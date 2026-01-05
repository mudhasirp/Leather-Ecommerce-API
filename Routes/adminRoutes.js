const express=require("express")
const {adminLogin, getAllEnquiries, updateEnquiryStatus,getCustomers,getCustomerDetails,toggleCustomerBlock, getDashboard}=require("../Controllers/adminController")
const {getCategories,createCategory,toggleCategory,updateCategory}=require("../Controllers/categoryController")
const{createProduct,listProducts,updateProduct,toggleProduct}=require("../Controllers/productController")
const upload=require("../Middleware/multer")
const {isAdmin,protect}=require("../Middleware/authMiddleware")
const{getAllOrders, updateOrderStatus, getOrderByIdAdmin, getOrderInvoiceAdmin}=require("../Controllers/orderController")
const router=express.Router()

router.post("/login",adminLogin)
router.get("/categories",  getCategories);
router.post("/categories",protect, isAdmin, upload.single("image"), createCategory);
router.patch("/categories/:id/toggle",protect,isAdmin, toggleCategory);
router.put("/categories/:id",protect,isAdmin,upload.single("image"), updateCategory)
function multerErrorHandler(err, req, res, next) {
  if (err && err.name === "MulterError") {
    console.log(err)
    return res.status(400).json({ success: false, message: `Multer: ${err.message}`, field: err.field });
  }
  next(err);
}
router.post("/products",protect, isAdmin,upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "images", maxCount: 12 },         
  { name: "variantImages", maxCount: 100 }  
])
, createProduct,multerErrorHandler);
router.get("/products",protect,isAdmin,listProducts)
router.put("/products/:id",protect,isAdmin, upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "images", maxCount: 12 },         
  { name: "variantImages", maxCount: 100 }   
]),
updateProduct)
router.patch("/products/:id/toggle",protect,isAdmin,toggleProduct)
router.get("/orders",protect,isAdmin,getAllOrders)
router.patch("/orders/:id/status",protect,isAdmin,updateOrderStatus)
router.get("/enquiries",protect,isAdmin,getAllEnquiries)
router.patch("/enquiries/:id/status",protect,isAdmin,updateEnquiryStatus)
router.get("/customers", protect, isAdmin,getCustomers);
router.get("/customers/:id", protect,isAdmin,getCustomerDetails);
router.patch("/customers/:id/block", protect,isAdmin, toggleCustomerBlock);
router.get("/dashboard",protect,isAdmin,getDashboard)
router.get("/order-details/:id",protect,isAdmin,getOrderByIdAdmin)
router.get("/orders/:id/invoice",protect,isAdmin,getOrderInvoiceAdmin)
module.exports=router

