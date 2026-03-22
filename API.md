# API Documentation

Complete reference for all Tempo API endpoints.

---

## WebSocket API

### Base URL
```
ws://localhost:8000/ws
```

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => console.log('Connected');
ws.onerror = (err) => console.error('Error:', err);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle message
};
ws.onclose = () => console.log('Disconnected');
```

---

## Coach Request Message

Send a coach request to get feedback or analysis.

### Endpoint
```
message.type === 'coach_request'
```

### Payload

#### Chat Mode (1-sentence feedback)
```json
{
  "type": "coach_request",
  "request_kind": "chat",
  "message": "How am I doing?",
  "coach_payload": {
    "exercise": {
      "name": "Happy Birthday",
      "tempo_bpm": 80,
      "expected_notes": ["C4", "C4", "G4", ...]
    },
    "played_notes": ["C4", "C4", "G4"],
    "errors": [],
    "attempt_context": {
      "attempt_number": 1,
      "attempt_played_note_count": 3,
      "attempt_error_count": 0
    },
    "session_context": {
      "friendly_score_percent": 100,
      "technical_session_accuracy_percent": 100,
      "played_notes_count": 3,
      "correct_played_notes_count": 3,
      "recurring_errors": {},
      "streak": 3,
      "best_streak": 3,
      "attempts_completed": 1,
      "skipped_notes_count": 0
    },
    "recent_attempts": [],
    "mode": "guided"
  }
}
```

#### Full Session Mode (Comprehensive analysis)
```json
{
  "type": "coach_request",
  "request_kind": "full_session",
  "message": "Give me a full coaching summary of this practice session.",
  "coach_payload": {
    /* Same as chat mode, but with complete session history */
    "recent_attempts": [
      {
        "exercise": { "name": "...", "expected_notes": [...] },
        "played_notes": [...],
        "errors": [...],
        "attempt_context": {...}
      }
    ]
  }
}
```

### Response Stream

The server sends three types of messages:

#### 1. Coach Start
```json
{
  "type": "coach_start",
  "role": "assistant"
}
```

#### 2. Coach Chunk (Streamed)
```json
{
  "type": "coach_chunk",
  "role": "assistant",
  "delta": "You're doing great!"
}
```
Multiple chunks are sent as response is generated.

#### 3. Coach Done
```json
{
  "type": "coach_done",
  "role": "assistant"
}
```

### Example Flow

**Request:**
```javascript
ws.send(JSON.stringify({
  type: 'coach_request',
  request_kind: 'chat',
  message: 'How am I doing?',
  coach_payload: {
    session_context: {
      friendly_score_percent: 87,
      played_notes_count: 20,
      correct_played_notes_count: 17
    },
    exercise: { name: 'Happy Birthday' }
  }
}));
```

**Response Stream:**
```
1. { type: 'coach_start' }
2. { type: 'coach_chunk', delta: 'Great' }
3. { type: 'coach_chunk', delta: ' job' }
4. { type: 'coach_chunk', delta: ' so far!' }
5. { type: 'coach_done' }
```

---

## HTTP API

### Base URL
```
http://localhost:8000
```

---

### POST `/api/generate-backing-track`

Generate a metronome/backing track from user performance.

#### Request
```
POST /api/generate-backing-track
Content-Type: multipart/form-data

Body:
- user_audio: WebM or WAV audio file
```

#### Response
```
200 OK
Content-Type: audio/wav

[Binary WAV file with click track]
```

#### Example (JavaScript)
```javascript
const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
const formData = new FormData();
formData.append('user_audio', audioBlob, 'recording.webm');

const response = await fetch(
  'http://localhost:8000/api/generate-backing-track',
  { method: 'POST', body: formData }
);

const wavBlob = await response.blob();
const audioUrl = URL.createObjectURL(wavBlob);
```

#### Backend Processing
1. Analyzes user audio with librosa
2. Detects tempo/BPM
3. Generates click track at detected tempo
4. Returns mixed WAV file

---

### GET `/api/proxy-midi`

Fetch MIDI files from remote URLs (bypasses CORS).

#### Request
```
GET /api/proxy-midi?url=https://example.com/song.mid
```

#### Response
```
200 OK
Content-Type: audio/midi
Content-Disposition: attachment; filename=track.mid

[Binary MIDI file]
```

#### Why This Exists
Browsers block direct cross-origin MIDI downloads. This endpoint acts as a proxy to enable loading MIDI files from any URL.

#### Example (JavaScript)
```javascript
const url = 'https://example.com/mysong.mid';
const proxyUrl = `/api/proxy-midi?url=${encodeURIComponent(url)}`;

const midi = await Midi.fromUrl(proxyUrl);
```

#### Error Responses
```json
{
  "detail": "Remote MIDI not found (404)"
}
```

---

## Data Structures

### Session Context

```typescript
interface SessionContext {
  friendly_score_percent: number;      // 0-100
  technical_session_accuracy_percent: number;  // 0-100
  played_notes_count: number;          // Total notes played
  correct_played_notes_count: number;  // Correctly matched notes
  recurring_errors: Record<string, number>; // Error patterns
  streak: number;                      // Current streak
  best_streak: number;                 // Best streak in session
  attempts_completed: number;          // Number of complete attempts
  skipped_notes_count: number;         // Missed notes
}
```

### Exercise

```typescript
interface Exercise {
  name: string;           // Song title
  tempo_bpm: number | null;
  expected_notes: Note[]; // Full note sequence
}

interface Note {
  note: string;      // e.g., 'C4', 'D#3'
  time: number;      // Seconds from start
  duration: number;  // Seconds
  velocity?: number; // MIDI velocity (0-127)
}
```

### Attempt

```typescript
interface Attempt {
  exercise: Exercise;
  played_notes: string[];  // Notes user played
  errors: Error[];         // Mismatches
  attempt_context: {
    attempt_number: number;
    attempt_played_note_count: number;
    attempt_error_count: number;
  };
}

interface Error {
  expected: string;
  played: string;
  time: number;  // When it happened
  type: 'wrong_note' | 'early' | 'late';
}
```

---

## Error Handling

### WebSocket Errors

**Offline/No Connection:**
```javascript
ws.onerror = () => {
  // WebSocket connection failed
  // Bot will not respond until reconnected
};
```

**Invalid JSON:**
```javascript
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
  } catch (e) {
    console.error('Invalid JSON from server:', event.data);
  }
};
```

### HTTP Errors

**400 Bad Request**
```json
{
  "detail": "Invalid query parameters"
}
```

**404 Not Found**
```json
{
  "detail": "Remote MIDI not found"
}
```

**500 Internal Server Error**
```json
{
  "detail": "Proxy failed: timeout reaching remote server"
}
```

---

## Rate Limiting

Claude API has rate limits based on your account tier:

```
- Haiku model: ~100 requests/minute
- Include retry logic in frontend
```

**How Claude handles it:**
```python
# Backend automatically throttles requests
# If rate limited, returns: "Coach is currently busy..."
```

---

## Testing Endpoints

### Using cURL

**Coach Chat:**
```bash
curl -N \
  -X GET "http://localhost:8000/ws" \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket"
```

**MIDI Proxy:**
```bash
curl -X GET \
  "http://localhost:8000/api/proxy-midi?url=https://example.com/song.mid" \
  -o song.mid
```

### Using Python

**WebSocket:**
```python
import asyncio
import websockets
import json

async def test_coach():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as ws:
        # Send coach request
        await ws.send(json.dumps({
            'type': 'coach_request',
            'request_kind': 'chat',
            'message': 'How am I doing?',
            'coach_payload': {
                'session_context': {
                    'friendly_score_percent': 87,
                    'played_notes_count': 20,
                    'correct_played_notes_count': 17
                }
            }
        }))
        
        # Receive response
        async for message in ws:
            data = json.loads(message)
            if data['type'] == 'coach_chunk':
                print(data['delta'], end='', flush=True)

asyncio.run(test_coach())
```

---

## Version History

### v1.0.0 (Current)
- WebSocket coach messaging
- Chat and full_session modes
- MIDI proxy endpoint
- Backing track generation

### Planned v1.1
- Connection pooling
- Request batching
- Advanced filters for analysis

