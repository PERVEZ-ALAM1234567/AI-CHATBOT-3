# AI Chatbot 3

A responsive AI chatbot web app built with HTML, CSS, JavaScript, Express, and the Google Generative AI SDK. The frontend has a Claude-style chat interface with chat history controls, dark mode, suggestion prompts, copy actions, typing indicator, and markdown/code formatting.

> Note: The UI currently uses Claude-style text and labels, while the backend sends prompts to Gemini through `@google/generative-ai`.

## Features

- Clean chat UI with sidebar, chat list, and searchable conversations.
- User and assistant message bubbles with markdown rendering.
- Code block highlighting and copy-code support.
- Typing indicator while waiting for the AI response.
- Dark mode toggle from the settings modal.
- Suggestion chips for quick prompt starters.
- Rename and delete chat actions.
- Express server that serves the frontend from `public/`.
- `/chat` API endpoint connected to Google Gemini.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- AI SDK: `@google/generative-ai`
- Utilities: `dotenv`, `cors`

## Project Structure

```text
AI CHATBOT 3/
+-- public/
|   +-- index.html
|   +-- script.js
|   +-- style.css
+-- images/
+-- server.js
+-- package.json
+-- package-lock.json
+-- .env
+-- .gitignore
```

## Requirements

- Node.js installed
- A Gemini API key from Google AI Studio

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Start the server:

```bash
node server.js
```

4. Open the app in your browser:

```text
http://localhost:3000
```

## API

### POST `/chat`

Sends a user message to the AI model and returns the generated reply.

Request body:

```json
{
  "message": "Explain JavaScript promises in simple terms"
}
```

Success response:

```json
{
  "reply": "AI generated response..."
}
```

Error response examples:

```json
{
  "reply": "Message is required"
}
```

```json
{
  "reply": "API error occurred",
  "error": "Error message"
}
```

## Configuration

The Gemini model is configured in `server.js`:

```js
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});
```

To use another supported model, replace the model name in `server.js`.

## Development Notes

- Static frontend files are served from the `public/` folder.
- `.env` and `node_modules/` are ignored by Git.
- The current `npm test` script is a placeholder and does not run automated tests yet.
- The server runs on port `3000`.

## Troubleshooting

### `GEMINI_API_KEY missing in .env file`

Make sure the `.env` file exists in the project root and contains:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Browser cannot open `localhost:3000`

Confirm that the server is running:

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

### AI response is not coming

- Check that the Gemini API key is valid.
- Check the terminal output for the full backend error.
- Confirm that the `/chat` route is receiving a non-empty `message`.

## License

This project currently uses the ISC license from `package.json`.
