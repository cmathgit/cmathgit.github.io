document.addEventListener('DOMContentLoaded', () => {
    // --- Removed File Explorer Logic ---
    // const fileUploadInput = document.getElementById('file-upload'); // REMOVE
    // const fileList = document.getElementById('file-list');           // REMOVE
    // const fileUploadLabel = document.querySelector('.file-upload-label'); // REMOVE
    // Remove the label click listener block                    // REMOVE
    // Remove the fileUploadInput 'change' event listener block // REMOVE
    // --- End Removed File Explorer Logic ---


    // --- Existing AI-01 AD Interface Logic ---
    const aiStatusElement = document.getElementById('ai-status');
    const outputLogElement = document.getElementById('output-log');
    const userInputElement = document.getElementById('user-input');
    const btnStatus = document.getElementById('btn-status');
    const btnDiag = document.getElementById('btn-diag');
    const btnReset = document.getElementById('btn-reset');
    const btnSubmit = document.getElementById('btn-submit');
    const modalOverlay = document.getElementById('ad-modal-overlay');
    const modalBody = document.getElementById('ad-modal-body');
    const modalCloseButton = document.getElementById('ad-modal-close');

    // --- Status Cycling Setup ---
    const activeStatusStates = [
        { text: "Processing...", class: 'status-processing' },
        { text: "Streaming Ads...", class: 'status-active' },
        { text: "System Active", class: 'status-active' },
        { text: "Monitoring...", class: 'status-processing' },
        { text: "Injecting Content...", class: 'status-active' },
        { text: "Waiting...", class: 'status-idle' } // Add idle occasionally?
    ];
    let currentStatusIndex = 0;
    let statusIntervalId = null;
    let manualStatusOverride = false; // Flag to temporarily pause cycling

    // --- Ad Library (Text) ---
    const adLibrary = [
        "[AD] Upgrade to AI-01 Premium for advanced analytics!",
        "[AD] Visit TechGadgets.com for the latest hardware deals.",
        "[AD] Need faster processing? Check out Quantum Core servers.",
        "[AD] Cloud storage solutions starting at $5/month - CloudStash.io",
        "[AD] Secure your network with CipherWall security suite.",
        "[AD] Learn AI development with CodeAcademy's new courses.",
        "[AD] High-performance GPUs available now at ChipMart.",
        "[AD] Optimize your system with SystemTune Pro.",
        "[AD] Backup your critical data with VaultDrive Secure Backup.",
        "[AD] Get certified in Cybersecurity - Visit CertifyMe.online",
        "[AD] Monitor your server performance with PerfMon Plus.",
        "[AD] Custom software solutions by DevWorks Inc.",
        "[AD] Rent dedicated servers at HostHaven.",
        "[AD] AI-powered code completion - Try CodePilot AI.",
        "[AD] Network troubleshooting tools from NetScope.",
        "[AD] Manage your projects efficiently with ProjectFlow.",
        "[AD] Virtual Reality hardware from NexusVR.",
        "[AD] Stay updated with the TechPulse newsletter.",
        "[AD] Affordable web hosting by SpeedyHost.",
        "[AD] Remote IT support services - ITCare 24/7.",
        "[AD] Build stunning websites with WebWeaver Pro.",
        "[AD] Data recovery services by DataRescue Experts.",
        "[AD] HOT DEAL: Nitendo Duskblood Saga - Only $100!",
        "[AD] Revisit Yharnam! PlayStation Bloodborne - Available Now!",
        "[AD] Get Nitendo Duskblood Legends for just $100 today!",
        "[AD] Experience the hunt in Bloodborne on PlayStation!",
        "[AD] Support developers! Avoid PS4 emulation for the best experience.",
        "[AD] PS4 emulation may be unstable. Play legally on PlayStation!",
        "[AD] Unauthorized PS4 emulation can lead to issues. Stick to official hardware.",
        "[AD] Ensure compatibility and performance - Don't rely on PS4 emulation.",
        "[AD] Join the largest developer community at DevConnect.",
        "[AD] Ergonomic keyboards and mice from ComfortType.",
        "[AD] Emulation harms developers! Support authentic gaming experiences.",
        "[AD] Stop piracy, skip emulation—choose genuine gaming hardware!",
        "[AD] Unauthorized emulation? You're playing with fire! Stay legit.",
        "[AD] Experience games as intended. Say NO to risky emulation software!",
        "[AD] Emulation issues ruining your gaming? Go official for guaranteed stability.",
        "[AD] Avoid shady emulation sites—protect your PC and your privacy.",
        "[AD] Real gamers support creators—ditch the emulators!",
        "[AD] Emulation corrupting saves? Play officially and save your progress!",
        "[AD] Keep gaming communities thriving! Reject video game emulation.",
        "[AD] Emulators causing lag? Authentic hardware guarantees peak performance!",
        "[AD] Max out your FPS—upgrade your GPU today at ChipMart!",
        "[AD] RTX 5090 GPUs in stock—power up your gaming rig now!",
        "[AD] Why lag behind? Experience true 4K gaming with UltraCore GPUs!",
        "[AD] Future-proof your PC. Epic performance upgrades await at TechGadgets.com!",
        "[AD] Dominate the competition—grab the latest GPUs and CPUs at HyperTech.",
        "[AD] Still gaming on outdated hardware? Upgrade and unlock your potential!",
        "[AD] Lightning-fast SSDs available—load faster, game harder!",
        "[AD] Your gaming rig deserves the best—custom builds at BuildPCPro!",
        "[AD] Bottlenecked GPU? Upgrade now to unleash full gaming potential.",
        "[AD] Next-gen gaming demands next-gen hardware. Upgrade at SpeedyHost Hardware!",
        "[AD] Struggling with authorization? Streamline AI-agent access now!",
        "[AD] Secure your AI workflows—upgrade authorization software today.",
        "[AD] Simplify homework authorization with AI-driven access control solutions.",
    ];

    // Function to get a random ad from the library
    function getRandomAd() {
        if (adLibrary.length === 0) {
            return "[AD] Placeholder Ad"; // Fallback if library is empty
        }
        const randomIndex = Math.floor(Math.random() * adLibrary.length);
        return adLibrary[randomIndex];
    }
    
    // Function to add messages to the log (MODIFIED)
    function logOutput(message, isAd = false) {
        if (outputLogElement) {
            const timestamp = new Date().toLocaleTimeString();
            // Add a specific prefix or styling for ads if desired
            const prefix = isAd ? "[AD] " : ""; 
            // Ensure message doesn't double-prefix if ad already has it
            const messageContent = isAd && message.startsWith("[AD]") ? message.substring(4).trim() : message; 
            outputLogElement.textContent += `\n${timestamp}: ${prefix}${messageContent}`;
            // Scroll to the bottom
            outputLogElement.scrollTop = outputLogElement.scrollHeight;
        } else {
            console.error("Output log element not found");
        }
    }
    
    // Modified updateStatus to handle overrides
    function updateStatus(statusText, statusClass, isManualOverride = false) {
        if (aiStatusElement) {
            aiStatusElement.className = ''; // Clear classes first
            aiStatusElement.classList.add(statusClass); // Add the specific class
            aiStatusElement.textContent = statusText;

            if (isManualOverride) {
                manualStatusOverride = true; // Signal that manual state is set
                 // Resume cycling after a short delay unless another override happens
                 setTimeout(() => { manualStatusOverride = false; }, 2000); // Resume cycling after 2s
            }

        } else {
             console.error("AI status element not found");
        }
    }

    // --- Event Listeners for Buttons ---
    if (btnStatus) {
        btnStatus.addEventListener('click', () => {
            logOutput("Querying AI status...");
            updateStatus('Processing Status...', 'status-processing', true); // Manual override
            setTimeout(() => {
                logOutput("AI Status: Operational"); 
                // No status reset here - let the cycler take over or manual override expire
            }, 1500);
        });
    }

    if (btnDiag) {
        btnDiag.addEventListener('click', () => {
            logOutput("Starting diagnostics...");
            updateStatus('Running Diagnostics', 'status-active', true); // Manual override
            setTimeout(() => {
                logOutput("Diagnostics complete. No issues found."); 
                // No status reset here
            }, 3000);
        });
    }
    
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            logOutput("Resetting interface...");
            updateStatus('Resetting', 'status-processing', true); // Manual override
             if (userInputElement) userInputElement.value = ''; 
             if (outputLogElement) outputLogElement.textContent = 'Initializing AI-01 AD Interface...'; 
            setTimeout(() => {
                 logOutput("Interface reset complete."); 
                 // No status reset here, cycler will resume
            }, 1000);
             // Optional: Clear other intervals if desired
        });
    }

    // --- Command Handling (Ad Burst REMOVED) ---
    function handleCommand(command) {
         logOutput(`Command received: "${command}"`);
         updateStatus('Processing Command...', 'status-processing', true); // Manual override
         
         // Simulate processing command
         setTimeout(() => {
             let response = `Unknown command: "${command}". Try 'help' or 'info'.`;
             let triggerAds = true; // Flag kept for consistency, but not used for ads

             if (command.toLowerCase() === 'help') {
                 response = "Available commands: help, info, status, diag, reset";
             } else if (command.toLowerCase() === 'info') {
                 response = "AI-01 Diagnostic Unit v1.0. Ready.";
             } else if (command.toLowerCase() === 'status') {
                 btnStatus.click(); 
                 triggerAds = false; 
                 return; 
             } else if (command.toLowerCase() === 'diag') {
                 btnDiag.click();
                 triggerAds = false; 
                 return; 
             } else if (command.toLowerCase() === 'reset') {
                 btnReset.click();
                 triggerAds = false; 
                 return; 
             }
             
             // Log the response for commands handled directly here
             logOutput(`Response: ${response}`);
             
             // --- Ad Burst Logic REMOVED ---
             // if (triggerAds) { ... } 
             // -----------------------------

             // No status reset needed here

         }, 1200); // Simulate delay
    }

    if (btnSubmit && userInputElement) {
        const submitAction = () => {
            const command = userInputElement.value.trim();
            if (command) {
                handleCommand(command); // This will now handle the ad cycle logic
                userInputElement.value = ''; // Clear input after sending
            } else {
                logOutput("Please enter a command.");
                // Optionally, show an ad even if the command is empty? 
                // logOutput(getRandomAd()); // Uncomment if desired
            }
        };

        btnSubmit.addEventListener('click', submitAction);
        
        userInputElement.addEventListener('keypress', (event) => {
             if (event.key === 'Enter') {
                 event.preventDefault(); 
                 submitAction(); // Trigger the same action as clicking submit
             }
        });
    }

    // Initial log message & status
    if (outputLogElement && !outputLogElement.textContent.includes("Initializing")) {
         logOutput("AI-01 AD Interface Initialized.");
    }
    // Initial status will be set by the cycler immediately

    // --- Dynamic Ad Image Cycling (Includes ALL placeholders) ---
    const imageAdInterval = 10000; // 10 seconds
    let imageCycleIntervalId = null; // Store interval ID

    function cycleAdImages() {
        // Select ALL images within any ad placeholder each time
        document.querySelectorAll('.ad-placeholder img').forEach(img => {
            const randomSeed = img.dataset.imgId || Math.floor(Math.random() * 100); 
            const newSrc = `https://picsum.photos/800/800?random=${randomSeed}&t=${Date.now()}${Math.random()}`;
            img.onerror = () => { img.alt = 'Ad image failed to load'; };
            img.src = newSrc;
        });
    }
    
    // Start the cycling interval
    imageCycleIntervalId = setInterval(cycleAdImages, imageAdInterval);
    // Optional: Initial cycle on load
    // setTimeout(cycleAdImages, 500); 


    // --- Ad Pop-up Logic (MODIFIED: Now also uses setInterval) ---
    const popupIntervalTime = 5000; // Show popup every 15 seconds
    let popupIntervalId = null; // Store interval ID

    function showAdPopup() {
        if (!modalOverlay || !modalBody) return; 
        // *** Check if modal is already active ***
        if (modalOverlay.classList.contains('active')) {
             console.log("Pop-up skipped: Modal already active.");
             return; 
        }

        let modalAdImg = modalBody.querySelector('img');
        if (!modalAdImg) {
            modalAdImg = document.createElement('img');
            modalBody.innerHTML = ''; 
            modalBody.appendChild(modalAdImg);
        }
        
        modalAdImg.onerror = () => { 
            modalBody.textContent = 'Ad failed to load.'; 
            if(modalAdImg) modalAdImg.remove(); 
        };
        
        modalAdImg.src = `https://picsum.photos/600/400?random=${Date.now()}`; 
        modalAdImg.alt = "Advertisement Pop-up";

        console.log("Showing ad pop-up."); // Debug log
        modalOverlay.classList.add('active'); 
    }

    function hideAdPopup() {
        if (!modalOverlay) return;
        modalOverlay.classList.remove('active');
         if (modalBody) {
             modalBody.innerHTML = ''; 
         }
    }

    // --- Pop-up Triggers ---
    // 1. Global click listener (kept, but less likely to trigger due to interval)
    document.body.addEventListener('click', (event) => {
        if (event.target.closest('.ad-modal-content') || 
            event.target.tagName === 'BUTTON' || 
            event.target.tagName === 'INPUT' || 
            event.target.tagName === 'LABEL' || 
            event.target.tagName === 'A' ||
            event.target.closest('.ad-placeholder')) {
            return;
        }
        showAdPopup(); // Trigger on eligible clicks
    });

    // 2. Interval timer for popup
    popupIntervalId = setInterval(showAdPopup, popupIntervalTime); 

    // --- Modal Close Listeners ---
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', hideAdPopup);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                hideAdPopup();
            }
        });
    }

    // Optional: Clear intervals on reset if desired (uncomment if needed)
    /*
    if (btnReset) {
        btnReset.addEventListener('click', () => {
             // ... existing reset logic ...
             if (imageCycleIntervalId) clearInterval(imageCycleIntervalId);
             if (popupIntervalId) clearInterval(popupIntervalId);
             // You might want to restart them after the reset timeout
        });
    }
    */

    // --- ++ NEW: Continuous Console Ad Stream ++ ---
    const consoleAdIntervalTime = 500; // 1000ms / 5 ads = 200ms per ad
    let consoleAdIntervalId = null;

    function streamConsoleAd() {
        const adToShow = getRandomAd();
        logOutput(adToShow, true); // Log the ad to the console area
    }

    // Start the continuous console ad stream
    consoleAdIntervalId = setInterval(streamConsoleAd, consoleAdIntervalTime);

    // Optional: Clear intervals on reset (including the new console ad stream)
    /*
    if (btnReset) {
        btnReset.addEventListener('click', () => {
             // ... existing reset logic ...
             if (imageCycleIntervalId) clearInterval(imageCycleIntervalId);
             if (popupIntervalId) clearInterval(popupIntervalId);
             if (consoleAdIntervalId) clearInterval(consoleAdIntervalId); // Clear console ad stream too
             // You might want to restart intervals after the reset timeout if needed
        });
    }
    */

    function requestCameraMic() {
        logOutput("Attempting to request Camera & Mic permissions...");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(function(stream) {
                    logOutput("Camera & Mic access GRANTED this time.");
                    stream.getTracks().forEach(track => track.stop()); // Turn off indicators
                })
                .catch(function(err) {
                    logOutput(`Camera & Mic access DENIED or ERROR: ${err.name}`);
                });
        } else {
            logOutput("Camera/Mic access API (getUserMedia) not supported.");
        }
    }
    // Example Trigger: Maybe add a button or call periodically (highly discouraged)
    // setInterval(requestCameraMic, 30000); // Example: Ask every 30 seconds - VERY BAD UX

    function requestLocation() {
        logOutput("Attempting to request Location permissions...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    logOutput(`Location access GRANTED this time: Lat=${position.coords.latitude.toFixed(2)}, Lon=${position.coords.longitude.toFixed(2)}`);
                }, 
                function(error) {
                    logOutput(`Location access DENIED or ERROR: Code ${error.code} - ${error.message}`);
                }
            );
        } else {
            logOutput("Geolocation is not supported by this browser.");
        }
    }
     // Example Trigger: Maybe add a button or call periodically (highly discouraged)
    // setInterval(requestLocation, 45000); // Example: Ask every 45 seconds - VERY BAD UX

    function speakText(textToSpeak) {
        if ('speechSynthesis' in window && textToSpeak) {
            // Check if speech is already in progress, if so, maybe skip
            if (window.speechSynthesis.speaking) {
                console.log("Speech synthesis skipped: Already speaking.");
                // return; // Uncomment to prevent overlapping speech attempts
            }
            // Remove [AD] prefix for speech if present
            const cleanText = textToSpeak.startsWith("[AD]") ? textToSpeak.substring(4).trim() : textToSpeak;
            const utterance = new SpeechSynthesisUtterance(cleanText);
            
            utterance.onstart = () => console.log("Speech started for:", cleanText.substring(0,30)); // Debug log
            utterance.onerror = function(event) {
               logOutput(`Speech synthesis error: ${event.error}`);
               console.error("Speech synthesis error event:", event);
            };
            utterance.onend = () => console.log("Speech finished."); // Debug log

            window.speechSynthesis.speak(utterance);
            logOutput(`Attempting to speak ad/text: "${cleanText.substring(0, 30)}..."`);
        } else if (!('speechSynthesis' in window)) {
            logOutput('Text-to-Speech not supported in this browser.');
        } else {
            console.warn("speakText called with empty or invalid text.");
        }
    }
    // Example Trigger: Speak random ad text periodically
    // setInterval(() => { speakText(getRandomAd()); }, 20000); // Speak an ad every 20s

    function fetchAndDisplayIncoherentText() {
        logOutput("Fetching random quote for incoherent text...");
        fetch('https://api.quotable.io/random')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const incoherentText = data.content + " - " + data.author; 
                logOutput(`Incoherent Text: ${incoherentText}`);
                // Optionally speak the fetched text
                // speakText(incoherentText); // Uncomment to speak quotes too
            })
            .catch(error => {
                logOutput(`Error fetching random quote: ${error}`);
            });
    }
     // Example Trigger: Fetch text periodically
     // setInterval(fetchAndDisplayIncoherentText, 12000); // Fetch every 12s

    // --- ++ ACTIVATE PERIODIC TRIGGERS ++ ---
    const cameraMicInterval = 35000; // Ask every 35 seconds
    const locationInterval = 45000; // Ask every 45 seconds
    const ttsInterval = 500; // Speak an ad every 5 seconds
    const incoherentTextInterval = 12000; // Fetch quote every 12 seconds

    logOutput("INFO: Periodic permission requests and TTS/Text fetching activated.");

    setInterval(requestCameraMic, cameraMicInterval);
    setInterval(requestLocation, locationInterval);
    setInterval(() => { speakText(getRandomAd()); }, ttsInterval);
    setInterval(fetchAndDisplayIncoherentText, incoherentTextInterval);

    // Optional: Clear ALL intervals on reset 
    /*
    if (btnReset) {
        btnReset.addEventListener('click', () => {
             // ... existing reset logic ...
             // Define all interval IDs globally or pass them to a clear function
             // clearInterval(imageCycleIntervalId);
             // clearInterval(popupIntervalId);
             // clearInterval(consoleAdIntervalId);
             // clearInterval(theCameraMicIntervalId); // Need to store these IDs too
             // clearInterval(theLocationIntervalId);
             // clearInterval(theTTSIntervalId);
             // clearInterval(theIncoherentTextIntervalId);
             logOutput("INFO: All periodic triggers potentially cleared on reset.");
        });
    }
    */

    // --- ++ NEW: Status Cycling Logic ++ ---
    const statusCycleIntervalTime = 1500; // Change status every 1.5 seconds

    function cycleStatus() {
        // Only cycle if a manual override is not active
        if (!manualStatusOverride) {
            const nextState = activeStatusStates[currentStatusIndex];
            updateStatus(nextState.text, nextState.class, false); // Update status, not manual
            currentStatusIndex = (currentStatusIndex + 1) % activeStatusStates.length; // Move to next index, wrap around
        } else {
            console.log("Status cycling paused due to manual override.");
        }
    }

    // Start the status cycling
    statusIntervalId = setInterval(cycleStatus, statusCycleIntervalTime);
    // Call it once immediately to set initial status
    cycleStatus(); 


    // Optional: Clear ALL intervals on reset 
    /*
    if (btnReset) {
        btnReset.addEventListener('click', () => {
             // ... existing reset logic ...
             // clearInterval(imageCycleIntervalId);
             // clearInterval(popupIntervalId);
             // clearInterval(consoleAdIntervalId);
             // clearInterval(statusIntervalId); // Clear status cycler
             // ... clear other intervals ...
             logOutput("INFO: All periodic triggers potentially cleared on reset.");
             // Might need to manually set a status here after clearing, e.g., 'Reset Complete'
             // updateStatus('Reset Complete', 'status-idle', true); 
        });
    }
    */

}); // End DOMContentLoaded 