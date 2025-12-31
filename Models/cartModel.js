const mongoose= require("mongoose")
const {Schema}=mongoose
const cartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },

  unitLabel: { type: String, required: true },       
  unitWeight: { type: Number, required: true },     
  
  name: { type: String, required: true },
  slug: { type: String },
  image: { type: String },

  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  stock:Number,

  addedAt: { type: Date, default: Date.now },
});


const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true, required: false },
    sessionId: { type: String, index: true, required: false },

    items: { type: [cartItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cartSchema.methods.recalculate = function () {
  this.subtotal = (this.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
  return this.subtotal;
};

cartSchema.methods.addItem = async function (itemSnapshot) {
  if (
    !itemSnapshot.productId ||
    !itemSnapshot.unitLabel ||
    !itemSnapshot.unitWeight
  ) {
    throw new Error("Invalid vegetable item");
  }

  const existingIndex = this.items.findIndex(
    (it) =>
      String(it.productId) === String(itemSnapshot.productId) &&
      it.unitLabel === itemSnapshot.unitLabel
  );

  if (existingIndex >= 0) {
    this.items[existingIndex].qty += Number(itemSnapshot.qty || 1);
  } else {
    this.items.push({
      productId: itemSnapshot.productId,
      name: itemSnapshot.name,
      slug: itemSnapshot.slug,
      image: itemSnapshot.image,

      unitLabel: itemSnapshot.unitLabel,
      unitWeight: itemSnapshot.unitWeight,

      qty: Number(itemSnapshot.qty || 1),
      price: Number(itemSnapshot.price),
    });
  }

  this.recalculate();
  await this.save();
  return this;
};



cartSchema.methods.updateItemQty = async function (cartItemId, qty) {
  const idx = this.items.findIndex((it) => String(it._id) === String(cartItemId));
  if (idx === -1) throw new Error("Cart item not found");

  if (!Number.isFinite(Number(qty)) || Number(qty) < 0) throw new Error("Invalid qty");

  if (Number(qty) === 0) {
    this.items.splice(idx, 1);
  } else {
    this.items[idx].qty = Number(qty);
  }

  this.recalculate();
  await this.save();
  return this;
};


cartSchema.methods.removeItem = async function (cartItemId) {
  const idx = this.items.findIndex((it) => String(it._id) === String(cartItemId));
  if (idx !== -1) this.items.splice(idx, 1);
  this.recalculate();
  await this.save();
  return this;
};

cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.subtotal = 0;
  await this.save();
  return this;
};


cartSchema.statics.findOrCreateFor = async function ({ userId }) {
  if (!userId) throw new Error("userId required");

  let cart = await this.findOne({ user: userId });
  if (!cart) cart = await this.create({ user: userId });

  return cart;
};


const Cart=mongoose.model("Cart",cartSchema)

module.exports =Cart