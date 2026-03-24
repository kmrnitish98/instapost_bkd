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
  // Sci-fi / Cyberpunk
  'a cyberpunk samurai warrior in neon-lit Tokyo alleyway, rain reflections, katana glowing',
  'a futuristic astronaut floating in deep space, nebula colors, helmet visor reflection, hyper realistic',
  'a robot mechanic repairing a starship engine, industrial sci-fi workshop, sparks flying',
  'a holographic city skyline at night, flying cars, neon signs, rain',
  'a glowing alien marketplace with exotic creatures, bioluminescent lanterns, epic scale',

  // Fantasy / Magic
  'a powerful dragon perched on a crystal castle, lightning storm, fantasy epic, ultra detailed',
  'an ancient wizard casting a spell in a glowing forest, magical runes, fireflies, mystical',
  'a fairy tale princess with shimmering butterfly wings in an enchanted garden, bokeh',
  'a dark sorceress summoning spirits from a void portal, dramatic lighting, fantasy art',
  'an underwater mermaid kingdom with glowing coral and ancient ruins, ethereal blue light',

  // Nature / Landscapes
  'a breathtaking mountain landscape at golden hour, reflection lake, cinematic, 8K',
  'a massive waterfall in a lush tropical rainforest, misty light rays, epic scale',
  'a lone wolf howling on a cliff under the northern lights, aurora borealis, ultra detailed',
  'a field of glowing purple flowers under a starry night sky, milky way, dreamlike',
  'a giant ancient tree in autumn forest, sunbeams through orange leaves, detailed bark',

  // Futuristic Characters (diverse — not same face)
  'a male cyborg warrior with golden armor in a desert wasteland, dramatic pose, 4K',
  'an elegant AI android woman with silver hair and galaxy eyes, studio lighting, fashion portrait',
  'a young dark-skinned male technomancer with glowing tattoos, urban future city background',
  'an old wise alien philosopher meditating, wrinkled blue skin, floating crystals',
  'a female knight in glowing white armor, ethereal wings, holy light, ultra HD',

  // Abstract / Artistic
  'an abstract explosion of colorful fractals and geometric shapes, psychedelic digital art',
  'a surreal dreamscape with floating islands and upside-down waterfalls, Salvador Dali style',
  'a vaporwave aesthetic city at sunset, pink and purple tones, retro neon glow',
  'intricate mandala art with golden sacred geometry, cosmic background, ultra detailed',
  'a liquid metal sculpture morphing into organic shapes, studio light, macro photography',

  // Animals
  'a majestic lion with a galaxy mane, constellation stars in fur, cosmic portrait, 4K',
  'a white tiger leaping through cherry blossoms, Japan mountain background, cinematic',
  'a glowing phoenix rising from golden flames, feather detail, mythological, epic',
  'a giant mechanical elephant in a futuristic city, steampunk style, intricate gears',
  'an owl with universe galaxy eyes, perched on ancient ruins at night, magical realism',
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
