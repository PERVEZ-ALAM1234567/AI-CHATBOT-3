// ========================================
// STATE MANAGEMENT
// ========================================

const state = {
    chats: [],
    currentChatId: null,
    chatToDelete: null,
    sidebarCollapsed: false,
    isMobile: window.innerWidth <= 768
};

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarLogoToggle: document.getElementById('sidebarLogoToggle'),
    sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    searchInput: document.getElementById('searchChats'),
    chatList: document.getElementById('chatList'),

    // Main Content
    menuToggle: document.getElementById('menuToggle'),
    messagesContainer: document.getElementById('messages'),
    emptyState: document.getElementById('emptyState'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),

    // Buttons
    attachBtn: document.getElementById('attachBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    regenerateBtn: document.getElementById('regenerateBtn'),
    shareBtn: document.getElementById('shareBtn'),
    moreBtn: document.getElementById('moreBtn'),
    moreMenu: document.getElementById('moreMenu'),
    shareChatBtn: document.getElementById('shareChatBtn'),
    pinChatBtn: document.getElementById('pinChatBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),

    // Modals
    deleteModal: document.getElementById('deleteModal'),
    settingsModal: document.getElementById('settingsModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),

    // Settings
    darkModeToggle: document.getElementById('darkModeToggle'),
    notificationsToggle: document.getElementById('notificationsToggle'),

    // Utilities
    loadingOverlay: document.getElementById('loadingOverlay')
};

const emptyStateTemplate = elements.emptyState ? elements.emptyState.outerHTML : '';

// ========================================
// UTILITY FUNCTIONS
// ========================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getChatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (date.toDateString() === today.toDateString()) {
        return 'today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'yesterday';
    } else if (date > sevenDaysAgo) {
        return 'week';
    } else {
        return 'older';
    }
}


function formatAIResponse(content) {
    let html = marked.parse(content);

    html = html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
        (match, lang, code) => {
            return `
                <div class="code-block">
                    <div class="code-header">
                        <span>${lang}</span>
                        <button class="copy-code-btn">Copy</button>
                    </div>
                    <pre><code>${code}</code></pre>
                </div>
            `;
        }
    );

    html = html
        .replace(/<h1>/g, '<h1 class="ai-h1">')
        .replace(/<h2>/g, '<h2 class="ai-h2">')
        .replace(/<h3>/g, '<h3 class="ai-h3">')
        .replace(/<p>/g, '<p class="ai-p">')
        .replace(/<ul>/g, '<ul class="ai-ul">')
        .replace(/<ol>/g, '<ol class="ai-ol">')
        .replace(/<li>/g, '<li class="ai-li">')
        .replace(/<blockquote>/g, '<blockquote class="ai-quote">');

    return html;
}
// ========================================
// CHAT MANAGEMENT
// ========================================

function createNewChat() {
    state.chats = state.chats.filter(chat =>
        chat.messages.length > 0 || chat.title !== 'New conversation'
    );

    const chatId = generateId();
    const newChat = {
        id: chatId,
        title: 'New conversation',
        messages: [],
        timestamp: new Date()
    };

    state.chats.unshift(newChat);
    state.currentChatId = chatId;

    resetMessagesToEmptyState();
    showEmptyState();
    renderChatList();
    if (elements.userInput) {
        elements.userInput.value = '';
        elements.userInput.style.height = 'auto';
        elements.userInput.focus();
    }
    if (elements.sendBtn) {
        elements.sendBtn.classList.remove('active');
    }
    closeMoreMenu();

    // Close sidebar on mobile
    if (state.isMobile) {
        closeSidebar();
    }
}

function loadChat(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    state.currentChatId = chatId;

    hideEmptyState();

    elements.messagesContainer.innerHTML = '';
    elements.emptyState = null;
    chat.messages.forEach(msg => {
        appendMessage(msg.role, msg.content, msg.time, false);
    });

    renderChatList();
    scrollToBottom();

    // Close sidebar on mobile
    if (state.isMobile) {
        closeSidebar();
    }
}

function renameChat(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const newTitle = prompt('Rename conversation:', chat.title);
    if (newTitle && newTitle.trim()) {
        chat.title = newTitle.trim();
        renderChatList();
    }
}

function deleteChat(chatId) {
    state.chatToDelete = chatId;
    showModal(elements.deleteModal);
}

function confirmDelete() {
    if (state.chatToDelete) {
        state.chats = state.chats.filter(c => c.id !== state.chatToDelete);

        if (state.currentChatId === state.chatToDelete) {
            if (state.chats.length > 0) {
                loadChat(state.chats[0].id);
            } else {
                createNewChat();
            }
        }

        renderChatList();
    }
    hideModal(elements.deleteModal);
}

// ========================================
// UI RENDERING
// ========================================

function renderChatList() {
    const sections = {
        today: [],
        yesterday: [],
        week: []
    };

    const visibleChats = state.chats.filter(chat =>
        chat.messages.length > 0 || chat.title !== 'New conversation'
    ).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

    visibleChats.forEach(chat => {
        const period = getChatDate(chat.timestamp);
        if (sections[period]) {
            sections[period].push(chat);
        }
    });

    const sectionElements = elements.chatList.querySelectorAll('.sidebar-section');

    // Today
    renderSection(sectionElements[0], sections.today);

    // Yesterday
    renderSection(sectionElements[1], sections.yesterday);

    // Previous 7 Days
    renderSection(sectionElements[2], sections.week);
}

function renderSection(sectionElement, chats) {
    const existingItems = sectionElement.querySelectorAll('.chat-item');
    existingItems.forEach(item => item.remove());

    if (chats.length === 0) {
        sectionElement.style.display = 'none';
    } else {
        sectionElement.style.display = 'block';
        chats.forEach(chat => {
            const chatItem = createChatItem(chat);
            sectionElement.appendChild(chatItem);
        });
    }
}

function createChatItem(chat) {
    const isActive = chat.id === state.currentChatId;
    const div = document.createElement('div');
    div.className = `chat-item ${isActive ? 'active' : ''}`;
    div.onclick = () => loadChat(chat.id);

    div.innerHTML = `
        <i class="fa-regular fa-message chat-item-icon"></i>
        <div class="chat-item-title">${escapeHtml(chat.title)}</div>
        ${chat.pinned ? '<i class="fa-solid fa-thumbtack chat-item-pin" title="Pinned"></i>' : ''}
        <div class="chat-item-actions">
            <button class="chat-item-btn rename-btn" title="Rename">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="chat-item-btn delete-btn" title="Delete">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `;

    const renameBtn = div.querySelector('.rename-btn');
    const deleteBtn = div.querySelector('.delete-btn');

    renameBtn.onclick = (e) => {
        e.stopPropagation();
        renameChat(chat.id);
    };

    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
    };

    return div;
}

// ========================================
// MESSAGE HANDLING
// ========================================

async function sendMessage() {
    const message = elements.userInput.value.trim();
    if (!message) return;

    hideEmptyState();

    if (!state.currentChatId) {
        createNewChat();
    }

    const currentChat = state.chats.find(c => c.id === state.currentChatId);
    const currentTime = getCurrentTime();

    if (currentChat.messages.length === 0) {
        currentChat.title = message.length > 50
            ? message.substring(0, 50) + '...'
            : message;
        renderChatList();
    }

    currentChat.messages.push({
        role: 'user',
        content: message,
        time: currentTime
    });

    appendMessage('user', message, currentTime);

    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    elements.sendBtn.classList.remove('active');

    scrollToBottom();

    showTypingIndicator();

    let response = '';
    try {
        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json();
        response = data.reply || data.response || '';
        if (!response) {
            throw new Error('Empty response');
        }
    } catch (err) {
        response = "Sorry, I couldn't get a response right now.";
        console.warn('Bot reply failed. Check server /chat endpoint.', err);
    } finally {
        hideTypingIndicator();
    }

    const responseTime = getCurrentTime();
    currentChat.messages.push({
        role: 'assistant',
        content: response,
        time: responseTime
    });

    appendMessage('assistant', response, responseTime);
    scrollToBottom();
}

function appendMessage(role, content, time, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    if (!animate) {
        messageDiv.style.animation = 'none';
    }

    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-user"></i>
            </div>
            <div class="message-content">
                ${marked.parse(content)}
                <div class="message-time">
                    <i class="fa-regular fa-clock"></i>
                    ${time}
                </div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                ${formatAIResponse(content)}
                <div class="message-actions">
                    <button class="message-btn copy-btn">
                        <i class="fa-regular fa-copy"></i>
                        Copy
                    </button>
                    <button class="message-btn">
                        <i class="fa-solid fa-rotate-right"></i>
                        Regenerate
                    </button>
                    <button class="message-btn">
                        <i class="fa-regular fa-thumbs-up"></i>
                        Like
                    </button>
                </div>
                <div class="message-time">
                    <i class="fa-regular fa-clock"></i>
                    ${time}
                </div>
            </div>
        `;

        const copyBtn = messageDiv.querySelector('.copy-btn');
        copyBtn.onclick = () => copyMessage(copyBtn, content);
    }

    elements.messagesContainer.appendChild(messageDiv);

    const codeButtons = messageDiv.querySelectorAll('.copy-code-btn');

    codeButtons.forEach(btn => {
        btn.onclick = () => {
            const code = btn.closest('.code-block').querySelector('code').innerText;
            navigator.clipboard.writeText(code);

            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = "Copy", 2000);
        };
    });
}

function copyMessage(btn, content) {
    navigator.clipboard.writeText(content).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `
            <i class="fa-solid fa-check"></i>
            Copied!
        `;

        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    }).catch(() => {
        console.warn('Failed to copy message.');
    });
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fa-solid fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing active">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    elements.messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// ========================================
// UI STATE MANAGEMENT
// ========================================

function refreshEmptyStateReference() {
    elements.emptyState = document.getElementById('emptyState');
}

function resetMessagesToEmptyState() {
    if (!elements.messagesContainer || !emptyStateTemplate) return;
    elements.messagesContainer.innerHTML = emptyStateTemplate;
    refreshEmptyStateReference();
}

function showEmptyState() {
    refreshEmptyStateReference();
    if (!elements.emptyState && emptyStateTemplate) {
        resetMessagesToEmptyState();
    }

    if (elements.emptyState) {
        elements.emptyState.style.display = 'block';
    }
}

function hideEmptyState() {
    refreshEmptyStateReference();
    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }
}

function toggleSidebar() {
    if (state.isMobile) {
        elements.sidebar.classList.toggle('active');
     } else {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        elements.sidebar.classList.toggle('collapsed');
    }
}

function closeSidebar() {
    if (state.isMobile) {
        elements.sidebar.classList.remove('active');
    }
}

function closeMoreMenu() {
    if (elements.moreMenu) {
        elements.moreMenu.classList.remove('open');
    }
    if (elements.moreBtn) {
        elements.moreBtn.setAttribute('aria-expanded', 'false');
    }
}

function updateMoreMenuState() {
    if (!elements.pinChatBtn) return;

    const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
    const isPinned = Boolean(currentChat && currentChat.pinned);
    elements.pinChatBtn.classList.toggle('active', isPinned);

    const label = elements.pinChatBtn.querySelector('span');
    if (label) {
        label.textContent = isPinned ? 'Unpin' : 'Pin';
    }
}

function toggleMoreMenu(event) {
    if (event) {
        event.stopPropagation();
    }
    if (!elements.moreMenu || !elements.moreBtn) return;

    const isOpen = elements.moreMenu.classList.toggle('open');
    elements.moreBtn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
        updateMoreMenuState();
    }
}

function getCurrentChatShareText() {
    const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
    if (!currentChat || currentChat.messages.length === 0) {
        return 'New HelpGPT conversation';
    }

    return currentChat.messages
        .map(message => `${message.role === 'user' ? 'You' : 'HelpGPT'}: ${message.content}`)
        .join('\n\n');
}

async function shareCurrentChat() {
    closeMoreMenu();
    const text = getCurrentChatShareText();

    try {
        if (navigator.share) {
            await navigator.share({ title: 'HelpGPT chat', text });
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        }
    } catch (error) {
        console.warn('Share action was cancelled or failed.', error);
    }
}

function togglePinCurrentChat() {
    const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
    if (!currentChat) return;

    currentChat.pinned = !currentChat.pinned;
    updateMoreMenuState();
    renderChatList();
}

function showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function showLoading() {
    elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

function searchChats(query) {
    const searchTerm = query.toLowerCase().trim();
    const allChatItems = document.querySelectorAll('.chat-item');

    allChatItems.forEach(item => {
        const title = item.querySelector('.chat-item-title').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ========================================
// EVENT LISTENERS
// ========================================

function addSafeListener(element, event, handler) {
    if (element) {
        element.addEventListener(event, handler);
    }
}

// Sidebar
addSafeListener(elements.sidebarLogoToggle, 'click', toggleSidebar);
addSafeListener(elements.menuToggle, 'click', toggleSidebar);
addSafeListener(elements.sidebarCloseBtn, 'click', toggleSidebar);
addSafeListener(elements.newChatBtn, 'click', createNewChat);

// Search
addSafeListener(elements.searchInput, 'input', (e) => {
    searchChats(e.target.value);
});

// Send message
addSafeListener(elements.sendBtn, 'click', sendMessage);

// Input handling
addSafeListener(elements.userInput, 'input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';

    if (this.value.trim()) {
        elements.sendBtn.classList.add('active');
    } else {
        elements.sendBtn.classList.remove('active');
    }
});

addSafeListener(elements.userInput, 'keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Buttons
addSafeListener(elements.moreBtn, 'click', toggleMoreMenu);
addSafeListener(elements.shareChatBtn, 'click', shareCurrentChat);
addSafeListener(elements.pinChatBtn, 'click', togglePinCurrentChat);
addSafeListener(elements.shareBtn, 'click', shareCurrentChat);

addSafeListener(elements.regenerateBtn, 'click', () => {});
addSafeListener(elements.attachBtn, 'click', () => {});
addSafeListener(elements.voiceBtn, 'click', () => {});

addSafeListener(elements.settingsBtn, 'click', () => {
    showModal(elements.settingsModal);
});

addSafeListener(elements.helpBtn, 'click', () => {
    closeMoreMenu();
});

// Modals
addSafeListener(elements.cancelDeleteBtn, 'click', () => {
    hideModal(elements.deleteModal);
});

addSafeListener(elements.confirmDeleteBtn, 'click', confirmDelete);

addSafeListener(elements.closeSettingsBtn, 'click', () => {
    hideModal(elements.settingsModal);
});

// Modal overlay clicks
addSafeListener(elements.deleteModal, 'click', (e) => {
    if (e.target === elements.deleteModal || e.target.classList.contains('modal-overlay')) {
        hideModal(elements.deleteModal);
    }
});

addSafeListener(elements.settingsModal, 'click', (e) => {
    if (e.target === elements.settingsModal || e.target.classList.contains('modal-overlay')) {
        hideModal(elements.settingsModal);
    }
});

// Settings toggles
addSafeListener(elements.darkModeToggle, 'change', function () {
    document.body.classList.toggle('dark-mode', this.checked);
});

addSafeListener(elements.notificationsToggle, 'change', function () {});

// Suggestion chips
document.addEventListener('click', (e) => {
    if (elements.moreMenu && !e.target.closest('.more-menu-wrapper')) {
        closeMoreMenu();
    }

    const chip = e.target.closest('.suggestion-chip');
    if (chip) {
        const suggestion = chip.getAttribute('data-suggestion');
        if (suggestion) {
            elements.userInput.value = suggestion;
            elements.userInput.focus();
            elements.sendBtn.classList.add('active');

            // Auto adjust textarea height
            elements.userInput.style.height = 'auto';
            elements.userInput.style.height = Math.min(elements.userInput.scrollHeight, 200) + 'px';
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMoreMenu();
    }
});

// Section toggles
document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.section-toggle');
    if (toggle) {
        const section = toggle.closest('.sidebar-section');
        section.classList.toggle('collapsed');
    }
});

// Window resize
window.addEventListener('resize', () => {
    state.isMobile = window.innerWidth <= 768;

    if (!state.isMobile) {
        elements.sidebar.classList.remove('active');
    } else {
        elements.sidebar.classList.remove('collapsed');
        state.sidebarCollapsed = false;
    }
});

// ========================================
// INITIALIZATION
// ========================================

function init() {
    // Focus on input
    elements.userInput.focus();

    // Show empty state
    showEmptyState();

    // Create initial chat
    createNewChat();

    console.log('HelpGPT initialized successfully.');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
