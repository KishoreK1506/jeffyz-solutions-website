# Jeffyz Solutions – Next-Level Development Build

This package upgrades your current site into a more professional multi-page experience.

## What is included

- improved homepage layout
- dedicated **Services** page
- separate pages for:
  - OS Installation & Recovery
  - Password & Access Help
  - Wireless Communications
  - Router Configuration
  - Switch Configuration
- existing **PC Consultation wizard** kept and integrated
- new **AI Support** page
- backend endpoint for AI support with:
  - `mock` mode for local development
  - `openai` mode
  - `ollama` mode
- contact form connected to backend
- local development fallback storage for contact submissions when email is not configured

## AI support improvements in this version

- upgraded AI support page with a more professional layout
- structured replies with clear sections such as diagnosis, checks, and next step
- recent conversation memory is now sent to the backend
- issue category selector added for better prompt targeting
- quick prompt library improved
- transcript copy button added
- local chat session is preserved in browser storage
- cleaner status handling and typing indicator

## Project structure

```text
jeffyz_next_level/
├── public/
│   ├── assets/
│   ├── index.html
│   ├── services.html
│   ├── ai-support.html
│   ├── os-recovery.html
│   ├── access-help.html
│   ├── wireless-communications.html
│   ├── router-configuration.html
│   ├── switch-configuration.html
│   ├── pc-consultation.html
│   ├── pc-results.html
│   ├── styles.css
│   ├── script.js
│   ├── ai-support.js
│   ├── pc-consultation.css
│   ├── pc-consultation.js
│   └── pc-results.js
├── server.js
├── package.json
├── .env.example
└── Dockerfile
```

## Run locally

### 1. Open the folder

```bash
cd jeffyz_next_level
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

```bash
cp .env.example .env
```

### 4. Start the app

```bash
npm start
```

### 5. Open in browser

```text
http://localhost:5000
```

---

## AI modes

### Option 1 – mock mode

Use this first while building UI.

```env
AI_PROVIDER=mock
```

This works without any external AI account.

---

### Option 2 – OpenAI

Set:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.4
```

---

### Option 3 – Ollama

Set:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=llama3.2
```

Make sure Ollama is already running locally.

---

## Contact form behavior

If:

```env
EMAIL_ENABLED=false
```

then form submissions are saved locally in:

```text
data/contact-submissions.json
```

If you later enable email, the backend will send messages using Nodemailer.

---

## Run with Docker

### Build

```bash
docker build -t jeffyz-solutions-next-level .
```

### Run

```bash
docker run --env-file .env -p 5000:5000 jeffyz-solutions-next-level
```

---

## Suggested next steps after you verify development

- connect real email settings
- connect real OpenAI or Ollama AI provider
- test all service links
- deploy updated package
- add CI/CD after development is finalized
