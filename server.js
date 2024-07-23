const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const upload = multer({ dest: "uploads/" }); // Directory to save uploaded files

app.use(express.json());
app.use(express.static(path.join(__dirname, "client/build"))); // Serve static files from React build directory

// Serve the user interface page
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

const sessions = {}; // In-memory session store

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("auth", (data) => {
    const sessionToken = data.sessionToken;

    if (sessions[sessionToken]) {
      // Restore session
      socket.session = sessions[sessionToken];
      console.log("Session restored for client:", socket.id);
    } else {
      // Create new session
      socket.session = { id: socket.id };
      sessions[sessionToken] = socket.session;
      console.log("New session created for client:", socket.id);
    }

    // Send initial message
    const initialMessage = { content: "Hello! How can I assist you today?" };
    handleMessage(socket, initialMessage);
  });

  socket.on("message", (msg) => {
    handleMessage(socket, msg);
  });

  function handleMessage(socket, msg) {
    try {
      const response = processMessage(msg);
      const { DISPLAY, ACTION, LOG } = response;

      console.log(LOG);
      fs.appendFileSync("log.txt", `${LOG}\n`);

      socket.emit("display", DISPLAY);
      socket.emit("action", ACTION);

      if (ACTION === "serverAction") {
        processServerAction();
      } else {
        socket.emit("clientAction", ACTION);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  socket.on("upload", (fileData) => {
    console.log("File uploaded:", fileData);
    // Process the uploaded file if needed
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

function processMessage(msg) {
  // Dummy function to simulate processing a message
  const displayMessage = `Processed message: ${JSON.stringify(msg)}`;
  const action = "noAction"; // Replace with actual logic
  const log = `Processed message log: ${JSON.stringify(msg)}`;

  return { DISPLAY: displayMessage, ACTION: action, LOG: log };
}

function processServerAction() {
  // Implement server-side action processing
}

server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
