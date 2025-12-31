const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    
    

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
categorySchema.index({ name: 1, vendorId: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
