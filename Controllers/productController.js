// controllers/productController.js
const Product = require("../Models/productModel"); // adjust path if needed
const mongoose = require("mongoose");
const { uploadBufferToCloudinary } = require("../Utils/cloudinaryHelper"); // your helper
const ALLOWED_GENDERS = ["Men", "Women", "Unisex"];
const Category=require("../Models/categoryModel")
/**
 * Helper: map incoming variant object -> normalized variant with images[] (0..4)
 * - v may contain: image (string or array), imageIndex (number), imageIndices (array)
 * - otherImages is an array of URLs produced by uploading gallery files for this request
 */
async function deleteRemoteImageByUrl(url) {
  if (!url || typeof url !== "string") return;
  try {
    // Cloudinary expects public_id, so convert URL -> public_id
    // This simple extractor assumes standard Cloudinary URL format:
    // https://res.cloudinary.com/<cloud_name>/.../<folder>/<public_id>.<ext>
    const parts = url.split("/");
    const last = parts[parts.length - 1]; // public_id.ext
    const [publicWithExt] = [last];
    const publicParts = publicWithExt.split(".");
    const publicId = publicParts.slice(0, -1).join("."); // handles dots in public_id
    // Build possible folder path (everything after "upload/")
    const uploadIdx = parts.findIndex((p) => p === "upload");
    let public_path = publicId;
    if (uploadIdx >= 0) {
      const afterUpload = parts.slice(uploadIdx + 1); // e.g. ['v1234', 'folder', 'file.jpg']
      // remove version token like v123456 if present
      if (afterUpload[0] && afterUpload[0].startsWith("v") && /^\v?\d+$/.test(afterUpload[0]) === false) {
        // ignore — defensive
      }
      // remove version token if it starts with 'v' followed by digits
      const withoutVersion = afterUpload[0] && /^v\d+$/.test(afterUpload[0]) ? afterUpload.slice(1) : afterUpload;
      // join without extension
      const pathParts = withoutVersion.map((p, idx) => {
        if (idx === withoutVersion.length - 1) return p.split(".").slice(0, -1).join(".");
        return p;
      });
      public_path = pathParts.join("/");
    }
    // try destroy using derived public_id
    await cloudinary.uploader.destroy(public_path, { resource_type: "image" });
  } catch (e) {
    // best-effort: if cloudinary delete fails, log and continue
    console.warn("deleteRemoteImageByUrl failed for", url, e?.message || e);
  }
}

function buildVariantFromIncoming(v = {}, otherImages = []) {
  const stock = Number(v.stock || 0);
  const price = v.price != null && v.price !== "" ? Number(v.price) : null;

  let images = [];

  // prefer explicit image or images provided as URL(s)
  if (v.image) {
    if (Array.isArray(v.image)) images = v.image.slice(0, 4).map(String).filter(Boolean);
    else images = [String(v.image)].filter(Boolean).slice(0, 4);
  }

  // imageIndices -> map to otherImages (if explicit images not provided)
  if ((images.length === 0 || !images) && Array.isArray(v.imageIndices)) {
    images = v.imageIndices
      .map((idx) => {
        const i = Number(idx);
        return Number.isFinite(i) && otherImages[i] ? otherImages[i] : null;
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  // fallback: single imageIndex numeric
  if ((images.length === 0 || !images) && typeof v.imageIndex === "number") {
    const i = Number(v.imageIndex);
    if (otherImages[i]) images = [otherImages[i]];
  }

  // final result
  return {
    color: v.color,
    size: v.size,
    stock,
    price,
    image: images,
  };
}

/**
 * Create product
 * Expects multipart/form-data:
 * - mainImage (file) required
 * - images (multiple files) optional
 * - body fields: name, description, basePrice, category, gender, badges, tags, variants (JSON string)
 */
// controllers/productController.js (only the createProduct function)
// replace your existing createProduct with this
// controllers/productController.js (replace createProduct with this)
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

    /* ------------------ BASIC VALIDATION ------------------ */
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

    /* ------------------ SLUG ------------------ */
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

    /* ------------------ MAIN IMAGE (REQUIRED) ------------------ */
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

    /* ------------------ EXTRA IMAGES (MAX 3) ------------------ */
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

    /* ------------------ UNIT VARIANTS ------------------ */
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

    /* ------------------ TAGS ------------------ */
    const tagsArr = tags
      ? String(tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    /* ------------------ CREATE PRODUCT ------------------ */
    const product = await Product.create({
      name: name.trim(),
      slug,
      description,
      category,
      mainImage: mainImageUrl,
      images,              // max 3
      unitVariants,        // weight-based
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


/**
 * List products
 */
const listProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate("category", "name") // <-- populate category name
      .lean();
    return res.json({ success: true, products });
  } catch (err) {
    console.error("listProducts error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get single product
 */
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
    console.log(id)

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
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

    /* ---------------- BASIC VALIDATION ---------------- */
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

    /* ---------------- SLUG ---------------- */
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    /* ---------------- MAIN IMAGE ---------------- */
    if (req.files?.mainImage?.[0]) {
      const uploaded = await uploadBufferToCloudinary(
        req.files.mainImage[0].buffer,
        `products/${slug}/main`
      );
      product.mainImage = uploaded.secure_url || uploaded.url;
    }

    /* ---------------- EXTRA IMAGES ---------------- */
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

    // Replace gallery if new ones uploaded
    if (newImages.length > 0) {
      product.images = newImages;
    }

    /* ---------------- VARIANTS ---------------- */
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

    /* ---------------- UPDATE DOCUMENT ---------------- */
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


/**
 * Toggle product active flag
 */
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
      category,        // category _id
      search = "",
      sort = "new",
      page = 1,
      limit = 24,
    } = req.query;

    // Build base filter (only active products)
    const filter = { isActive: true };

    // filter by category id if provided
    if (category) {
      // allow objectId or string - assume client sends _id
      filter.category = category;
    }

    // simple text search on name/description/tags
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    // sorting
    let sortObj = { createdAt: -1 }; // default -> newest
    if (sort === "price-asc") sortObj = { basePrice: 1 };
    else if (sort === "price-desc") sortObj = { basePrice: -1 };
    else if (sort === "bestselling") sortObj = { soldCount: -1 };

    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.max(1, Math.min(100, Number(limit) || 24));
    const skip = (pg - 1) * lim;

    // total count for pagination
    const total = await Product.countDocuments(filter);

    // fetch products, populate category (only _id & name)
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(lim)
      .select("-__v") // omit __v
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
  getShopProducts
};
