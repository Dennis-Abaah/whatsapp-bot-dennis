export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  // --- 1. CALLBACK HANDLER ---
  if (req.body.callback_query) {
    const callback = req.body.callback_query;
    const chatId = callback.message.chat.id;
    const dataParts = callback.data.split(':');
    const action = dataParts[0];

    if (action === 'save') {
      const [, item, price, dayType] = dataParts;
      const finalDate = getFormattedDate(dayType);
      await callAppsScript({ action: 'add', item, price, date: finalDate });
      await editMessage(chatId, callback.message.message_id, `✅ *Synced!*\n🛒 ${item} | 💰 ₵${price} | 📅 ${finalDate}`);
    } 
    else if (action === 'reports') {
      await sendReportsMenu(chatId);
    }
    else if (action === 'view_all') {
      const data = await callAppsScript({ action: 'readAll' });
      await sendMessage(chatId, formatReport("Full Report (Last 10)", data));
    }
    else if (action === 'view_today') {
      const today = getFormattedDate('today');
      const data = await callAppsScript({ action: 'readByDate', date: today });
      await sendMessage(chatId, formatReport(`Report for ${today}`, data));
    }
    return res.status(200).send('OK');
  }

  // --- 2. MESSAGE HANDLER ---
  const message = req.body.message;
  if (!message || !message.text) return res.status(200).send('OK');
  const chatId = message.chat.id;
  const text = message.text.trim();

  // Welcome / Main Menu
  if (['hi', 'hello', '/start'].includes(text.toLowerCase())) {
    const mainMenu = {
      inline_keyboard: [
        [{ text: "📊 View Reports", callback_data: "reports" }],
        [{ text: "🌐 Open Spreadsheet", url: `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}` }]
      ]
    };
    await sendMessage(chatId, "💎 *SIKATRACKER v3.0* 💎\n━━━━━━━━━━━━━━━━━━\nSend an expense (e.g. `Lunch 20`) or use the menu below:", mainMenu);
    return res.status(200).send('OK');
  }

  // Handle Search by Date manually (e.g. "view 10/04/26")
  if (text.toLowerCase().startsWith('view ')) {
    const searchDate = text.split(' ')[1];
    const data = await callAppsScript({ action: 'readByDate', date: searchDate });
    await sendMessage(chatId, formatReport(`Report for ${searchDate}`, data));
    return res.status(200).send('OK');
  }

  // Standard Parsing for adding expenses
  const parts = text.split(' ');
  if (parts.length >= 2) {
    const price = parts.pop();
    const item = parts.join(' ');
    await sendDateKeyboard(chatId, item, price);
  }

  return res.status(200).send('OK');
}

// --- HELPER FUNCTIONS ---

async function sendReportsMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "📝 Last 10 Entries", callback_data: "view_all" }],
      [{ text: "📅 Today's Summary", callback_data: "view_today" }],
      [{ text: "🔍 Search Specific Date", callback_data: "older:SEARCH:0" }] // Re-uses older logic
    ]
  };
  await sendMessage(chatId, "📋 *Select a Report Type:*", keyboard);
}

function formatReport(title, rows) {
  if (!rows || rows.length === 0) return `📂 *${title}*\nNo data found for this selection.`;
  let report = `📂 *${title}*\n━━━━━━━━━━━━━━━━━━\n`;
  let total = 0;
  rows.forEach(row => {
    report += `• ${row[0]}: *₵${row[1]}*\n`;
    total += parseFloat(row[1]);
  });
  report += `━━━━━━━━━━━━━━━━━━\n💰 *Total: ₵${total.toFixed(2)}*`;
  return report;
}

async function callAppsScript(payload) {
  const res = await fetch(process.env.APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

// (Reuse your previous sendDateKeyboard, getFormattedDate, editMessage, and sendMessage functions here)