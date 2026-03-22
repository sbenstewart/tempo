# Tempo 🎹

**Agentic Piano Learning Platform** — Real-time AI-powered piano instruction with live feedback, skill tracking, and personalized coaching.

---

## Overview

Tempo is a full-stack piano learning application that combines:
- 🎵 **Interactive MIDI Library** — Upload or browse your favorite songs
- 🎹 **Real-time Piano Keyboard** — Play using your computer keyboard or connected MIDI device
- 📊 **Performance Tracking** — Accuracy metrics, streak counting, and note-by-note feedback
- 🤖 **AI Coach** — Claude-powered real-time feedback and comprehensive session analysis
- 🏅 **Skill Progression** — Track mastery across scales, chords, rhythm, and technique

---

## Tech Stack

### Frontend
- **React 19** — Modern UI with hooks and Zustand state management
- **Vite** — Fast development server and build tooling
- **Tone.js** — Web audio synthesis and playback
- **ToneJS MIDI** — MIDI file parsing and handling
- **React Markdown** — Rich formatting in AI Coach messages
- **WebMIDI API** — Hardware piano/keyboard support

### Backend
- **FastAPI** — High-performance async Python web framework
- **Uvicorn** — ASGI server
- **Anthropic Claude API** — AI coaching engine
- **Librosa** — Audio analysis and BPM detection
- **SoundFile** — WAV audio processing

### State Management
- **Zustand** — Lightweight global state (practice mode, coach messages, skills)

---

## Project Structure

```
tempo/
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── CoachChat.jsx        # AI Coach interface
│   │   │   ├── PianoKeyboard.jsx    # Interactive keyboard
│   │   │   ├── Waterfall.jsx        # Note visualization
│   │   │   ├── ScoreDisplay.jsx     # Performance metrics
│   │   │   ├── MidiLoader.jsx       # File upload
│   │   │   └── Header.jsx           # App header
│   │   ├── lib/
│   │   │   ├── store.js            # Zustand store
│   │   │   ├── AudioEngine.js       # Tone.js wrapper
│   │   │   ├── patternMatcher.js    # Note matching logic
│   │   │   └── insforgeClient.js    # Cloud integration
│   │   ├── App.jsx
│   │   ├── App.css             # Dark theme design system
│   │   └── index.css
│   ├── public/
│   │   ├── Happy Birthday MIDI.mid  # Default song
│   │   └── songs.json               # Song library metadata
│   ├── package.json
│   └── vite.config.js
│
├── backend/                    # FastAPI server
│   ├── server.py               # WebSocket & HTTP endpoints
│   ├── claudeCoach.py          # AI coaching logic
│   ├── setup_insforge.py       # Cloud configuration
│   ├── requirements.txt        # Python dependencies
│   └── prompt/
│       ├── system_prompt.txt   # Coach system prompt
│       ├── user_message_template.txt
│       └── jsonObject          # Data schema reference
│
├── .env                        # API keys (not in git)
├── tinyfish_scraper.py         # Utility script
└── README.md                   # This file
```

---

## Installation

### Prerequisites
- **Node.js** 18+ (frontend)
- **Python** 3.10+ (backend)
- **Anthropic API Key** (for AI Coach) — [Get here](https://console.anthropic.com/)

### Backend Setup

```bash
cd tempo/backend

# Install dependencies
pip install -r requirements.txt

# Create .env file with API keys
echo "ANTHROPIC_API_KEY=your_key_here" > ../.env
echo "OPENAI_API_KEY=your_openai_key" >> ../.env
```

### Frontend Setup

```bash
cd tempo/frontend

# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev
```

---

## Running the Application

### Terminal 1: Backend Server

```bash
cd tempo/backend
python server.py
# Server runs on http://localhost:8000
```

### Terminal 2: Frontend Dev Server

```bash
cd tempo/frontend
npm run dev
# Open http://localhost:5173 in your browser
```

---

## Features

### 🎹 Core Learning

- **MIDI Upload & Playback** — Import any MIDI file or use the default "Happy Birthday"
- **Real-time Performance Matching** — System tracks which notes you play correctly
- **Accuracy Scoring** — Friendly score % + technical accuracy metrics
- **Streak Tracking** — Consecutive correct notes with best streak recording
- **Missed Note Detection** — See which notes you skipped with detailed feedback

### 🎹 Input Methods

- **Computer Keyboard** — Piano keys mapped to QWERTY (A=C3, W=C#3, etc.)
- **MIDI Device** — Connect a USB keyboard or hardware piano via WebMIDI API
- **On-Screen Buttons** — Virtual piano keyboard for mouse/touch input

### 🤖 AI Coach

#### Chat Mode (Send Button)
- 1-sentence encouraging feedback
- Responds to your questions in context of current session
- Real-time WebSocket streaming

#### Analysis Mode (Analysis Button)
- **The Vibe Check** — Overall performance trend and encouragement
- **What You Crushed** — Technical wins with exact values from your session
- **The Practice Room** — Specific improvement areas with practice tips
- **Theory Corner** — Music theory insights from your performance

**Example Analysis Response:**
```
## The Vibe Check
You're showing steady improvement on Happy Birthday! Your accuracy jumped to 87%.

## What You Crushed
- **Timing**: You stayed in the tempo pocket for bars 5-12 (velocity steady at 75-80)
- **Right Hand Technique**: Smooth ascending passage from C4 to G4 — great finger independence!

## The Practice Room
- **Focus Area**: Notes 3-5 of bar 8 (D, E, F) — you played E♯ instead of E♮
- **Practice Tip**: Isolate bar 8 at 60 BPM, hands separately until consistent

## Theory Corner
Happy Birthday's interval jumps (perfect 4ths in bar 1) require hand position awareness — focus on your thumb contact point!
```

### 📊 Performance Metrics

- **Technical Accuracy** — Percentage of notes played correctly vs. expected
- **Friendly Score** — Your perceived progress score
- **Played Notes Count** — Total notes you've attempted
- **Skipped Notes** — Notes you missed in the sequence
- **Attempts Completed** — Number of full song attempts
- **Current Streak** — Consecutive correct notes

### 🏅 Skill Scoring

Automatic skill progression in these areas:
- **Scales** — C Major, G Major
- **Chords** — Basic Triads
- **Rhythm** — Quarter Notes, Eighth Notes
- **Technique** — Finger Independence
- **Reading** — Treble Clef
- **Theory** — Intervals

Each skill reaches 100% mastery through consistent accurate performance.

---

## API Reference

### WebSocket: `/ws`

#### Coach Request
```json
{
  "type": "coach_request",
  "request_kind": "chat" | "full_session",
  "message": "How am I doing?",
  "coach_payload": { /* session JSON */ }
}
```

#### Coach Response
```json
{
  "type": "coach_start" | "coach_chunk" | "coach_done",
  "delta": "Streaming response text..."
}
```

### HTTP: `POST /api/generate-backing-track`

Analyze user performance and generate metronome track.

**Input:** WebM audio blob  
**Output:** WAV file with click track

### HTTP: `GET /api/proxy-midi?url=...`

Bypass CORS to load remote MIDI files.

---

## Configuration

### Environment Variables (.env)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key

# Optional
OPENAI_API_KEY=sk-proj-...          # For future features
GEMINI_API_KEY=...                  # For future features
TINYFISH_API_KEY=...                # Cloud storage (if enabled)

# Backend
VITE_WS_URL=ws://localhost:8000/ws  # WebSocket endpoint (frontend)
```

### Color Scheme (CSS Variables)

The app uses a dark theme with customizable color variables in `App.css`:

```css
--bg: #0a0a0f              /* Main background */
--surface: #111118         /* Surface layer */
--accent: #6c5ce7          /* Primary purple */
--neon: #00f5d4            /* Highlight cyan */
--warm: #ff6b6b            /* Warning red */
--gold: #feca57            /* Accent gold */
```

---

## Usage Examples

### Start Learning

1. **Launch the app** — Frontend and backend both running
2. **Select a song** — "Happy Birthday" loads by default
3. **Click Play** — Music starts; follow with your keyboard or MIDI device
4. **Get Feedback** — Performance metrics display in real-time
5. **Ask the Coach** — Type questions or click "Analysis" for full breakdown

### Upload Your Own MIDI

1. Click the upload area below the song library
2. Select any `.mid` file from your computer
3. Song appears in the library with note count
4. Click to practice immediately

### Connect Hardware

1. Plug in your MIDI keyboard via USB
2. Grant browser permission to access MIDI devices
3. Play notes — they register in the app
4. Performance tracking works with physical keys

---

## Troubleshooting

### AI Coach Won't Respond
- ✅ Check that backend is running (`http://localhost:8000` responds)
- ✅ Verify `ANTHROPIC_API_KEY` in `.env` is valid
- ✅ Check browser console for WebSocket errors
- ✅ Ensure you've played at least some notes (bot won't respond to empty sessions)

### MIDI Files Won't Load
- ✅ Ensure file is valid MIDI format (`.mid` or `.midi`)
- ✅ Try the proxy endpoint: check `/api/proxy-midi` response
- ✅ Check browser console for CORS errors

### No Audio Output
- ✅ Allow browser audio permissions when prompted
- ✅ Check system volume and browser tab volume
- ✅ Refresh and try clicking "Play" again
- ✅ Some browsers require a user gesture first (click anywhere on page)

### Performance Tracking Not Working
- ✅ Make sure you're playing notes while music is playing
- ✅ Check if MIDI input is selected correctly
- ✅ Try using the on-screen keyboard instead
- ✅ Verify keyboard mapping: A=C3, W=C#3, etc.

---

## Development

### Frontend Build

```bash
cd frontend
npm run build      # Production build in dist/
npm run preview    # Preview build locally
```

### Backend Testing

```bash
cd backend
python -m pytest   # Run tests (when added)
```

### Code Style

- **Frontend**: ESLint configured in `eslint.config.js`
- **Backend**: Follow PEP 8 (Python style guide)

---

## Contributing

Contributions welcome! Areas for expansion:
- [ ] Lesson plans and curriculum progression
- [ ] Video tutorials integrated with lessons
- [ ] Multiplayer jam sessions
- [ ] Sheet music import and display
- [ ] More AI coaching models/personalities
- [ ] Mobile app (React Native)
- [ ] Cloud sync with user accounts

---

## License

MIT License — See LICENSE file for details

---

## Support

- **Issues & Bugs**: GitHub Issues
- **Documentation**: See README sections
- **API Keys**: 
  - Anthropic: https://console.anthropic.com/
  - OpenAI: https://platform.openai.com/

---

## Roadmap

- [ ] v1.1 — User accounts and cloud sync
- [ ] v1.2 — Advanced AI patterns (hand position detection)
- [ ] v1.3 — Mobile webapp with touch keyboard
- [ ] v1.4 — Multiplayer duet mode
- [ ] v2.0 — Video lesson integration

---

## Credits

Built with ❤️ using React, FastAPI, and Claude AI

**Key Libraries:**
- Tone.js for web audio
- Zustand for state management
- FastAPI for backend
- Anthropic Claude for AI coaching
