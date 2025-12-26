const mongoose= require("mongoose")
const {Schema}=mongoose
const cartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },

  // 🥕 VEGETABLE-SPECIFIC
  unitLabel: { type: String, required: true },       // "500 g"
  unitWeight: { type: Number, required: true },      // 500 (grams)

  // snapshots
  name: { type: String, required: true },
  slug: { type: String },
  image: { type: String },

  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },

  addedAt: { type: Date, default: Date.now },
});


const cartSchema = new Schema(
  {
    // associate a cart with a user (preferred) OR a sessionId for guest carts
    user: { type: Schema.Types.ObjectId, ref: "User", index: true, required: false },
    sessionId: { type: String, index: true, required: false },

    // items array
    items: { type: [cartItemSchema], default: [] },

    // cached totals for performance (you may keep them in sync in controllers)
    subtotal: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    // optional flags
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cartSchema.methods.recalculate = function () {
  this.subtotal = (this.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
  return this.subtotal;
};
// add after cartSchema.methods.recalculate = function () { ... }

//
// Instance methods
//

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



/**
 * Update quantity of a cart item (by cart subdocument _id).
 * If qty <= 0, the item will be removed.
 */
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

/**
 * Remove an item by cartItemId
 */
cartSchema.methods.removeItem = async function (cartItemId) {
  const idx = this.items.findIndex((it) => String(it._id) === String(cartItemId));
  if (idx !== -1) this.items.splice(idx, 1);
  this.recalculate();
  await this.save();
  return this;
};

/**
 * Clear cart
 */
cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.subtotal = 0;
  await this.save();
  return this;
};

//
// Static helpers
//

/**
 * Find or create cart for a user or sessionId
 * Pass either { userId } (preferred) or { sessionId }.
 */
cartSchema.statics.findOrCreateFor = async function ({ userId }) {
  if (!userId) throw new Error("userId required");

  let cart = await this.findOne({ user: userId });
  if (!cart) cart = await this.create({ user: userId });

  return cart;
};


const Cart=mongoose.model("Cart",cartSchema)

module.exports =Cart