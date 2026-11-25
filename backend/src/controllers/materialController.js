const path = require("path");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Material = require("../models/Material");
const {
  getFileExtension,
  getFileSizeInMB,
  deleteFile,
} = require("../utils/fileHelper");


// @desc    Upload material
// @route   POST /api/materials/upload
// @access  Private
const uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, subject, semester } = req.body;

    // Validate required fields
    if (!title || !subject || !semester) {
      // Delete uploaded file if validation fails
      deleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and semester are required'
      });
    }

    // Create material record
    const material = await Material.create({
      title,
      subject,
      semester,
      uploaderId: req.user._id,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileType: getFileExtension(req.file.filename),
      fileSize: req.file.size
    });

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully. Waiting for admin approval.',
      data: {
        material: {
          id: material._id,
          title: material.title,
          subject: material.subject,
          semester: material.semester,
          fileName: material.fileName,
          fileType: material.fileType,
          fileSize: getFileSizeInMB(material.fileSize),
          uploadDate: material.uploadDate,
          approved: material.approved
        }
      }
    });
  } catch (error) {
    // Delete uploaded file if database operation fails
    if (req.file) {
      deleteFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading material',
      error: error.message
    });
  }
};

// @desc    Get all approved materials (optionally filter and paginate)
// @route   GET /api/materials
// @access  Public
const getMaterials = async (req, res) => {
  try {
    const hasPage = typeof req.query.page !== 'undefined';
    const hasLimit = typeof req.query.limit !== 'undefined';
    const usePagination = hasPage || hasLimit;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { approved: true };

    // Support text search against title when `search` is provided
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.subject) {
      filter.subject = { $regex: req.query.subject, $options: 'i' };
    }

    if (req.query.semester) {
      // Expecting exact match for semester filtering
      filter.semester = req.query.semester;
    }

    // Build sort object
    let sort = { uploadDate: -1 }; // Default: newest first
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'oldest':
          sort = { uploadDate: 1 };
          break;
        case 'title':
          sort = { title: 1 };
          break;
        case 'subject':
          sort = { subject: 1 };
          break;
        case 'downloads':
          sort = { downloadCount: -1 };
          break;
        case 'rating':
          sort = { averageRating: -1 };
          break;
      }
    }

    // Build query
    let query = Material.find(filter)
      .populate('uploaderId', 'name email')
      .sort(sort);

    if (usePagination) {
      query = query.skip(skip).limit(limit);
    }

    const materials = await query;

    // Total count for pagination meta
    const total = await Material.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      page: usePagination ? page : 1,
      pages: usePagination ? Math.ceil(total / limit) : 1,
      data: materials.map(material => ({
        id: material._id,
        title: material.title,
        subject: material.subject,
        semester: material.semester,
        uploader: {
          id: material.uploaderId?._id,
          name: material.uploaderId?.name
        },
        fileName: material.fileName,
        fileType: material.fileType,
        fileSize: getFileSizeInMB(material.fileSize),
        uploadDate: material.uploadDate,
        downloadCount: material.downloadCount,
        averageRating: material.averageRating,
        totalRatings: material.totalRatings
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching materials',
      error: error.message
    });
  }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Public
const getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('uploaderId', 'name email')
      .populate('approvedBy', 'name');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Only show approved materials to non-admin users
    if (!material.approved && req.user?.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: material._id,
        title: material.title,
        subject: material.subject,
        semester: material.semester,
        uploader: {
          id: material.uploaderId._id,
          name: material.uploaderId.name
        },
        fileName: material.fileName,
        fileType: material.fileType,
        fileSize: getFileSizeInMB(material.fileSize),
        uploadDate: material.uploadDate,
        approved: material.approved,
        approvedBy: material.approvedBy ? {
          id: material.approvedBy._id,
          name: material.approvedBy.name
        } : null,
        approvedAt: material.approvedAt,
        downloadCount: material.downloadCount,
        averageRating: material.averageRating,
        totalRatings: material.totalRatings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching material',
      error: error.message
    });
  }
};

// @desc    Download material
// @route   GET /api/materials/:id/download
// @access  Public
const downloadMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Only allow download of approved materials
    if (!material.approved) {
      return res.status(403).json({
        success: false,
        message: 'Material not approved for download'
      });
    }

    // Check if file exists
    if (!require('fs').existsSync(material.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Increment download count
    await Material.findByIdAndUpdate(req.params.id, {
      $inc: { downloadCount: 1 }
    });

    // Set appropriate headers and send file
    res.setHeader('Content-Disposition', `attachment; filename="${material.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    res.download(material.filePath, material.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading material',
      error: error.message
    });
  }
};

// @desc    Get user's uploaded materials
// @route   GET /api/materials/my-uploads
// @access  Private
const getMyMaterials = async (req, res) => {
  console.log("Fetching materials for user:", req.user.id);
  try {
    const materials = await Material.find({ uploaderId: req.user._id })
      .sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials.map(material => ({
        id: material._id,
        title: material.title,
        subject: material.subject,
        semester: material.semester,
        fileName: material.fileName,
        fileType: material.fileType,
        fileSize: getFileSizeInMB(material.fileSize),
        uploadDate: material.uploadDate,
        approved: material.approved,
        downloadCount: material.downloadCount,
        averageRating: material.averageRating,
        totalRatings: material.totalRatings
      }))
    });
    console.log("Fetched user's materials successfully");
  } catch (error) {
    console.error("Error fetching user's materials:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your materials',
      error: error.message
    });
  }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private (owner only)
const updateMaterial = async (req, res) => {
  try {
    const { title, description, subject, semester } = req.body;
    
    // Find material
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    // Check ownership
    if (material.uploaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this material'
      });
    }
    
    // Update fields
    material.title = title || material.title;
    material.description = description || material.description;
    material.subject = subject || material.subject;
    material.semester = semester || material.semester;
    
    await material.save();
    
    res.status(200).json({
      success: true,
      message: 'Material updated successfully',
      data: {
        id: material._id,
        title: material.title,
        description: material.description,
        subject: material.subject,
        semester: material.semester
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating material',
      error: error.message
    });
  }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private (owner or admin)
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    // Check authorization: owner or admin
    if (
      material.uploaderId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this material'
      });
    }
    
    // Delete the file from filesystem
    deleteFile(material.filePath);
    
    // Delete material from database
    await Material.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting material',
      error: error.message
    });
  }
};

module.exports = {
  uploadMaterial,
  getMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  downloadMaterial,
  getMyMaterials
};
