import json
import os
import asyncio
from pathlib import Path
import tempfile
import librosa
import numpy as np
import soundfile as sf
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

# 1. Load Environment Variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"📋 Loaded .env from {env_path}")
except ImportError:
    pass

app = FastAPI(title="Tempo Backend Server")

# 2. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════
# MIDI PROXY (Solves CORS errors for remote MIDI files)
# ══════════════════════════════════════════════════════

@app.get("/api/proxy-midi")
async def proxy_midi(url: str):
    """
    Acts as a middle-man. Fetches MIDI from a remote site 
    and sends it to the frontend from 'localhost' to bypass CORS.
    """
    try:
        print(f"🌐 Proxy Request: {url}")
        async with httpx.AsyncClient() as client:
            # We follow redirects (some sites use http -> https redirects)
            response = await client.get(url, follow_redirects=True, timeout=15.0)
            
            if response.status_code != 200:
                print(f"❌ Remote site error: {response.status_code}")
                raise HTTPException(status_code=response.status_code, detail="Remote MIDI not found")
            
            # Return raw binary data
            return Response(
                content=response.content,
                media_type="audio/midi",
                headers={
                    "Content-Disposition": "attachment; filename=track.mid",
                    "Access-Control-Allow-Origin": "*"
                }
            )
    except Exception as e:
        print(f"❌ Proxy Error: {str(e)}")
        raise HTTPException(500, f"Proxy failed: {str(e)}")

# ══════════════════════════════════════════════════════
# LOCAL RHYTHM GENERATION & MIXING
# ══════════════════════════════════════════════════════

@app.post("/api/generate-backing-track")
async def generate_backing_track(user_audio: UploadFile = File(...)):
    """
    Analyzes piano recording for BPM and adds a sharp click track.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_in:
        tmp_in.write(await user_audio.read())
        input_path = tmp_in.name

    try:
        print("🎵 Processing audio for rhythm analysis...")
        y, sr = librosa.load(input_path, sr=None)
        
        # Analyze BPM
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        detected_bpm = round(float(tempo[0]) if isinstance(tempo, (np.ndarray, list)) else float(tempo))
        print(f"⏱️ BPM: {detected_bpm}")

        # Fallback if no rhythmic pulses detected
        if len(beat_frames) == 0:
            print("⚠️ Forcing metronome fallback...")
            safe_bpm = detected_bpm if detected_bpm > 0 else 120
            beat_samples = np.arange(0, len(y), int(sr * 60 / safe_bpm))
            beat_frames = librosa.samples_to_frames(beat_samples)

        # Generate Click track (1000Hz = sharp beep)
        clicks = librosa.clicks(frames=beat_frames, sr=sr, length=len(y), click_freq=1000.0, click_duration=0.1)
        
        # Mix: Piano 50% / Click 100%
        mixed = (y * 0.5) + (clicks * 1.0)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
            output_path = tmp_out.name
        
        sf.write(output_path, mixed, sr)
        print("✅ Mix complete.")
        return FileResponse(output_path, media_type="audio/wav")
        
    except Exception as e:
        print(f"❌ Mix Error: {e}")
        raise HTTPException(500, str(e))
    finally:
        if os.path.exists(input_path): os.remove(input_path)

# ══════════════════════════════════════════════════════
# OPENAI COACHING & WEBSOCKET
# ══════════════════════════════════════════════════════

SYSTEM_PROMPT = "You are Tempo Coach. Give brief (2 sentence) piano tips."

async def stream_coach_response(websocket: WebSocket, user_message: str):
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        await websocket.send_text(json.dumps({"action": "coach_response", "text": "Set API Key!", "done": True}))
        return
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "stream": True,
                    "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_message}]
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]": break
                        try:
                            chunk = json.loads(data)
                            txt = chunk["choices"][0]["delta"].get("content", "")
                            if txt: await websocket.send_text(json.dumps({"action": "coach_chunk", "text": txt}))
                        except: pass
        await websocket.send_text(json.dumps({"action": "coach_done"}))
    except Exception as e:
        await websocket.send_text(json.dumps({"action": "coach_response", "text": str(e), "done": True}))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_notes = {}
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            m_type = msg.get("type")
            
            if m_type == "note_on":
                active_notes[msg.get("note")] = msg.get("time")
            elif m_type == "note_off":
                note = msg.get("note")
                if note in active_notes:
                    start = active_notes.pop(note)
                    dur = round((msg.get("time") - start) / 1000, 3)
                    await websocket.send_text(json.dumps({"action": "processed_note", "note": note, "duration_seconds": dur}))
            elif m_type == "coach_request":
                await stream_coach_response(websocket, msg.get("message", "Ready to play"))
    except WebSocketDisconnect:
        print("WebSocket Disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)