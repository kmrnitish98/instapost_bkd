const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { generateImage } = require('../services/freepikService');
const { postToInstagram } = require('../services/instagramService');

/**
 * Internal function to perform the actual post generation and upload.
 * This runs in the background when triggered via API.
 */
const performPost = async (settings) => {
  let imageUrl = '';
  const caption = 'Automated AI generated tech art #AI #Tech #Innovation';

  try {
    // 1. Generate AI Image via Freepik (returns base64) then upload to Imgbb for a public URL
    imageUrl = await generateImage(settings.freepikApiKey, settings.imgbbApiKey);

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      throw new Error(`Invalid image URL returned: "${imageUrl}". Instagram requires a public http/https URL.`);
    }

    console.log('✅ Image URL ready for Instagram:', imageUrl);

    // 2. Post to Instagram
    const postId = await postToInstagram(
      settings.instagramAccessToken,
      settings.instagramAccountId,
      imageUrl,
      caption
    );

    // 3. Log success to MongoDB
    await ActivityLog.create({
      imageUrl,
      caption,
      status: 'success',
      instagramPostId: postId
    });

  } catch (error) {
    console.error('❌ Background Posting Flow Error:', error.message);

    // Log failure to MongoDB
    await ActivityLog.create({
      imageUrl: imageUrl || 'N/A',
      caption,
      status: 'failed',
      errorMessage: error.message
    });
  }
};

const triggerPost = async (req, res) => {
  try {
    // 1. Fetch settings from MongoDB
    const settings = await Setting.findOne();
    if (!settings || !settings.freepikApiKey || !settings.instagramAccessToken || !settings.instagramAccountId) {
      throw new Error('API keys or Account IDs are missing in settings');
    }

    if (!settings.imgbbApiKey) {
      throw new Error('IMGBB_API_KEY is missing in settings. Add it to your .env file. Get a free key at https://imgbb.com/');
    }

    // 2. Start the process in the background immediately
    // We don't 'await' this so that we can respond to the request immediately
    performPost(settings).catch(err => {
      console.error('Fatal Background Error:', err);
    });

    // 3. Respond to the request immediately
    // This fixed "output too large" errors on external cron services
    if (res) {
      return res.status(200).json({
        message: 'Post process triggered successfully in the background.',
        status: 'processing'
      });
    }
  } catch (error) {
    console.error('Core Trigger Error:', error.message);

    if (res) {
      return res.status(500).json({
        error: error.message
      });
    }
  }
};

module.exports = { triggerPost };
