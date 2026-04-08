const twilio = require('twilio');

// These will be pulled safely from Vercel Environment Variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Bot Active');

  const buffers = [];
  for await (const chunk of req) { buffers.push(chunk); }
  const data = Buffer.concat(buffers).toString();
  const params = new URLSearchParams(data);
  
  const incomingMsg = (params.get('Body') || '').trim().toLowerCase();
  const fromNumber = params.get('From'); // The user's WhatsApp number

  if (incomingMsg === 'hi' || incomingMsg === 'hello') {
    try {
      // This sends the Premium Template with buttons
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: fromNumber,
        contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // Your Template ID
        contentVariables: JSON.stringify({ "1": "Lumina Dining", "2": "Accra" })
      });

      // We send an empty 200 OK so Twilio knows we handled the API call
      return res.status(200).send('<Response></Response>');
      
    } catch (error) {
      console.error("Twilio Error:", error);
      return res.status(500).send('Error sending template');
    }
  }

  // Fallback for other messages
  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send('<Response><Message>Type "Hi" to see our reservation menu!</Message></Response>');
}