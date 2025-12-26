const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: String,
  image: String,

  price: Number,
  qty: Number,

  size: String,
  color: String,
}, { _id: false });

const orderAddressSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [orderItemSchema],

    address: orderAddressSchema,

    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "CARD"],
      default: "COD",
    },

    subtotal: Number,
    deliveryFee: Number,
    totalAmount: Number,

    status: {
      type: String,
      enum: ["Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Placed",
    },

    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Order", orderSchema);
