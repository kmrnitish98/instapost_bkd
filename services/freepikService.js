const axios = require('axios');
const FormData = require('form-data');

/**
 * Generates an AI image using Freepik API and returns a public URL via Imgbb.
 * Instagram requires a publicly accessible image_url, so we upload the base64
 * image returned by Freepik to Imgbb to get a usable public link.
 *
 * @param {string} freepikApiKey  - Freepik API key
 * @param {string} imgbbApiKey    - Imgbb API key (free at imgbb.com)
 * @param {string} [prompt]       - Optional custom image prompt
 * @returns {string} Public image URL suitable for Instagram
 */
const generateImage = async (freepikApiKey, imgbbApiKey, prompt) => {
  // ── Step 1: Generate image via Freepik ─────────────────────────────────────
  let base64Image;
  try {
    const imagePrompt = prompt ||
      'AI face with tech theme, futuristic electronic circuits on skin, glowing blue eyes, highly detailed, realistic, cinematic lighting';

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

  // ── Step 2: Upload base64 to Imgbb to get a public URL ────────────────────
  try {
    if (!imgbbApiKey) {
      throw new Error('IMGBB_API_KEY is missing. Add it to your .env file. Get a free key at https://imgbb.com/');
    }

    const form = new FormData();
    form.append('key', imgbbApiKey);
    form.append('image', base64Image);

    const imgbbResponse = await axios.post(
      'https://api.imgbb.com/1/upload',
      form,
      { headers: form.getHeaders() }
    );

    const publicUrl = imgbbResponse.data?.data?.url;
    if (!publicUrl) {
      throw new Error('Imgbb did not return a public URL');
    }

    console.log('Image uploaded to Imgbb:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Imgbb Upload Error:', error.response?.data || error.message);
    throw new Error(`Image Upload Failed: ${error.message}`);
  }
};

module.exports = { generateImage };
