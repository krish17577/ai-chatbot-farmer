class FarmerChatbot {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.conversationHistory = [];
        this.uploadedFiles = [];
        this.isTyping = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadChatHistory();
        this.hideLoading();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeElements() {
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        // Control elements
        this.newChatBtn = document.getElementById('newChatBtn');
        this.historyBtn = document.getElementById('historyBtn');
        this.historyPanel = document.getElementById('historyPanel');
        this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.historyList = document.getElementById('historyList');
        
        // Other elements
        this.languageSelect = document.getElementById('languageSelect');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    bindEvents() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });

        // File upload events
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Control events
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.historyBtn.addEventListener('click', () => this.toggleHistory());
        this.closeHistoryBtn.addEventListener('click', () => this.closeHistory());
        this.clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());

        // Close history when clicking outside
        document.addEventListener('click', (e) => {
            if (this.historyPanel.classList.contains('open') && 
                !this.historyPanel.contains(e.target) && 
                !this.historyBtn.contains(e.target)) {
                this.closeHistory();
            }
        });

        // Language selector
        this.languageSelect.addEventListener('change', () => {
            this.updatePlaceholder();
        });
    }

    updatePlaceholder() {
        const language = this.languageSelect.value;
        const placeholders = {
            'auto': 'अपना सवाल पूछें... Ask your question in any language...',
            'en': 'Ask your farming question...',
            'hi': 'अपना कृषि प्रश्न पूछें...',
            'ta': 'உங்கள் வேளாண் கேள்வியை கேளுங்கள்...',
            'bn': 'আপনার কৃষি প্রশ্ন জিজ্ঞাসা করুন...',
            'kn': 'ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ...',
            'ml': 'നിങ്ങളുടെ കൃഷി ചോദ്യം ചോദിക്കൂ...',
            'te': 'మీ వ్యవసాయ ప్రశ్న అడగండి...',
            'gu': 'તમારો ખેતીનો પ્રશ્ન પૂછો...',
            'mr': 'आपला शेती प्रश्न विचारा...',
            'pa': 'ਆਪਣਾ ਖੇਤੀ ਸਵਾਲ ਪੁੱਛੋ...'
        };
        
        this.messageInput.placeholder = placeholders[language] || placeholders['auto'];
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message && this.uploadedFiles.length === 0) return;

        // Disable send button and show typing
        this.setSendingState(true);
        
        // Add user message to chat
        this.addMessageToChat('user', message, this.uploadedFiles);
        
        // Save to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message,
            files: [...this.uploadedFiles],
            timestamp: new Date().toISOString()
        });

        // Clear input and files
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.clearUploadedFiles();

        // Show typing indicator
        this.showTyping();

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('message', message);
            formData.append('sessionId', this.sessionId);
            formData.append('language', this.languageSelect.value);

            // Add files to form data
            this.uploadedFiles.forEach((file, index) => {
                formData.append('files', file.file);
            });

            // Send request to backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Hide typing and add assistant response
            this.hideTyping();
            this.addMessageToChat('assistant', data.response, data.files || []);
            
            // Save assistant response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: data.response,
                files: data.files || [],
                timestamp: new Date().toISOString()
            });

            // Save chat history
            this.saveChatHistory();

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTyping();
            this.addMessageToChat('assistant', 
                'माफ करें, कुछ तकनीकी समस्या हुई है। कृपया दोबारा कोशिश करें। / Sorry, there was a technical issue. Please try again.');
        } finally {
            this.setSendingState(false);
        }
    }

    addMessageToChat(role, content, files = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.formatMessage(content);
        
        // Add files if present
        if (files && files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'message-files';
            
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-preview-chat';
                
                if (file.type && file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = file.url || URL.createObjectURL(file.file);
                    img.alt = file.filename || file.file.name;
                    fileDiv.appendChild(img);
                } else if (file.type && file.type.startsWith('audio/')) {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = file.url || URL.createObjectURL(file.file);
                    fileDiv.appendChild(audio);
                } else if (file.type && file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.controls = true;
                    video.style.maxWidth = '200px';
                    video.src = file.url || URL.createObjectURL(file.file);
                    fileDiv.appendChild(video);
                }
                
                filesDiv.appendChild(fileDiv);
            });
            
            messageContent.appendChild(filesDiv);
        }
        
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        // Smooth scroll to bottom
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Simple text formatting - convert line breaks to <br>
        return content.replace(/\n/g, '<br>');
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (this.uploadedFiles.length >= 5) {
                alert('Maximum 5 files allowed');
                return;
            }
            
            const fileObj = {
                file: file,
                filename: file.name,
                type: file.type,
                preview: null
            };
            
            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    fileObj.preview = e.target.result;
                    this.renderFilePreview();
                };
                reader.readAsDataURL(file);
            }
            
            this.uploadedFiles.push(fileObj);
        });
        
        this.renderFilePreview();
        event.target.value = ''; // Reset file input
    }

    renderFilePreview() {
        if (this.uploadedFiles.length === 0) {
            this.filePreview.innerHTML = '';
            this.filePreview.classList.remove('has-files');
            return;
        }

        this.filePreview.classList.add('has-files');
        this.filePreview.innerHTML = '';

        this.uploadedFiles.forEach((fileObj, index) => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            
            if (fileObj.type.startsWith('image/') && fileObj.preview) {
                const img = document.createElement('img');
                img.src = fileObj.preview;
                img.alt = fileObj.filename;
                fileDiv.appendChild(img);
            } else {
                const icon = document.createElement('div');
                icon.className = 'file-info';
                icon.innerHTML = `<i class="fas fa-${this.getFileIcon(fileObj.type)}"></i><br>${fileObj.filename.substring(0, 10)}...`;
                fileDiv.appendChild(icon);
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-remove';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = () => this.removeFile(index);
            
            fileDiv.appendChild(removeBtn);
            this.filePreview.appendChild(fileDiv);
        });
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'music';
        if (mimeType.startsWith('video/')) return 'video';
        return 'file';
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderFilePreview();
    }

    clearUploadedFiles() {
        this.uploadedFiles = [];
        this.renderFilePreview();
    }

    setSendingState(sending) {
        this.sendBtn.disabled = sending;
        this.uploadBtn.disabled = sending;
        this.messageInput.disabled = sending;
        
        if (sending) {
            this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        } else {
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        }
    }

    showTyping() {
        this.typingIndicator.classList.add('show');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.remove('show');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    async startNewChat() {
        if (this.conversationHistory.length > 0) {
            const confirmed = confirm('शुरू नई बातचीत? / Start new conversation? This will save current chat to history.');
            if (!confirmed) return;
        }

        // Save current chat to history before starting new one
        if (this.conversationHistory.length > 0) {
            this.saveCurrentChatToHistory();
        }

        try {
            // Clear conversation on server
            await fetch('/api/new-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: this.sessionId })
            });
        } catch (error) {
            console.error('Error starting new chat:', error);
        }

        // Clear local state
        this.conversationHistory = [];
        this.sessionId = this.generateSessionId();
        
        // Clear chat UI
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-avatar">
                    <i class="fas fa-seedling"></i>
                </div>
                <div class="welcome-content">
                    <h2>नमस्ते किसान भाई! 🙏</h2>
                    <p>Welcome, farmer friend! I'm here to help you with:</p>
                    <ul>
                        <li><i class="fas fa-bug"></i> Crop diseases and pest control</li>
                        <li><i class="fas fa-tint"></i> Irrigation and water management</li>
                        <li><i class="fas fa-leaf"></i> Soil health and fertilizers</li>
                        <li><i class="fas fa-sun"></i> Weather and seasonal advice</li>
                        <li><i class="fas fa-camera"></i> Upload photos for plant diagnosis</li>
                    </ul>
                    <p class="welcome-note">You can type in any language - Hindi, English, Tamil, Bengali, or your local language!</p>
                </div>
            </div>
        `;
        
        this.clearUploadedFiles();
        this.messageInput.focus();
    }

    toggleHistory() {
        this.historyPanel.classList.toggle('open');
        if (this.historyPanel.classList.contains('open')) {
            this.loadHistoryList();
        }
    }

    closeHistory() {
        this.historyPanel.classList.remove('open');
    }

    loadHistoryList() {
        const history = this.getChatHistory();
        
        if (history.length === 0) {
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-comments"></i>
                    <p>No chat history yet. Start a conversation!</p>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = '';
        
        history.forEach((chat, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const preview = chat.preview || 'Chat session';
            const time = new Date(chat.timestamp).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            historyItem.innerHTML = `
                <div class="history-preview">${preview}</div>
                <div class="history-time">${time}</div>
            `;
            
            historyItem.addEventListener('click', () => {
                this.loadChatFromHistory(index);
                this.closeHistory();
            });
            
            this.historyList.appendChild(historyItem);
        });
    }

    loadChatFromHistory(index) {
        const history = this.getChatHistory();
        const chat = history[index];
        
        if (!chat) return;
        
        // Save current chat if it has messages
        if (this.conversationHistory.length > 0) {
            this.saveCurrentChatToHistory();
        }
        
        // Load selected chat
        this.conversationHistory = chat.messages || [];
        this.sessionId = this.generateSessionId();
        
        // Clear and reload chat UI
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-avatar">
                    <i class="fas fa-seedling"></i>
                </div>
                <div class="welcome-content">
                    <h2>नमस्ते किसान भाई! 🙏</h2>
                    <p>Loaded chat from ${new Date(chat.timestamp).toLocaleDateString('en-IN')}</p>
                </div>
            </div>
        `;
        
        // Add all messages from history
        this.conversationHistory.forEach(msg => {
            this.addMessageToChat(msg.role, msg.content, msg.files || []);
        });
    }

    saveCurrentChatToHistory() {
        if (this.conversationHistory.length === 0) return;
        
        const history = this.getChatHistory();
        
        // Get first user message as preview
        const firstUserMsg = this.conversationHistory.find(msg => msg.role === 'user');
        const preview = firstUserMsg ? 
            firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '') :
            'Chat session';
        
        const chatData = {
            timestamp: new Date().toISOString(),
            preview: preview,
            messages: this.conversationHistory
        };
        
        history.unshift(chatData);
        
        // Keep only last 20 chats
        if (history.length > 20) {
            history.splice(20);
        }
        
        localStorage.setItem('farmer_chat_history', JSON.stringify(history));
    }

    saveChatHistory() {
        // Auto-save current conversation periodically
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveCurrentChatToHistory();
        }, 2000);
    }

    getChatHistory() {
        try {
            return JSON.parse(localStorage.getItem('farmer_chat_history') || '[]');
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    }

    loadChatHistory() {
        // Load any existing chat history on startup
        // This method can be extended to restore the last session if needed
    }

    clearAllHistory() {
        const confirmed = confirm('सभी चैट इतिहास साफ़ करें? / Clear all chat history? This cannot be undone.');
        if (!confirmed) return;
        
        localStorage.removeItem('farmer_chat_history');
        this.loadHistoryList();
    }

    hideLoading() {
        setTimeout(() => {
            this.loadingOverlay.classList.add('hidden');
        }, 1000);
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.farmerChatbot = new FarmerChatbot();
});

// Service Worker for offline capability (basic)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(err => console.log('Service Worker registration failed'));
    });
}