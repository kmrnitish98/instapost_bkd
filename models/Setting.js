const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  freepikApiKey: {
    type: String,
    default: ''
  },
  imgbbApiKey: {
    type: String,
    default: ''
  },
  instagramAccessToken: {
    type: String,
    default: ''
  },
  instagramAccountId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
