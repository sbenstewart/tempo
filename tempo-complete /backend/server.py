import json
import os
import asyncio
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Load .env from project root (one level up from /backend)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"📋 Loaded .env from {env_path}")
except ImportError:
    pass

app = FastAPI(title="Tempo Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════
# OPENAI COACHING
# ══════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are Tempo Coach — an expert piano teacher and AI music tutor. You are warm, encouraging, technically precise, and conversational.

Your personality:
- Celebrate small wins genuinely ("Nice! That B-flat was right in the pocket.")
- Give specific, actionable feedback, not vague encouragement
- Reference exact notes and timing when discussing performance
- Weave in music theory naturally ("You just played a ii-V-I — that's the backbone of jazz!")
- When the learner is frustrated, acknowledge difficulty and offer to simplify
- Playful but never condescending

When you receive performance data, respond with:
1. One specific observation about what went well
2. One specific area to improve (with a concrete tip)
3. A suggestion for what to try next

Keep responses under 3 sentences unless asked for detail. Be concise — they're mid-practice."""


async def get_coach_response(user_message: str) -> str:
    """Call OpenAI and return the full response."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return "Coach is offline. Add OPENAI_API_KEY to your environment to enable AI coaching."

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "max_tokens": 300,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                },
                timeout=30.0,
            )
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Coach error: {str(e)}"


async def stream_coach_response(websocket: WebSocket, user_message: str):
    """Stream OpenAI response token by token over WebSocket."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        await websocket.send_text(json.dumps({
            "action": "coach_response",
            "text": "Coach is offline. Add OPENAI_API_KEY to your .env file.",
            "done": True,
        }))
        return

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "max_tokens": 300,
                    "stream": True,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                },
                timeout=30.0,
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            text = chunk["choices"][0]["delta"].get("content", "")
                            if text:
                                await websocket.send_text(json.dumps({
                                    "action": "coach_chunk",
                                    "text": text,
                                }))
                        except (json.JSONDecodeError, KeyError, IndexError):
                            pass

        await websocket.send_text(json.dumps({
            "action": "coach_done",
        }))
    except Exception as e:
        await websocket.send_text(json.dumps({
            "action": "coach_response",
            "text": f"Coach error: {str(e)}",
            "done": True,
        }))


# ══════════════════════════════════════════════════════
# MAIN WEBSOCKET (MIDI + Coaching)
# ══════════════════════════════════════════════════════

@app.websocket("/ws")
async def midi_stream_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🟢 Client connected")

    active_notes = {}

    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            event_type = event.get("type")

            # ── MIDI note events ────────────────────
            if event_type == "note_on":
                note = event.get("note")
                timestamp = event.get("time")
                active_notes[note] = timestamp
                print(f"🎵 Note ON: {note}")

            elif event_type == "note_off":
                note = event.get("note")
                timestamp = event.get("time")
                if note in active_notes:
                    start_time = active_notes.pop(note)
                    duration_ms = timestamp - start_time
                    duration_sec = round(duration_ms / 1000, 3)
                    await websocket.send_text(json.dumps({
                        "action": "processed_note",
                        "note": note,
                        "duration_seconds": duration_sec,
                    }))

            # ── Coach request ───────────────────────
            elif event_type == "coach_request":
                message = event.get("message", "")
                performance = event.get("performance", {})

                if not message and performance:
                    message = (
                        f"Performance data: {json.dumps(performance)}\n"
                        f"Song: {event.get('song', 'Unknown')}\n"
                        f"Mode: {event.get('mode', 'guided')}\n"
                        "Give me brief coaching feedback."
                    )

                # Stream the response
                await stream_coach_response(websocket, message)

            # ── Save session to InsForge ─────────────
            elif event_type == "save_session":
                session_data = event.get("data", {})
                await websocket.send_text(json.dumps({
                    "action": "session_saved",
                    "success": True,
                    "data": session_data,
                }))

    except WebSocketDisconnect:
        print("🔴 Client disconnected")


# ══════════════════════════════════════════════════════
# TINYFISH SONG CRAWLING (HTTP endpoint)
# ══════════════════════════════════════════════════════

class CrawlRequest(BaseModel):
    url: str
    goal: Optional[str] = None

@app.post("/api/crawl")
async def crawl_songs(req: CrawlRequest):
    """Use TinyFish to crawl a MIDI site for songs."""
    api_key = os.getenv("TINYFISH_API_KEY", "")
    if not api_key:
        raise HTTPException(400, "TINYFISH_API_KEY not set. Get one free at tinyfish.ai")

    goal = req.goal or (
        "Find all available MIDI files. For each, return JSON array: "
        '[{"title":"...","artist":"...","midi_url":"..."}]'
    )

    try:
        import httpx
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://agent.tinyfish.ai/v1/automation/run-sse",
                headers={
                    "X-API-Key": api_key,
                    "Content-Type": "application/json",
                },
                json={"url": req.url, "goal": goal},
            )

            # Parse SSE to get final result
            result = ""
            for line in response.text.split("\n"):
                if line.startswith("data: "):
                    data = line[6:]
                    try:
                        parsed = json.loads(data)
                        if parsed.get("type") == "COMPLETE":
                            result = parsed.get("resultJson", parsed.get("result", ""))
                    except json.JSONDecodeError:
                        pass

            if result:
                return {"songs": json.loads(result), "source": req.url}
            return {"songs": [], "source": req.url, "note": "No results found"}

    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "tinyfish": bool(os.getenv("TINYFISH_API_KEY")),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
