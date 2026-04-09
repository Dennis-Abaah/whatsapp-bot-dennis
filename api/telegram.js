export default async function handler(req, res) {
  // 1. Only allow POST requests (which Telegram sends)
  if (req.method !== 'POST') {
    return res.status(200).send('Telegram Bot is Active');
  }

  const { message } = req.body;

  // 2. Ignore any updates that aren't text messages
  if (!message || !message.text) {
    return res.status(200).send('No message received');
  }

  const chatId = message.chat.id;
  const incomingText = message.text.toLowerCase();
  let replyText = "";

  // 3. Simple Restaurant Logic (Same as your WhatsApp one!)
  if (incomingText === '/start' || incomingText === 'hi') {
    replyText = "✨ *WELCOME TO LUMINA DINING* ✨\n\nHow can we serve you today?\n1. View Menu\n2. Make a Reservation";
  } else if (incomingText === '1') {
    replyText = "🍽️ *OUR SIGNATURE DISHES*\n- Lobster Royale: GHS 250\n- Wagyu Burger: GHS 180\n\nReply with '2' to book a table.";
  } else {
    replyText = "I didn't quite catch that. Try saying 'Hi' to see the menu.";
  }

  // 4. Send the reply back to Telegram
  const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;

  try {
    await fetch(TELEGRAM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: 'Markdown' // This allows the *bold* and _italic_ text
      })
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }

  return res.status(200).send('OK');
}