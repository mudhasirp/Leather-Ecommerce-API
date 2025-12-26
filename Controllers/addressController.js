// API/Controllers/addressController.js
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

    if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const hasAddress = await Address.exists({ user: userId });

    const address = await Address.create({
      user: userId,
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
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

    const address = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    Object.assign(address, req.body);
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

    // unset previous default
    await Address.updateMany(
      { user: userId },
      { isDefault: false }
    );

    // set new default
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