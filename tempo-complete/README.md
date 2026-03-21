# 🎹 Tempo — Your AI Music Tutor

## Project Structure

```
tempo-complete/
├── .env                          ← ALL API keys go here
├── start.sh                      ← Mac/Linux: one-click launch
├── start.bat                     ← Windows: one-click launch
│
├── backend/
│   ├── server.py                 ← Python: MIDI + AI Coach + TinyFish
│   ├── requirements.txt          ← fastapi, uvicorn, httpx, dotenv
│   └── setup_insforge.py         ← Database schema for InsForge
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx               ← Main app (everything wired together)
        ├── main.jsx
        ├── index.css
        ├── components/
        │   ├── Waterfall.jsx     ← Falling notes + wait mode
        │   ├── PianoKeyboard.jsx ← 61 keys C2-C7
        │   ├── MidiLoader.jsx    ← MIDI file upload
        │   ├── CoachChat.jsx     ← AI coaching (streams from Python)
        │   ├── SkillGraph.jsx    ← Skill progress bars
        │   └── ModeSelector.jsx  ← 5 practice modes
        ├── hooks/
        │   └── useMidi.js        ← WebMIDI + WebSocket
        └── lib/
            ├── AudioEngine.js    ← Tone.js synth
            ├── patternMatcher.js ← Scoring engine
            ├── store.js          ← Zustand global state
            └── insforgeClient.js ← InsForge REST API

```

## Quick Start

### 1. Add your OpenAI key

Open `.env` in the root folder:
```
OPENAI_API_KEY=sk-proj-paste-your-key-here
```

### 2. Run it

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```
start.bat
```

**Or manually (two terminals):**

Terminal 1:
```bash
cd backend
pip install -r requirements.txt
python server.py
```

Terminal 2:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open http://localhost:5173 in Chrome

Upload a MIDI file, press Play, and start learning.
