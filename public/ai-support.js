const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatLog = document.getElementById("chatLog");
const statusPill = document.getElementById("aiStatus");
const clearChat = document.getElementById("clearChat");
const issueTypeSelect = document.getElementById("issueType");
const providerBadge = document.getElementById("providerBadge");
const messageCount = document.getElementById("messageCount");
const sessionState = document.getElementById("sessionState");
const charCount = document.getElementById("charCount");
const copyTranscript = document.getElementById("copyTranscript");
const randomPrompt = document.getElementById("randomPrompt");
const sendBtn = document.getElementById("sendBtn");
const API_BASE = String(window.JEFFYZ_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
const STORAGE_KEY = "jeffyz_ai_support_v3";

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

const starterMessage = {
  role: "assistant",
  content: [
    "## What this looks like",
    "Describe the symptom in plain language and I will turn it into a clear first-pass troubleshooting plan.",
    "",
    "## What to check now",
    "1. Explain the exact issue.",
    "2. Mention when it started.",
    "3. Say what changed recently.",
    "",
    "## Recommended next step",
    "Use one of the quick prompts or describe your own issue directly."
  ].join("\n")
};

let conversation = loadConversation();
let typingBubble = null;

function loadConversation() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (_error) {
    // Ignore parse errors.
  }
  return [starterMessage];
}

function saveConversation() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation.slice(-20)));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineFormatting(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderRichText(content) {
  const lines = String(content || "").split(/\r?\n/);
  let html = "";
  let listType = null;

  function closeList() {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      return;
    }

    if (/^##\s+/.test(line)) {
      closeList();
      html += `<h3>${applyInlineFormatting(line.replace(/^##\s+/, ""))}</h3>`;
      return;
    }

    if (/^###\s+/.test(line)) {
      closeList();
      html += `<h4>${applyInlineFormatting(line.replace(/^###\s+/, ""))}</h4>`;
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html += "<ol>";
      }
      html += `<li>${applyInlineFormatting(line.replace(/^\d+\.\s+/, ""))}</li>`;
      return;
    }

    if (/^[*-]\s+/.test(line)) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html += "<ul>";
      }
      html += `<li>${applyInlineFormatting(line.replace(/^[*-]\s+/, ""))}</li>`;
      return;
    }

    closeList();
    html += `<p>${applyInlineFormatting(line)}</p>`;
  });

  closeList();
  return html || `<p>${applyInlineFormatting(content)}</p>`;
}

function createMetaLabel(role) {
  return role === "user" ? "You" : "Jeffyz AI";
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function addMessage(role, content, options = {}) {
  const message = document.createElement("article");
  message.className = `message ${role} message-card`;

  const header = document.createElement("div");
  header.className = "message-header";

  const roleLabel = document.createElement("div");
  roleLabel.className = "message-role";
  roleLabel.textContent = createMetaLabel(role);

  const timestamp = document.createElement("span");
  timestamp.className = "message-time";
  timestamp.textContent = formatTime(new Date());

  header.appendChild(roleLabel);
  header.appendChild(timestamp);

  const body = document.createElement("div");
  body.className = "message-body rich-body";
  body.innerHTML = role === "assistant" ? renderRichText(content) : `<p>${applyInlineFormatting(content)}</p>`;

  message.appendChild(header);
  message.appendChild(body);

  if (options.typing) {
    message.dataset.typing = "true";
  }

  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
  updateSessionMetrics();
  return message;
}

function renderConversation() {
  chatLog.innerHTML = "";
  conversation.forEach((item) => addMessage(item.role, item.content));
  updateSessionMetrics();
}

function setStatus(text, busy = false, error = false) {
  statusPill.textContent = text;
  statusPill.classList.toggle("busy", busy);
  statusPill.classList.toggle("error", error);
  statusPill.classList.toggle("live", !busy && !error);
  sessionState.textContent = text;
}

function updateSessionMetrics() {
  messageCount.textContent = String(conversation.length);
}

function setComposerState(disabled) {
  chatInput.disabled = disabled;
  sendBtn.disabled = disabled;
  issueTypeSelect.disabled = disabled;
}

function showTypingBubble() {
  hideTypingBubble();
  typingBubble = addMessage("assistant", "Thinking through the best next steps…", { typing: true });
  typingBubble.querySelector(".rich-body").innerHTML = `
    <div class="typing-row" aria-label="Assistant is typing">
      <span></span><span></span><span></span>
    </div>
  `;
}

function hideTypingBubble() {
  if (typingBubble) {
    typingBubble.remove();
    typingBubble = null;
  }
}

function getRecentHistory() {
  return conversation.slice(-8);
}

async function syncHealth() {
  try {
    const response = await fetch(apiUrl("/api/health"));
    if (!response.ok) throw new Error("Health check failed");
    const data = await response.json();
    providerBadge.textContent = data.aiProvider ? "Assistant online" : "Assistant ready";
  } catch (_error) {
    providerBadge.textContent = "Connection unavailable";
  }
}

async function sendMessage(message) {
  setStatus("Thinking…", true, false);
  setComposerState(true);
  showTypingBubble();

  try {
    const response = await fetch(apiUrl("/api/ai-support"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        history: getRecentHistory(),
        issueType: issueTypeSelect.value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || data.error || "AI support request failed.");
    }

    hideTypingBubble();

    const reply = data.reply || "I could not generate a response.";
    conversation.push({ role: "assistant", content: reply });
    addMessage("assistant", reply);
    saveConversation();

    if (data.issueType) {
      issueTypeSelect.value = data.issueType;
    }

    providerBadge.textContent = "Assistant online";
    setStatus(data.provider ? `Ready • ${data.provider}` : "Ready");
  } catch (error) {
    hideTypingBubble();
    const fallback = /Failed to fetch/.test(error.message)
      ? "Unable to reach the AI backend. If the frontend and backend are hosted separately, set your backend URL in site-config.js."
      : (error.message || "Something went wrong while contacting AI support.");
    conversation.push({ role: "assistant", content: fallback });
    addMessage("assistant", fallback);
    saveConversation();
    setStatus("Error", false, true);
  } finally {
    setComposerState(false);
    chatInput.focus();
  }
}

function submitPrompt(prompt) {
  const message = String(prompt || "").trim();
  if (!message) return;

  conversation.push({ role: "user", content: message });
  addMessage("user", message);
  saveConversation();
  chatInput.value = "";
  updateCharCount();
  sendMessage(message);
}

function updateCharCount() {
  charCount.textContent = `${chatInput.value.length} / 1600`;
}

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitPrompt(chatInput.value);
});

chatInput?.addEventListener("input", updateCharCount);
chatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitPrompt(chatInput.value);
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => submitPrompt(button.dataset.prompt || ""));
});

randomPrompt?.addEventListener("click", () => {
  const prompts = Array.from(document.querySelectorAll("[data-prompt]"));
  if (!prompts.length) return;
  const choice = prompts[Math.floor(Math.random() * prompts.length)];
  const prompt = choice.dataset.prompt || "";
  chatInput.value = prompt;
  updateCharCount();
  chatInput.focus();
});

copyTranscript?.addEventListener("click", async () => {
  const plainText = conversation
    .map((item) => `${item.role === "user" ? "You" : "Jeffyz AI"}:\n${item.content}`)
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(plainText);
    copyTranscript.textContent = "Copied";
    setTimeout(() => {
      copyTranscript.textContent = "Copy transcript";
    }, 1400);
  } catch (_error) {
    copyTranscript.textContent = "Copy failed";
    setTimeout(() => {
      copyTranscript.textContent = "Copy transcript";
    }, 1400);
  }
});

clearChat?.addEventListener("click", () => {
  conversation = [starterMessage];
  saveConversation();
  renderConversation();
  setStatus("Ready");
  issueTypeSelect.value = "general";
  chatInput.value = "";
  updateCharCount();
});

renderConversation();
updateCharCount();
syncHealth();
setStatus("Ready");
