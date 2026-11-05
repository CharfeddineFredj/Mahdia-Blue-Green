const Resource = require('../models/Resource');

function inferFileKind(ext = '', mime = '') {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  const m = String(mime || '').toLowerCase();
  if (e === 'pdf' || m.includes('pdf')) return 'pdf';
  if (['doc', 'docx'].includes(e) || m.includes('word')) return 'word';
  if (['xls', 'xlsx'].includes(e) || m.includes('excel') || m.includes('spreadsheet')) return 'excel';
  if (['ppt', 'pptx'].includes(e) || m.includes('powerpoint') || m.includes('presentation')) return 'powerpoint';
  if (['txt', 'csv'].includes(e) || m.startsWith('text/')) return 'text';
  if (['zip', 'rar', '7z'].includes(e) || m.includes('zip') || m.includes('rar') || m.includes('compressed')) return 'archive';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  return 'other';
}

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
exports.getResources = async (req, res) => {
  try {
    const resources = await Resource.find({ isPublic: true })
      .populate('uploadedBy', 'username email')
      .populate('category', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching resources',
      error: error.message
    });
  }
};

// @desc    Get resource by id
// @route   GET /api/resources/:id
// @access  Public
// @desc    Recalculer l'aperçu d'une ressource (lien : image du site ; Word / Excel / CSV : début du texte)
// @route   POST /api/resources/:id/refresh-preview
// @access  Private (admin)
exports.refreshResourcePreview = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const { computeResourcePreview } = require('../utils/resourcePreview');
    const preview = await computeResourcePreview(resource);
    resource.previewImage = preview.previewImage;
    resource.previewText = preview.previewText;
    resource.previewUpdatedAt = new Date();
    await resource.save();
    res.json({ success: true, data: { previewImage: resource.previewImage, previewText: resource.previewText } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur calcul de l’aperçu' });
  }
};

// @desc    Enregistrer un clic (téléchargement ou ouverture) et renvoyer le total
// @route   POST /api/resources/:id/click
// @access  Public
exports.recordResourceClick = async (req, res) => {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, isPublic: true },
      { $inc: { downloadsCount: 1 } },
      { new: true }
    ).select('downloadsCount');
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, downloadsCount: resource.downloadsCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('uploadedBy', 'username email')
      .populate('category', 'title');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching resource',
      error: error.message
    });
  }
};

// @desc    Create resource
// @route   POST /api/resources
// @access  Private/Admin
exports.createResource = async (req, res) => {
  try {
    const { title, type, url, description, category, isPublic, fileExtension, mimeType, originalName } = req.body;
    const normalizedExt = String(fileExtension || '').toLowerCase();
    const normalizedMime = String(mimeType || '').toLowerCase();
    const fileKind = inferFileKind(normalizedExt, normalizedMime);
    const normalizedType = fileKind === 'image'
      ? 'image'
      : fileKind === 'video'
        ? 'video'
        : type === 'link'
          ? 'link'
          : (type === 'document' ? 'document' : 'file');

    const resource = await Resource.create({
      title,
      type: normalizedType,
      url,
      description,
      fileExtension: normalizedExt,
      mimeType: normalizedMime,
      originalName,
      fileKind,
      category,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
      uploadedBy: req.user.id
    });

    // Aperçu (image du site ou début du texte) calculé dès l'envoi
    await require('../utils/resourcePreview').applyResourcePreview(resource);

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating resource',
      error: error.message
    });
  }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private/Admin
exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Fichier ou lien modifié : aperçu recalculé
    if (req.body.url || req.body.type || req.body.fileExtension) {
      await require('../utils/resourcePreview').applyResourcePreview(resource);
    }

    res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating resource',
      error: error.message
    });
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private/Admin
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting resource',
      error: error.message
    });
  }
};
