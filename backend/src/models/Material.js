const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [50, 'Subject cannot be more than 50 characters']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true,
    maxlength: [20, 'Semester cannot be more than 20 characters']
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  }
});

// Index for better query performance
materialSchema.index({ subject: 1, semester: 1 });
materialSchema.index({ uploaderId: 1 });
materialSchema.index({ approved: 1 });
materialSchema.index({ uploadDate: -1 });

module.exports = mongoose.model('Material', materialSchema);
