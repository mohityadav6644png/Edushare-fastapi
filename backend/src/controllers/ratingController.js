const Rating = require('../models/Rating');
const Material = require('../models/Material');

// @desc    Add or update rating for material
// @route   POST /api/materials/:id/rate OR /api/ratings/:materialId
// @access  Private
const addRating = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const materialId = req.params.materialId || req.params.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if material exists and is approved
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    if (!material.approved) {
      return res.status(403).json({
        success: false,
        message: 'Cannot rate unapproved material'
      });
    }

    // Check if user has already rated this material
    let existingRating = await Rating.findOne({
      userId: req.user.id,
      materialId: materialId
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment || existingRating.comment;
      await existingRating.save();
    } else {
      // Create new rating
      existingRating = await Rating.create({
        userId: req.user.id,
        materialId: materialId,
        rating,
        comment
      });
    }

    // Update material's average rating and total ratings count
    await updateMaterialRating(materialId);

    res.status(200).json({
      success: true,
      message: existingRating.isNew ? 'Rating added successfully' : 'Rating updated successfully',
      data: {
        rating: {
          id: existingRating._id,
          rating: existingRating.rating,
          comment: existingRating.comment,
          createdAt: existingRating.createdAt
        }
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this material'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding rating',
      error: error.message
    });
  }
};

// @desc    Get ratings for a material
// @route   GET /api/materials/:id/ratings OR /api/ratings/:materialId
// @access  Public
const getMaterialRatings = async (req, res) => {
  try {
    const materialId = req.params.materialId || req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if material exists
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Get ratings with pagination
    const ratings = await Rating.find({ materialId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Rating.countDocuments({ materialId });

    res.status(200).json({
      success: true,
      count: ratings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: ratings.map(rating => ({
        id: rating._id,
        rating: rating.rating,
        comment: rating.comment,
        user: {
          id: rating.userId._id,
          name: rating.userId.name
        },
        createdAt: rating.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ratings',
      error: error.message
    });
  }
};

// @desc    Get user's rating for a material
// @route   GET /api/materials/:id/ratings/my-rating OR /api/ratings/:materialId/my-rating
// @access  Private
const getMyRating = async (req, res) => {
  try {
    const materialId = req.params.materialId || req.params.id;

    const rating = await Rating.findOne({
      userId: req.user.id,
      materialId: materialId
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'You have not rated this material'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: rating._id,
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your rating',
      error: error.message
    });
  }
};

// @desc    Delete user's rating
// @route   DELETE /api/materials/:id/ratings OR /api/ratings/:materialId
// @access  Private
const deleteRating = async (req, res) => {
  try {
    const materialId = req.params.materialId || req.params.id;

    const rating = await Rating.findOneAndDelete({
      userId: req.user.id,
      materialId: materialId
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Update material's average rating and total ratings count
    await updateMaterialRating(materialId);

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting rating',
      error: error.message
    });
  }
};

// Helper function to update material's average rating
const updateMaterialRating = async (materialId) => {
  try {
    const ratings = await Rating.find({ materialId });
    
    if (ratings.length === 0) {
      // No ratings, set to 0
      await Material.findByIdAndUpdate(materialId, {
        averageRating: 0,
        totalRatings: 0
      });
    } else {
      // Calculate average rating
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.length;
      
      await Material.findByIdAndUpdate(materialId, {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        totalRatings: ratings.length
      });
    }
  } catch (error) {
    console.error('Error updating material rating:', error);
  }
};

module.exports = {
  addRating,
  getMaterialRatings,
  getMyRating,
  deleteRating
};
