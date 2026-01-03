const Order = require("../Models/orderModel");
const Cart = require("../Models/cartModel")
const Product = require("../Models/productModel");
const Enquiry=require("../Models/enquiryModel")
const Address= require("../Models/addressModel")
const mongoose=require("mongoose")
const User=require("../Models/userModel")
const pdfkit=require("pdfkit")
const PDFDocument = require("pdfkit");

const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, paymentMethod } = req.body;

    /* ------------------ BASIC VALIDATION ------------------ */
   if (
  !address?.fullName ||
  !address?.phone ||
  !address?.line1 ||
  !address?.city ||
  !address?.postalCode
) {
  return res.status(400).json({ message: "Address incomplete" });
}

    /* ------------------ FETCH CART ------------------ */
    const cart = await Cart.findOne({ user: userId });
    console.log(cart)
    /* ----------- STRICT VALIDATION (DO NOT REMOVE) ----------- */

// Phone must be 10 digits
if (!/^\d{10}$/.test(address.phone)) {
  return res.status(400).json({ message: "Invalid phone number" });
}

// Postal code should be numeric
if (!/^\d{5,6}$/.test(address.postalCode)) {
  return res.status(400).json({ message: "Invalid postal code" });
}

// Prevent empty strings / whitespace abuse
if (
  !address.fullName.trim() ||
  !address.line1.trim() ||
  !address.city.trim() ||
  !address.state.trim()
) {
  return res.status(400).json({ message: "Address fields cannot be empty" });
}

    if (!cart) {
      return res.status(400).json({ message: "Cart not found" });
    }

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    /* ------------------ STOCK VALIDATION ------------------ */
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // find correct unit variant (eg: 500g)
      const unit = product.unitVariants.find(
        (u) => u.label === item.unitLabel
      );

      if (!unit) {
        return res.status(400).json({
          message: `Invalid unit for ${product.name}`,
        });
      }

      if (unit.stock < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }
    }

    /* ------------------ CALCULATE TOTALS ------------------ */
    const subtotal = cart.items.reduce(
      (sum, i) => sum + i.price * i.qty,
      0
    );

    const deliveryFee = subtotal >= 499 ? 0 : 40;
    const totalAmount = subtotal + deliveryFee;

    /* ------------------ CREATE ORDER ------------------ */
    const order = await Order.create({
      userId,
      items: cart.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        image: i.image,
        price: i.price,
        qty: i.qty,
        unitLabel: i.unitWeight,
      })),
      address,
      paymentMethod,
      subtotal,
      deliveryFee,
      totalAmount,
      status: "Placed",
    });

    /* ------------------ REDUCE STOCK ------------------ */
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      const unit = product.unitVariants.find(
        (u) => u.label === item.unitLabel
      );
      
      unit.stock -= item.qty;
      await product.save();
    }

    /* ------------------ CLEAR CART ------------------ */
    cart.items = [];
    await cart.save();

    /* ------------------ RESPONSE ------------------ */
    return res.status(201).json({
      success: true,
      order,
    });

  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Admin get orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ userId })
      .select("_id status isPaid totalAmount createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch {
    res.status(500).json({ message: "Failed to load order" });
  }
};

const createEnquiry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, message, phone } = req.body;

    /* ---------------- BASIC VALIDATION ---------------- */

    if (!productId || !message || !phone) {
      return res.status(400).json({
        message: "Product, message, and phone are required",
      });
    }

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    // Validate phone number (10 digits only)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone number. Enter a 10-digit number",
      });
    }

    // Validate message length
    if (message.trim().length < 5) {
      return res.status(400).json({
        message: "Message must be at least 5 characters long",
      });
    }

    /* ---------------- FETCH USER ---------------- */

    const user = await User.findById(userId).select("name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* ---------------- FETCH PRODUCT ---------------- */

    const product = await Product.findById(productId).select(
      "name mainImage"
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    /* ---------------- FETCH ADDRESS ---------------- */

    const address = await Address.findOne({
      user: userId,
      isDefault: true,
    });

    /* ---------------- CREATE ENQUIRY ---------------- */

    const enquiry = await Enquiry.create({
      user: userId,
      username: user.name,
      userPhone: phone,

      userAddress: address
        ? {
            line1: address.line1,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          }
        : undefined,

      product: {
        productId: product._id,
        name: product.name,
        image: product.mainImage,
      },

      message: message.trim(),
      status: "New",
    });

    res.status(201).json({
      success: true,
      enquiry,
    });

  } catch (err) {
    console.error("Create enquiry error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getOrderByIdAdmin = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("userId", "name email");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json(order);
};


const getOrderInvoiceAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate(
      "userId",
      "name email"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${order._id}.pdf`
    );

    doc.pipe(res);

    /* ---------------- HEADER ---------------- */
    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${order.createdAt.toDateString()}`);
    doc.text(`Status: ${order.status}`);
    doc.moveDown();

    /* ---------------- CUSTOMER ---------------- */
    doc.fontSize(14).text("Customer Details", { underline: true });
    doc.fontSize(12).text(`Name: ${order.userId?.name || "N/A"}`);
    doc.text(`Email: ${order.userId?.email || "N/A"}`);
    doc.moveDown();

    /* ---------------- ADDRESS ---------------- */
    if (order.address) {
      doc.fontSize(14).text("Delivery Address", { underline: true });
      doc.fontSize(12).text(
        `${order.address.line1}, ${order.address.line2 || ""}`
      );
      doc.text(
        `${order.address.city}, ${order.address.state}`
      );
      doc.text(
        `${order.address.postalCode}, ${order.address.country}`
      );
      if (order.address.phone) {
        doc.text(`Phone: +91 ${order.address.phone}`);
      }
      doc.moveDown();
    }

    /* ---------------- ITEMS ---------------- */
    doc.fontSize(14).text("Order Items", { underline: true });
    doc.moveDown(0.5);

    order.items.forEach((item, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${item.name}
Qty: ${item.qty}
Price: ₹${item.price}
Total: ₹${item.qty * item.price}`
      );
      doc.moveDown(0.5);
    });

    /* ---------------- TOTAL ---------------- */
    doc.moveDown();
    doc
      .fontSize(14)
      .text(`Grand Total: ₹${order.totalAmount}`, {
        align: "right",
      });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Invoice generation failed" });
  }
};

module.exports={createOrder,getAllOrders,updateOrderStatus,getMyOrders,getAllOrders,getOrderDetails,createEnquiry,getOrderByIdAdmin,getOrderInvoiceAdmin}