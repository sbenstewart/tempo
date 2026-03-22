# Quick Start Guide

Get Tempo running in 5 minutes.

## Prerequisites

- Node.js 18+
- Python 3.10+
- Anthropic API Key (free at https://console.anthropic.com/)

## 1. Clone and Setup

```bash
cd tempo

# Create .env with your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

## 2. Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
python server.py
```

✅ You should see: `Application startup complete`

## 3. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

✅ You should see: `Local: http://localhost:5173`

## 4. Open in Browser

Visit **http://localhost:5173** and start practicing!

---

## Test It Out

1. **Happy Birthday** loads by default
2. Click **▶ Play**
3. Follow along with your keyboard:
   - A = C note
   - S = D note  
   - D = E note
   - etc.
4. Watch the **Score** percentage update in real-time
5. Type in the **AI Coach** section to get feedback

---

## Keyboard Mapping

| Key | Note | Key | Note | Key  | Note |
|-----|------|-----|------|------|------|
| A   | C3   | W   | C#3  | S    | D3   |
| E   | D#3  | D   | E3   | F    | F3   |
| T   | F#3  | G   | G3   | Y    | G#3  |
| H   | A3   | U   | A#3  | J    | B3   |
| K   | C4   | O   | C#4  | L    | D4   |
| P   | D#4  | ;   | E4   | '    | F4   |
| ]   | F#4  | \\  | G4   |      |      |

---

## Troubleshooting

**"Coach is offline"?**
- Check `.env` has your API key
- Restart backend with `python server.py`

**No audio?**
- Click anywhere on the page first
- Check system volume
- Try it in a different browser

**MIDI files won't load?**
- Make sure file is `.mid` format
- Check browser console for errors

---

## Next Steps

- Upload your own MIDI files
- Connect a hardware piano via MIDI cable
- Explore different practice modes
- Check the full [README.md](README.md) for advanced features

