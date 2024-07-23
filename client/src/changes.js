const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { OpenAI } = require("openai");
const d = require("./dontshareconfig"); // Contains the API key

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const openAI = new OpenAI({ apiKey: d.key });
const client = openAI.beta;
const upload = multer({ dest: "uploads/" }); // Directory to save uploaded files

app.use(express.json());
app.use(express.static(path.join(__dirname, "client/build"))); // Serve static files from React build directory

// Serve the user interface page
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

const clientThreads = new Map(); // Map to store client-thread associations
const assistantId = fs.readFileSync("assistant_id.txt", "utf8");

io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);

  // Check if a thread already exists for this client
  if (!clientThreads.has(socket.id)) {
    await createThreadForClient(socket.id);
  }

  const threadId = clientThreads.get(socket.id);

  // Send an initial message
  const initialMessage = { content: "Hello! How can I assist you today?" };
  await handleMessage(socket, initialMessage, threadId);

  socket.on("message", async (msg) => {
    await handleMessage(socket, msg, threadId);
  });

  socket.on("upload", (fileData) => {
    console.log("File uploaded:", fileData);
    // Process the uploaded file if needed
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

async function createThreadForClient(clientId) {
  try {
    const thread = await client.threads.create({ assistant_id: assistantId });
    clientThreads.set(clientId, thread.id);
    console.log("Thread created for client:", clientId, "Thread ID:", thread.id);
  } catch (error) {
    console.error("Error creating thread:", error);
  }
}

async function handleMessage(socket, msg, threadId) {
  try {
    const assistantResponse = await processMessage(msg, threadId);
    const { DISPLAY, ACTION, LOG } = assistantResponse;

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

async function processMessage(msg, threadId) {
  const message = await client.threads.messages.create({
    thread_id: threadId,
    role: "user",
    content: JSON.stringify(msg),
  });

  const run = await client.threads.runs.create({
    thread_id: threadId,
    assistant_id: assistantId,
  });

  while (true) {
    const runStatus = await client.threads.runs.retrieve({
      thread_id: threadId,
      run_id: run.id,
    });
    if (["completed", "failed", "cancelled"].includes(runStatus.status)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const messages = await client.threads.messages.list({ thread_id: threadId });
  return JSON.parse(
    messages.data[messages.data.length - 1].content[0].text.value
  );
}

function processServerAction() {
  // Implement server-side action processing
}

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
