export default async function handler(req, res) {
  // 1. Basic Safety Check
  if (req.method !== 'POST') return res.status(200).send('System Live');

  const message = req.body?.message;
  if (!message || !message.text) return res.status(200).send('OK');

  const chatId = message.chat.id;
  const text = message.text.trim();
  const lowerText = text.toLowerCase();

  // ---------------------------------------------------------
  // 2. MODERN WELCOME TEMPLATE
  // ---------------------------------------------------------
  const greetings = ['hi', 'hello', '/start', 'hey'];
  
  if (greetings.includes(lowerText)) {
    const welcomeMsg = 
      "📊 *SikaTracker v1.0* \n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Welcome! I'm your automated expense assistant. I'll help you sync your spending directly to your Google Sheet.\n\n" +
      "💡 *How to log an expense:*\n" +
      "Simply type: `Item Price Date` \n\n" +
      "📍 *Example:*\n" +
      "`Fried Rice 45 10/04/26` \n\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Ready when you are. What did you buy?";

    await sendMessage(chatId, welcomeMsg);
    return res.status(200).send('OK');
  }

  // ---------------------------------------------------------
  // 3. EXPENSE PARSING LOGIC
  // ---------------------------------------------------------
  const parts = text.split(' ');
  
  if (parts.length < 3) {
    await sendMessage(chatId, "⚠️ *Format Error*\nUse: `Item Price Date` \nExample: `Mango 20 10/04/26` ");
    return res.status(200).send('OK');
  }

  // Extract from the end to allow for multi-word items (e.g., "Club Sandwich")
  const date = parts.pop();         
  const price = parts.pop();        
  const item = parts.join(' ');     

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

  try {
    // Fire the "typing..." indicator to feel more "AI"
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, price, date })
    });
    
    await sendMessage(chatId, `✅ *Transaction Synced!*\n\n🛒 *Item:* ${item}\n💰 *Price:* GHS ${price}\n📅 *Date:* ${date}`);
  } catch (err) {
    await sendMessage(chatId, "❌ *Server Error:* Could not reach Google Sheets.");
  }

  return res.status(200).send('OK');
}

// ---------------------------------------------------------
// 4. HELPER FUNCTION
// ---------------------------------------------------------
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: text,
      parse_mode: 'Markdown' // This makes the bolding and mono-font work
    })
  });
}