require("dotenv").config({ path: ".env" });

const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const QRCode = require("qrcode");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Ensure .env variables are loaded
console.log("Cloudinary Config:", process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Setup (Allow Multiple Files)
const upload = multer({ dest: "uploads/" });

// Read existing file data (if exists)
const loadUploads = () => {
  try {
    return JSON.parse(fs.readFileSync("uploads.json"));
  } catch (err) {
    return [];
  }
};

// Upload Multiple Files
app.post("/upload", upload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded!" });
    }

    // Get selected expiry time from user input
    const selectedExpiry = req.body.expiry ? parseInt(req.body.expiry) : 86400; // Default to 1 day

    let uploads = loadUploads();
    if (!Array.isArray(uploads)) uploads = []; // Ensure uploads is an array

    const now = Date.now();
    const expiryTime = now + selectedExpiry * 1000; // Convert seconds to milliseconds

    let uploadedFiles = [];

    for (const file of req.files) {
      const fileExtension = file.originalname.split(".").pop().toLowerCase();
      const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"].includes(fileExtension);
      
      // Use "raw" for non-image files to prevent access issues
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: isImage ? "image" : "raw",
        public_id: file.originalname.split(".")[0],
        invalidate: true,
      });

      console.log("Cloudinary Upload Response:", result); // Debug log

      const qrCode = await QRCode.toDataURL(result.secure_url);
      const fileData = {
        fileName: file.originalname,
        url: result.secure_url,
        qrCode,
        expiresAt: expiryTime, // Store user-selected expiry time
      };

      uploads.push(fileData);
      uploadedFiles.push(fileData);

      // Delete local file after upload
      fs.unlinkSync(file.path);
    }

    fs.writeFileSync("uploads.json", JSON.stringify(uploads, null, 2));
    res.json({ uploads: uploadedFiles });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "File upload failed!" });
  }
});

// Route to get all uploaded files
app.get("/uploads", (req, res) => {
  try {
    const uploads = JSON.parse(fs.readFileSync("uploads.json"));
    res.json({ uploads });
  } catch (err) {
    res.json({ uploads: [] });
  }
});

// Delete uploaded file
app.delete("/delete/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    // Delete file from Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });

    // Load existing uploads and remove the deleted file
    let uploads = loadUploads();
    uploads = uploads.filter(file => file.fileName.split(".")[0] !== publicId);

    // Save updated uploads list
    fs.writeFileSync("uploads.json", JSON.stringify(uploads, null, 2));

    res.json({ success: true, message: "File deleted successfully!" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "File deletion failed!" });
  }
});

// Serve Static Files (Frontend)
app.use(express.static("public"));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
