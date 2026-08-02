# VocaPet — Learn with a desktop study companion

VocaPet is a vocabulary-learning platform that turns review into a small game: users organise words into decks, study with spaced repetition, read text or PDFs, and receive help from a responsive desktop pet.

The project contains a React frontend and a Spring Boot API.

## Highlights

- Deck and vocabulary management with spaced-repetition study sessions.
- A PixiJS desktop pet with species, unlocks, moods, quiz reactions, and ambient animations.
- Pet companion mini quizzes that award XP/coins and count as real study attempts.
- Profile, streaks, missions, achievements, avatar selection, and pet collection.
- Reader workspace for pasted text and PDF documents: select words into a vocabulary basket, persist local highlights, detect words already in the user's vocabulary, and generate Gemini flashcard suggestions.
- Home dashboard with decks, recently studied words, learning/mastered counts, and recent accuracy.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, TanStack Router/Query, Tailwind CSS |
| Pet rendering | PixiJS AnimatedSprite |
| Backend | Java 25, Spring Boot, Spring Security, JPA/Hibernate |
| Database | MySQL |
| Authentication | JWT |
| AI | Google Gemini API |
| PDF rendering | PDF.js |

## Project structure

```text
LearnWithPet/
├── backend/                      # Spring Boot REST API
│   └── src/main/java/com/vocabpet/backend/
├── vocapet-desktop-friend/       # React application
│   └── src/
│       ├── components/           # UI, Pixi pet, reader components
│       ├── routes/               # Application pages
│       ├── api/                  # API clients
│       └── hooks/queries/        # TanStack Query hooks
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- JDK 21+ (the deployment image uses Java 21 LTS)
- MySQL 8+
- A Gemini API key only if you want AI flashcard generation

## Local setup

### 1. Create the database

```sql
CREATE DATABASE vocab_pet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update `backend/src/main/resources/application.yaml` with your local MySQL username and password. Keep real credentials out of Git.

### 2. Configure Gemini (optional)

The API reads the key from `GEMINI_API_KEY`. In PowerShell for the current terminal:

```powershell
$env:GEMINI_API_KEY = "your_gemini_key"
```

Do not put the key in source files, `.vscode/launch.json`, or a committed `.env` file. If a key was exposed, revoke it in Google AI Studio and create a new one.

### 3. Start the backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

The backend starts at `http://localhost:8080`.

### 4. Start the frontend

Open a second terminal:

```powershell
cd vocapet-desktop-friend
npm install
npm run dev
```

Vite displays the local application URL, normally `http://localhost:5173`.

## Useful commands

### Frontend

```powershell
cd vocapet-desktop-friend
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
npm run format    # Format frontend files
```

### Backend

```powershell
cd backend
.\mvnw.cmd test              # Run tests
.\mvnw.cmd spring-boot:run   # Run API locally
```

## Learning data rules

- **Words learning** counts vocabulary reviewed 1–3 times.
- **Mastered** counts vocabulary reviewed at least 4 times.
- **Recent accuracy** uses the latest 20 study attempts; `AGAIN` is treated as incorrect.
- A pet mini quiz is persisted as a study attempt, so Home statistics stay synchronized with quiz results.
- Pet unlock ownership is stored per user on the backend, not derived from browser-only game state.

## Reader and PDF notes

- The uploaded PDF and local highlights are stored in browser IndexedDB, scoped to the signed-in user; raw PDFs are not saved to the database.
- Text selection works best on PDFs with a real text layer. Scanned/image-only PDFs need OCR before individual words can be selected reliably.
- Gemini can return `429` when its quota is exhausted. Wait for the reported retry time or adjust your Gemini plan/model.

## Security checklist

- Never commit `.env`, `backend/.env`, or `.vscode/launch.json` if they contain secrets.
- Rotate any secret detected by GitHub Push Protection before pushing again.
- Provide `GEMINI_API_KEY` only through environment variables or an ignored local configuration file.

## Current API areas

| Area | Base route |
| --- | --- |
| Authentication | `/api/auth` |
| User/profile | `/api/users` |
| Decks and vocabulary | `/api/decks`, `/api/vocabularies` |
| Study sessions | `/api/study-sessions` |
| Desktop quiz | `/api/quiz` |
| Pets | `/api/pets` |
| Achievements | `/api/achievements` |
| Reader AI | `/api/reader` |

## License

This repository does not currently declare a license. Add one before distributing the project publicly.
