const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { generateImage } = require('../services/freepikService');
const { postToInstagram } = require('../services/instagramService');

const triggerPost = async (req, res) => {
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

    if (res) {
      // Sirf ek chhota message return karein
      return res.status(200).send("OK"); 
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
