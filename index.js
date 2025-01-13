import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

const app = express();

// Load the .env file
dotenv.config();

// Replace with your Twitch and Discord credentials
// const TWITCH_CLIENT_ID = 'your_client_id';
// const TWITCH_CLIENT_SECRET = 'your_client_secret';
// const TWITCH_ACCESS_TOKEN = 'your_access_token'; // Get with clips:edit scope
// const DISCORD_WEBHOOK_URL = 'your_discord_webhook_url';

// Function to create a Twitch clip
async function createTwitchClip(broadcasterId, title, duration) {
  try {
    // Create the clip
    const clipResponse = await axios.post(
      `https://api.twitch.tv/helix/clips`,
      null,
      {
        headers: {
          'Client-Id': process.env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
        },

        params: { broadcaster_id: broadcasterId, edit_url: title },
      }
    );

    const clipUrl = `https://clips.twitch.tv/${clipResponse.data.data[0].id}`;

    // Post to Discord
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
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

  const broadcasterId = process.env.BROADCASTER_ID; // Replace with your Twitch user ID
  const clipUrl = await createTwitchClip(broadcasterId, title, duration);

  if (clipUrl) {
    return res.send(`Clip created: ${clipUrl}`);
  } else {
    return res.send('Failed to create clip.');
  }
});

app.listen(process.env.PORT, () => {
  auth();
  console.log(`Server running on port ${process.env.PORT}`);
});

async function auth() {
  try {
    // Define the Twitch API endpoint
    const url = 'https://id.twitch.tv/oauth2/token';

    // Data to send in the POST request
    const data = {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    };

    // Make the POST request
    const response = await axios.post(url, null, {
      params: data, // Send as query parameters
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('response from auth():', response);

    process.env.TWITCH_ACCESS_TOKEN = response.data.access_token;
    // console.log(
    //   'process.env.TWITCH_ACCESS_TOKEN',
    //   process.env.TWITCH_ACCESS_TOKEN
    // );
  } catch (error) {
    console.error(error);
    // res.status(500).json({ error: 'Failed to fetch data from Twitch API' });
  }
  //   express.post('https://id.twitch.tv/oauth2/token', (req, res) =>  {
  //      const params =  {    "client_id" : "hof5gwx0su6owfnys0yan9c87zr6t",
  // "client_secret": "41vpdji4e9gif29md0ouet6fktd2",
  // "grant_type" : "client_credentials"}
  //     res.send(params)

  //   })
  //   const TWITCH_ACCESS_TOKEN =
}
