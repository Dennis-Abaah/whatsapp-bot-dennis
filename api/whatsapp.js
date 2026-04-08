// A simple Menu with prices (in GHS or USD)
const MENU = {
  "1": { name: "Grilled Lobster", price: 250 },
  "2": { name: "Wagyu Beef Burger", price: 180 },
  "3": { name: "Jollof Royale (Seafood)", price: 120 },
  "4": { name: "Truffle Pasta", price: 150 }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Restaurant Bot Active');

  const buffers = [];
  for await (const chunk of req) { buffers.push(chunk); }
  const data = Buffer.concat(buffers).toString();
  const params = new URLSearchParams(data);
  const incomingMsg = (params.get('Body') || '').trim().toLowerCase();
  
  let replyMsg = "";

  // --- PREMIUM INTERFACE LOGIC ---

  if (incomingMsg === "hi" || incomingMsg === "menu") {
    replyMsg = "✨ *WELCOME TO LUMINA DINING* ✨\n\n" +
               "Experience the extraordinary. Please select an option:\n" +
               "1️⃣ *View Signature Menu*\n" +
               "2️⃣ *Make a Reservation*\n" +
               "3️⃣ *Current Promotions*";

  } else if (incomingMsg === "1") {
    replyMsg = "🍽️ *SIGNATURE MENU* 🍽️\n\n" +
               "1. Grilled Lobster - GHS 250\n" +
               "2. Wagyu Beef Burger - GHS 180\n" +
               "3. Jollof Royale - GHS 120\n" +
               "4. Truffle Pasta - GHS 150\n\n" +
               "Reply with *'Order [Number] [Quantity]'*\n" +
               "Example: *Order 1 2* (for 2 Lobsters)";

  } else if (incomingMsg.startsWith("order")) {
    // Basic Parsing: "order 1 2" -> Food #1, Qty 2
    const parts = incomingMsg.split(" ");
    const itemNum = parts[1];
    const qty = parseInt(parts[2]) || 1;

    if (MENU[itemNum]) {
      const item = MENU[itemNum];
      const total = item.price * qty;
      replyMsg = `✅ *ORDER PRE-CONFIRMED*\n\n` +
                 `Item: ${item.name}\n` +
                 `Quantity: ${qty}\n` +
                 `Total: *GHS ${total.toFixed(2)}*\n\n` +
                 `How many seats shall we reserve for you? \n` +
                 `(Reply: *Seats [Number]*)`;
    } else {
      replyMsg = "❌ Invalid selection. Please check the menu and try again.";
    }

  } else if (incomingMsg.startsWith("seats")) {
    const seats = incomingMsg.split(" ")[1];
    replyMsg = `🥂 *RESERVATION FINALIZED*\n\n` +
               `We have reserved a table for *${seats} guests*.\n\n` +
               `*Next Steps:* Our concierge will call you shortly to confirm your arrival time. We look forward to hosting you!`;

  } else {
    replyMsg = "I'm sorry, I didn't catch that. Reply *'Hi'* to see the main menu.";
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMsg}</Message></Response>`;
  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}