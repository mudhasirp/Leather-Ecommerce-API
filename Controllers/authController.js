const jwt = require("jsonwebtoken")
const User = require("../Models/userModel")
const sendTokens = require("../Utils/sendTokens")
const Otp=require("../Models/otpModel")
const bcrypt = require("bcrypt");
const sendEmail=require("../Config/nodeMailer")
const {getOtpEmailHtml}=require("../Utils/emailContentProvider")
//for sendingOtp to User

const sendRegisterOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("otp send to the email",otp)

    await Otp.findOneAndUpdate(
      { email },
      {
        email,
        name,
        password: hashedPassword,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    const html = getOtpEmailHtml({ name, otp });

    await sendEmail(email, "Your Leather Haven OTP Code", html);

    return res.status(200).json({
      message: "OTP sent successfully",
      email,
    });
  } catch (error) {
    console.error("sendRegisterOtp error:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  }
};
//for verifying OTP
const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email });

    if (!record) return res.status(400).json({ message: "OTP expired or not found" });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.create({
      name: record.name,
      email: record.email,
      password: record.password,
    });

    await Otp.deleteOne({ email });

    return sendTokens(user, res, 201);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};
// for login purpose
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }
        const user = await User.findOne({ email })
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: "Invalid credentials " })
        }
        return sendTokens(user, res)
    } catch (err) {
        console.error("Login error", err.message);
        res.status(500).json({ message: "Server error" })
    }
}
//for regenerating the refresh token
const refresh = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "No refresh token" })
        }
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id)
        if (!user) return res.status(401).json({ message: "User not Found" })
        const accessToken = jwt.sign(

            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }

        )
        return res.json({
            success:true,
            accessToken,
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                role:user.role
            }
        });
    }
    catch(error){
        console.log(error);
        return res.status(401).json({message:"Invalid refresh token"})
    }
}

// for logout 
const logout=(req,res)=>{
    res.clearCookie("refreshToken",{
        httpOnly:true,
              secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",

    })
    .json({success:true,message:"LoggedOut"})
}


module.exports = { loginUser, logout,refresh,sendRegisterOtp,verifyRegisterOtp }