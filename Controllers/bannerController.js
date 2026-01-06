const Banner=require("../Models/bannerModel")
const cloudinary=require("../Config/cloudinary")
const createBanner = async (req, res) => {
  try {
    const { position } = req.body;

    if (!req.file || !position) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // upload buffer to cloudinary
    cloudinary.uploader
      .upload_stream({ folder: "banners" }, async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({ message: "Image upload failed" });
        }

        const banner = await Banner.findOneAndUpdate(
          { page: "home", position },
          {
            image: result.secure_url, // ✅ THIS WAS MISSING
            isActive: true,
          },
          { upsert: true, new: true }
        );

        res.json(banner);
      })
      .end(req.file.buffer);

  } catch (error) {
    console.error("Create banner error:", error);
    res.status(500).json({ message: "Failed to save banner" });
  }
};

const getAdminBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ page: "home" });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch banners" });
  }
};
const getHomeBanners = async (req, res) => {
  try {
    const banners = await Banner.find({
      page: "home",
      isActive: true,
    });
   console.log(banners)
    res.json(banners);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch banners" });
  }
};
module.exports={getHomeBanners,getAdminBanners,createBanner}