
const mongoose=require("mongoose")

const unitVariantSchema = new mongoose.Schema({
  label: {
    type: String, 
    required: true,
  },
  weightInGrams: {
    type: Number, 
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    default: 0,
  },
});
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },

    description: { type: String, required: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    mainImage: { type: String, required: true },
    images: [{ type: String }],

    unitVariants: [unitVariantSchema], // 🥕 weight-based

    isOrganic: { type: Boolean, default: false },

    pricePerKg: { type: Number }, // optional reference price

    isActive: { type: Boolean, default: true },

    soldCount: { type: Number, default: 0 },

    badges: [{ type: String, enum: ["New", "Popular", "Organic"] }],

    tags: [{ type: String }],

  },
  { timestamps: true }
);
const Product=mongoose.model("Product",productSchema)
module.exports=Product