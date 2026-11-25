const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one rating per user per material
ratingSchema.index({ userId: 1, materialId: 1 }, { unique: true });

// Index for better query performance
ratingSchema.index({ materialId: 1 });
ratingSchema.index({ userId: 1 });
ratingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
