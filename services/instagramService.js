const axios = require('axios');

// Wait helper
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const postToInstagram = async (accessToken, accountId, imageUrl, caption) => {
  try {
    // Step 0: Small delay to let Imgbb URL "settle" for Facebook's crawler
    console.log('⏳ Waiting 5 seconds for image URL to stabilize...');
    await wait(5000);

    // Step 1: Create Media Container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        image_url: imageUrl,
        caption: caption
      },
      {
        params: {
          access_token: accessToken
        },
        timeout: 30000 // 30s timeout
      }
    );

    const creationId = containerResponse.data.id;
    if (!creationId) {
      throw new Error('Failed to create Instagram media container (no ID in response)');
    }

    console.log(`✅ Media container created: ${creationId}. Waiting for it to be ready...`);

    // Step 1.5: Poll until container status is FINISHED (Instagram requires this)
    const MAX_RETRIES = 10;
    const POLL_INTERVAL_MS = 5000; // 5 seconds between each check
    let status = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      await wait(POLL_INTERVAL_MS);

      const statusResponse = await axios.get(
        `https://graph.facebook.com/v19.0/${creationId}`,
        {
          params: {
            fields: 'status_code',
            access_token: accessToken
          }
        }
      );

      status = statusResponse.data?.status_code;
      console.log(`⏳ Container status check (${attempt}/${MAX_RETRIES}): ${status}`);

      if (status === 'FINISHED') break;
      if (status === 'ERROR') throw new Error('Instagram media container processing failed (status: ERROR)');
    }

    if (status !== 'FINISHED') {
      throw new Error(`Media container not ready after ${MAX_RETRIES} attempts. Last status: ${status}`);
    }

    // Step 2: Publish Media Container (only after FINISHED)
    console.log('🚀 Publishing media container...');
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        creation_id: creationId
      },
      {
        params: {
          access_token: accessToken
        }
      }
    );

    return publishResponse.data.id; // Returns the Instagram Post ID
  } catch (error) {
    console.error('Instagram Service Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    throw new Error(`Instagram Posting Failed: ${errorMessage}`);
  }
};


const getInstagramAccountDetails = async (accessToken) => {
  try {
    // Get basic info about the token and account
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        params: {
          fields: 'id,name',
          access_token: accessToken
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Instagram Info Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Instagram account details');
  }
};

const getInstagramProfileStats = async (accessToken, accountId) => {
  try {
    // Fetch profile info including profile picture, username, followers and media count
    const profileResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${accountId}`,
      {
        params: {
          fields: 'id,username,profile_picture_url,followers_count,media_count',
          access_token: accessToken
        }
      }
    );

    return {
      ...profileResponse.data,
      profile_views: 0 // Returning 0 since insights are disabled
    };
  } catch (error) {
    console.error('Instagram Stats Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Instagram profile stats');
  }
};

module.exports = { postToInstagram, getInstagramAccountDetails, getInstagramProfileStats };
