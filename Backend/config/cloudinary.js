const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadImage = async (filePath, folder = 'mahdia_bg') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Image upload failed');
  }
};

// Upload image from buffer (for multer memoryStorage)
const uploadFromBuffer = (buffer, folder = 'mahdia_bg') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error('Image upload failed'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height
          });
        }
      }
    );
    stream.end(buffer);
  });
};

// Upload video from buffer
const uploadVideoFromBuffer = (buffer, folder = 'mahdia_bg/videos') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        eager: [{ format: 'mp4', quality: 'auto' }],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary video upload error:', error);
          reject(new Error('Video upload failed'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
            format: result.format,
            width: result.width,
            height: result.height
          });
        }
      }
    );
    stream.end(buffer);
  });
};

// Upload generic file (pdf, doc, zip, etc.) from buffer
const uploadRawFromBuffer = (buffer, folder = 'mahdia_bg/files', originalName = '') => {
  return new Promise((resolve, reject) => {
    const parsed = path.parse(originalName || 'file');
    const safeBase = String(parsed.name || 'file')
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80);
    const safeExt = String(parsed.ext || '').toLowerCase();
    const publicId = `${safeBase}-${Date.now()}${safeExt}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        public_id: publicId
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary file upload error:', error);
          reject(new Error('File upload failed'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            storedFileName: `${safeBase}${safeExt}`,
          });
        }
      }
    );
    stream.end(buffer);
  });
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadFromBuffer,
  uploadVideoFromBuffer,
  uploadRawFromBuffer,
  deleteImage
};
