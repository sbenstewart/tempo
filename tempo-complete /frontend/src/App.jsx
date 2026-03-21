import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Midi } from '@tonejs/midi';
import { useMidi } from './hooks/useMidi';
import { playNote, stopNote, startAudioContext } from './lib/AudioEngine';
import { PianoKeyboard } from './components/PianoKeyboard';
import { MidiLoader } from './components/MidiLoader';
import { Waterfall } from './components/Waterfall';
import { CoachChat } from './components/CoachChat';
import { SkillGraph } from './components/SkillGraph';
import { ModeSelector } from './components/ModeSelector';
import { useStore } from './lib/store';
import { isInsForgeConfigured } from './lib/insforgeClient';
import {
  buildExpectedSequenceFromSong,
  createMatcherState,
  detectSkippedNotes,
  evaluatePlayedNote,
  shouldCompletePhrase,
  finalizePhrase,
} from './lib/patternMatcher';

// ── Keyboard → Note mapping (team's original) ─────
const KEYBOARD_MAP = {
  a: 'C3', w: 'C#3', s: 'D3', e: 'D#3', d: 'E3', f: 'F3',
  t: 'F#3', g: 'G3', y: 'G#3', h: 'A3', u: 'A#3', j: 'B3',
  k: 'C4', o: 'C#4', l: 'D4', p: 'D#4', ';': 'E4', "'": 'F4',
  ']': 'F#4', '\\': 'G4',
};
const PIANO_KEYS_SET = new Set(Object.keys(KEYBOARD_MAP));

const normalizeMidiData = (parsedMidi) => {
  const flatToSharp = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  parsedMidi.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      const match = note.name.match(/^([A-G](?:#|b)?)(-?\d+)$/);
      if (!match) return;
      const [, baseNote, octave] = match;
      if (flatToSharp[baseNote]) note.name = `${flatToSharp[baseNote]}${octave}`;
    });
  });
  return parsedMidi;
};

function App() {
  // ── Team's original state ────────────────────────
  const [localNotes, setLocalNotes] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [songLibrary, setSongLibrary] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isWaitMode, setIsWaitMode] = useState(false);
  const [expectedNotes, setExpectedNotes] = useState([]);
  const [matcherState, setMatcherState] = useState(createMatcherState());
  const [noteFeedback, setNoteFeedback] = useState({});
  const [lastPhraseSummary, setLastPhraseSummary] = useState(null);
  const [feedbackLog, setFeedbackLog] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // ── New: Zustand store ───────────────────────────
  const mode = useStore((s) => s.mode);
  const addCoachMessage = useStore((s) => s.addCoachMessage);
  const updateSkill = useStore((s) => s.updateSkill);
  const skills = useStore((s) => s.skills);

  const scrollWrapperRef = useRef(null);
  const exerciseStartRef = useRef(null);
  const lastPlayedAtRef = useRef(0);
  const phraseTimerRef = useRef(null);
  const wsRef = useRef(null);

  const targetSong = currentSongIndex !== null ? songLibrary[currentSongIndex]?.midi ?? null : null;
  const currentSongName = currentSongIndex !== null
    ? (songLibrary[currentSongIndex]?.name || songLibrary[currentSongIndex]?.fileName || null)
    : null;

  // ── Coach WebSocket (separate from MIDI ws) ──────
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    wsRef.current = ws;
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, []);

  // ── Team's matcher helpers (unchanged) ───────────
  const resetMatcher = () => {
    setMatcherState(createMatcherState());
    setLastPhraseSummary(null);
    setNoteFeedback({});
    exerciseStartRef.current = null;
    lastPlayedAtRef.current = 0;
    if (phraseTimerRef.current) { clearTimeout(phraseTimerRef.current); phraseTimerRef.current = null; }
  };

  const clearFeedbackAfterDelay = (note) => {
    window.setTimeout(() => {
      setNoteFeedback((prev) => { const next = { ...prev }; delete next[note]; return next; });
    }, 350);
  };

  const getPlaybackTimeSeconds = () => {
    if (!exerciseStartRef.current) return 0;
    return (performance.now() - exerciseStartRef.current) / 1000;
  };

  const completePhraseIfNeeded = (stateToCheck) => {
    const now = performance.now();
    if (!shouldCompletePhrase(stateToCheck, lastPlayedAtRef.current, now)) return stateToCheck;
    const { state: nextState, phraseSummary } = finalizePhrase(stateToCheck);
    setMatcherState(nextState);
    setLastPhraseSummary(phraseSummary);
    setFeedbackLog((prev) => [phraseSummary, ...prev].slice(0, 10));

    // NEW: Auto-notify coach after each phrase
    if (phraseSummary.errors.length > 3) {
      addCoachMessage({
        role: 'system',
        content: `Phrase #${phraseSummary.phraseNumber}: ${phraseSummary.errors.length} errors, accuracy ${Math.round(phraseSummary.sessionAccuracy * 100)}%`,
      });
    }

    // NEW: Update skill mastery
    if (phraseSummary.sessionAccuracy > 0.8) {
      updateSkill('quarter', Math.min(1, (skills.find((s) => s.id === 'quarter')?.mastery || 0) + 0.05));
    }

    return nextState;
  };

  const handleMatchedNote = (note, velocity = 80, source = 'virtual') => {
    if (!expectedNotes.length) return;
    if (isWaitMode && !isPlaying) return;
    if (!exerciseStartRef.current) exerciseStartRef.current = performance.now();

    const playedTimeSeconds = getPlaybackTimeSeconds();

    setMatcherState((prevState) => {
      let workingState = detectSkippedNotes({ state: prevState, expectedNotes, playbackTimeSeconds: playedTimeSeconds });
      const expected = expectedNotes[workingState.expectedIndex];
      const { state: evaluatedState, result } = evaluatePlayedNote({
        state: workingState, expectedNote: expected, playedNote: note, playedTimeSeconds, velocity,
      });

      setNoteFeedback((prev) => ({
        ...prev,
        [note]: {
          type: result.feedbackType,
          label: expected ? `${result.feedbackType.toUpperCase()} — expected ${expected.note}` : `Played ${note}`,
        },
      }));
      clearFeedbackAfterDelay(note);
      lastPlayedAtRef.current = performance.now();

      if (phraseTimerRef.current) clearTimeout(phraseTimerRef.current);
      phraseTimerRef.current = setTimeout(() => {
        setMatcherState((s) => completePhraseIfNeeded(s));
      }, 850);

      const maybeCompleted = completePhraseIfNeeded(evaluatedState);
      if (maybeCompleted.expectedIndex >= expectedNotes.length) {
        return completePhraseIfNeeded(maybeCompleted);
      }
      return maybeCompleted;
    });
  };

  // ── MIDI hook (team's) ───────────────────────────
  const { isReady: isMidiReady, activeNotes: midiNotes, error: midiError, emitMidiEvent } = useMidi({
    onNoteEvent: (event) => {
      if (event.type === 'note_on') {
        handleMatchedNote(event.note, event.velocity ?? 80, event.source || 'physical');
      }
    },
  });

  // ── Keyboard input (with capture to prevent restarts) ──
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (PIANO_KEYS_SET.has(key)) {
        e.preventDefault();
        e.stopPropagation();
        const note = KEYBOARD_MAP[key];
        if (note && !localNotes[note]) {
          playNote(note);
          setLocalNotes((prev) => ({ ...prev, [note]: true }));
          emitMidiEvent?.('note_on', note, 80, 'keyboard');
          handleMatchedNote(note, 80, 'keyboard');
        }
      }
    }
    function onKeyUp(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (PIANO_KEYS_SET.has(key)) {
        e.preventDefault();
        const note = KEYBOARD_MAP[key];
        if (note) {
          stopNote(note);
          setLocalNotes((prev) => { const n = { ...prev }; delete n[note]; return n; });
          emitMidiEvent?.('note_off', note, 0, 'keyboard');
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
    };
  }, [localNotes, emitMidiEvent]);

  // ── Effects ──────────────────────────────────────
  useEffect(() => {
    if (scrollWrapperRef.current) {
      scrollWrapperRef.current.scrollLeft = 720 - window.innerWidth / 2;
    }
  }, []);

  useEffect(() => { return () => { if (phraseTimerRef.current) clearTimeout(phraseTimerRef.current); }; }, []);

  useEffect(() => {
    if (!targetSong) { setExpectedNotes([]); resetMatcher(); return; }
    setExpectedNotes(buildExpectedSequenceFromSong(targetSong));
    resetMatcher();
  }, [targetSong]);

  const initAudio = async () => {
    if (!audioEnabled) { await startAudioContext(); setAudioEnabled(true); }
  };

  const loadSampleSong = async () => {
    try {
      await initAudio();
      const response = await fetch('/Happy Birthday MIDI.mid');
      if (!response.ok) throw new Error("Could not find 'Happy Birthday MIDI.mid' in public/");
      const arrayBuffer = await response.arrayBuffer();
      const midiData = new Midi(arrayBuffer);
      const cleanedMidi = normalizeMidiData(midiData);
      const sampleSong = { id: 'sample-happy-birthday', name: cleanedMidi.name || 'Happy Birthday', midi: cleanedMidi };
      setSongLibrary((prev) => {
        const without = prev.filter((s) => s.id !== sampleSong.id);
        return [sampleSong, ...without];
      });
      setCurrentSongIndex(0);
    } catch (err) {
      console.error('Could not load sample song:', err);
    }
  };

  const handleMidiLoaded = (songs) => {
    const cleaned = songs.map((s) => ({
      ...s,
      midi: normalizeMidiData(s.midi),
      name: s.fileName?.replace('.mid', '') || 'Untitled',
    }));
    setSongLibrary((prev) => [...prev, ...cleaned]);
    if (currentSongIndex === null && cleaned.length > 0) {
      setCurrentSongIndex(songLibrary.length);
    }
  };

  const allActiveNotes = useMemo(() => {
    return [...Object.keys(localNotes), ...Object.keys(midiNotes)];
  }, [localNotes, midiNotes]);

  const stats = matcherState.sessionStats;
  const accuracyPercent = stats.totalNotes > 0 ? Math.round((stats.correctNotes / stats.totalNotes) * 100) : 0;
  const currentExpected = expectedNotes[matcherState.expectedIndex] || null;
  const grade = accuracyPercent >= 95 ? 'S' : accuracyPercent >= 85 ? 'A' : accuracyPercent >= 70 ? 'B' : accuracyPercent >= 55 ? 'C' : accuracyPercent >= 40 ? 'D' : '—';

  // ── Styles (matching team's UI) ──────────────────
  const S = {
    app: { maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px', fontFamily: "system-ui, 'Segoe UI', sans-serif" },
    header: { textAlign: 'center', padding: '20px 0 10px' },
    logo: { fontSize: 36, fontWeight: 500, color: '#007bff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
    logoIcon: { fontSize: 32 },
    subtitle: { color: '#666', fontSize: 14 },
    statusBar: (ok) => ({ textAlign: 'center', padding: '10px 16px', borderRadius: 8, margin: '10px 0', background: ok ? '#d4edda' : '#f8f9fa', border: `1px solid ${ok ? '#c3e6cb' : '#ddd'}` }),
    statusText: (ok) => ({ fontWeight: 600, color: ok ? '#28a745' : '#666', fontSize: 14 }),
    statusSub: { color: '#666', fontSize: 13 },
    btn: (bg, color) => ({ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: bg, color, border: 'none', borderRadius: 6, cursor: 'pointer' }),
    btnOutline: (active, color) => ({ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: active ? color : '#fff', color: active ? '#fff' : '#333', border: `2px solid ${color}`, borderRadius: 6, cursor: 'pointer' }),
    card: { background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 12 },
    stat: { background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 },
    statLabel: { fontWeight: 600, fontSize: 13, color: '#333' },
    statValue: { fontSize: 20, fontWeight: 700, color: '#007bff', marginTop: 2 },
    controls: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
    songLoaded: { background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: '12px 16px', textAlign: 'center', marginTop: 16 },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginTop: 16 },
    sidebar: { display: 'flex', flexDirection: 'column', gap: 0 },
    integrations: { display: 'flex', gap: 8, marginTop: 12 },
    badge: (ok) => ({ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: ok ? '#d4edda' : '#f8f9fa', color: ok ? '#28a745' : '#999', border: `1px solid ${ok ? '#c3e6cb' : '#ddd'}`, fontFamily: 'monospace' }),
  };

  // ══════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════
  return (
    <div style={S.app}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.logo}>
          <span style={S.logoIcon}>🎹</span>
          <span style={{ color: '#007bff' }}>Tempo</span>
        </div>
        <p style={S.subtitle}>Your AI Music Tutor</p>
      </div>

      {/* ── Status bars ─────────────────────────────── */}
      <div style={S.statusBar(audioEnabled)}>
        <div style={S.statusText(audioEnabled)}>
          {audioEnabled ? '🔊 Audio Engine Active' : '🔇 Click to Enable Audio'}
        </div>
        <div style={S.statusSub}>
          MIDI: {isMidiReady ? 'Connected / Ready' : midiError || 'Not detected'}
          {wsConnected && ' · AI Coach: Connected'}
        </div>
      </div>

      {/* ── Mode selector (NEW) ─────────────────────── */}
      <ModeSelector />

      {/* ── Load sample + MIDI upload ───────────────── */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button style={S.btn('#007bff', 'white')} onClick={loadSampleSong}>
          Load Sample: Happy Birthday
        </button>
      </div>

      <MidiLoader onMidiLoaded={handleMidiLoaded} />

      {/* ── Song library ────────────────────────────── */}
      {songLibrary.length > 0 && (
        <div style={S.card}>
          <h3 style={{ textAlign: 'center', fontSize: 16 }}>🎵 Song Library</h3>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 13 }}>
            Uploaded songs: {songLibrary.length}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>
            {songLibrary.map((song, idx) => (
              <button
                key={song.id || idx}
                onClick={async () => { await initAudio(); setCurrentSongIndex(idx); setIsPlaying(false); resetMatcher(); }}
                style={{
                  padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  background: currentSongIndex === idx ? '#007bff' : '#fff',
                  color: currentSongIndex === idx ? '#fff' : '#333',
                  border: `1px solid ${currentSongIndex === idx ? '#007bff' : '#ddd'}`,
                  fontWeight: currentSongIndex === idx ? 600 : 400,
                }}
              >
                {song.name || song.fileName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transport + stats ───────────────────────── */}
      {targetSong && (
        <>
          <div style={S.songLoaded}>
            <strong>✅ Song Loaded: {currentSongName}</strong>
          </div>

          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={S.controls}>
              <button
                onClick={async () => { await initAudio(); setIsPlaying((p) => !p); }}
                style={S.btn(isPlaying ? '#ffc107' : '#007bff', isPlaying ? 'black' : 'white')}
              >
                {isPlaying ? '⏸ Pause' : '▶️ Play'}
              </button>
              <button
                onClick={() => setIsWaitMode((p) => !p)}
                style={S.btnOutline(isWaitMode, '#6f42c1')}
              >
                Wait Mode: {isWaitMode ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => { setResetKey((p) => p + 1); setIsPlaying(false); resetMatcher(); }}
                style={S.btnOutline(false, '#999')}
              >
                ⏪ Rewind
              </button>
              <button
                onClick={() => { setCurrentSongIndex(null); setIsPlaying(false); setExpectedNotes([]); resetMatcher(); }}
                style={S.btnOutline(false, '#ccc')}
              >
                Unload Song
              </button>
            </div>
          </div>

          {/* ── Stats grid (enhanced) ───────────────── */}
          <div style={S.grid}>
            <div style={S.stat}>
              <div style={S.statLabel}>Next Expected</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>
                {currentExpected?.note || 'Done'}
              </div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Accuracy</div>
              <div style={{ ...S.statValue, color: accuracyPercent >= 70 ? '#28a745' : accuracyPercent >= 40 ? '#ffc107' : '#dc3545' }}>
                {accuracyPercent}%
              </div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Streak</div>
              <div style={S.statValue}>
                {stats.streak} <span style={{ fontSize: 12, color: '#666', fontWeight: 400 }}>
                  (best {stats.bestStreak})
                </span>
              </div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Grade</div>
              <div style={{
                fontSize: 28, fontWeight: 700,
                color: grade === 'S' ? '#ffc107' : grade === 'A' ? '#28a745' : grade === 'B' ? '#007bff' : grade === 'C' ? '#fd7e14' : '#dc3545',
              }}>{grade}</div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Notes Hit</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
                {stats.correctNotes}/{stats.totalNotes}
              </div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Phrases</div>
              <div style={S.statValue}>{stats.phrasesCompleted}</div>
            </div>
          </div>

          {/* ── Debug / Coach Log (team's original) ─── */}
          <div style={{ marginTop: 16, textAlign: 'left' }}>
            <button
              onClick={() => setShowDebugPanel((p) => !p)}
              style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #bbb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              {showDebugPanel ? 'Hide Debug Log' : 'Show Debug Log'}
            </button>
            {showDebugPanel && (
              <div style={{ ...S.card, marginTop: 8 }}>
                {lastPhraseSummary && (
                  <div style={{ marginBottom: 12, padding: 12, background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8 }}>
                    <strong>Last Attempt</strong>
                    <div>Attempt #{lastPhraseSummary.phraseNumber}</div>
                    <div>Notes: {lastPhraseSummary.playedNotes.length} · Errors: {lastPhraseSummary.errors.length}</div>
                    <div style={{ marginTop: 4 }}>
                      Recurring: {lastPhraseSummary.recurringErrors.length ? lastPhraseSummary.recurringErrors.join(', ') : 'None'}
                    </div>
                  </div>
                )}
                {feedbackLog.length > 0 ? (
                  <div>
                    <strong>History</strong>
                    <div style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {feedbackLog.map((item) => (
                        <div key={item.phraseNumber} style={{ padding: '4px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
                          Attempt {item.phraseNumber}: {item.errors.length} errors, accuracy {Math.round(item.sessionAccuracy * 100)}%
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#666' }}>No logs yet.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Two-column: Waterfall+Piano | Coach+Skills ── */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* LEFT: Waterfall + Piano */}
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div ref={scrollWrapperRef} style={{ width: '100%', overflowX: 'auto', display: 'flex', paddingBottom: 8 }}>
              <div style={{ margin: '0 auto', display: 'inline-flex', flexDirection: 'column' }}>
                <Waterfall
                  song={targetSong}
                  isPlaying={isPlaying}
                  onReset={resetKey}
                  audioEnabled={audioEnabled}
                  activeNotes={allActiveNotes}
                  isWaitMode={isWaitMode}
                />
                <PianoKeyboard
                  activeNotes={allActiveNotes}
                  noteFeedback={noteFeedback}
                  onPlayNote={async (note) => {
                    await initAudio();
                    playNote(note);
                    setLocalNotes((prev) => ({ ...prev, [note]: true }));
                    emitMidiEvent?.('note_on', note, 80, 'mouse');
                    handleMatchedNote(note, 80, 'mouse');
                  }}
                  onStopNote={(note) => {
                    stopNote(note);
                    setLocalNotes((prev) => { const n = { ...prev }; delete n[note]; return n; });
                    emitMidiEvent?.('note_off', note, 0, 'mouse');
                  }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Coach + Skills */}
          <div style={{ width: 380, flexShrink: 0 }}>
            <CoachChat wsRef={wsRef} matcherState={matcherState} songName={currentSongName} />
            <SkillGraph />

            {/* Integration status */}
            <div style={S.integrations}>
              <span style={S.badge(wsConnected)}>
                {wsConnected ? '✓ AI Coach' : '○ AI Coach'}
              </span>
              <span style={S.badge(isInsForgeConfigured())}>
                {isInsForgeConfigured() ? '✓ InsForge' : '○ InsForge'}
              </span>
              <span style={S.badge(isMidiReady)}>
                {isMidiReady ? '✓ MIDI' : '○ MIDI'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
