const UI = {
    micButton: document.getElementById("mic-btn"),
    keyboardButton: document.getElementById("keyboard-btn"),
    messageInput: document.getElementById("message-input"),
    sendButton: document.getElementById("send-btn"),
    messageSection: document.getElementById("message-section"),
    messageContent: document.getElementById("message-content"),
    activeMode: null,
  };

  // Initialization
  function init() {
    UI.messageInput.addEventListener("input", handleInput);
    UI.messageInput.addEventListener("keypress", handleEnterKey);
    UI.sendButton.addEventListener("click", sendMessage);
    UI.keyboardButton.addEventListener("click", toggleKeyboard);
    UI.micButton.addEventListener("click", toggleMicrophone);
  }
  // Show Typing Indicator
  function showTypingIndicator() {
      const typingDiv = document.createElement("div");
      typingDiv.classList.add("chat-message", "bot", "typing");
      UI.messageContent.appendChild(typingDiv);
      UI.messageContent.scrollTop = UI.messageContent.scrollHeight; // Scroll to latest message

      // Step 1: Animate "⛁⛁ Data is fetched..."
      const message1 = "⛁ Data is fetched..";
      let charIndex1 = 0;

      typingDiv.style.color = "white";
      typingDiv.style.background = "none"; // No background color
      typingDiv.style.border = "none"; // No border
      typingDiv.style.padding = "0"; // No padding around the text


      function typeMessage1() {
          if (charIndex1 < message1.length) {
              typingDiv.innerHTML += message1[charIndex1];
              charIndex1++;
              setTimeout(typeMessage1, 50); // Typing speed (100ms per character)
          }
      }

      typeMessage1(); // Start typing the first message

      // Wait for 1 second before changing to the next step
      setTimeout(() => {
          typingDiv.innerHTML = ''; // Clear the previous message
          const message2 = "✒️ Agent is typing...⏳";
          let charIndex2 = 0;

          function typeMessage2() {
              if (charIndex2 < message2.length) {
                  typingDiv.innerHTML += message2[charIndex2];
                  charIndex2++;
                  setTimeout(typeMessage2, 50); // Typing speed (100ms per character)
              }
          }

          typeMessage2(); // Start typing the second message
      }, 1300); // Wait 1 second before starting the next message
  }

  // Remove Typing Indicator
  function removeTypingIndicator() {
      const typingDiv = document.querySelector(".chat-message.typing");
      if (typingDiv) typingDiv.remove();
  }

  // Send message handler
  function sendMessage() {
    const userQuery = UI.messageInput.value.trim();
    if (!userQuery) return;

    // Add user message to chat
    addMessage(userQuery, "user");
    UI.messageInput.value = "";
    UI.sendButton.disabled = true;
    
    showTypingIndicator()
    // Make AJAX request to Flask backend to get the bot's response
    fetch('/get_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_query: userQuery })
    })
    .then(response => response.json())
    .then(data => {
      // Add bot response to chat
      removeTypingIndicator()
      addMessage(data.response, "bot");
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }
  
  // Scroll Automatically
  function scrollToBottom() {
      UI.messageContent.scrollTop = UI.messageContent.scrollHeight;
  }
  // Add message to chat window
  function addMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message", sender);
    messageDiv.innerHTML = message;
    UI.messageContent.appendChild(messageDiv);
    UI.messageContent.scrollTop = UI.messageContent.scrollHeight;  // Scroll to latest message
  }

  // Simulate voice input listening
  function startListening() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
        console.log("Listening...");
        UI.micButton.classList.add("mic-listening");
        UI.keyboardButton.style.display = "none";

        // 🔥 FIX: Delay the announcement to avoid browser blocking
        setTimeout(() => {
            speakText("hello User.");
        }, 100); // 500ms delay
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        console.log("Recognized text:", transcript);

        // Display the recognized text as a user message
        addMessage(transcript, "user");

        // Send the recognized text to the backend
        fetch('/get_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_query: transcript })
        })
        .then(response => response.json())
        .then(data => {
            addMessage(data.response, "bot"); // Display bot response
            speakText(data.response); // Speak bot response via device's speaker
        })
        .catch(error => {
            console.error("Error:", error);
        });
    };

    recognition.onerror = function (event) {
        console.error("Recognition error:", event.error);
    };

    recognition.onend = function () {
        console.log("Stopped listening.");
        UI.micButton.classList.remove("mic-listening");
        resetUI();
    };

    recognition.start();
}

// Function to speak text (Text-to-Speech)
async function speakText(text) {
const API_KEY = "sk_aecd5f61477ad9b63953a7632bae8d1d268ced808ae9ef34"; // Replace with your ElevenLabs API key
const VOICE_ID = "90ipbRoKi4CpHXvKVtl0"; // Replace with your preferred voice ID

try {
    let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": API_KEY
        },
        body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2", output_format: "mp3_44100_128" })
    });

    if (!response.ok) throw new Error("API request failed");

    let audioBlob = await response.blob();
    new Audio(URL.createObjectURL(audioBlob)).play();
} catch (error) {
    console.warn("Using browser speech synthesis:", error);
    let utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}
}


  // Toggle keyboard mode
  function toggleKeyboard() {
    if (UI.activeMode === "keyboard") {
      resetUI();
    } else {
      UI.activeMode = "keyboard";
      UI.messageSection.classList.add("active");
      UI.messageInput.focus();
      updateButtons();
    }
  }

  // Toggle microphone mode
  function toggleMicrophone() {
    if (UI.activeMode === "mic") {
      resetUI();
    } else {
      UI.activeMode = "mic";
      startListening();
      updateButtons();
    }
  }

  // Update button states
  function updateButtons() {
    const isKeyboard = UI.activeMode === "keyboard";
    const isMic = UI.activeMode === "mic";

    UI.keyboardButton.classList.toggle("btn-cancel", isKeyboard);
    UI.keyboardButton.innerHTML = isKeyboard
      ? '<i class="fas fa-times text-white text-2xl"></i>'
      : '<i class="fas fa-keyboard text-white text-2xl"></i>';

    UI.micButton.classList.toggle("btn-cancel", isMic);
    UI.micButton.classList.toggle("mic-listening", isMic);
    UI.micButton.innerHTML = isMic
      ? '<i class="fas fa-times text-white text-2xl"></i>'
      : '<i class="fas fa-microphone text-white text-2xl"></i>';

    // Hide the other button when one mode is active
    UI.keyboardButton.style.display = isMic ? "none" : "flex";
    UI.micButton.style.display = isKeyboard ? "none" : "flex";
  }

  // Enable/disable send button based on input
  function handleInput() {
    UI.sendButton.disabled = UI.messageInput.value.trim() === "";
  }

  // Handle Enter key to send messages
  function handleEnterKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!UI.sendButton.disabled) sendMessage();
    }
  }

  // Reset UI to its default state
  function resetUI() {
    UI.activeMode = null;
    UI.messageSection.classList.remove("active");
    UI.micButton.classList.remove("mic-listening");
    updateButtons();
  }

  // Initialize the application
  init();



// new code 
// const UI = {
//   micButton: document.getElementById("mic-btn"),
//   keyboardButton: document.getElementById("keyboard-btn"),
//   messageInput: document.getElementById("message-input"),
//   sendButton: document.getElementById("send-btn"),
//   messageSection: document.getElementById("message-section"),
//   messageContent: document.getElementById("message-content"),
//   activeMode: null,
// };
// function showTypingIndicator() {
//         const typingDiv = document.createElement("div");
//         typingDiv.classList.add("chat-message", "bot", "typing");
//         UI.messageContent.appendChild(typingDiv);
//         UI.messageContent.scrollTop = UI.messageContent.scrollHeight; // Scroll to latest message
  
//         // Step 1: Animate "⛁⛁ Data is fetched..."
//         const message1 = "⛁ Data is fetched..";
//         let charIndex1 = 0;
  
//         typingDiv.style.color = "white";
//         typingDiv.style.background = "none"; // No background color
//         typingDiv.style.border = "none"; // No border
//         typingDiv.style.padding = "0"; // No padding around the text
  
  
//         function typeMessage1() {
//             if (charIndex1 < message1.length) {
//                 typingDiv.innerHTML += message1[charIndex1];
//                 charIndex1++;
//                 setTimeout(typeMessage1, 50); // Typing speed (100ms per character)
//             }
//         }
  
//         typeMessage1(); // Start typing the first message
  
//         // Wait for 1 second before changing to the next step
//         setTimeout(() => {
//             typingDiv.innerHTML = ''; // Clear the previous message
//             const message2 = "✒️ Agent is typing...⏳";
//             let charIndex2 = 0;
  
//             function typeMessage2() {
//                 if (charIndex2 < message2.length) {
//                     typingDiv.innerHTML += message2[charIndex2];
//                     charIndex2++;
//                     setTimeout(typeMessage2, 50); // Typing speed (100ms per character)
//                 }
//             }
  
//             typeMessage2(); // Start typing the second message
//         }, 1300); // Wait 1 second before starting the next message
//     }
  
//     // Remove Typing Indicator
//     function removeTypingIndicator() {
//         const typingDiv = document.querySelector(".chat-message.typing");
//         if (typingDiv) typingDiv.remove();
//     }
  
// // Conversation history tracking (Stores last 2 interactions)
// let conversationHistory = [];

// // Initialization
// function init() {
//   UI.messageInput.addEventListener("input", handleInput);
//   UI.messageInput.addEventListener("keypress", handleEnterKey);
//   UI.sendButton.addEventListener("click", () => sendMessage());
//   UI.keyboardButton.addEventListener("click", toggleKeyboard);
//   UI.micButton.addEventListener("click", toggleMicrophone);
// }

// // Send message handler (Now displays both user query & bot response for mic input)
// function sendMessage(inputText = null, fromMic = false) {
//   let userQuery = inputText || UI.messageInput.value.trim();
//   if (!userQuery) return;

//   // Show user message in chat (whether from text or mic input)
//   addMessage(userQuery, "user");

//   // Store user message in history
//   conversationHistory.push({ role: "user", content: userQuery });

//   // Keep only the last 2 user-bot interactions (4 messages total)
//   if (conversationHistory.length > 4) {
//       conversationHistory = conversationHistory.slice(-4);
//   }

//   UI.messageInput.value = "";
//   UI.sendButton.disabled = true;
//   showTypingIndicator();

//   // Send conversation history to backend
//   fetch('/get_response', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ conversation_history: conversationHistory })
//   })
//   .then(response => response.json())
//   .then(data => {
//       removeTypingIndicator();
//       if (data.response) {
//           let botResponse = data.response;

//           // Store bot response in history
//           conversationHistory.push({ role: "bot", content: botResponse });

//           // Keep only the last 2 user-bot interactions
//           if (conversationHistory.length > 4) {
//               conversationHistory = conversationHistory.slice(-4);
//           }

//           // Show bot response in chat
//           addMessage(botResponse, "bot");

//           // Speak response if input is from mic
//           if (fromMic) {
//               speakText(botResponse);
//           }
//       } else {
//           addMessage("Error: No response received.", "bot");
//       }
//   })
//   .catch(error => {
//       console.error("Fetch error:", error);
//       addMessage("Error: Unable to process request.", "bot");
//   });
// }

// // Show Typing Indicator
// function showTypingIndicator() {
//   const typingDiv = document.createElement("div");
//   typingDiv.classList.add("chat-message", "bot", "typing");
//   UI.messageContent.appendChild(typingDiv);
//   UI.messageContent.scrollTop = UI.messageContent.scrollHeight;

//   typingDiv.innerHTML = "⛁ Data is fetched..";

//   setTimeout(() => {
//       typingDiv.innerHTML = "✒️ Agent is typing...⏳";
//   }, 1300);
// }

// // Remove Typing Indicator
// function removeTypingIndicator() {
//   const typingDiv = document.querySelector(".chat-message.typing");
//   if (typingDiv) typingDiv.remove();
// }

// // Add message to chat window
// function addMessage(message, sender) {
//   const messageDiv = document.createElement("div");
//   messageDiv.classList.add("chat-message", sender);
//   messageDiv.innerHTML = message;
//   UI.messageContent.appendChild(messageDiv);
//   UI.messageContent.scrollTop = UI.messageContent.scrollHeight;
// }

// // Voice Input Handling (Now shows both user query & bot response)
// function startListening() {
//   const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
//   recognition.lang = "en-IN";

//   recognition.onstart = function () {
//       console.log("Listening...");
//       UI.micButton.classList.add("mic-listening");
//   };

//   recognition.onresult = function (event) {
//       let transcript = event.results[0][0].transcript;
//       console.log("Recognized:", transcript);

//       // Send message and ensure both user query & bot response are shown
//       sendMessage(transcript, true);
//   };

//   recognition.onerror = function (event) {
//       console.error("Speech recognition error:", event.error);
//       addMessage("Error: Voice input failed.", "bot");
//   };

//   recognition.onend = function () {
//       UI.micButton.classList.remove("mic-listening");
//   };

//   recognition.start();
// }

// // Speak Bot Response (Text-to-Speech)
// async function speakText(text) {
//   const API_KEY = "sk_68ad8ec55b55fee26a39f8cccac5e0d00585273b4893dfa4";
//   const VOICE_ID = "wlmwDR77ptH6bKHZui0l";

//   try {
//       let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
//           method: "POST",
//           headers: {
//               "Content-Type": "application/json",
//               "xi-api-key": API_KEY
//           },
//           body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2", output_format: "mp3_44100_128" })
//       });

//       if (!response.ok) throw new Error("API request failed");

//       let audioBlob = await response.blob();
//       new Audio(URL.createObjectURL(audioBlob)).play();
//   } catch (error) {
//       console.warn("Using browser speech synthesis:", error);
//       let utterance = new SpeechSynthesisUtterance(text);
//       speechSynthesis.speak(utterance);
//   }
// }

// // Toggle Keyboard Mode
// function toggleKeyboard() {
//   if (UI.activeMode === "keyboard") {
//       resetUI();
//   } else {
//       UI.activeMode = "keyboard";
//       UI.messageSection.classList.add("active");
//       UI.messageInput.focus();
//       updateButtons();
//   }
// }

// // Toggle Microphone Mode
// function toggleMicrophone() {
//   if (UI.activeMode === "mic") {
//       resetUI();
//   } else {
//       UI.activeMode = "mic";
//       startListening();
//       updateButtons();
//   }
// }

// // Update UI Buttons
// function updateButtons() {
//   const isKeyboard = UI.activeMode === "keyboard";
//   const isMic = UI.activeMode === "mic";

//   UI.keyboardButton.classList.toggle("btn-cancel", isKeyboard);
//   UI.keyboardButton.innerHTML = isKeyboard
//       ? '<i class="fas fa-times text-white text-2xl"></i>'
//       : '<i class="fas fa-keyboard text-white text-2xl"></i>';

//   UI.micButton.classList.toggle("btn-cancel", isMic);
//   UI.micButton.classList.toggle("mic-listening", isMic);
//   UI.micButton.innerHTML = isMic
//       ? '<i class="fas fa-times text-white text-2xl"></i>'
//       : '<i class="fas fa-microphone text-white text-2xl"></i>';

//   UI.keyboardButton.style.display = isMic ? "none" : "flex";
//   UI.micButton.style.display = isKeyboard ? "none" : "flex";
// }

// // Handle Input Enable/Disable Send Button
// function handleInput() {
//   UI.sendButton.disabled = UI.messageInput.value.trim() === "";
// }

// // Handle Enter Key to Send Message
// function handleEnterKey(e) {
//   if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       if (!UI.sendButton.disabled) sendMessage();
//   }
// }

// // Reset UI
// function resetUI() {
//   UI.activeMode = null;
//   UI.messageSection.classList.remove("active");
//   UI.micButton.classList.remove("mic-listening");
//   updateButtons();
// }

// // Initialize the application
// init();
