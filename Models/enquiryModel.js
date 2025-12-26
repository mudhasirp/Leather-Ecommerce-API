const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    username: {
      type: String,
      required: true,
    },

    userPhone: {
      type: String,
      required: true,
    },

    userAddress: {
      line1: String,
      city: String,
      state: String,
      postalCode: String,
    },

    product: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: String,
      image: String,
    },

    message: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["New", "Contacted", "Closed"],
      default: "New",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);
