document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    function updateConnectionStatus(status, code = '', message = '') {
        switch (status) {
            case 'connected':
                statusIcon.className = 'status-icon connected';
                statusText.textContent = `Connected ${code ? `(${code})` : ''}`;
                break;
            case 'error':
                statusIcon.className = 'status-icon error';
                statusText.textContent = `Error ${code ? `(${code})` : ''}: ${message}`;
                break;
            default:
                statusIcon.className = 'status-icon';
                statusText.textContent = 'Connecting...';
        }
    }

    function checkServerConnection() {
        fetch(config.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'ping' })
        })
        .then(response => {
            if (response.ok) {
                updateConnectionStatus('connected', response.status);
            } else {
                updateConnectionStatus('error', response.status, 'Server error');
            }
        })
        .catch(error => {
            updateConnectionStatus('error', '', 'Cannot connect to server');
        });
    }

    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Disable input and button while processing
        userInput.disabled = true;
        sendButton.disabled = true;

        // Add user message to chat
        addMessage(message, true);
        userInput.value = '';

        try {
            const response = await fetch(config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();
            if (response.ok) {
                updateConnectionStatus('connected', response.status);
                addMessage(data.response);
            } else {
                updateConnectionStatus('error', response.status, data.error || 'Something went wrong');
                addMessage('Error: ' + (data.error || 'Something went wrong'));
            }
        } catch (error) {
            updateConnectionStatus('error', '', 'Cannot connect to server');
            addMessage('Error: Could not connect to the server');
        }

        // Re-enable input and button
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Initial connection check
    checkServerConnection();
    
    // Periodic connection check every 30 seconds
    setInterval(checkServerConnection, 30000);

    // Initial focus
    userInput.focus();
});