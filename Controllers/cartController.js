const Cart=require("../Models/cartModel")
const mongoose=require("mongoose")
const Product=require("../Models/productModel")
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const cart = await Cart.findOrCreateFor({ userId });
    return res.json({ success: true, cart });
  } catch (err) {
    console.error("getCart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(req.body)

    const { productId, unitLabel, qty } = req.body;

    // Basic validation
    if (!productId || !unitLabel || !qty || qty < 1) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find correct unit
    const unit = product.unitVariants.find(
      (u) => u.label === unitLabel
    );

    if (!unit) {
      return res.status(400).json({ message: "Invalid unit selected" });
    }

    // Extract trusted values
    const unitWeight = unit.weightInGrams;
    const price = unit.price;

    // Find or create cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if same product + unit already exists
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.unitLabel === unitLabel
    );

    if (existingItem) {
      existingItem.qty += qty;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        unitLabel,
        unitWeight,
        price,
        qty,
        image: product.mainImage,
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (err) {
    console.error("Add to cart error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const updateItemQty = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { itemId } = req.params;
    const { qty } = req.body;

    const cart = await Cart.findOrCreateFor({ userId });
    await cart.updateItemQty(itemId, qty);

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("updateItemQty error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const removeItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { itemId } = req.params;

    const cart = await Cart.findOrCreateFor({ userId });
    await cart.removeItem(itemId);

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("removeItem error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;
        console.log("cart is",userId)

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const cart = await Cart.findOrCreateFor({ userId });
    await cart.clearCart();

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("clearCart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
 module.exports={getCart,clearCart,removeItem,addItem,updateItemQty}