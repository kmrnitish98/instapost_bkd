const axios = require('axios');

const postToInstagram = async (accessToken, accountId, imageUrl, caption) => {
  try {
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
        }
      }
    );

    const creationId = containerResponse.data.id;
    if (!creationId) {
      throw new Error('Failed to create Instagram media container');
    }

    // Step 2: Publish Media Container
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

module.exports = { postToInstagram, getInstagramAccountDetails };
