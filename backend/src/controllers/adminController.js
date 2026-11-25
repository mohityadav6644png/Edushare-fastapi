const User = require('../models/User');
const Material = require('../models/Material');
const Rating = require('../models/Rating');
const { deleteFile } = require('../utils/fileHelper');
const mongoose = require('mongoose');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = { createdAt: -1 }; // Default: newest first
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'name':
          sort = { name: 1 };
          break;
        case 'email':
          sort = { email: 1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
      }
    }

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's uploads count
    const uploadsCount = await Material.countDocuments({ uploaderId: user._id });
    
    // Get user's approved uploads count
    const approvedUploadsCount = await Material.countDocuments({ 
      uploaderId: user._id, 
      approved: true 
    });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        stats: {
          totalUploads: uploadsCount,
          approvedUploads: approvedUploadsCount,
          pendingUploads: uploadsCount - approvedUploadsCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (user or admin) is required'
      });
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's materials to delete associated files
    const userMaterials = await Material.find({ uploaderId: user._id });
    
    // Delete associated files
    for (const material of userMaterials) {
      deleteFile(material.filePath);
    }

    // Delete user's materials, ratings, and user
    await Material.deleteMany({ uploaderId: user._id });
    await Rating.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// @desc    Approve material
// @route   PUT /api/admin/materials/:id/approve
// @access  Private/Admin
const approveMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    if (material.approved) {
      return res.status(400).json({
        success: false,
        message: 'Material is already approved'
      });
    }

    // Update material
    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      {
        approved: true,
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('uploaderId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Material approved successfully',
      data: {
        id: updatedMaterial._id,
        title: updatedMaterial.title,
        subject: updatedMaterial.subject,
        semester: updatedMaterial.semester,
        uploader: {
          id: updatedMaterial.uploaderId._id,
          name: updatedMaterial.uploaderId.name
        },
        approved: updatedMaterial.approved,
        approvedAt: updatedMaterial.approvedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving material',
      error: error.message
    });
  }
};

// @desc    Delete material
// @route   DELETE /api/admin/materials/:id
// @access  Private/Admin
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Delete associated file
    deleteFile(material.filePath);

    // Delete material and associated ratings
    await Rating.deleteMany({ materialId: material._id });
    await Material.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Material and all associated data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting material',
      error: error.message
    });
  }
};

// @desc    Get admin statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalMaterials = await Material.countDocuments();
    const approvedMaterials = await Material.countDocuments({ approved: true });
    const pendingMaterials = await Material.countDocuments({ approved: false });
    const totalRatings = await Rating.countDocuments();

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const recentMaterials = await Material.countDocuments({ uploadDate: { $gte: sevenDaysAgo } });
    const recentRatings = await Rating.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Get top subjects
    const topSubjects = await Material.aggregate([
      { $match: { approved: true } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get materials by file type
    const materialsByType = await Material.aggregate([
      { $match: { approved: true } },
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalAdmins,
          totalMaterials,
          approvedMaterials,
          pendingMaterials,
          totalRatings
        },
        recentActivity: {
          recentUsers,
          recentMaterials,
          recentRatings,
          period: 'Last 7 days'
        },
        topSubjects: topSubjects.map(item => ({
          subject: item._id,
          count: item.count
        })),
        materialsByType: materialsByType.map(item => ({
          fileType: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// @desc    Get pending materials for approval
// @route   GET /api/admin/materials/pending
// @access  Private/Admin
const getPendingMaterials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { approved: false };
    
    if (req.query.subject) {
      filter.subject = { $regex: req.query.subject, $options: 'i' };
    }
    
    if (req.query.semester) {
      filter.semester = { $regex: req.query.semester, $options: 'i' };
    }

    // Get pending materials with pagination
    const materials = await Material.find(filter)
      .populate('uploaderId', 'name email')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Material.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: materials.map(material => ({
        id: material._id,
        title: material.title,
        subject: material.subject,
        semester: material.semester,
        uploader: {
          id: material.uploaderId._id,
          name: material.uploaderId.name,
          email: material.uploaderId.email
        },
        fileName: material.fileName,
        fileType: material.fileType,
        fileSize: material.fileSize,
        uploadDate: material.uploadDate
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending materials',
      error: error.message
    });
  }
};

// @desc    Get uploads (approved and pending)
// @route   GET /api/admin/uploads
// @access  Private/Admin
const getUploads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status === 'approved') filter.approved = true;
    if (req.query.status === 'pending') filter.approved = false;
    if (req.query.subject) filter.subject = { $regex: req.query.subject, $options: 'i' };
    if (req.query.semester) filter.semester = { $regex: req.query.semester, $options: 'i' };

    const [materials, total] = await Promise.all([
      Material.find(filter)
        .populate('uploaderId', 'name email')
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit),
      Material.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: materials.map(m => ({
        id: m._id,
        title: m.title,
        subject: m.subject,
        semester: m.semester,
        uploader: { id: m.uploaderId._id, name: m.uploaderId.name, email: m.uploaderId.email },
        fileName: m.fileName,
        fileType: m.fileType,
        fileSize: m.fileSize,
        uploadDate: m.uploadDate,
        approved: m.approved,
        approvedAt: m.approvedAt || null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching uploads', error: error.message });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/admin/toggle/:userId
// @access  Private/Admin
const toggleUserBlock = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot block/unblock yourself' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.blocked = !user.blocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.blocked ? 'User blocked' : 'User unblocked',
      data: { id: user._id, name: user.name, email: user.email, role: user.role, blocked: user.blocked }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling user status', error: error.message });
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  approveMaterial,
  deleteMaterial,
  getStats,
  getPendingMaterials,
  getUploads,
  toggleUserBlock
};
