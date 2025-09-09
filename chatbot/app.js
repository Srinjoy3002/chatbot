const API_URL = "http://127.0.0.1:8000";  // Backend URL

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const stopBtn = document.getElementById("stop-btn");
const imagePreview = document.getElementById("image-preview");

let currentUtterance = null;
let currentFetchController = null;
// -------------------- Helpers --------------------

// Toggle library panel
function toggleLibrary() {
  const lib = document.getElementById("library");
  lib.style.display = lib.style.display === "block" ? "none" : "block";
}

// Load chat history
function loadHistory() {
  let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  const list = document.getElementById("history");
  if (!list) return;

  list.innerHTML = "";
  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.sender === "user" ? "👤" : "🤖"} ${item.text}`;
    list.appendChild(li);
  });
}

// Save chat history
function saveHistory(sender, text) {
  let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  history.push({ sender, text });
  localStorage.setItem("chatHistory", JSON.stringify(history));
  loadHistory();
}

// Format text with line breaks
function formatText(text) {
  return text.replace(/\n/g, "<br>");
}

// Remove emojis
function removeEmojis(text) {
  return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])/g, '');
}

// Detect language for TTS
function detectLanguage(text) {
  // Simple heuristic: non-ASCII = Hindi, else English
  if (/[^\u0000-\u007F]/.test(text)) return 'hi-IN';
  return 'en-IN';
}

// -------------------- UI --------------------

// Add message to chat
function addMessage(sender, text, isBot = false) {
  const msg = document.createElement("div");
  msg.classList.add("message");
  msg.classList.add(isBot ? "bot-msg" : "user-msg");

  if (isBot) {
    msg.innerHTML = `<b>${sender}:</b> ${formatText(text)} 
        <button class="listen-btn">🔊 Hear</button>`;
  } else {
    msg.innerHTML = `<b>${sender}:</b> ${text}`;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  saveHistory(isBot ? "bot" : "user", text);

  // Add event listener for TTS button
  if (isBot) {
    const listenBtn = msg.querySelector(".listen-btn");
    listenBtn.addEventListener("click", () => {
      toggleSpeak(text, listenBtn);
    });
  }
}
function speakText(text) {
  // Remove emojis and special characters
  const cleanText = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = currentLang; // your selected language
  speechSynthesis.speak(utterance);
}

function detectLanguageCode(text) {
  if (/[अ-ह]/.test(text)) return "hi";  // Hindi
  if (/[অ-ঔ]/.test(text)) return "bn";  // Bengali
  if (/[அ-ஹ]/.test(text)) return "ta";  // Tamil
  if (/[ก-๙]/.test(text)) return "th";  // Thai
  if (/[一-龯]/.test(text)) return "zh"; // Chinese
  if (/[а-яА-Я]/.test(text)) return "ru"; // Russian
  if (/[أ-ي]/.test(text)) return "ar"; // Arabic
  return "en"; // default English
}


// -------------------- Chat --------------------

// Send message
async function sendMessage(message) {
  if (!message) {
    message = userInput.value.trim();
    if (!message) return;
    userInput.value = "";
  }
const langCode = detectLanguageCode(message);

const res = await fetch(`${API_URL}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: message, language: langCode }),
  signal: currentFetchController.signal
});

  message = removeEmojis(message);
  addMessage("👨‍🌾 You", message);

  try {
    currentFetchController = new AbortController();
    
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, language: "langCode" }),
      signal: currentFetchController.signal
    });

    const data = await res.json();
    const reply = data.answer;
    addMessage("🤖 Kalpataru", reply, true);
    currentFetchController = null;
  } catch (error) {
    addMessage("🤖 Kalpataru", "⚠️ Error: Cannot connect to server.", true);
  }
}

// -------------------- Voice Input --------------------

if ("webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;

  voiceBtn.addEventListener("click", () => {
    recognition.start();
    voiceBtn.classList.add("listening");
    voiceBtn.innerText = "🎙️";
  });

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage(transcript);
    voiceBtn.classList.remove("listening");
    voiceBtn.innerText = "🎤";
  };

  recognition.onerror = function () {
    voiceBtn.classList.remove("listening");
    voiceBtn.innerText = "🎤";
  };
} else {
  alert("Your browser does not support Speech Recognition");
}

// -------------------- Text-to-Speech --------------------

function toggleSpeak(text, btn) {
  if (speechSynthesis.speaking && currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
    btn.textContent = "🔊 Hear";
  } else {
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = detectLanguage(text); // Automatic language detection
    currentUtterance.onend = () => {
      btn.textContent = "🔊 Hear";
      currentUtterance = null;
    };
    btn.textContent = "⏹ Stop";
    speechSynthesis.speak(currentUtterance);
  }
}

// -------------------- Image Upload --------------------

async function sendImage() {
  const fileInput = document.getElementById("image-upload");
  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  // Show image in chat
  const reader = new FileReader();
  reader.onload = function(e) {
    const imgMsg = document.createElement("div");
    imgMsg.classList.add("message", "user-msg");
    imgMsg.innerHTML = `<b>👨‍🌾 You:</b><br>
      <img src="${e.target.result}" style="max-width:200px; display:block; margin:5px 0;">
      <span style="color:green;">Image uploaded ✅</span>`;
    chatBox.appendChild(imgMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  };
  reader.readAsDataURL(fileInput.files[0]);

  // Send image to backend
  try {
    currentFetchController = new AbortController();
    const response = await fetch(`${API_URL}/diagnose`, {
      method: "POST",
      body: formData,
      signal: currentFetchController.signal
    });

    const data = await response.json();
    addMessage("🤖 Kalpataru", data.disease_report, true);
    currentFetchController = null;
  } catch (error) {
    addMessage("🤖 Kalpataru", "⚠️ Error: Could not process the image.", true);
  }
}

// -------------------- File Upload --------------------

async function sendFile() {
  const fileInput = document.getElementById("file-upload");
  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  addMessage("👨‍🌾 You", `[📂 File uploaded: ${fileInput.files[0].name}]`);

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    addMessage("🤖 Kalpataru", data.message, true);
  } catch (error) {
    addMessage("🤖 Kalpataru", "⚠️ Error: Could not upload the file.", true);
  }
}

// -------------------- UI Events --------------------

// Send button
sendBtn.addEventListener("click", () => {
  sendMessage();
});

// Enter key to send
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Stop button
stopBtn.addEventListener("click", () => {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }

  if (currentFetchController) {
    currentFetchController.abort();
    currentFetchController = null;
  }

  addMessage("🤖 Kalpataru", "⏹ Generation stopped by user.", true);
});

// Load chat history
window.onload = loadHistory;
