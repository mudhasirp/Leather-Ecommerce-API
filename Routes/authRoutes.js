const express=require("express")
const { loginUser,refresh,logout,sendRegisterOtp,verifyRegisterOtp
}=require("../Controllers/authController")
const {protect,isAdmin}=require("../Middleware/authMiddleware")
const router=express.Router()

router.post("/send-otp",sendRegisterOtp)
router.post("/verify-otp",verifyRegisterOtp)
router.post("/login",loginUser)
router.post("/refresh",refresh)
router.post("/logout",logout)

module.exports=router;