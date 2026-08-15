// Shared chat widget logic. Two independent instances run on the page:
// the floating bubble and the inline "Ask AI" section — each keeps its
// own conversation history and hits the same /api/chat endpoint.

class PortfolioChat {
  constructor({ messagesEl, inputEl, sendBtn, initialFocus = false }) {
    this.messagesEl = messagesEl;
    this.inputEl = inputEl;
    this.sendBtn = sendBtn;
    this.history = [];
    this.busy = false;

    this.sendBtn.addEventListener("click", () => this.send());
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
    this.inputEl.addEventListener("input", () => {
      this.inputEl.style.height = "auto";
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 100) + "px";
    });

    if (initialFocus) this.inputEl.focus();
  }

  addBubble(role, text) {
    const el = document.createElement("div");
    el.className = `chat-msg ${role}`;
    el.textContent = text;
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return el;
  }

  addTyping() {
    const el = document.createElement("div");
    el.className = "chat-msg typing";
    el.textContent = "Thinking…";
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return el;
  }

  async send(textOverride) {
    if (this.busy) return;
    const text = (textOverride ?? this.inputEl.value).trim();
    if (!text) return;

    this.busy = true;
    this.sendBtn.disabled = true;
    this.inputEl.value = "";
    this.inputEl.style.height = "auto";

    this.addBubble("user", text);
    const typingEl = this.addTyping();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: this.history }),
      });

      const data = await res.json().catch(() => ({}));
      typingEl.remove();

      if (!res.ok || !data.reply) {
        this.addBubble("error", data.error || "Something went wrong. Please try again.");
        this.busy = false;
        this.sendBtn.disabled = false;
        return;
      }

      this.addBubble("bot", data.reply);
      this.history.push({ role: "user", content: text });
      this.history.push({ role: "assistant", content: data.reply });
    } catch (err) {
      typingEl.remove();
      this.addBubble("error", "Couldn't reach the assistant. Check your connection and try again.");
    }

    this.busy = false;
    this.sendBtn.disabled = false;
  }
}

// ---------- Floating bubble ----------
const fab = document.getElementById("chatFab");
const panel = document.getElementById("chatPanel");
const closeBtn = document.getElementById("chatClose");

if (fab && panel) {
  const bubbleChat = new PortfolioChat({
    messagesEl: document.getElementById("bubbleMessages"),
    inputEl: document.getElementById("bubbleInput"),
    sendBtn: document.getElementById("bubbleSend"),
  });

  fab.addEventListener("click", () => {
    panel.classList.add("is-open");
    fab.classList.add("is-hidden");
    document.getElementById("bubbleInput").focus();
    dismissChatHint();
  });
  closeBtn.addEventListener("click", () => {
    panel.classList.remove("is-open");
    fab.classList.remove("is-hidden");
  });
}

// ---------- First-visit greeting hint ----------
// Shows once ever (per browser) so a first-time visitor knows the
// floating icon is a chatbot, without having to click it to find out.
const chatHint = document.getElementById("chatHint");
const chatHintClose = document.getElementById("chatHintClose");
const CHAT_HINT_SEEN_KEY = "chatHintSeen";
let chatHintTimers = [];

function dismissChatHint() {
  chatHintTimers.forEach(clearTimeout);
  chatHintTimers = [];
  if (chatHint) chatHint.classList.remove("is-visible");
  if (fab) fab.classList.remove("is-pulsing");
  localStorage.setItem(CHAT_HINT_SEEN_KEY, "1");
}

if (chatHint && fab && !localStorage.getItem(CHAT_HINT_SEEN_KEY)) {
  chatHintTimers.push(
    setTimeout(() => {
      chatHint.classList.add("is-visible");
      fab.classList.add("is-pulsing");
    }, 1500),
    setTimeout(dismissChatHint, 9500) // 1.5s delay + ~8s visible
  );
  if (chatHintClose) chatHintClose.addEventListener("click", dismissChatHint);
}

// ---------- Inline "Ask AI" section ----------
const askMessages = document.getElementById("askMessages");
if (askMessages) {
  const askChat = new PortfolioChat({
    messagesEl: askMessages,
    inputEl: document.getElementById("askInput"),
    sendBtn: document.getElementById("askSend"),
  });

  document.querySelectorAll(".chat-suggestion").forEach((chip) => {
    chip.addEventListener("click", () => askChat.send(chip.dataset.q));
  });
}
