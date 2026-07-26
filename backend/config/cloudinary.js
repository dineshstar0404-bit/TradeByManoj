const cloudinary             = require('cloudinary').v2;
const multer                 = require('multer');
const { CloudinaryStorage }  = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'manoj-traders/bills',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [{ width: 1600, crop: 'limit', quality: 'auto' }],
  },
});

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

module.exports = { cloudinary, upload };
