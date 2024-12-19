import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const TWITCH_CLIENT_ID = 'your_client_id';
const TWITCH_CLIENT_SECRET = 'your_client_secret';
const TWITCH_ACCESS_TOKEN = 'your_access_token'; // Generate this via the Twitch API
const CALLBACK_URL = 'https://yourserver.com/twitch-eventsub';
const NIGHTBOT_TOKEN = 'your_nightbot_token';
const BROADCASTER_ID = 'your_broadcaster_id'; // Replace with your Twitch User ID

// Function to verify Twitch EventSub requests
function verifyTwitchSignature(req) {
  const messageId = req.header('Twitch-Eventsub-Message-Id');
  const timestamp = req.header('Twitch-Eventsub-Message-Timestamp');
  const body = JSON.stringify(req.body);
  const message = messageId + timestamp + body;
  const hmac = crypto
    .createHmac('sha256', 'your_secret')
    .update(message)
    .digest('hex');
  const expected = `sha256=${hmac}`;
  return req.header('Twitch-Eventsub-Message-Signature') === expected;
}

// Function to subscribe to Twitch EventSub
async function subscribeToEventSub() {
  try {
    const response = await axios.post(
      'https://api.twitch.tv/helix/eventsub/subscriptions',
      {
        type: 'channel.raid',
        version: '1',
        condition: { to_broadcaster_user_id: BROADCASTER_ID },
        transport: {
          method: 'webhook',
          callback: CALLBACK_URL,
          secret: 'your_secret', // Used to verify Twitch messages
        },
      },
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Subscribed to raid events:', response.data);
  } catch (error) {
    console.error(
      'Failed to subscribe to EventSub:',
      error.response?.data || error.message
    );
  }
}

// Function to fetch last played game for the raider
async function fetchLastGame(userId) {
  try {
    const response = await axios.get(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
        },
      }
    );

    return response.data.data[0]?.game_name || 'a mystery game';
  } catch (error) {
    console.error(
      'Failed to fetch game:',
      error.response?.data || error.message
    );
    return 'a mystery game';
  }
}

// Handle incoming Twitch EventSub notifications
app.post('/twitch-eventsub', async (req, res) => {
  // Verify the Twitch message
  if (!verifyTwitchSignature(req)) {
    return res.status(403).send('Invalid signature');
  }

  // Handle EventSub challenge (for verification)
  if (
    req.headers['twitch-eventsub-message-type'] ===
    'webhook_callback_verification'
  ) {
    return res.status(200).send(req.body.challenge);
  }

  // Handle raid event
  if (req.body.subscription.type === 'channel.raid') {
    const { from_broadcaster_user_id, from_broadcaster_user_name, viewers } =
      req.body.event;

    // Fetch the last game the raider was playing
    const lastGame = await fetchLastGame(from_broadcaster_user_id);

    // Send shoutout via Nightbot
    const shoutoutMessage = `/me Shoutout to ${from_broadcaster_user_name}! They raided us with ${viewers} viewers! They were last playing ${lastGame}. Check them out at https://twitch.tv/${from_broadcaster_user_name}`;
    await axios.get(
      `https://api.nightbot.tv/1/channel/send?message=${encodeURIComponent(
        shoutoutMessage
      )}`,
      {
        headers: { Authorization: `Bearer ${NIGHTBOT_TOKEN}` },
      }
    );

    return res.status(200).send('Raid event handled');
  }

  res.status(200).send('Event received');
});

// Start the server and subscribe to EventSub
app.listen(3000, () => {
  console.log('Server running on port 3000');
  subscribeToEventSub();
});
