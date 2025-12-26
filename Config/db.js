//for connecting mongo db
const mongoose=require("mongoose")
const connectDb=async()=>{
    try{
      const conn=await mongoose.connect(process.env.MONGO_URI)
      console.log(process.env.MONGO_URI)
   console.log("Mongo db connected",conn.connection.host)
    }catch(err){
        console.error("Mongo DB connection error",err.message)
        process.exit(1)
    }

   
};
module.exports=connectDb