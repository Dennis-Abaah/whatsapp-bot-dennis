export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('System Live');

  const message = req.body?.message;
  if (!message || !message.text) return res.status(200).send('OK');

  const chatId = message.chat.id;
  const text = message.text.trim();
  const lowerText = text.toLowerCase();

  // 1. Welcome Message
  const greetings = ['hi', 'hello', '/start', 'hey'];
  if (greetings.includes(lowerText)) {
    const welcomeMsg = 
      "📊 *SikaTracker v1.1* \n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Fast Logging enabled! 🚀\n\n" +
      "✅ *Today's Expense:* `Item Price` \n" +
      "_(e.g. Gob3 15)_\n\n" +
      "📅 *Past Expense:* `Item Price Date` \n" +
      "━━━━━━━━━━━━━━━━━━";
    await sendMessage(chatId, welcomeMsg);
    return res.status(200).send('OK');
  }

  // 2. SMART PARSING LOGIC
  const parts = text.split(' ');

  if (parts.length < 2) {
    await sendMessage(chatId, "⚠️ Please enter at least `Item` and `Price`.");
    return res.status(200).send('OK');
  }

  let item, price, date;

  // Check if the last part looks like a date (contains a slash /)
  const lastPart = parts[parts.length - 1];
  const isDateProvided = lastPart.includes('/');

  if (isDateProvided) {
    date = parts.pop();         // Use provided date
    price = parts.pop();        // Second to last is price
    item = parts.join(' ');     // Everything else is item
  } else {
    // AUTO-DATE LOGIC: Get Ghana Time (GMT)
    const now = new Date();
    const ghanaTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Accra',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(now);
    
    date = ghanaTime;           // Use today's date automatically
    price = parts.pop();        // Last part is price
    item = parts.join(' ');     // Everything else is item
  }

  // 3. SEND TO GOOGLE SHEETS
  try {
    await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, price, date })
    });
    
    await sendMessage(chatId, `✅ *Saved!*\n🛒 ${item}\n💰 GHS ${price}\n📅 ${date}`);
  } catch (err) {
    await sendMessage(chatId, "❌ Error reaching Sheets.");
  }

  return res.status(200).send('OK');
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}