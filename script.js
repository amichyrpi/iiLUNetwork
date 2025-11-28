class iiLUChatClient {
    constructor() {
        this.username = null;
        this.apiUrl = CONFIG.API_URL; // Utilise la configuration
        this.socket = null;
        this.messageHistory = [];
        
        // Vocal mode properties
        this.vocalMode = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.isPaused = false;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        
        this.initElements();
        this.initEventListeners();
        this.initVocalMode();
    }

    initElements() {
        // Existing elements
        this.loginContainer = document.getElementById('login-container');
        this.chatContainer = document.getElementById('chat-container');
        this.usernameInput = document.getElementById('username-input');
        this.loginBtn = document.getElementById('login-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.currentUserSpan = document.getElementById('current-user');
        this.statusIndicator = document.getElementById('status-indicator');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.introSound = document.getElementById('intro-sound');
        
        // Vocal mode elements
        this.micBtn = document.getElementById('mic-btn');
        this.vocalModeOverlay = document.getElementById('vocal-mode');
        this.vocalExit = document.getElementById('vocal-exit');
        this.vocalStatus = document.getElementById('vocal-status');
        this.vocalMessage = document.getElementById('vocal-message');
        this.vocalPauseBtn = document.getElementById('vocal-pause-btn');
        this.pauseIcon = document.getElementById('pause-icon');
        this.playIcon = document.getElementById('play-icon');
        this.audioVisualizer = document.getElementById('audio-visualizer');
    }

    initEventListeners() {
        // Existing listeners
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        this.disconnectBtn.addEventListener('click', () => this.handleDisconnect());
        
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });

        // Vocal mode listeners
        this.micBtn.addEventListener('click', () => this.toggleVocalMode());
        this.vocalExit.addEventListener('click', () => this.exitVocalMode());
        this.vocalPauseBtn.addEventListener('click', () => this.toggleVocalPause());
    }

    initVocalMode() {
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'fr-FR';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            
            this.recognition.onstart = () => {
                this.vocalStatus.textContent = 'Ecoute en cours...';
                this.micBtn.classList.add('active');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.vocalStatus.textContent = 'Message recu';
                this.vocalMessage.textContent = `Vous: ${transcript}`;
                this.sendVocalMessage(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Erreur reconnaissance vocale:', event.error);
                this.vocalStatus.textContent = 'Erreur de reconnaissance vocale';
                setTimeout(() => {
                    if (this.vocalMode && !this.isPaused) {
                        this.startListening();
                    }
                }, 2000);
            };
            
            this.recognition.onend = () => {
                if (this.vocalMode && !this.isPaused) {
                    // Restart listening after a short delay
                    setTimeout(() => {
                        if (this.vocalMode && !this.isPaused) {
                            this.startListening();
                        }
                    }, 1000);
                }
            };
        } else {
            console.warn('Reconnaissance vocale non supportee');
        }

        // Initialize visualizer bars
        this.createVisualizerBars();
    }

    createVisualizerBars() {
        const barCount = 40;
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '5px';
            this.audioVisualizer.appendChild(bar);
        }
    }

    toggleVocalMode() {
        if (!this.vocalMode) {
            this.enterVocalMode();
        } else {
            this.exitVocalMode();
        }
    }

    enterVocalMode() {
        this.vocalMode = true;
        this.vocalModeOverlay.classList.add('active');
        this.isPaused = false;
        
        // Stop any ongoing TTS from text mode
        this.stopTTS();
        
        // Initialize audio context for visualizer
        this.initAudioContext();
        
        // Start listening
        this.startListening();
        
        // Start visualizer animation
        this.animateVisualizer();
    }

    exitVocalMode() {
        this.vocalMode = false;
        this.vocalModeOverlay.classList.remove('active');
        
        // Stop recognition
        if (this.recognition) {
            this.recognition.stop();
        }
        
        // Stop TTS
        this.stopTTS();
        
        // Stop visualizer
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Reset visualizer bars
        const bars = this.audioVisualizer.querySelectorAll('.visualizer-bar');
        bars.forEach(bar => bar.style.height = '5px');
        
        // Reset status
        this.vocalStatus.textContent = 'En attente...';
        this.vocalMessage.textContent = '';
        this.micBtn.classList.remove('active');
        this.isPaused = false;
        this.updatePauseButton();
    }

    toggleVocalPause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Pause
            if (this.recognition) {
                this.recognition.stop();
            }
            if (this.currentUtterance && this.synthesis.speaking) {
                this.synthesis.pause();
            }
            this.vocalStatus.textContent = 'En pause';
            this.micBtn.classList.remove('active');
        } else {
            // Resume
            if (this.currentUtterance && this.synthesis.paused) {
                this.synthesis.resume();
            } else {
                this.startListening();
            }
            this.vocalStatus.textContent = 'Ecoute en cours...';
        }
        
        this.updatePauseButton();
    }

    updatePauseButton() {
        if (this.isPaused) {
            this.pauseIcon.style.display = 'none';
            this.playIcon.style.display = 'block';
            this.vocalPauseBtn.classList.add('paused');
        } else {
            this.pauseIcon.style.display = 'block';
            this.playIcon.style.display = 'none';
            this.vocalPauseBtn.classList.remove('paused');
        }
    }

    startListening() {
        if (this.recognition && this.vocalMode && !this.isPaused) {
            try {
                this.recognition.start();
            } catch (e) {
                console.log('Recognition already started');
            }
        }
    }

    async sendVocalMessage(message) {
        this.vocalStatus.textContent = 'Envoi...';
        
        try {
            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    username: this.username
                })
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi du message');
            }
            
            const data = await response.json();
            
            if (data.response) {
                this.vocalStatus.textContent = 'Reponse de iiLU';
                this.vocalMessage.textContent = `iiLU: ${data.response}`;
                
                // Speak the response (only in vocal mode)
                this.speakText(data.response);
                
                // Also add to chat history
                this.addUserMessage(message);
                this.addAIMessage(data.response);
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            this.vocalStatus.textContent = 'Erreur de communication';
            setTimeout(() => {
                if (this.vocalMode && !this.isPaused) {
                    this.startListening();
                }
            }, 2000);
        }
    }

    speakText(text) {
        // Only speak in vocal mode
        if (!this.vocalMode) {
            return;
        }

        // Stop any ongoing speech
        this.stopTTS();
        
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.lang = 'fr-FR';
        this.currentUtterance.rate = 1.0;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;
        
        this.currentUtterance.onend = () => {
            this.vocalStatus.textContent = 'Ecoute en cours...';
            // Resume listening after speech ends
            if (this.vocalMode && !this.isPaused) {
                setTimeout(() => this.startListening(), 500);
            }
        };
        
        this.currentUtterance.onerror = (event) => {
            console.error('Erreur TTS:', event);
            if (this.vocalMode && !this.isPaused) {
                setTimeout(() => this.startListening(), 1000);
            }
        };
        
        this.synthesis.speak(this.currentUtterance);
    }

    stopTTS() {
        if (this.synthesis.speaking || this.synthesis.pending) {
            this.synthesis.cancel();
        }
        this.currentUtterance = null;
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 128;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            // Try to get microphone access for real-time visualization
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const source = this.audioContext.createMediaStreamSource(stream);
                    source.connect(this.analyser);
                })
                .catch(err => {
                    console.log('Microphone access denied, using simulated visualization');
                });
        }
    }

    animateVisualizer() {
        if (!this.vocalMode) return;
        
        const bars = this.audioVisualizer.querySelectorAll('.visualizer-bar');
        
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            if (this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
                
                bars.forEach((bar, index) => {
                    const dataIndex = Math.floor(index * this.dataArray.length / bars.length);
                    const value = this.dataArray[dataIndex];
                    const height = Math.max(5, (value / 255) * 200);
                    bar.style.height = `${height}px`;
                });
            } else {
                // Simulated visualization when no audio input
                const time = Date.now() / 1000;
                bars.forEach((bar, index) => {
                    const height = 5 + Math.abs(Math.sin(time * 2 + index * 0.2) * 50);
                    bar.style.height = `${height}px`;
                });
            }
        };
        
        animate();
    }

    async handleLogin() {
        const username = this.usernameInput.value.trim();
        
        if (!username) {
            alert('Veuillez entrer un nom');
            return;
        }

        this.username = username;
        
        try {
            const response = await fetch(`${this.apiUrl}/api/status`);
            const data = await response.json();
            
            if (data.status === 'running') {
                this.updateStatus('online');
            }
        } catch (error) {
            console.error('Erreur lors de la verification du statut:', error);
        }

        this.showChatInterface();
        this.connectSocketIO();
        
        if (this.introSound) {
            this.introSound.play().catch(e => console.log('Lecture audio intro echouee:', e));
        }
    }

    showChatInterface() {
        this.loginContainer.style.display = 'none';
        this.chatContainer.style.display = 'flex';
        this.currentUserSpan.textContent = this.username;
        this.addSystemMessage(`Bienvenue ${this.username}! Vous etes connecte a iiLU.`);
        this.messageInput.focus();
    }

    connectSocketIO() {
        // Charger Socket.IO depuis le CDN
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
            script.onload = () => this.initSocketIO();
            document.head.appendChild(script);
        } else {
            this.initSocketIO();
        }
    }

    initSocketIO() {
        // Connexion Socket.IO
        this.socket = io(this.apiUrl, {
            transports: ['websocket', 'polling']
        });
        
        // Événements Socket.IO
        this.socket.on('connect', () => {
            console.log('Socket.IO connecte');
            this.updateStatus('online');
            
            // Authentification
            this.socket.emit('auth', {
                username: this.username
            });
        });
        
        this.socket.on('disconnect', () => {
            console.log('Socket.IO deconnecte');
            this.updateStatus('offline');
        });
        
        this.socket.on('system', (data) => {
            this.addSystemMessage(data.message);
        });
        
        this.socket.on('response', (data) => {
            this.hideTypingIndicator();
            this.addAIMessage(data.content);
        });
        
        this.socket.on('typing', () => {
            this.showTypingIndicator();
        });
        
        this.socket.on('error', (data) => {
            this.hideTypingIndicator();
            this.addErrorMessage(data.message);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Erreur de connexion Socket.IO:', error);
            this.addErrorMessage('Erreur de connexion au serveur');
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) return;
        
        this.addUserMessage(message);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        this.sendBtn.disabled = true;
        this.showTypingIndicator();
        
        try {
            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    username: this.username
                })
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi du message');
            }
            
            const data = await response.json();
            
            if (data.response) {
                this.hideTypingIndicator();
                this.addAIMessage(data.response);
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            this.hideTypingIndicator();
            this.addErrorMessage('Erreur lors de la communication avec iiLU');
        } finally {
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }

    addUserMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-user';
        messageDiv.textContent = content;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addAIMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-ai';
        messageDiv.textContent = content;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-system';
        messageDiv.textContent = content;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addErrorMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-error';
        messageDiv.textContent = content;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    updateStatus(status) {
        if (status === 'online') {
            this.statusIndicator.textContent = 'En ligne';
            this.statusIndicator.className = 'status-indicator status-online';
        } else {
            this.statusIndicator.textContent = 'Hors ligne';
            this.statusIndicator.className = 'status-indicator status-offline';
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleDisconnect() {
        // Exit vocal mode if active
        if (this.vocalMode) {
            this.exitVocalMode();
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.username = null;
        this.chatMessages.innerHTML = '';
        this.chatContainer.style.display = 'none';
        this.loginContainer.style.display = 'block';
        this.usernameInput.value = '';
        this.updateStatus('offline');
    }
}

// Initialize the chat client when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new iiLUChatClient();
});