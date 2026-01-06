const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    page: {
      type: String,
      enum: ["home"],
      default: "home",
    },
    position: {
      type: String,
      enum: ["left", "right"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
