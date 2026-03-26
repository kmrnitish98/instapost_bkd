const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { generateImage } = require('../services/freepikService');
const { postToInstagram } = require('../services/instagramService');

// ── Global lock to prevent duplicate/concurrent posts ──────────────────────
let isPostingInProgress = false;

const triggerPost = async (req, res) => {
  // Prevent concurrent posts — if a post is already being processed, reject new requests
  if (isPostingInProgress) {
    console.warn('⚠️ Post already in progress, rejecting duplicate trigger.');
    if (res && !res.headersSent) {
      return res.status(429).json({ error: 'A post is already being processed. Please wait.' });
    }
    return;
  }

  isPostingInProgress = true;
  let imageUrl = '';
  const caption = 'Artificial Intelligence generated futuristic art 🤖✨ #ArtificialIntelligence #AI #AIRobot #FutureTech #AIArt';

  try {
    // 1. Fetch settings from MongoDB
    const settings = await Setting.findOne();
    if (!settings || !settings.freepikApiKey || !settings.instagramAccessToken || !settings.instagramAccountId) {
      throw new Error('API keys or Account IDs are missing in settings');
    }

    if (!settings.cloudinaryUrl) {
      throw new Error('Cloudinary URL is missing in settings. Please add your Cloudinary Connection URL.');
    }

    // 2. Generate AI Image via Freepik (returns base64) then upload to Cloudinary for a public URL
    imageUrl = await generateImage(settings.freepikApiKey, settings.cloudinaryUrl);

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

    console.log('✅ Post successful! Instagram Post ID:', postId);

    if (res && !res.headersSent) {
      return res.status(200).json({
        message: 'Post published successfully!',
        instagramPostId: postId,
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

    if (res && !res.headersSent) {
      return res.status(500).json({
        error: error.message,
        log
      });
    }
  } finally {
    // Always release the lock when done (success or failure)
    isPostingInProgress = false;
  }
};

module.exports = { triggerPost };
