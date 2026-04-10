export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  // --- 1. CALLBACK HANDLER (Button Clicks) ---
  if (req.body.callback_query) {
    const callback = req.body.callback_query;
    const chatId = callback.message.chat.id;
    const dataParts = callback.data.split(':');
    const action = dataParts[0];

    if (action === 'save') {
      const [, item, price, dayType] = dataParts;
      const finalDate = getFormattedDate(dayType);
      
      await saveToSheets(item, price, finalDate);
      await editMessage(chatId, callback.message.message_id, `✅ *Transaction Synced!*\n\n🛒 *Item:* ${item}\n💰 *Price:* GHS ${price}\n📅 *Date:* ${finalDate}`);
    } 
    else if (action === 'older') {
      const [, item, price] = dataParts;
      await editMessage(chatId, callback.message.message_id, `🗓 *Manual Entry Required*\n\nTo log *${item}* for a specific date, please send the message again in this format:\n\n\`${item} ${price} DD/MM/YY\``);
    }
    return res.status(200).send('OK');
  }

  // --- 2. MESSAGE HANDLER ---
  const message = req.body.message;
  if (!message || !message.text) return res.status(200).send('OK');

  const chatId = message.chat.id;
  const text = message.text.trim();
  const lowerText = text.toLowerCase();

  // --- 3. MODERN WELCOME TEMPLATE ---
  const greetings = ['hi', 'hello', '/start', 'hey'];
  if (greetings.includes(lowerText)) {
    const welcomeMsg = 
      "💎 *SIKATRACKER v2.0* 💎\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Your personal expense engineer. I sync your spending directly to Google Sheets with zero friction.\n\n" +
      "🚀 *Quick Log (Today)*\n" +
      "└ Type: `Item Price` (e.g. `Lunch 25`)\n\n" +
      "📅 *Custom Date*\n" +
      "└ Type: `Item Price Date` (e.g. `Fuel 100 08/04/26`)\n\n" +
      "📊 *Current Sheet:*\n" +
      "[View My Expenses](https://docs.google.com/spreadsheets/d/" + process.env.SPREADSHEET_ID + ")\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "_*What did we spend today?*_";

    await sendMessage(chatId, welcomeMsg);
    return res.status(200).send('OK');
  }

  // --- 4. SMART PARSING ---
  const parts = text.split(' ');
  if (parts.length < 2) {
    await sendMessage(chatId, "⚠️ *Invalid Format*\nUse: `Item Price` or `Item Price DD/MM/YY` ");
    return res.status(200).send('OK');
  }

  // Check if a date was already provided (contains a /)
  if (parts[parts.length - 1].includes('/')) {
    const date = parts.pop();
    const price = parts.pop();
    const item = parts.join(' ');
    await saveToSheets(item, price, date);
    await sendMessage(chatId, `✅ *Saved!*\n🛒 ${item} | 💰 GHS ${price} | 📅 ${date}`);
  } else {
    // Show buttons for Today, Yesterday, or Older
    const price = parts.pop();
    const item = parts.join(' ');
    await sendDateKeyboard(chatId, item, price);
  }

  return res.status(200).send('OK');
}

// --- HELPER FUNCTIONS ---

async function sendDateKeyboard(chatId, item, price) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "📍 Today", callback_data: `save:${item}:${price}:today` },
        { text: "⏳ Yesterday", callback_data: `save:${item}:${price}:yesterday` }
      ],
      [
        { text: "📅 Older Date", callback_data: `older:${item}:${price}` }
      ]
    ]
  };

  await sendMessage(chatId, `Confirming: *${item}* for *₵${price}*.\nWhen did this happen?`, keyboard);
}

function getFormattedDate(type) {
  const date = new Date();
  if (type === 'yesterday') date.setDate(date.getDate() - 1);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    day: '2-digit', month: '2-digit', year: '2-digit'
  }).format(date);
}

async function saveToSheets(item, price, date) {
  await fetch(process.env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, price, date })
  });
}

async function sendMessage(chatId, text, keyboard = null) {
  const body = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
  if (keyboard) body.reply_markup = keyboard;
  
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function editMessage(chatId, msgId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: msgId, text: text, parse_mode: 'Markdown' })
  });
}