export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is active!');
  }

  // Parse Twilio's incoming form data
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = Buffer.concat(buffers).toString();
  const params = new URLSearchParams(data);
  const incomingMsg = (params.get('Body') || '').trim().toLowerCase();
  
  let replyMsg = "";

  // Menu Logic
  if (incomingMsg === "1") {
    replyMsg = "This is GCTU Tech support team.";
  } else if (incomingMsg === "2") {
    replyMsg = "Our Engineering lab is at GCTU Tesano.";
  } else if (incomingMsg === "hi" || incomingMsg === "hello") {
    replyMsg = "Welcome to your Engineering Bot!🚀\nReply with:\n1. Tech Support\n2. Location";
  } else {
    replyMsg = "You typed" + incomingMsg + ". \n Please reply with 1 or 2.";
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMsg}</Message></Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}