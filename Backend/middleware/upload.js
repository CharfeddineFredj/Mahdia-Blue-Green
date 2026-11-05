const multer = require('multer');
const path = require('path');
const { uploadFromBuffer } = require('../config/cloudinary');

// Use memory storage so we can pipe to Cloudinary
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp, svg) are allowed'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Middleware to process single image upload to Cloudinary
const uploadSingle = (fieldName = 'image', folder = 'mahdia_bg') => {
  return [
    upload.single(fieldName),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return next(); // No file uploaded, continue
        }

        const result = await uploadFromBuffer(req.file.buffer, folder);
        req.uploadedImage = result;
        next();
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Image upload failed'
        });
      }
    }
  ];
};

// Middleware to process multiple image uploads to Cloudinary
const uploadMultiple = (fieldName = 'images', maxCount = 5, folder = 'mahdia_bg') => {
  return [
    upload.array(fieldName, maxCount),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return next(); // No files uploaded, continue
        }

        const uploadPromises = req.files.map(file => uploadFromBuffer(file.buffer, folder));
        req.uploadedImages = await Promise.all(uploadPromises);
        next();
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Image upload failed'
        });
      }
    }
  ];
};

// Error handling middleware for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  handleUploadError
};
