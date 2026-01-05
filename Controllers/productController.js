
const Product = require("../Models/productModel"); 
const mongoose = require("mongoose");
const { uploadBufferToCloudinary } = require("../Utils/cloudinaryHelper"); 
const ALLOWED_GENDERS = ["Men", "Women", "Unisex"];
const Category=require("../Models/categoryModel")

async function deleteRemoteImageByUrl(url) {
  if (!url || typeof url !== "string") return;
  try {
  
    const parts = url.split("/");
    const last = parts[parts.length - 1]; 
    const [publicWithExt] = [last];
    const publicParts = publicWithExt.split(".");
    const publicId = publicParts.slice(0, -1).join("."); 
    const uploadIdx = parts.findIndex((p) => p === "upload");
    let public_path = publicId;
    if (uploadIdx >= 0) {
      const afterUpload = parts.slice(uploadIdx + 1); 
      if (afterUpload[0] && afterUpload[0].startsWith("v") && /^\v?\d+$/.test(afterUpload[0]) === false) {
      }
      const withoutVersion = afterUpload[0] && /^v\d+$/.test(afterUpload[0]) ? afterUpload.slice(1) : afterUpload;
      const pathParts = withoutVersion.map((p, idx) => {
        if (idx === withoutVersion.length - 1) return p.split(".").slice(0, -1).join(".");
        return p;
      });
      public_path = pathParts.join("/");
    }
    await cloudinary.uploader.destroy(public_path, { resource_type: "image" });
  } catch (e) {
    console.warn("deleteRemoteImageByUrl failed for", url, e?.message || e);
  }
}

function buildVariantFromIncoming(v = {}, otherImages = []) {
  const stock = Number(v.stock || 0);
  const price = v.price != null && v.price !== "" ? Number(v.price) : null;

  let images = [];

  if (v.image) {
    if (Array.isArray(v.image)) images = v.image.slice(0, 4).map(String).filter(Boolean);
    else images = [String(v.image)].filter(Boolean).slice(0, 4);
  }

  if ((images.length === 0 || !images) && Array.isArray(v.imageIndices)) {
    images = v.imageIndices
      .map((idx) => {
        const i = Number(idx);
        return Number.isFinite(i) && otherImages[i] ? otherImages[i] : null;
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if ((images.length === 0 || !images) && typeof v.imageIndex === "number") {
    const i = Number(v.imageIndex);
    if (otherImages[i]) images = [otherImages[i]];
  }

  return {
    color: v.color,
    size: v.size,
    stock,
    price,
    image: images,
  };
}


const createProduct = async (req, res) => {
  try {
    console.log("FILES:", Object.keys(req.files || {}));
    console.log("BODY:", Object.keys(req.body || {}));

    const {
      name,
      description,
      category,
      tags,
      unitVariants: unitVariantsRaw,
      slug: incomingSlug,
      isActive,
    } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, description and category are required",
      });
    }

    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const slug = (incomingSlug || name)
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const slugExists = await Product.findOne({ slug });
    if (slugExists) {
      return res.status(409).json({
        success: false,
        message: "Product already exists",
      });
    }

    if (!req.files?.mainImage?.[0]) {
      return res.status(400).json({
        success: false,
        message: "Main image is required",
      });
    }

    const mainUpload = await uploadBufferToCloudinary(
      req.files.mainImage[0].buffer,
      `products/${slug}/main`
    );

    const mainImageUrl =
      mainUpload?.secure_url || mainUpload?.url || "";

    const images = [];

    if (Array.isArray(req.files?.images)) {
      for (let i = 0; i < req.files.images.length; i++) {
        const file = req.files.images[i];

        const upload = await uploadBufferToCloudinary(
          file.buffer,
          `products/${slug}/gallery-${i}`
        );

        images.push(upload?.secure_url || upload?.url || "");
      }
    }

    let unitVariants = [];

    try {
      const parsed =
        typeof unitVariantsRaw === "string"
          ? JSON.parse(unitVariantsRaw)
          : unitVariantsRaw;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid unit variants");
      }

      unitVariants = parsed.map((u) => ({
        label: String(u.label).trim(),
        weightInGrams: Number(u.weightInGrams),
        price: Number(u.price),
        stock: Number(u.stock) || 0,
      }));
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit variants data",
      });
    }

    const tagsArr = tags
      ? String(tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];


    const product = await Product.create({
      name: name.trim(),
      slug,
      description,
      category,
      mainImage: mainImageUrl,
      images,             
      unitVariants,       
      tags: tagsArr,
      isActive: isActive !== "false",
      soldCount: 0,
    });

    return res.status(201).json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const listProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate("category", "name") 
      .lean();
    return res.json({ success: true, products });
  } catch (err) {
    console.error("listProducts error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const listProductsUser = async (req, res) => {
  try {
    const products = await Product.find({isActive:true})
      .sort({ createdAt: -1 })
      .populate("category", "name") 
      .lean();
    return res.json({ success: true, products });
  } catch (err) {
    console.error("listProducts error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

 const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const LIMIT = 4;

    const currentProduct = await Product.findById(productId);
    if (!currentProduct) {
      return res.status(404).json({ success: false });
    }

    // 1️⃣ Same category first
    let products = await Product.find({
      category: currentProduct.category,
      _id: { $ne: currentProduct._id },
      isActive: true,
    }).limit(LIMIT);

    // 2️⃣ Fill remaining slots
    if (products.length < LIMIT) {
      const remaining = LIMIT - products.length;

      const excludeIds = products.map(p => p._id);

      const fallback = await Product.find({
        _id: { $nin: [...excludeIds, currentProduct._id] },
        isActive: true,
      }).limit(remaining);

      products = [...products, ...fallback];
    }

    res.json({
      success: true,
      products,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};



const getProduct = async (req, res) => {
  const { slug } = req.params;
  try {
    const product = await Product.findOne({ slug })
      .populate("category", "name")
      .lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body)

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }
    let existingImages = [];

if (req.body.existingImages) {
  existingImages =
    typeof req.body.existingImages === "string"
      ? JSON.parse(req.body.existingImages)
      : req.body.existingImages;
}


    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const {
      name,
      description,
      category,
      tags,
      unitVariants,
      isActive,
    } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, description and category are required",
      });
    }

    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

  
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");


    if (req.files?.mainImage?.[0]) {
      const uploaded = await uploadBufferToCloudinary(
        req.files.mainImage[0].buffer,
        `products/${slug}/main`
      );
      product.mainImage = uploaded.secure_url || uploaded.url;
    }

  
    let newImages = [];
    if (req.files?.images?.length) {
      for (let i = 0; i < req.files.images.length; i++) {
        const f = req.files.images[i];
        const uploaded = await uploadBufferToCloudinary(
          f.buffer,
          `products/${slug}/gallery-${Date.now()}-${i}`
        );
        newImages.push(uploaded.secure_url || uploaded.url);
      }
    }
    product.images = [...existingImages, ...newImages];


    let parsedVariants = [];
    if (unitVariants) {
      const parsed =
        typeof unitVariants === "string"
          ? JSON.parse(unitVariants)
          : unitVariants;

      parsed.forEach((v) => {
        if (!v.label || !v.price) return;

        parsedVariants.push({
          label: v.label,
          weightInGrams: Number(v.weightInGrams),
          price: Number(v.price),
          stock: Number(v.stock || 0),
        });
      });
    }

    if (!parsedVariants.length) {
      return res.status(400).json({
        success: false,
        message: "At least one variant is required",
      });
    }

 
    product.name = name;
    product.slug = slug;
    product.description = description;
    product.category = category;
    product.tags = tags ? tags.split(",").map(t => t.trim()) : [];
    product.unitVariants = parsedVariants;
    product.isActive = isActive !== false;

    await product.save();

    return res.json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const toggleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const p = await Product.findById(id);
    if (!p) return res.status(404).json({ success: false, message: "Not found" });
    p.isActive = !p.isActive;
    await p.save();
    return res.json({ success: true, product: p });
  } catch (err) {
    console.error("toggleProduct error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const getShopProducts = async (req, res) => {
  try {
    const {
      category,        
      search = "",
      sort = "new",
      page = 1,
      limit = 24,
    } = req.query;

    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === "price-asc") sortObj = { basePrice: 1 };
    else if (sort === "price-desc") sortObj = { basePrice: -1 };
    else if (sort === "bestselling") sortObj = { soldCount: -1 };

    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.max(1, Math.min(100, Number(limit) || 24));
    const skip = (pg - 1) * lim;

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(lim)
      .select("-__v") 
      .populate({ path: "category", select: "_id name" })
      .lean();

    return res.json({
      success: true,
      meta: { total, page: pg, limit: lim, pages: Math.ceil(total / lim) },
      products,
    });
  } catch (error) {
    console.error("getUserProducts error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  toggleProduct,
  getShopProducts,
  listProductsUser,
  getRelatedProducts
};
