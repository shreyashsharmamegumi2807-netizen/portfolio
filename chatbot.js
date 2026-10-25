// ==========================================
// AI ASSISTANT & WEATHER CHATBOT
// ==========================================
const chatInput = document.getElementById("userInput");
const chatButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.getElementById("chatStatus");

// Temperature for Groq generation
let chatTemperature = 0.6;
const CHATBOT_WEATHER_API_KEY = "5c2c70848a1bcfa13745ed78b08d9a01";

function showChatMessage(role, text) {
  if (!chatMessages) return;

  const message = document.createElement("div");
  message.className = "chat-message " + (role === "user" ? "chat-user" : "chat-assistant");

  // Format message text with line breaks if any
  const formattedText = document.createElement("span");
  formattedText.textContent = text;
  message.appendChild(formattedText);

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Check configuration availability
const isConfigValid = typeof CONFIG !== "undefined" &&
  CONFIG.apiKey &&
  CONFIG.apiKey !== "YOUR_PRIVATE_GROQ_KEY";

if (!isConfigValid && chatStatus) {
  chatStatus.textContent = "AI Chat configuration is in demo mode.";
}

// Extract potential city name from weather inquiries
function extractWeatherCity(text) {
  const normalized = text.trim();
  // Match patterns like "weather in Jaipur", "weather for London", "temperature in Tokyo", "what is the weather in Delhi"
  const patterns = [
    /(?:weather|temperature|forecast|temp|rain|climate)\s+(?:in|at|for|of)\s+([a-zA-Z\s]+?)(?:\?|$|\.|\!)/i,
    /(?:what(?:'s|\s+is)\s+the\s+weather\s+(?:in|at|for|like\s+in)\s+)([a-zA-Z\s]+?)(?:\?|$|\.|\!)/i,
    /(?:how(?:'s|\s+is)\s+the\s+weather\s+(?:in|at|for)\s+)([a-zA-Z\s]+?)(?:\?|$|\.|\!)/i,
    /^([a-zA-Z\s]{2,25})\s+weather\??$/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const city = match[1].trim();
      // Exclude generic non-city words
      if (!["today", "tomorrow", "now", "here", "this week", "the city", "my city", "outside"].includes(city.toLowerCase())) {
        return city;
      }
    }
  }
  return null;
}

// Fetch live weather data for chatbot integration
async function fetchWeatherForChat(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${CHATBOT_WEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn("Chatbot weather fetch error:", err);
    return null;
  }
}

// Portfolio knowledge context for the AI
const PORTFOLIO_SYSTEM_PROMPT = `You are a friendly, knowledgeable AI assistant and Weather Chatbot for Shreyash Sharma's personal portfolio website.

Key Information about Shreyash Sharma:
- Who: BTech Student in Computer Science and Engineering at University of Jaipur, India.
- Email: shryashsharmamegumi2807@gmail.com
- Interests: Web Development and Machine Learning.
- Skills: HTML, CSS, JavaScript, Git, Python.
- Projects:
  1. "Python Programs Collection": Covers data structures, algorithms, and machine learning in Python.
  2. "Messy Python Code Improvement": Corrected messy python code with Cursor AI.
  3. "Bug Fixing Project": Debugged logical errors in Python programs with Cursor AI.
  4. "Interactive Quiz": Quiz application using JavaScript, HTML, and CSS with live score calculation.
  5. "Book Reading List Application": Web application deployed on Vercel to manage reading lists.
- Interactive Features on this page:
  - Live project search & filters (find projects by "Python", "Quiz", "Book", or technologies).
  - Dark & Light mode toggle at the bottom of the interface.
  - Live OpenWeatherMap weather lookup for any city worldwide.
  - This AI Assistant & Weather Chatbot powered by Groq.

Guidelines:
- Answer questions accurately about Shreyash's portfolio, projects, skills, and weather.
- If live weather information is provided in the prompt, report it clearly and pleasantly.
- Keep replies concise, helpful, and under 70 words.
- Maintain a polite, professional, and encouraging tone.`;

async function sendChatMessage() {
  if (!chatInput) return;
  const question = chatInput.value.trim();
  if (!question) return;

  showChatMessage("user", question);
  chatInput.value = "";

  if (chatButton) chatButton.disabled = true;
  if (chatStatus) chatStatus.textContent = "AI is thinking...";

  try {
    // Check if the user is asking about weather
    const potentialCity = extractWeatherCity(question);
    let weatherContext = "";
    let liveWeatherData = null;

    if (potentialCity) {
      if (chatStatus) chatStatus.textContent = `Looking up live weather for ${potentialCity}...`;
      liveWeatherData = await fetchWeatherForChat(potentialCity);
      if (liveWeatherData && liveWeatherData.main) {
        weatherContext = `[REAL-TIME LIVE WEATHER DATA for ${liveWeatherData.name}, ${liveWeatherData.sys?.country || ""}]: Current temperature: ${Math.round(liveWeatherData.main.temp)}°C, feels like: ${Math.round(liveWeatherData.main.feels_like)}°C, condition: ${liveWeatherData.weather[0].description}, humidity: ${liveWeatherData.main.humidity}%, wind speed: ${liveWeatherData.wind.speed} m/s.`;
      }
    }

    // If API config is missing but we have live weather data, provide direct answer
    if (!isConfigValid) {
      if (liveWeatherData) {
        showChatMessage(
          "assistant",
          `🌤️ Live weather in ${liveWeatherData.name}: ${Math.round(liveWeatherData.main.temp)}°C with ${liveWeatherData.weather[0].description}. Humidity is ${liveWeatherData.main.humidity}%, wind speed is ${liveWeatherData.wind.speed} m/s.`
        );
      } else {
        showChatMessage(
          "assistant",
          "I am running in local demo mode. I can answer questions about Shreyash's Python, Quiz, and Book Reading List projects, or provide live weather for cities like Jaipur or London!"
        );
      }
      return;
    }

    const messages = [
      {
        role: "system",
        content: PORTFOLIO_SYSTEM_PROMPT
      }
    ];

    if (weatherContext) {
      messages.push({
        role: "system",
        content: `Current verified live weather data: ${weatherContext}. Please formulate a friendly answer incorporating these real-time weather metrics.`
      });
    }

    messages.push({
      role: "user",
      content: question
    });

    const response = await fetch(
      CONFIG.baseUrl.replace(/\/$/, "") + "/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + CONFIG.apiKey
        },
        body: JSON.stringify({
          model: CONFIG.model,
          temperature: chatTemperature,
          messages: messages
        })
      }
    );

    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }

    if (!response.ok) {
      throw new Error(`API_ERROR_${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      // If LLM returned empty but we have weather data
      if (liveWeatherData) {
        showChatMessage(
          "assistant",
          `🌤️ Live weather in ${liveWeatherData.name}: ${Math.round(liveWeatherData.main.temp)}°C with ${liveWeatherData.weather[0].description}. Humidity is ${liveWeatherData.main.humidity}%.`
        );
      } else {
        throw new Error("INVALID_RESPONSE");
      }
    } else {
      showChatMessage("assistant", answer.trim());
    }

  } catch (error) {
    console.error("Chat error:", error);

    // Fallback: If it was a weather query and we managed to fetch weather before LLM errored
    const potentialCity = extractWeatherCity(question);
    if (potentialCity) {
      try {
        const fallbackWeather = await fetchWeatherForChat(potentialCity);
        if (fallbackWeather) {
          showChatMessage(
            "assistant",
            `🌤️ Live weather in ${fallbackWeather.name}: ${Math.round(fallbackWeather.main.temp)}°C, ${fallbackWeather.weather[0].description}. Humidity is ${fallbackWeather.main.humidity}%, wind speed: ${fallbackWeather.wind.speed} m/s.`
          );
          return;
        }
      } catch (e) {
        // Continue to regular error handlers
      }
    }

    if (error.message === "RATE_LIMIT") {
      showChatMessage("assistant", "⏳ Rate limit reached. Please wait a few seconds and try again.");
    } else if (!navigator.onLine) {
      showChatMessage("assistant", "📡 No internet connection detected. Please check your network.");
    } else {
      showChatMessage("assistant", "🤖 I'm here! Feel free to ask about Shreyash's Python, Quiz, and Reading List projects, or check the weather above.");
    }
  } finally {
    if (chatButton) chatButton.disabled = false;
    if (chatStatus) chatStatus.textContent = "";
  }
}

if (chatButton) {
  chatButton.addEventListener("click", sendChatMessage);
}

if (chatInput) {
  chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChatMessage();
    }
  });
}