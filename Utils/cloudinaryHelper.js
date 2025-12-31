const cloudinary = require("../Config/cloudinary"); 
const streamifier = require("streamifier");


function uploadBufferToCloudinary(buffer, publicIdPrefix = "") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "leatherhaven/categories", public_id: publicIdPrefix || undefined, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  })
};
module.exports={uploadBufferToCloudinary}