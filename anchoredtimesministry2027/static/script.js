document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    // Check for essential elements early. If missing, log error and stop.
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    if (!chatMessages || !userInput || !sendButton || !statusIcon || !statusText) {
        console.error("Essential chat elements are missing from the DOM. Chat cannot initialize.");
        // Optionally display an error message to the user in a safe element
        // document.body.insertAdjacentHTML('afterbegin', '<p style="color:red; text-align:center;">Chat UI failed to load correctly.</p>');
        return; // Stop script execution if essential elements are missing
    }

    // Check for config early as well
    if (typeof config === 'undefined' || !config.API_URL) {
        console.error("Config or config.API_URL is not defined. Chat cannot function.");
        updateConnectionStatus('error', '', 'Configuration error'); // Use the function if elements exist
        return; // Stop script execution
    }

    // --- Define speakText function directly within this script ---
    let currentSpeechUtterance = null; // Keep track of the current utterance

    function speakText(textToSpeak) {
        if ('speechSynthesis' in window && textToSpeak) {
            if (window.speechSynthesis.speaking) {
                console.log("Cancelling previous speech...");
                window.speechSynthesis.cancel();
            }
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            currentSpeechUtterance = utterance;
            utterance.onerror = function(event) {
                console.error(`Speech synthesis error: ${event.error}`, event);
                currentSpeechUtterance = null;
            };
            utterance.onend = () => {
                console.log("Speech finished.");
                currentSpeechUtterance = null;
            };
            console.log(`Attempting to speak: "${textToSpeak.substring(0, 50)}..."`);
            window.speechSynthesis.speak(utterance);
        } else if (!('speechSynthesis' in window)) {
            console.warn('Text-to-Speech not supported in this browser.');
        } else {
            console.warn("speakText called with empty or invalid text.");
        }
    }
    // --- End speakText definition ---

    // --- Connection Status Update ---
    function updateConnectionStatus(status, code = '', message = '') {
        // No need for checks here anymore, they happen at the top
        switch (status) {
            case 'connected':
                statusIcon.className = 'status-icon connected fas fa-check-circle';
                statusText.textContent = `Connected ${code ? `(${code})` : ''}`;
                break;
            case 'error':
                statusIcon.className = 'status-icon error fas fa-exclamation-circle';
                statusText.textContent = `Error ${code ? `(${code})` : ''}: ${message}`;
                break;
            case 'connecting':
            default:
                statusIcon.className = 'status-icon connecting fas fa-spinner fa-spin';
                statusText.textContent = 'Connecting...';
                break;
        }
    }

    // --- Check Server Connection ---
    function checkServerConnection() {
        // Config check already done at the top
        updateConnectionStatus('connecting');
        fetch(config.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'ping' })
        })
        .then(response => {
            if (response.ok) {
                return response.json().then(data => {
                     if (data.response === 'pong') { updateConnectionStatus('connected', response.status); }
                     else { updateConnectionStatus('error', response.status, 'Unexpected ping response'); }
                 });
            } else {
                return response.json().then(errData => {
                     updateConnectionStatus('error', response.status, errData.error || 'Server error');
                 }).catch(() => { updateConnectionStatus('error', response.status, 'Server error'); });
            }
         })
        .catch(error => {
            console.error("Connection check error:", error);
            updateConnectionStatus('error', '', 'Cannot connect to server');
        });
    }

    // --- Add Message to Chat UI ---
    function addMessage(content, isUser = false, isThinking = false, modelName = null) {
        const messageId = isThinking ? `thinking-${Date.now()}` : null; // Generate ID only for thinking messages
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        if (messageId) {
            messageDiv.id = messageId;
            messageDiv.classList.add('thinking'); // Add thinking class
        }

        // Use a span for the content, required for the ::after pseudo-element
        const messageContentSpan = document.createElement('span');
        // Set base text for thinking message, actual content otherwise
        messageContentSpan.textContent = isThinking ? 'Thinking' : content;
        messageDiv.appendChild(messageContentSpan);

        // 2. Add model tag for non-thinking AI messages if modelName is provided
        if (!isUser && !isThinking && modelName) {
            const modelTag = document.createElement('span');
            modelTag.className = 'model-tag';
            modelTag.textContent = modelName;
            messageDiv.appendChild(modelTag);
        }

        // Only add speak button for non-thinking AI messages
        if (!isUser && !isThinking && 'speechSynthesis' in window) {
            try {
                const speakButton = document.createElement('button');
                speakButton.textContent = '🔊';
                speakButton.className = 'speak-button';
                speakButton.title = 'Speak this message';
                speakButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    // Pass the original content to speakText, not 'Thinking'
                    speakText(content);
                });
                messageDiv.appendChild(speakButton);
            } catch (e) { console.error("Error creating/appending speak button:", e); }
        } else if (!isUser && !isThinking) { console.log("Speak button not added (speechSynthesis not supported or thinking message)."); }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return messageId; // Return the ID (null if not thinking)
    }

    // --- Remove Message from Chat UI ---
    function removeMessage(id) {
        const messageEl = document.getElementById(id);
        if (messageEl) {
            console.log(`[removeMessage] Removing element with ID: ${id}`);
            messageEl.remove();
        } else {
            console.warn(`[removeMessage] Element with ID ${id} not found.`);
        }
    }

    // --- Send Message to Backend ---
    async function sendMessage() {
        // Element and config checks done at top
        const message = userInput.value.trim();
        if (!message) return;

        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        addMessage(message, true); // Add user message (returns null)
        userInput.value = '';

        let thinkingMsgId = null; // Variable to hold the thinking indicator ID

        try {
            // Add Thinking Indicator using addMessage
            thinkingMsgId = addMessage("Thinking", false, true); // Add thinking message, store its ID
            console.log(`[sendMessage] Thinking indicator ADDED with ID: ${thinkingMsgId}.`);

            // Perform Fetch
            const response = await fetch(config.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            // Remove thinking indicator *before* processing response
            if (thinkingMsgId) {
                removeMessage(thinkingMsgId);
                thinkingMsgId = null; // Clear the ID after removal
            }

            // Process Response
            const data = await response.json();
            console.log("[sendMessage] API Response Data:", data);

            if (response.ok) {
                updateConnectionStatus('connected', response.status);
                if (data && data.response) {
                    // 3. Extract model name and pass it to addMessage
                    const modelUsed = data.model_used || null; // Extract model name, default to null if missing
                    addMessage(data.response, false, false, modelUsed); // Add AI response with model name
                } else {
                    console.error("[sendMessage] API response missing 'response' field:", data);
                    addMessage("Error: Received an empty or invalid response from the AI."); // Pass default args
                }
            } else {
                 console.error("[sendMessage] API Error:", response.status, data);
                 const errorMessage = data.error || `Server responded with status ${response.status}`;
                 updateConnectionStatus('error', response.status, errorMessage);
                 addMessage(`Error: ${errorMessage}`); // Display API error (no model name here)
            }

        } catch (error) {
            console.error("[sendMessage] Fetch Error:", error);
            updateConnectionStatus('error', '', 'Network error');
            addMessage('Error: Could not connect to the server. Please check your connection.'); // Display fetch error

        } finally {
            console.log("[sendMessage] Entering finally block.");
            // --- Ensure thinking indicator is removed if an error occurred before explicit removal ---
            if (thinkingMsgId) {
                console.warn("[sendMessage] Removing thinking indicator in finally block (likely due to an early error).");
                removeMessage(thinkingMsgId);
            }
             // Re-enable input and button
             userInput.disabled = false;
             sendButton.disabled = false;
             sendButton.textContent = 'Send';
             userInput.focus(); // Set focus back to input
             console.log("[sendMessage] Finally block finished.");
        }
    }

    // --- Initialize Chat ---

    // Event listeners (already checked elements at top)
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Initial connection check
    checkServerConnection();

    // Periodic connection check every 60 seconds
    setInterval(checkServerConnection, 60000);

    // Add initial welcome message (now uses the modified addMessage)
    addMessage("Welcome, friend. Enter a Bible reference (e.g., John 3:16, Romans 8, Genesis 1:1-5) and I shall provide commentary grounded in the Word. Remember to seek the Holy Spirit's guidance above all. Avoid sharing sensitive personal information."); // isUser=false, isThinking=false by default

    // Initial focus
    userInput.focus();

}); // End DOMContentLoaded