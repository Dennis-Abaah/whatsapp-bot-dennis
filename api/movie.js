export default async function handler(req, res) {
  // 1. Only accept POST requests from Telegram
  if (req.method !== 'POST') return res.status(200).send('Bot is online');

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TMDB_KEY = process.env.TMDB_KEY;
  const body = req.body;

  // --- HELPER FUNCTION: Clean API Calls ---
  // This makes sending messages to Telegram much cleaner in the code
  const tgRequest = async (method, payload) => {
    return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  // ==========================================
  // BLOCK A: HANDLE BUTTON CLICKS (CALLBACKS)
  // ==========================================
  if (body.callback_query) {
    const callback = body.callback_query;
    const chatId = callback.message.chat.id;
    const data = callback.data;

    // Acknowledge the button click immediately so the loading icon stops
    await tgRequest('answerCallbackQuery', { callback_query_id: callback.id });

    if (data === 'help') {
      await tgRequest('sendMessage', { 
        chat_id: chatId, 
        text: "🔍 *How to search:*\nJust type the name of any movie.\n\n_Example: 'The Matrix' or 'Avengers'_\n\nI will find the official poster, ratings, and links for you!", 
        parse_mode: 'Markdown' 
      });
    }
    return res.status(200).send('OK');
  }

  // ==========================================
  // BLOCK B: HANDLE TEXT MESSAGES
  // ==========================================
  if (!body.message || !body.message.text) return res.status(200).send('OK');

  const chatId = body.message.chat.id;
  const text = body.message.text.trim();
  const lowerText = text.toLowerCase();

  // --- FEATURE: Custom "Hello" Menu Template ---
  const greetings = ['hello', 'hi', '/start', 'menu', 'start'];
  if (greetings.includes(lowerText)) {
    const menuText = "🍿 *Welcome to CinemaBot!*\n\nI am your personal movie assistant. I find high-quality movie details, trailers, and search links instantly.\n\nWhat do you need?";
    
    // Create Interactive Buttons
    const keyboard = {
      inline_keyboard: [
        [{ text: "❓ How to Use the Bot", callback_data: "help" }]
      ]
    };

    await tgRequest('sendMessage', {
      chat_id: chatId,
      text: menuText,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    return res.status(200).send('OK');
  }

  // ==========================================
  // BLOCK C: MOVIE SEARCH LOGIC
  // ==========================================

  try {
    // SPEED FIX: Fire the "typing..." action, but DO NOT await it.
    // This runs in the background while the bot talks to TMDB.
    tgRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

    // 1. Fetch Data from TMDB
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(text)}&include_adult=false`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      await tgRequest('sendMessage', { chat_id: chatId, text: "❌ Sorry, I couldn't find a movie with that name." });
      return res.status(200).send('OK');
    }

    // ACCURACY FIX: Sort the results by popularity. 
    // This ensures the famous blockbuster always beats the obscure indie movie.
    const sortedMovies = data.results.sort((a, b) => b.popularity - a.popularity);
    const movie = sortedMovies[0]; 

    // 2. Format the Details
    const title = movie.title;
    const year = movie.release_date ? movie.release_date.split('-')[0] : "N/A";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
    const overview = movie.overview.length > 250 ? movie.overview.substring(0, 250) + "..." : movie.overview;
    
    const caption = `🎬 *${title}* (${year})\n\n` +
                    `⭐ *Rating:* ${rating}/10\n\n` +
                    `📝 *Plot:* _${overview}_\n\n` +
                    `📥 [Search Download on Telegram](https://t.me/share/url?url=https://t.me/search?q=${encodeURIComponent(title)})\n` +
                    `▶️ [Watch Official Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(title)}+trailer)`;

    // 3. Send the final response
    if (movie.poster_path) {
      const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
      
      // Background action change
      tgRequest('sendChatAction', { chat_id: chatId, action: 'upload_photo' }); 
      
      await tgRequest('sendPhoto', {
        chat_id: chatId,
        photo: posterUrl,
        caption: caption,
        parse_mode: 'Markdown'
      });
    } else {
      await tgRequest('sendMessage', {
        chat_id: chatId,
        text: caption,
        parse_mode: 'Markdown'
      });
    }

  } catch (error) {
    console.error(error);
    await tgRequest('sendMessage', { chat_id: chatId, text: "⚠️ My server is a bit busy right now. Please try again!" });
  }

  return res.status(200).send('OK');
}