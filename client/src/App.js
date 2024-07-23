import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

// Function to get query parameter by name
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to generate a unique session token
function generateUniqueSessionToken() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function () {
        return Math.floor(Math.random() * 16).toString(16);
    });
}

// Check if session token exists in URL
let sessionToken = getQueryParam('session');

if (!sessionToken) {
    // If no session token, generate a new one
    sessionToken = generateUniqueSessionToken();
    // Update the URL without reloading the page
    window.history.replaceState(null, null, `?session=${sessionToken}`);
}

const socket = io('ws://yourserver.com', {
    query: { sessionToken: sessionToken }
});

function App() {
  const [instruction, setInstruction] = useState('');
  const [file, setFile] = useState(null);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    socket.on('connect', () => {
      // Send session token to server after connection
      socket.emit('auth', { sessionToken });
    });

    socket.on('display', (displayMessage) => {
      setResponses((prevResponses) => [...prevResponses, displayMessage]);
    });

    socket.on('action', (action) => {
      // Handle any actions if necessary
    });

    return () => {
      socket.off('connect');
      socket.off('display');
      socket.off('action');
    };
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSubmit = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const fileData = event.target.result;
        socket.emit('upload', { fileData, instruction, sessionToken });
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit('message', { instruction, sessionToken });
    }
  };

  return (
    <div className="App">
      <div id="responses">
        {responses.map((response, index) => (
          <div key={index} className="response">{response}</div>
        ))}
      </div>
      <textarea
        id="instruction"
        placeholder="Type your instruction here..."
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <input type="file" id="fileInput" onChange={handleFileChange} />
      <button id="submit" onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default App;
