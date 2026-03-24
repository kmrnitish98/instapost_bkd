const axios = require('axios');
const cloudinary = require('cloudinary').v2;

/**
 * Generates an AI image using Freepik API and returns a public URL via Cloudinary.
 * Instagram requires a publicly accessible image_url, so we upload the base64
 * image returned by Freepik to Cloudinary to get a usable public link.
 *
 * @param {string} freepikApiKey     - Freepik API key
 * @param {string} cloudinaryUrl     - Cloudinary connection URL (e.g., cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
 * @param {string} [prompt]          - Optional custom image prompt
 * @returns {string} Public image URL suitable for Instagram
 */
// ── Randomized Prompt System ────────────────────────────────────────────────
// Large pool of diverse themes — completely different subjects each time
const PROMPT_THEMES = [
  // Artificial Intelligence Core & Networks
  'a glowing artificial intelligence brain processing data, futuristic neural network, blue holographic light',
  'a hyper-realistic cyborg face with glowing circuits, cinematic studio lighting, detailed',
  'a sleek AI robot assistant in a futuristic laboratory, neon lights, 8k resolution',
  'an abstract representation of artificial intelligence learning, flowing data streams, cyberpunk style',
  'a microscopic view of a quantum computer chip, glowing gold and blue energy lines, artificial intelligence',
  
  // Future Robotics & Cyborgs
  'a futuristic robot reading a holographic book, highly detailed, neon pink and turquoise',
  'an AI android meditating, floating glowing geometric shapes, peaceful sci-fi atmosphere',
  'a high-tech mechanical humanoid examining a glowing orb of light, concept art, masterpiece',
  'a mechanical cyborg repairing its own arm, futuristic workshop, glowing sparks, hyper detailed',
  
  // AI in Environments
  'a giant AI supercomputer core glowing in a vast dark room, lasers and data streams',
  'a person plugged into a futuristic AI virtual reality matrix, glowing cables, neon green data',
  'a cyborg hacker with glowing augmented reality glasses, highly detailed face portrait, dark cyberpunk',
  'a beautiful AI goddess composed of fiber optic strings, ethereal light, perfect face',
  'a futuristic robotic eye focusing, macro lens, glowing blue iris with digital code'
];

// Style modifiers mixed in randomly for extra variation
const ART_STYLES = [
  'photorealistic, 8K, ultra detailed',
  'cinematic concept art, trending on ArtStation',
  'oil painting style, impressionist',
  'digital art, vibrant colors, hyperdetailed',
  'unreal engine render, ray tracing, perfect lighting',
];

const MOODS = [
  'dramatic lighting', 'golden hour', 'moody dark atmosphere',
  'ethereal glow', 'high contrast', 'soft diffused light',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getRandomPrompt = () => {
  const theme = pick(PROMPT_THEMES);
  const style = pick(ART_STYLES);
  const mood  = pick(MOODS);
  return `${theme}, ${mood}, ${style}`;
};
// ─────────────────────────────────────────────────────────────────────────────

const generateImage = async (freepikApiKey, cloudinaryUrl, prompt) => {
  // ── Step 1: Generate image via Freepik ─────────────────────────────────────
  let base64Image;
  try {
    const imagePrompt = prompt || getRandomPrompt();
    console.log('🎨 Image prompt:', imagePrompt);

    const response = await axios.post(
      'https://api.freepik.com/v1/ai/text-to-image',
      {
        prompt: imagePrompt,
        negative_prompt: 'blurry, low quality, distorted, watermark',
        num_images: 1,
        image: { size: 'square_1_1' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-freepik-api-key': freepikApiKey
        }
      }
    );

    // Freepik returns base64 in response.data.data[0].base64
    const imageData = response.data?.data?.[0];
    if (!imageData) {
      throw new Error('No image data returned from Freepik API');
    }

    // Support both 'base64' and 'url' fields defensively
    if (imageData.base64) {
      base64Image = imageData.base64;
    } else if (imageData.url) {
      // If Freepik ever returns a public URL directly, use it as-is
      console.log('Freepik returned a direct URL, using it directly.');
      return imageData.url;
    } else {
      throw new Error('Freepik API response contained neither base64 nor url');
    }
  } catch (error) {
    console.error('Freepik Service Error:', error.response?.data || error.message);
    throw new Error(`Freepik Image Generation Failed: ${error.message}`);
  }

  // ── Step 2: Upload base64 to Cloudinary to get a public URL ────────────────────
  try {
    if (!cloudinaryUrl) {
      throw new Error('CLOUDINARY_URL is missing. Add it to your .env file.');
    }

    // Configure cloudinary with the URL
    // We don't want to rely on the global environment variable directly since it's passed as an argument.
    // However, cloudinary.v2.uploader.upload does not directly accept the connection string.
    // We use cloudinary.config() to set it.
    cloudinary.config(cloudinaryUrl);

    // Cloudinary expects the base64 string to include the data URI scheme
    const base64DataUri = `data:image/jpeg;base64,${base64Image}`;

    const uploadResult = await cloudinary.uploader.upload(base64DataUri, {
      folder: 'instapost',
    });

    const publicUrl = uploadResult.secure_url;

    console.log('✅ Image uploaded to Cloudinary:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error.message || error);
    throw new Error(`Image Upload Failed: ${error.message}`);
  }
};

module.exports = { generateImage };
