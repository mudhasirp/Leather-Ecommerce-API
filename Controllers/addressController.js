const Address = require("../Models/addressModel")


const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await Address.find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, addresses });
  } catch (err) {
    console.error("Get addresses error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
    } = req.body;

    // ---------- VALIDATION ----------
    if (!fullName?.trim())
      return res.status(400).json({ message: "Full name is required" });

    if (!/^\d{10}$/.test(phone))
      return res.status(400).json({ message: "Invalid phone number" });
    // Postal code must be numbers only (5–6 digits)
if (!/^\d{5,6}$/.test(postalCode)) {
  return res.status(400).json({
    message: "Postal code must be a valid number",
  });
}

    if (!line1?.trim())
      return res.status(400).json({ message: "Address line is required" });

    if (!city?.trim())
      return res.status(400).json({ message: "City is required" });

    if (!state?.trim())
      return res.status(400).json({ message: "State is required" });

    if (!postalCode?.trim())
      return res.status(400).json({ message: "Postal code is required" });

    // ---------- CREATE ADDRESS ----------
    const hasAddress = await Address.exists({ user: userId });

    const address = await Address.create({
      user: userId,
      fullName: fullName.trim(),
      phone,
      line1: line1.trim(),
      line2: line2?.trim() || "",
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country || "India",
      isDefault: !hasAddress,
    });

    res.status(201).json({ success: true, address });
  } catch (err) {
    console.error("Create address error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, user: userId });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const {
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
    } = req.body;

    // ---------- VALIDATION ----------
    if (fullName && !fullName.trim())
      return res.status(400).json({ message: "Invalid full name" });

    if (phone && !/^\d{10}$/.test(phone))
      return res.status(400).json({ message: "Invalid phone number" });
// Postal code must be numbers only (5–6 digits)
if (!/^\d{5,6}$/.test(postalCode)) {
  return res.status(400).json({
    message: "Postal code must be a valid number",
  });
}

    if (postalCode && !postalCode.trim())
      return res.status(400).json({ message: "Invalid postal code" });

    // ---------- UPDATE ----------
    Object.assign(address, {
      ...(fullName && { fullName: fullName.trim() }),
      ...(phone && { phone }),
      ...(line1 && { line1: line1.trim() }),
      ...(line2 && { line2: line2.trim() }),
      ...(city && { city: city.trim() }),
      ...(state && { state: state.trim() }),
      ...(postalCode && { postalCode: postalCode.trim() }),
    });

    await address.save();

    res.json({ success: true, address });
  } catch (err) {
    console.error("Update address error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await Address.updateMany(
      { user: userId },
      { isDefault: false }
    );

    const address = await Address.findOneAndUpdate(
      { _id: id, user: userId },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ success: true, address });
  } catch (err) {
    console.error("Set default address error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    await address.deleteOne();

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (err) {
    console.error("Delete address error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports={setDefaultAddress,updateAddress,createAddress,getAddresses,deleteAddress}