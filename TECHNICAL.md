# Technical Documentation

## Architecture Overview

Tempo uses a client-server architecture with real-time bidirectional communication:

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│  (Vite Dev Server on port 5173)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Components: CoachChat, PianoKeyboard, Waterfall  │  │
│  │ State: Zustand (coach messages, scores, skills) │  │
│  │ Audio: Tone.js synth + WebMIDI input            │  │
│  └──────────────────────────────────────────────────┘  │
│              ↕ WebSocket (ws://localhost:8000/ws)      │
│              ↕ HTTP (http://localhost:8000)            │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│                FastAPI Backend                          │
│  (Uvicorn on port 8000)                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ WebSocket Handler: Real-time coach communication │  │
│  │ claudeCoach.py: Claude API integration          │  │
│  │ Audio Processing: Librosa + SoundFile           │  │
│  │ CORS Proxy: Remote MIDI loading                 │  │
│  └──────────────────────────────────────────────────┘  │
│              ↓ HTTPS (api.anthropic.com)               │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│          Claude AI (Anthropic)                          │
│  - Receives session performance data                    │
│  - Generates personalized coaching feedback            │
│  - Streams responses back via WebSocket                │
└─────────────────────────────────────────────────────────┘
```

---

## State Management (Zustand)

The app uses Zustand for lightweight global state:

```javascript
// Store structure
{
  // Practice mode
  mode: 'guided' | 'freeplay' | 'jam' | 'boss' | 'ear',
  setMode: (mode) => void,

  // Coach messages
  coachMessages: [
    { id, timestamp, role: 'user' | 'assistant' | 'system', content }
  ],
  addCoachMessage: (msg) => void,
  replaceLastCoachMessage: (content) => void,
  setCoachThinking: (bool) => void,

  // Skill tracking
  skills: [
    { id, name, mastery: 0-1, category }
  ],
  updateSkill: (id, mastery) => void,

  // Session history
  sessionHistory: [...]
}
```

---

## Real-time Communication Flow

### Message Flow for Chat Request

```
Frontend
  │ User types "How am I doing?"
  │ Sends WebSocket message:
  ├→ {
      type: "coach_request",
      request_kind: "chat",
      message: "How am I doing?",
      coach_payload: { session_context: {...} }
     }
  │
  └→ Backend (server.py)
      │ Receives WebSocket message
      │ Calls claudeCoach.get_coach_response()
      ├→ Anthropic API
      │  │ Analyzes request_kind = "chat"
      │  │ Uses short 1-sentence prompt
      │  │ Generates response: "You're doing great!"
      │  └→ Returns to backend
      │
      └→ Sends back:
         1. { type: "coach_start" }
         2. { type: "coach_chunk", delta: "You're doing great!" }
         3. { type: "coach_done" }

Frontend
  │ Receives streaming chunks
  │ Updates Zustand store with message
  │ Re-renders CoachChat component
  └→ User sees response appear in chat
```

### Message Flow for Analysis Request

```
Frontend
  │ User clicks "Analysis" button
  │ Sends WebSocket message:
  ├→ {
      type: "coach_request",
      request_kind: "full_session",
      message: "Give me a full coaching summary...",
      coach_payload: { complete session data }
     }
  │
  └→ Backend (server.py)
      │ Receives WebSocket message
      │ Calls claudeCoach.get_coach_response()
      ├→ Anthropic API
      │  │ Analyzes request_kind = "full_session"
      │  │ Loads system_prompt.txt (detailed coach prompt)
      │  │ Creates comprehensive analysis:
      │  │  - The Vibe Check
      │  │  - What You Crushed
      │  │  - The Practice Room
      │  │  - Theory Corner
      │  └→ Returns full response
      │
      └→ Sends back:
         1. { type: "coach_start" }
         2. { type: "coach_chunk", delta: "## The Vibe Check..." }
         3. { type: "coach_chunk", delta: "You're improving!" }
         4. { type: "coach_done" }

Frontend
  │ Receives entire markdown response
  │ Parses with react-markdown
  │ Renders formatted analysis in chat
  └→ User sees complete coaching breakdown
```

---

## Note Matching Algorithm

Located in `lib/patternMatcher.js`:

```javascript
// Expected sequence for a song
expectedNotes = [
  { note: 'C4', time: 0.0, duration: 0.5 },
  { note: 'C4', time: 0.5, duration: 0.5 },
  { note: 'G4', time: 1.0, duration: 1.0 },
  // ...
]

// Real-time matching
1. Listen for note_on event from MIDI/keyboard
2. Compare against expectedNotes[expectedIndex]
3. If match: 
   - Mark as correct
   - Increment streak
   - Move to next expected note
4. If wrong note:
   - Record error
   - Stay on same expected note
   - Show feedback
5. If time expires without note:
   - Mark as skipped
   - Move to next expected note
```

**Scoring Logic:**
```
- Friendly Score = (correctPlayedNotes / totalPlayedNotes) * 100
- Technical Score = (correctNotes / expectedNotes) * 100
- Streak = consecutive correct notes
- Overall Session = trending accuracy over multiple attempts
```

---

## Audio Pipeline

### Playback (Tone.js Synth)

```
MIDI Song File
  ↓
Parse with @tonejs/midi
  ↓
Extract note sequence
  ↓
Schedule on Tone Transport
  ↓
Route through Synth
  ↓
Output to speakers
```

### Input (WebMIDI or Keyboard)

```
User input (keyboard key or MIDI note)
  ↓
Event handler detects note_on
  ↓
Play note via AudioEngine.playNote()
  ↓
Pass to handleMatchedNote()
  ↓
Pattern matcher evaluates
  ↓
Update UI with feedback
```

### Recording (MediaRecorder)

```
User clicks "Record + AI Drums"
  ↓
MediaRecorder captures audio output
  ↓
Collect WebM chunks
  ↓
Convert to WAV via wavEncoder.js
  ↓
POST to /api/generate-backing-track
  ↓
Backend analyzes BPM
  ↓
Generate click track
  ↓
Return as audio player
```

---

## Coach Prompt Engineering

Two distinct prompts for different modes:

### Chat Mode Prompt
```
You are Tempo Coach, an encouraging piano teacher.
Give SHORT, one-sentence encouraging feedback...
Examples: "Great job nailing that tricky passage!"
Never give long explanations in chat mode — just a quick positive note.
```

**Max tokens:** 150  
**Use case:** Real-time encouragement during practice

### Full Session Prompt (system_prompt.txt)
```
You are Tempo Coach — an expert piano teacher...

Output Format:
## The Vibe Check
[1-2 sentence trend analysis]

## What You Crushed
- Specific technical wins with metrics
- Rhythmic/dynamic improvements

## The Practice Room
- Single biggest improvement area
- Concrete physical practice instruction

## Theory Corner
[Music theory connection to performance]
```

**Max tokens:** 1024  
**Use case:** Comprehensive session analysis

---

## Database/Storage

Currently **stateless** — no persistent database. Future versions should add:

```python
# Suggested schema
class Session(Base):
    id: UUID
    user_id: UUID
    song_id: UUID
    date: DateTime
    duration_seconds: int
    attempts: int
    best_friendly_score: float
    best_technical_score: float
    coach_feedback: str
    created_at: DateTime

class UserSkills(Base):
    user_id: UUID
    skill_id: str  # e.g., 'quarter-notes'
    mastery: float  # 0-1
    last_updated: DateTime
```

---

## Error Handling

### Frontend

```javascript
// WebSocket error handling
ws.onerror = () => {
  setWsConnected(false);
  addCoachMessage({
    role: 'system',
    content: '⚠️ AI Coach is offline...'
  });
}

// Audio context errors
try {
  await startAudioContext();
} catch (err) {
  alert('Audio context failed: ' + err.message);
}

// MIDI file loading
try {
  midi = await Midi.fromUrl(url);
} catch (err) {
  console.error('MIDI load failed');
  alert('Could not load MIDI file');
}
```

### Backend

```python
# API key validation
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    return "Coach is offline. Add ANTHROPIC_API_KEY..."

# WebSocket disconnection
except WebSocketDisconnect:
    print("🔴 Client disconnected")
    # Cleanup

# JSON parsing
try:
    data = json.loads(session_json)
except json.JSONDecodeError:
    request_kind = 'chat'  # Default fallback
```

---

## Performance Considerations

### Frontend Optimization

1. **Component Memoization**
   - PianoKeyboard uses `useMemo` for active notes
   - Waterfall component optimized for 100+ notes

2. **State Updates**
   - Zustand batches updates automatically
   - No unnecessary re-renders

3. **Audio Processing**
   - Tone.js uses Web Audio API (native)
   - MIDI parsing happens once on load
   - Streaming responses prevent large JSON transfers

### Backend Optimization

1. **Async Processing**
   - FastAPI uses asyncio for concurrent connections
   - Can handle 100+ simultaneous WebSocket clients

2. **Response Streaming**
   - Claude API streams responses
   - Backend chunks data to frontend
   - Prevents timeout on long analyses

3. **Caching**
   - Prompts loaded once on startup
   - Song metadata cached in frontend

---

## Security Considerations

### Frontend
- ❌ Never expose API keys in frontend code
- ❌ Don't send raw session data to third parties
- ✅ Sanitize user input in chat
- ✅ Use HTTPS in production

### Backend
- ✅ Store API keys in environment variables only
- ✅ Validate all incoming WebSocket messages
- ✅ Implement rate limiting for Claude API calls
- ✅ Add CORS restrictions in production
- ✅ Validate uploaded MIDI files

```python
# Example: Rate limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/api/coach")
@limiter.limit("5/minute")  # 5 requests per minute per IP
```

---

## Testing Strategy

### Unit Tests (Backend)

```python
# test_claudeCoach.py
async def test_chat_response():
    response = await get_coach_response({
        'request_kind': 'chat',
        'message': 'How am I doing?'
    })
    assert len(response) <= 150  # Short response

async def test_full_session_response():
    response = await get_coach_response({
        'request_kind': 'full_session',
        'coach_payload': {...}
    })
    assert '## The Vibe Check' in response  # Has sections
```

### Integration Tests (Frontend)

```javascript
// CoachChat.test.jsx
test('sends message on Enter key', () => {
  render(<CoachChat />);
  const input = screen.getByPlaceholderText('Ask for tips...');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(sendToCoach).toHaveBeenCalled();
});
```

---

## Deployment

### Docker Setup (Future)

```dockerfile
# Backend
FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "server.py"]

# Frontend build
FROM node:18 as build
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### Environment Setup (Production)

```bash
# Backend on 0.0.0.0:8000
uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend via Vercel or similar
vercel deploy
```

---

## Future Enhancements

1. **Hand Position Detection** - Computer vision to track hand placement
2. **Video Integration** - Lessons synced with performance
3. **Multiplayer Mode** - Real-time duet with others
4. **Sheet Music Display** - Synchronized with MIDI playback
5. **Mobile App** - React Native version with touch keyboard
6. **User Accounts** - Cloud sync of progress and sessions
7. **Advanced Analytics** - Improvement trends and weak areas
8. **Custom Prompts** - Let users define coaching style

