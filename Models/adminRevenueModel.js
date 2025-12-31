const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminRevenueSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },

    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "INR"
    },

    type: {
      type: String,
      enum: ["order", "refund"],
      default: "order"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminRevenue", adminRevenueSchema);
