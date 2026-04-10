🕯️ Confessio — Secret in the Hole
A sacred space for what cannot be said.
Anonymous peer-to-peer confession platform inspired by the confessional booth.
�

�
�
�
�
�
�
�

🌙 What is Confessio?
Confessio is an anonymous, real-time communication platform where two strangers meet in a private digital confessional booth. No names. No photos. No history.
Inspired by the psychological phenomenon known as the "Stranger on a Train Effect" — people open up more honestly to those they will never meet again — Confessio creates a structured, ritualistic space for authentic human expression.
Every session ends with the conversation permanently deleted. What is said here, dies here.
🎭 The Two Roles
At the start of every session, each user chooses one of two roles:
Role
Description
🙏 Confessor
Carries something unsaid — a secret, a guilt, a fear, a decision
🛡️ Guardian
Listens without judgment. Asks. Never advises unless asked
Roles are reset with every new session. Today's Guardian can be tomorrow's Confessor.
✨ Core Features
🎭 Dual Role System — Confessor & Guardian with session-based role selection
🔒 Total Anonymity — No email, no name, no profile picture ever
💬 Text Sessions — Real-time encrypted messaging via Socket.IO
🎙️ Voice Sessions — Peer-to-peer audio via WebRTC (no voice stored)
🌍 Multilingual Matching — Arabic, French, English, Spanish, German
🕯️ Auto-Delete — All messages permanently erased when session ends
⭐ Guardian Rating — Stars-only rating system, visible only to the Guardian
⏱️ Session Timer — Configurable 15 or 30-minute sessions
🆘 Crisis Protocol — Silent detection of distress keywords with immediate support resources
🏅 Secret Badges — Earned privately, never displayed publicly
🌊 Echo of the Void — Anonymous post-session quotes shared globally
🛠️ Tech Stack
Frontend          Backend           Real-time         Database
─────────         ───────           ─────────         ────────
React 18          Express.js        Socket.IO         SQLite
TypeScript        Node.js 18+       WebRTC            better-sqlite3
Vite              JWT Auth          ICE/TURN
Tailwind CSS      bcrypt            Signaling Server
🚀 Getting Started
Prerequisites
Node.js 18+
npm or yarn
Installation
# Clone the repository
git clone https://github.com/amin14c/Confesio.git
cd Confesio

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start development server
npm run dev
The app will be available at http://localhost:3000
Environment Variables
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_min_32_chars
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
🏗️ Architecture
Confesio/
├── src/
│   ├── components/
│   │   ├── AuthScreen.tsx        # Login & anonymous registration
│   │   ├── RoleSelector.tsx      # Confessor / Guardian choice
│   │   ├── SessionRoom.tsx       # Active session (text + voice)
│   │   ├── AccountDashboard.tsx  # Stats, badges, preferences
│   │   └── WaitingRoom.tsx       # Queue with live timer
│   ├── hooks/
│   │   └── useAuth.ts            # Authentication state management
│   └── main.tsx
├── server.ts                     # Express + Socket.IO + WebRTC signaling
├── auth.ts                       # JWT authentication logic
├── database.ts                   # SQLite schema & queries
├── .github/workflows/            # CI/CD via GitHub Actions
├── vite.config.ts
└── tsconfig.json
🔐 Privacy by Design
Confessio is built on a zero-knowledge philosophy:
What we collect
What we never collect
Anonymous UUID (user-generated)
Name or username
Hashed password
Email address
Session duration statistics
Message content
Aggregate language usage
Voice recordings
Star ratings (guardian only)
Location data
All session content is ephemeral. Messages exist only in memory during the session and are never written to disk.
🌍 Supported Languages
Language
Queue Code
العربية
ar
Français
fr
English
en
Español
es
Deutsch
de
🧠 Psychological Foundation
Confessio is grounded in three evidence-based psychological principles:
1. Stranger on a Train Effect
People disclose more to strangers with no social consequences, enabling deeper honesty than with known relationships.
2. Catharsis Theory
Verbal expression of suppressed emotions before a human witness produces measurable psychological relief — more than journaling alone.
3. Ritual Effect (Harvard Business School, 2013)
Structured rituals increase perceived value of experiences and deepen emotional engagement, even when arbitrary.
🗺️ Roadmap
[x] Real-time text sessions with role matching
[x] WebRTC voice sessions
[x] Multilingual queue system
[x] Anonymous account system
[x] Guardian rating system
[x] Crisis keyword detection
[ ] Mobile app (Android & iOS)
[ ] TURN server integration for restricted networks
[ ] Redis migration for production scalability
[ ] End-to-end message encryption
[ ] B2B version for mental health institutions
[ ] Delayed Forgiveness feature (24h post-session message)
⚠️ Disclaimer
Confessio is not a mental health service and is not a substitute for professional psychological care.
If you or someone you know is in crisis:
🇩🇿 Algeria: 3548
🌍 International: befrienders.org
👤 Author
Dr. Amin — Psychiatrist & Developer
Building at the intersection of clinical psychology and digital health.
GitHub: @amin14c
Project: Confessio on AI Studio
📄 License
MIT License — See LICENSE for details.
�

"What is said in the booth, dies in the booth."
🕯️
