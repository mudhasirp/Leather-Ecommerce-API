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
    const { productId, unitLabel, qty } = req.body;
    console.log("started")
    console.log(req.body)
    console.log(typeof unitLabel)

    if (!productId || !unitLabel || !qty || qty < 1) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const unit = product.unitVariants.find(
      (u) => u.label === unitLabel
    );
    console.log(unit)
    
    if (!unit) {
      return res.status(400).json({ message: "Invalid unit" });
    }

    // 🔒 STOCK VALIDATION
    if(unit.stock)
    if (qty > unit.stock) {
      return res.status(400).json({
        message: `Only ${unit.stock} items available`
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.unitLabel === unitLabel
    );
    if (existingItem) {
  const totalQty = existingItem.qty + qty;

  if (totalQty > unit.stock) {
    return res.status(400).json({
      message: `Only ${unit.stock} items available`,
    });
  }

  existingItem.qty = totalQty;
} else {
  if (qty > unit.stock) {
    return res.status(400).json({
      message: `Only ${unit.stock} items available`,
    });
  }

  cart.items.push({
    productId,
    name: product.name,
    unitLabel,
    image:product.mainImage,
    unitWeight: unit.weightInGrams,
    price: unit.price,
    qty,
    stock: unit.stock
  });
} 
await cart.save()
   console.log("wro")
    res.status(200).json({
      success: true,
      cart,
    });

  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Internal server error" });
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