const { OpenAI } = require('openai');
const fs = require('fs');
const d = require('./dontshareconfig'); // Contains the API key

const client = new OpenAI({apiKey:d.key});

async function createAssistant() {
  try {
    const assistant = await client.beta.assistants.create({
      name: 'IYAM',
      instructions: 'Your task is to control a web interface, navigate URLs, query DOM, enter text, etc. Generate plans and instructions for the Client.',
      model: 'gpt-4-1106-preview'
    });

    console.log('Assistant created:', assistant.id);
    fs.writeFileSync('assistant_id.txt', assistant.id);
  } catch (error) {
    console.error('Error creating assistant:', error);
  }
}

createAssistant();
