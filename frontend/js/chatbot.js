/**
 * chatbot.js
 * TruyenHay AI Assistant — powered by Google Gemini
 */

(function initChatbot() {
  // ============ HTML Widget ============
  const widgetHTML = `
    <div class="speed-dial" id="speed-dial">
      <div class="sd-menu" id="sd-menu">
        <button class="sd-btn" title="Lên đầu trang" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </button>
        <button class="sd-btn" title="Trang chủ" onclick="window.location.hash='#home'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>
        <button class="sd-btn" title="Chatbot AI" onclick="toggleChatbot()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </button>
      </div>

      <button class="sd-main-btn" id="sd-main-btn" onclick="toggleSpeedDial()" title="Tùy chọn">
        <svg id="sd-icon-main" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1b1407" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <svg id="sd-icon-close" style="display:none;" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1b1407" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span class="chatbot-badge" id="chatbot-badge">1</span>
      </button>
    </div>


    <div class="chatbot-window" id="chatbot-window">
      <div class="chat-header">
        <div class="chat-header-av">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b1407" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <div class="chat-header-info">
          <div class="chat-header-name">TruyenHay AI</div>
          <div class="chat-header-status">Đang hoạt động</div>
        </div>
        <button class="chat-close-btn" onclick="toggleChatbot()">✕</button>
      </div>

      <div class="chat-suggestions" id="chat-suggestions">
        <button class="chat-suggest-btn" onclick="sendSuggestion('Gợi ý truyện tiên hiệp hay')">⚔️ Tiên Hiệp</button>
        <button class="chat-suggest-btn" onclick="sendSuggestion('Gợi ý truyện ngôn tình lãng mạn')">💕 Ngôn Tình</button>
        <button class="chat-suggest-btn" onclick="sendSuggestion('Cách nạp Coin?')">💰 Nạp Coin</button>
        <button class="chat-suggest-btn" onclick="sendSuggestion('VIP có lợi ích gì?')">👑 VIP</button>
      </div>

      <div class="chat-messages" id="chat-messages">
        <!-- Tin nhắn chào mừng -->
      </div>

      <div class="chat-input-area">
        <textarea class="chat-input" id="chat-input"
          placeholder="Hỏi về truyện, nạp tiền, VIP..."
          rows="1"
          onkeydown="chatKeyDown(event)"
          oninput="autoResizeChatInput(this)"></textarea>
        <button class="chat-send-btn" id="chat-send-btn" onclick="sendChatMessage()">➤</button>
      </div>
    </div>
  `;

  // Chèn vào body
  const wrapper = document.createElement('div');
  wrapper.innerHTML = widgetHTML;
  document.body.appendChild(wrapper);

  // Inject CSS
  if (!document.getElementById('chatbot-css-link')) {
    const link = document.createElement('link');
    link.id = 'chatbot-css-link';
    link.rel = 'stylesheet';
    link.href = 'css/chatbot.css';
    document.head.appendChild(link);
  }

  // Thêm tin nhắn chào mừng sau khi DOM sẵn sàng
  setTimeout(() => {
    appendBotMessage(`Xin chào! Tôi là **TruyenHay AI** ✨\n\nTôi có thể giúp bạn:\n- 📚 **Gợi ý truyện** theo sở thích\n- 💰 Hướng dẫn **nạp Coin, mua VIP**\n- ❓ Trả lời **mọi thắc mắc** về nền tảng\n\nBạn muốn hỏi gì nào?`);

    // Hiện badge sau 2s để thu hút chú ý
    setTimeout(() => {
      const badge = document.getElementById('chatbot-badge');
      if (badge) badge.style.display = 'flex';
    }, 2000);
  }, 800);
})();

// ============ State ============
let chatIsOpen = false;
let chatIsWaiting = false;
let speedDialOpen = false;

// ============ Toggle Speed Dial ============
window.toggleSpeedDial = function() {
  speedDialOpen = !speedDialOpen;
  const menu = document.getElementById('sd-menu');
  const iconMain = document.getElementById('sd-icon-main');
  const iconClose = document.getElementById('sd-icon-close');
  
  if (menu) menu.classList.toggle('open', speedDialOpen);
  if (iconMain) iconMain.style.display = speedDialOpen ? 'none' : 'block';
  if (iconClose) iconClose.style.display = speedDialOpen ? 'block' : 'none';
  
  // Xóa badge khi mở menu
  const badge = document.getElementById('chatbot-badge');
  if (badge && speedDialOpen) badge.style.display = 'none';
};

// ============ Toggle Chatbot ============
window.toggleChatbot = function() {
  chatIsOpen = !chatIsOpen;
  const win = document.getElementById('chatbot-window');
  
  // Đóng speed dial nếu mở chatbot
  if (chatIsOpen && speedDialOpen) {
    toggleSpeedDial(); 
  }

  if (win) win.classList.toggle('open', chatIsOpen);

  if (chatIsOpen) {
    // Xóa ẩn badge nếu có
    const badge = document.getElementById('chatbot-badge');
    if (badge) badge.style.display = 'none';
    
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) input.focus();
      scrollChatToBottom();
    }, 350);
  }
};

// ============ Gửi tin nhắn từ gợi ý nhanh ============
window.sendSuggestion = function(text) {
  const input = document.getElementById('chat-input');
  if (input) input.value = text;
  // Ẩn suggestions sau khi dùng
  const suggestions = document.getElementById('chat-suggestions');
  if (suggestions) suggestions.style.display = 'none';
  sendChatMessage();
};

// ============ Gửi tin nhắn ============
window.sendChatMessage = async function() {
  if (chatIsWaiting) return;

  const input = document.getElementById('chat-input');
  const msg = input ? input.value.trim() : '';
  if (!msg) return;

  // Hiển thị tin nhắn của user
  appendUserMessage(msg);
  input.value = '';
  autoResizeChatInput(input);

  // Ẩn suggestions sau lần đầu gửi
  const suggestions = document.getElementById('chat-suggestions');
  if (suggestions) suggestions.style.display = 'none';

  // Hiện typing indicator
  const typingId = appendTypingIndicator();
  chatIsWaiting = true;
  toggleSendBtn(true);

  try {
    const res = await fetch('http://localhost:8080/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });

    removeTypingIndicator(typingId);

    if (res.ok) {
      const data = await res.json();
      appendBotMessage(data.reply || 'Xin lỗi, tôi chưa có câu trả lời cho vấn đề này!');
    } else {
      appendBotMessage('❌ Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendBotMessage('❌ Không thể kết nối tới máy chủ. Bạn hãy kiểm tra kết nối mạng và thử lại nhé!');
  } finally {
    chatIsWaiting = false;
    toggleSendBtn(false);
  }
};

// ============ Helpers ============
function appendUserMessage(text) {
  const initials = (typeof curUser !== 'undefined' && curUser)
    ? (curUser.firstname || curUser.username || '?')[0].toUpperCase()
    : '?';

  appendMessage('user', escapeHtmlChat(text), initials);
}

function appendBotMessage(text) {
  // Chuyển markdown đơn giản → HTML
  const html = markdownToHtml(text);
  const svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1b1407" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
  appendMessage('bot', html, svg);
}

function appendMessage(role, htmlContent, avatar) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${role}`;
  msgEl.innerHTML = `
    <div class="chat-msg-av">${avatar}</div>
    <div class="chat-msg-bubble">${htmlContent}</div>
  `;
  container.appendChild(msgEl);
  scrollChatToBottom();
}

function appendTypingIndicator() {
  const container = document.getElementById('chat-messages');
  if (!container) return null;
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.className = 'chat-msg bot';
  el.id = id;
  const svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1b1407" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
  el.innerHTML = `
    <div class="chat-msg-av">${svg}</div>
    <div class="chat-msg-bubble">
      <div class="chat-typing">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  container.appendChild(el);
  scrollChatToBottom();
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollChatToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

function toggleSendBtn(disabled) {
  const btn = document.getElementById('chat-send-btn');
  if (btn) btn.disabled = disabled;
}

function autoResizeChatInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

window.chatKeyDown = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
};

// Markdown cơ bản → HTML
function markdownToHtml(text) {
  return escapeHtmlBase(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *italic*
    .replace(/\n/g, '<br>');                           // newline
}

function escapeHtmlBase(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlChat(str) {
  return escapeHtmlBase(str).replace(/\n/g, '<br>');
}
