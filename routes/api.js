const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { triggerPost } = require('../controllers/postController');
const { getInstagramAccountDetails } = require('../services/instagramService');

// Settings Routes
router.get('/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/verify-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    const data = await getInstagramAccountDetails(token);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { freepikApiKey, cloudinaryUrl, instagramAccessToken, instagramAccountId } = req.body;
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    settings.freepikApiKey = freepikApiKey;
    settings.cloudinaryUrl = cloudinaryUrl;
    settings.instagramAccessToken = instagramAccessToken;
    settings.instagramAccountId = instagramAccountId;
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs & Stats Routes
router.get('/logs', async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const total = await ActivityLog.countDocuments();
    const success = await ActivityLog.countDocuments({ status: 'success' });
    const failed = await ActivityLog.countDocuments({ status: 'failed' });
    res.json({ total, success, failed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger
router.post('/trigger-post', triggerPost);

module.exports = router;
