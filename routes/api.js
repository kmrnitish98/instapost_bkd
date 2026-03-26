const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { triggerPost } = require('../controllers/postController');
const { getInstagramAccountDetails, getInstagramProfileStats } = require('../services/instagramService');

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

// Weekly activity data for the chart (last 7 days, grouped by day)
router.get('/weekly-stats', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today = 7 days
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Aggregate logs by day
    const pipeline = [
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const results = await ActivityLog.aggregate(pipeline);

    // Build a full 7-day array (fill in days with no activity as 0)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i)); // from 6 days ago to today
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = dayNames[date.getDay()];

      const found = results.find(r => r._id === dateStr);
      weeklyData.push({
        name: dayName,
        date: dateStr,
        total: found ? found.total : 0,
        success: found ? found.success : 0,
        failed: found ? found.failed : 0
      });
    }

    res.json(weeklyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/instagram-stats', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    const accessToken = settings?.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = settings?.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
    
    if (!accessToken || !accountId) {
      return res.status(400).json({ error: 'Instagram credentials completely missing' });
    }
    
    const data = await getInstagramProfileStats(accessToken, accountId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger
router.post('/trigger-post', triggerPost);

// External trigger via cron-job.org
router.get('/cron/trigger-post', async (req, res) => {
  const secret = req.query.secret || req.headers.authorization?.replace('Bearer ', '');
  const validSecret = process.env.CRON_SECRET;

  if (!validSecret) {
    console.error('Missing CRON_SECRET in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration: CRON_SECRET missing' });
  }

  if (secret !== validSecret) {
    console.warn(`Unauthorized cron attempt with secret: ${secret}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid secret key' });
  }

  console.log('🚀 Running Instagram post triggered by external cron...');
  await triggerPost(req, res);
});

module.exports = router;
