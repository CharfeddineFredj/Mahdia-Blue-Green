const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { uploadFromBuffer, uploadVideoFromBuffer, uploadRawFromBuffer, deleteImage } = require('../config/cloudinary');
const { moderateImage } = require('../utils/moderateContent');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
  const videoTypes = /mp4|mov|avi|webm|mkv/;
  const fileTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|zip|rar|7z/;
  const ext = file.originalname.split('.').pop().toLowerCase();
  const mime = file.mimetype;
  file.fileExt = ext;

  if (imageTypes.test(ext) || mime.startsWith('image/')) {
    file.mediaType = 'image';
    cb(null, true);
  } else if (videoTypes.test(ext) || mime.startsWith('video/')) {
    file.mediaType = 'video';
    cb(null, true);
  } else if (
    fileTypes.test(ext) ||
    mime === 'application/pdf' ||
    mime.includes('officedocument') ||
    mime.startsWith('text/') ||
    mime.includes('zip') ||
    mime === 'application/octet-stream'
  ) {
    file.mediaType = 'file';
    cb(null, true);
  } else {
    cb(new Error('Types autorisés: images, vidéos, pdf/doc/xls/ppt/txt/csv/zip/rar/7z'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier envoyé' });
    }

    const folder = req.body.folder || 'mahdia_bg/articles';
    let result;

    if (req.file.mediaType === 'video' || req.file.mimetype.startsWith('video/')) {
      result = await uploadVideoFromBuffer(req.file.buffer, folder);
      result.type = 'video';
    } else if (req.file.mediaType === 'file') {
      result = await uploadRawFromBuffer(req.file.buffer, folder, req.file.originalname || '');
      result.type = 'file';
    } else {
      result = await uploadFromBuffer(req.file.buffer, folder);
      result.type = 'image';

      const moderation = await moderateImage(result.url);
      if (moderation.blocked) {
        if (result.publicId) {
          try { await deleteImage(result.publicId); } catch (_) {}
        }
        return res.status(403).json({
          success: false,
          moderated: true,
          message: moderation.reason
        });
      }
    }

    result.mimeType = req.file.mimetype || '';
    result.fileExtension = req.file.fileExt ? `.${String(req.file.fileExt).toLowerCase()}` : '';
    result.originalName = req.file.originalname || '';
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de l\'upload' });
  }
});

router.post('/check-image', protect, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL manquante' });
    }
    const result = await moderateImage(url);
    if (result.blocked) {
      return res.status(403).json({ success: false, moderated: true, message: result.reason });
    }
    return res.status(200).json({ success: true, message: 'Image acceptable' });
  } catch (error) {
    console.error('Image check error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la vérification' });
  }
});

module.exports = router;
