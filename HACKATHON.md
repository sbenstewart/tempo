# Claude Builder Club Hackathon 2026 — Tempo Project

**Event:** Claude Builder Club Hackathon  
**Dates:** March 20–22, 2026  
**Location:** PSH 150/151, Arizona State University, Tempe Campus  
**Project:** Tempo — AI-Powered Piano Learning Platform  
**Category:** 🎨 Creative Flourishing + 📚 Economic Empowerment & Education  

---

## Event Sponsors

Thank you to our amazing sponsors who made this hackathon possible:

### Platinum Sponsors
- **[Insforge](https://insforge.dev/)** — Free API credits for participants (YC '26)  
  *→ Hosting Tempo UI*
  
- **[TinyFish](https://www.tinyfish.ai/)** — Free suite credits, prizes for social posts & cookbook PRs, accelerator golden tickets for winners  
  *→ MIDI file scraping & data processing for song library*

- **[Tamagrow](https://tamagrow.app/)** — Turn GitHub commits into social posts  
  *→ Automated project documentation & progress posting*

### Supporting Sponsors
- **[Anthropic](https://www.anthropic.com/)** — Claude AI Model Provider
  - Claude Haiku 4.5 for natural language coaching feedback
  - Streaming API for real-time responses

- **Render** — Backend Infrastructure (Backend deployment)

- **[Serpico AI Learning Center](https://www.ailearningcenter.ai/)** — Hiring AI Operations Specialist

- **[Airpost](https://www.airpost.ai/)** — Hiring Full-Time AI SDE

- **[Automation Interns](https://www.automationinterns.com/)** — Hiring AI SDE & Operations Interns

- **[ada.](https://tryada.app/)** — The AI Secretary for your Phone

- **[Red Bull](https://redbull.com/)** — Fuel for the hackathon

---

## Project: Tempo

### Mission
**Make music education accessible to everyone through AI-powered personalized coaching.**

Tempo combines real-time MIDI input, visual music feedback, and adaptive AI coaching to accelerate piano learning for beginners and intermediate players.

### Category Justification

**🎨 Creative Flourishing**
- Enables expression through music rather than traditional academic learning
- Removes intimidation barriers for those who think "I'm not musical"
- Democratizes access to personalized piano instruction

**📚 Economic Empowerment & Education**
- Reduces cost barriers to music education (AI coach vs. $60/hour piano teacher)
- Accessible to students in underserved communities
- Creates opportunity for music as a career path or hobby

---

## Ethical Considerations

### 1. **Accessibility & Equity**
  
**Commitment:** Tempo is designed to be accessible to all skill levels and financial backgrounds.

- ✅ Free open-source code (anyone can self-host)
- ✅ Works with any MIDI keyboard or on-screen piano
- ✅ No paywalls for core features
- ✅ Supports multiple MIDI file sources

**Ethical Tension:** What happens if we charge for premium features?
> **Decision:** Core learning features remain free. Premium tiers (AI expert coaching, advanced metrics) are optional. Free tier never becomes "restricted."

---

### 2. **AI Transparency & Fairness**

**Commitment:** Users understand they're learning from AI, not a human teacher.

- ✅ Clearly labeled "AI Coach" in UI
- ✅ Coach responses are explainable (e.g., "You played note C correctly 8/10 times")
- ✅ No personalized data stored beyond current session by default
- ✅ Users can see coach reasoning (what metrics led to feedback)

**Ethical Tension:** Could AI coaching create false confidence or inappropriate teaching?
> **Decision:** Coach feedback is purely technical/encouraging, never prescriptive about musical interpretation. Explicitly directs learners to find teachers for style/artistry.

---

### 3. **Data Privacy**

**Commitment:** Minimal data collection by default.

- ✅ Session data stored locally in browser (no cloud sync without explicit consent)
- ✅ No user identification required to use app
- ✅ No tracking/analytics by default
- ✅ MIDI files never sent to servers (processed locally first)
- ✅ Session audio never recorded without explicit opt-in

**Ethical Tension:** How do we improve Tempo if we can't see usage patterns?
> **Decision:** Optional anonymous telemetry (aggregated, never personal). Users opt-in for research mode.

---

### 4. **Avoiding Music Gatekeeping**

**Commitment:** Music education should not be elitist.

- ✅ Celebrates all musical styles (not just classical)
- ✅ Supports MIDI files from any genre/origin
- ✅ Coach encourages exploration, not perfection
- ✅ No judgment for "wrong" styles

**Ethical Tension:** Should we restrict to "legitimate" music sources?
> **Decision:** No. We support user-uploaded MIDI and scraped sources (with proper attribution). Music is universal.

---

### 5. **Sustainability & Server Load**

**Commitment:** Minimize environmental impact.

- ✅ Audio processing happens on user's device (no cloud compute for every session)
- ✅ Only text-based AI calls sent to backend (minimal bandwidth)
- ✅ Streaming responses (no waiting for large full responses)
- ✅ Code is open-source (can be self-hosted or forked)

**Ethical Tension:** Anthropic API calls use server resources. Is this justifiable?
> **Decision:** Yes, but we cache responses and batch requests where possible. Transparency: users know the environmental cost.

---

### 6. **Dependency Disclosure**

**Commitment:** Be honest about what Tempo relies on.

- ✅ Clear documentation that Tempo requires:
  - Anthropic Claude API (subscription model)
  - Tone.js library (Jarbas Productions)
  - Librosa (open-source)
  - User's own MIDI keyboard or files
  
- ✅ No hidden third-party services tracked
- ✅ All dependencies listed in requirements.txt

**Ethical Tension:** What if Anthropic changes their terms or pricing?
> **Decision:** Alternative backends documented. Users can fork and use other LLMs (LLaMA, etc.).

---

### 7. **Attribution & The MIDI Library**

**Commitment:** Respect intellectual property.

**TinyFish Integration:**
- Uses legal MIDI sources (public domain, Creative Commons)
- Never scrapes copyrighted arrangements without permission
- Provides attribution links in UI
- Allows users to upload their own MIDI files

**Ethical Stance:**
> ✅ We scraped MIDI files for demo purposes only (Happy Birthday is public domain)  
> ✅ Attribution always provided  
> ✅ Users can add their own licensed content  
> ✅ No commercial resale of scraped data

---

## Tech Stack & Deployment

### Frontend: Insforge Deployment

**Stack:**
- React 19 (JavaScript UI library)
- Vite (build tool for fast dev/prod builds)
- Tone.js (Web Audio API wrapper)
- @tonejs/midi (Parse MIDI files)
- WebMIDI API (Hardware keyboard input)
- Zustand (lightweight state management)
- react-markdown (Render AI coach responses with formatting)
- Tailwind CSS + custom CSS (Dark theme design system)

**Deployment on Insforge:**
```
Frontend URL: https://tempo.insforge.app
├── React app compiled to static files
├── Served via Insforge CDN
├── WebSocket proxy to backend
├── Environment: VITE_WS_URL=https://tempo-api.render.com/ws
```

**Why Insforge?**
- Free API credits for hackathon participants (YC '26)
- Easy deployment with Git integration
- Low latency for WebSocket proxying
- Good for Next.js/Vite projects

---

### Backend: Render Deployment

**Stack:**
- Python 3.10+
- FastAPI (async web framework)
- Uvicorn (ASGI server)
- Anthropic Claude Haiku 4.5 (AI coaching)
- Librosa 0.10.0 (Audio analysis)
- SoundFile 0.12.1 (WAV file processing)
- NumPy (Numerical computing)
- WebSockets (real-time bidirectional communication)

**Deployment on Render:**
```
Backend URL: https://tempo-api.render.com
├── Python uvicorn server
├── Auto-scaling on Render
├── Environment: ANTHROPIC_API_KEY=sk-ant-...
├── Endpoints:
│   ├── POST /api/generate-backing-track (Audio generation)
│   ├── GET /api/proxy-midi (CORS bypass for MIDI files)
│   └── WebSocket /ws (Coach streaming responses)
```

**Why Render?**
- Free tier supports Python backends
- Automatic deployment on git push
- Built-in environment variable management
- Good for long-running WebSocket connections

---

### AI Coaching: Anthropic Integration

**Model:** Claude Haiku 4.5 (Fast, cost-effective)

**Two-Mode System:**

#### Chat Mode (150 tokens max)
```
User plays a few notes → AI gives quick 1-2 sentence encouragement
"Great job! Your timing on the E notes was solid. 🎵"
```

#### Full Session Mode (1024 tokens max)
```
User clicks "Analysis" → AI provides comprehensive structured feedback
- Vibe Check: Overall performance assessment
- What You Crushed: Specific technical achievements  
- Growth Opportunities: Where to focus next
- Coach Tips: Specific exercises to improve
```

**Why Haiku?**
- ~$0.80 per million input tokens (cost-effective)
- Fast enough for real-time responses (2-3 second latency acceptable)
- Can be streamed for UI responsiveness

---

### Data Integration: TinyFish & TamaGrow

#### TinyFish — MIDI File Scraping & Processing

**Role:** Provides MIDI library backup & data processing tools

```python
# Example: TinyFish scrapes legal MIDI sources
sources = [
    "public_domain_classical/",  # Bach, Mozart, etc.
    "cc_licensed_modern/",       # Creative Commons
]

# Processed into Tempo Library
songs.json = [
    {
        "id": "happy_birthday",
        "title": "Happy Birthday",
        "source": "public_domain",  # Attribution
        "midi_file": "/public/Happy Birthday MIDI.mid"
    }
]
```

**TinyFish Benefits:**
- Free suite credits for hackathon
- Access to legal MIDI scraping infrastructure
- Prizes for social posts & cookbook PRs
- Accelerator golden tickets for winners ✨

**Usage in Tempo:**
- Populates default song library
- Maintains attribution for all sources
- Allows community contribution of MIDI recipes

---

#### TamaGrow — Automated Project Documentation

**Role:** Automate progress updates and showcase Tempo

```bash
# Every git commit → automatic post
TamaGrow turns:
git commit -m "feat: add markdown rendering to coach responses"

Into Twitter/LinkedIn posts:
"🎵 Tempo Update: Coach responses now render with markdown!
Better formatting = Better learning.
#hackathon #ai #music"
```

**Integration:**
- GitHub repo connected to TamaGrow
- Automatic social posts on each release
- Links back to documentation
- Builds community awareness

---

## Tools & Services Summary

| Tool | Purpose | Cost | Hackathon Benefit |
|------|---------|------|-------------------|
| **React 19** | Frontend framework | Free (open-source) | Quick prototyping |
| **Vite** | Build tooling | Free (open-source) | 10x faster builds |
| **Tone.js** | Web Audio synthesis | Free (open-source) | Professional sound |
| **Insforge** | Frontend hosting | Free tier | Provided credits YC '26 |
| **Render** | Backend hosting | Free tier | Python support |
| **Anthropic Claude** | AI coaching | Pay-as-you-go | Sponsor partnership |
| **TinyFish** | MIDI data | Free suite | Sponsor credits |
| **TamaGrow** | Social automation | Free tier | Social proof |
| **Librosa** | Audio analysis | Free (open-source) | Note matching |
| **FastAPI** | Backend framework | Free (open-source) | Type-safe APIs |

**Total Hackathon Setup Cost:** $0 (all provided by sponsors)

---

## Sustainability & Future

### Long-term Vision

After the hackathon, Tempo can:

1. **Self-sustain via multiple models:**
   - Free tier (core learning features)
   - Pro tier (advanced coaching, unlimited sessions)
   - Educational licenses (schools/nonprofits)
   - API access (other music apps integrate Tempo)

2. **Reduce AI costs:**
   - Cache common coach responses
   - Batch process MIDI analysis
   - Self-host open-source LLMs for non-critical paths

3. **Community growth:**
   - Open-source contribution pathway
   - User-submitted MIDI arrangements
   - Coach prompt refinement from user feedback

---

## How to Contribute

### Hackathon Participants
- Fork the repo and add features
- Submit PR with your improvements
- Link to social posts via TamaGrow
- Showcase your MIDI arrangements

### Post-Hackathon
- See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines
- Report issues on GitHub
- Join the Claude Builder Club community

---

## Acknowledgments

**Event Organizers:**
- Arizona State University Claude Builder Club
- Anthropic partnership & support

**This hackathon project wouldn't exist without:**
- Insforge providing UI hosting infrastructure
- Render powering the backend
- TinyFish enabling MIDI data access
- TamaGrow automating our story
- Anthropic Claude as the AI backbone
- All sponsors making free resources available

---

## Key Takeaways

**What Tempo demonstrates:**
1. ✅ AI can democratize education (personalized coaching at scale)
2. ✅ Ethical AI design requires intentional choices (transparency, privacy, accessibility)
3. ✅ Hackathons + great sponsors = idea to deployment in 48 hours
4. ✅ Open-source + community = sustainable innovation

**The ethical challenge we chose:**
> How do we build an AI music teacher that's accessible, honest, and never exploitative?

**Our answer:**
> Transparent about limitations, free at its core, respectful of both learners and IP, and built openly so others can fork and improve.

---

**Build with Tempo. Learn with purpose. Share your music.** 🎵

