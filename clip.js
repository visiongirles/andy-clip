import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 3000;

// Replace with your Twitch and Discord credentials
const TWITCH_CLIENT_ID = 'your_client_id';
const TWITCH_CLIENT_SECRET = 'your_client_secret';
const TWITCH_ACCESS_TOKEN = 'your_access_token'; // Get with clips:edit scope
const DISCORD_WEBHOOK_URL = 'your_discord_webhook_url';

// Function to create a Twitch clip
async function createTwitchClip(broadcasterId, title, duration) {
  try {
    // Create the clip
    const clipResponse = await axios.post(
      `https://api.twitch.tv/helix/clips`,
      null,
      {
        headers: {
          'Client-Id': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
        },

        params: { broadcaster_id: broadcasterId, edit_url: title },
      }
    );

    const clipUrl = `https://clips.twitch.tv/${clipResponse.data.data[0].id}`;

    // Post to Discord
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: `New clip created: ${clipUrl}\nTitle: ${title}\nDuration: ${duration}s`,
    });

    return clipUrl;
  } catch (error) {
    console.error(
      'Error creating clip:',
      error.response?.data || error.message
    );
    return null;
  }
}

// Route for Nightbot to call
app.get('/clip', async (req, res) => {
  const { title, duration } = req.query;

  if (!title || !duration) {
    return res.status(400).send('Missing title or duration parameter.');
  }

  const broadcasterId = 'your_broadcaster_id'; // Replace with your Twitch user ID
  const clipUrl = await createTwitchClip(broadcasterId, title, duration);

  if (clipUrl) {
    return res.send(`Clip created: ${clipUrl}`);
  } else {
    return res.send('Failed to create clip.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
