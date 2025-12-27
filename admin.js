import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./Models/userModel.js";

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log("Admin already exists");
    process.exit(0);
  }


  await User.create({
    name: "Admin",
    email: "admin@gmail.com",
    password: "admin123",
    role: "admin",
  });

  console.log("✅ Admin created successfully");
  process.exit(0);
}

createAdmin();
