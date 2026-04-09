const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Bot is active');

  const { message } = req.body;
  if (!message || !message.text) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const query = message.text;

  try {
    // --- STAGE 1: "Typing" ---
    // Make the user feel like the bot is processing their request
    await sendStatus(chatId, 'typing');
    await sleep(1500); 

    // --- STAGE 2: Search TMDB ---
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_KEY}&query=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return sendMessage(chatId, "❌ I couldn't find that movie. Try another title!");
    }

    const movie = searchData.results[0];
    const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    
    // --- STAGE 3: "Uploading Photo" ---
    // Change the status to "sending photo" for realism
    await sendStatus(chatId, 'upload_photo');
    await sleep(2000); 

    // --- STAGE 4: Build the Details ---
    const title = movie.title.toUpperCase();
    const releaseDate = movie.release_date || "N/A";
    const rating = movie.vote_average || "N/A";
    const overview = movie.overview.length > 200 ? movie.overview.substring(0, 200) + "..." : movie.overview;

    const caption = `🎬 *${title}*\n\n` +
      `📅 *Release:* ${releaseDate}\n` +
      `⭐ *Rating:* ${rating}/10\n\n` +
      `📝 *Plot:* _${overview}_\n\n` +
      `📥 [Download / Watch Options](https://www.google.com/search?q=${encodeURIComponent(title)}+download+site:telegram.dog)\n` +
      `▶️ [Official Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(title)}+trailer)`;

    // --- STAGE 5: Final Delivery ---
    await sendPhoto(chatId, posterUrl, caption);

  } catch (error) {
    console.error("Bot Error:", error);
    await sendMessage(chatId, "⚠️ My server is a bit busy. Please try again in a moment.");
  }

  return res.status(200).send('ok');
}

// --- HELPER FUNCTIONS ---

async function sendStatus(chatId, action) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: action })
  });
}

async function sendPhoto(chatId, photo, caption) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photo,
      caption: caption,
      parse_mode: 'Markdown'
    })
  });
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}