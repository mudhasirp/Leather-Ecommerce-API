const bcrypt = require("bcrypt");
const User = require("../Models/userModel");
const sendTokens = require("../Utils/sendTokens");
const Enquiry = require("../Models/enquiryModel");
const Order = require("../Models/orderModel")
const Address =require("../Models/addressModel")
const Product=require("../Models/productModel")
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email,password)

    const user = await User.findOne({ email }).select("+password");
    console.log("FOUND USER:", user ? { email: user.email, role: user.role } : null);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied - not admin" });
    }

    const isMatch = await user.matchPassword(password);
    console.log("PASSWORD MATCH:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return sendTokens(user, res);
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .sort({ createdAt: -1 })
      .populate("product.productId", "slug");

    res.json({ success: true, enquiries });
  } catch (err) {
    console.error("Admin enquiry fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    res.json({ success: true, enquiry });
  } catch (err) {
    console.error("Update enquiry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const getCustomers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("name email createdAt")
      .lean();

    const userIds = users.map(u => u._id);

    const addresses = await Address.find({
      user: { $in: userIds },
      isDefault: true,
    }).lean();

    const orders = await Order.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: "$userId",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
        },
      },
    ]);

    const addressMap = {};
    addresses.forEach(a => (addressMap[a.user.toString()] = a));

    const orderMap = {};
    orders.forEach(o => (orderMap[o._id.toString()] = o));

    const customers = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: addressMap[u._id]?.phone || "—",
      totalOrders: orderMap[u._id]?.totalOrders || 0,
      totalSpent: orderMap[u._id]?.totalSpent || 0,
      joinedAt: u.createdAt,
    }));

    res.json({ success: true, customers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};
const getCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("name email createdAt isBlocked");
    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const defaultAddress = await Address.findOne({
      user: id,
      isDefault: true,
    });

    const orders = await Order.find({ userId: id })
      .sort({ createdAt: -1 })
      .select("_id totalAmount status createdAt");

    const totalSpent = orders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    const enquiries = await Enquiry.find({ user: id })
      .sort({ createdAt: -1 })
      .select("product message status createdAt");

    return res.json({
      user,
      defaultAddress,
      orders,
      totalSpent,
      enquiries,
    });
  } catch (err) {
    console.error("getCustomerDetails error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
const toggleCustomerBlock = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.json({
      success: true,
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    console.error("toggleCustomerBlock error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
const getDashboard = async (req, res) => {
  try {
    const range = req.query.range || "month";

    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    let groupBy;
    if (range === "week") {
      groupBy = {
        $dateToString: { format: "%a", date: "$createdAt" }, 
      };
    } else if (range === "month") {
      groupBy = {
        $dateToString: { format: "%d %b", date: "$createdAt" },
      };
    } else {
      groupBy = {
        $dateToString: { format: "%b %Y", date: "$createdAt" }, 
      };
    }

    
    
    const salesChart = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);


    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          revenue: {
            $sum: { $multiply: ["$items.price", "$items.qty"] },
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    const recentOrders = await Order.find()
      .populate("userId", "name")
      .populate("items.productId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      salesChart,
      topProducts,
      recentOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Dashboard error" });
  }
};


module.exports = { adminLogin,getAllEnquiries,updateEnquiryStatus,getCustomers,getCustomerDetails,toggleCustomerBlock,getDashboard};
