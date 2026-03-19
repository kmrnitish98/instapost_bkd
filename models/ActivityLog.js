const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  instagramPostId: {
    type: String, // Store IG Post ID if success
    default: null
  },
  errorMessage: {
    type: String, // Store exact error message if failed
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
