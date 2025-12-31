const express=require("express")
const {adminLogin, getAllEnquiries, updateEnquiryStatus,getCustomers,getCustomerDetails,toggleCustomerBlock, getDashboard}=require("../Controllers/adminController")
const {getCategories,createCategory,toggleCategory,updateCategory}=require("../Controllers/categoryController")
const{createProduct,listProducts,updateProduct,toggleProduct}=require("../Controllers/productController")
const upload=require("../Middleware/multer")
const{getAllOrders, updateOrderStatus}=require("../Controllers/orderController")
const router=express.Router()

router.post("/login",adminLogin)
router.get("/categories", getCategories);
router.post("/categories", upload.single("image"), createCategory);
router.patch("/categories/:id/toggle", toggleCategory);
router.put("/categories/:id",upload.single("image"), updateCategory)
function multerErrorHandler(err, req, res, next) {
  if (err && err.name === "MulterError") {
    console.log(err)
    return res.status(400).json({ success: false, message: `Multer: ${err.message}`, field: err.field });
  }
  next(err);
}
router.post("/products", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "images", maxCount: 12 },         
  { name: "variantImages", maxCount: 100 }  
])
, createProduct,multerErrorHandler);
router.get("/products",listProducts)
router.put("/products/:id", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "images", maxCount: 12 },         
  { name: "variantImages", maxCount: 100 }   
]),
updateProduct)
router.patch("/products/:id/toggle",toggleProduct)
router.get("/orders",getAllOrders)
router.patch("/orders/:id/status",updateOrderStatus)
router.get("/enquiries",getAllEnquiries)
router.patch("/enquiries/:id/status",updateEnquiryStatus)
router.get("/customers",  getCustomers);
router.get("/customers/:id", getCustomerDetails);
router.patch("/customers/:id/block",  toggleCustomerBlock);
router.get("/dashboard",getDashboard)

module.exports=router

