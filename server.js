const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
// const scheduler = require('./cron/scheduler'); // Will be initialized soon

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'https://instapost-ebon.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Render health checks, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

const Setting = require('./models/Setting');

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/instapost')
  .then(async () => {
    console.log(`✅ MongoDB Atlas connected: ${mongoose.connection.host}`);

    // Sync settings from .env
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        freepikApiKey: process.env.FREEPIK_API_KEY || '',
        imgbbApiKey: process.env.IMGBB_API_KEY || '',
        instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
        instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || ''
      });
      console.log('Initialized settings from .env');
    } else {
      // Update if env vars are present and different
      let updated = false;
      if (process.env.FREEPIK_API_KEY && settings.freepikApiKey !== process.env.FREEPIK_API_KEY) {
        settings.freepikApiKey = process.env.FREEPIK_API_KEY;
        updated = true;
      }
      if (process.env.IMGBB_API_KEY && settings.imgbbApiKey !== process.env.IMGBB_API_KEY) {
        settings.imgbbApiKey = process.env.IMGBB_API_KEY;
        updated = true;
      }
      if (process.env.INSTAGRAM_ACCESS_TOKEN && settings.instagramAccessToken !== process.env.INSTAGRAM_ACCESS_TOKEN) {
        settings.instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        updated = true;
      }
      if (process.env.INSTAGRAM_ACCOUNT_ID && settings.instagramAccountId !== process.env.INSTAGRAM_ACCOUNT_ID) {
        settings.instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
        updated = true;
      }

      if (updated) {
        await settings.save();
        console.log('Synced settings from .env to database');
      }
    }

    // Start scheduler
    require('./cron/scheduler');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
