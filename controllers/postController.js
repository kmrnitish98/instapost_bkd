const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { generateImage } = require('../services/freepikService');
const { postToInstagram } = require('../services/instagramService');

const triggerPost = async (req, res) => {
  let imageUrl = '';
  const caption = 'Automated AI generated tech art #AI #Tech #Innovation';

  try {
    // 1. Fetch settings from MongoDB
    const settings = await Setting.findOne();
    if (!settings || !settings.freepikApiKey || !settings.instagramAccessToken || !settings.instagramAccountId) {
      throw new Error('API keys or Account IDs are missing in settings');
    }

    if (!settings.imgbbApiKey) {
      throw new Error('IMGBB_API_KEY is missing in settings. Add it to your .env file. Get a free key at https://imgbb.com/');
    }

    // 2. Generate AI Image via Freepik (returns base64) then upload to Imgbb for a public URL
    imageUrl = await generateImage(settings.freepikApiKey, settings.imgbbApiKey);

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      throw new Error(`Invalid image URL returned: "${imageUrl}". Instagram requires a public http/https URL.`);
    }

    console.log('Image URL ready for Instagram:', imageUrl);

    // 3. Post to Instagram
    const postId = await postToInstagram(
      settings.instagramAccessToken,
      settings.instagramAccountId,
      imageUrl,
      caption
    );

    // 4. Log success to MongoDB
    const log = await ActivityLog.create({
      imageUrl,
      caption,
      status: 'success',
      instagramPostId: postId
    });

    if (res) {
      return res.status(200).json({
        message: 'Post successful',
        postId,
        log
      });
    }
  } catch (error) {
    console.error('Core Posting Flow Error:', error.message);

    // Log failure to MongoDB
    const log = await ActivityLog.create({
      imageUrl: imageUrl || 'N/A',
      caption,
      status: 'failed',
      errorMessage: error.message
    });

    if (res) {
      return res.status(500).json({
        error: error.message,
        log
      });
    }
  }
};

module.exports = { triggerPost };
