export default async function handler(req, res) {
  // 1. Only process POST requests
  if (req.method !== 'POST') return res.status(200).send('Bot Online');

  const message = req.body?.message;
  if (!message || !message.text) return res.status(200).send('OK');

  const chatId = message.chat.id;
  const text = message.text.trim();

  // 2. Parse the input (e.g., "Fried Rice 50 01/10/25")
  const parts = text.split(' ');
  
  if (parts.length < 3) {
    await sendMessage(chatId, "❌ Format error. Please use: Item Price Date\n_Example: Mango 50 01/10/25_");
    return res.status(200).send('OK');
  }

  // Extract from the end to allow multi-word items
  const date = parts.pop();         // Gets the last part (01/10/25)
  const price = parts.pop();        // Gets the second to last part (50)
  const item = parts.join(' ');     // Joins whatever is left (Mango, or Fried Rice)

  // 3. Send to Google Apps Script
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; // Add your Web App URL to Vercel env variables

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, price, date })
    });
    
    // 4. Confirm to user
    await sendMessage(chatId, `✅ Saved to Sheets!\n🛒 *Item:* ${item}\n💰 *Price:* GHS ${price}\n📅 *Date:* ${date}`);
  } catch (err) {
    console.error(err);
    await sendMessage(chatId, "⚠️ Could not connect to Google Sheets.");
  }

  return res.status(200).send('OK');
}

// Helper function to send Telegram messages
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: text,
      parse_mode: 'Markdown'
    })
  });
}