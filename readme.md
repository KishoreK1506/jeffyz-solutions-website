# Jeffyz Solutions website

A polished multi-page website for Jeffyz Solutions with:
- client-facing homepage and service pages
- PC consultation flow
- AI support page with structured responses
- contact form that can email you and auto-reply to the customer
- black visual theme with MP4 hero background

## Run locally

```bash
npm install
npm start
```

Open:
- `http://localhost:5000`
- `http://localhost:5000/ai-support.html`

## Email setup

Create a `.env` file from `.env.example`.

Use these values:

```env
PORT=5000
EMAIL_ENABLED=true
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_google_app_password
EMAIL_TO=yourgmail@gmail.com
EMAIL_FROM_NAME=Jeffyz Solutions
AI_PROVIDER=mock
```

Important:
- `EMAIL_PASS` must be a Google App Password, not your normal Gmail password.
- When `EMAIL_ENABLED=false`, contact form submissions are stored locally in `data/contact-submissions.json`.

## AI setup

### Mock mode
Fastest for testing:

```env
AI_PROVIDER=mock
```

### OpenAI mode

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4
```

### Ollama mode

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=llama3.2
```

## Deployment note for AI and query features

The AI chat and contact form need the Node/Express backend to be running.

These features will **not work** if you deploy only the static `public` files to S3 or any static-only hosting.

You have two correct deployment choices:
1. Deploy the full Node app on EC2, Docker, Render, Railway, or another server platform.
2. Host the frontend separately, host the backend separately, and then set the backend URL in `public/site-config.js`.

## Separate frontend/backend hosting

If your frontend is on one domain and backend is on another domain, edit:

```js
public/site-config.js
```

Set:

```js
window.JEFFYZ_CONFIG = {
  apiBaseUrl: "https://your-backend-domain.com"
};
```

That makes both:
- contact form
- AI support page

talk to the correct backend after deployment.
