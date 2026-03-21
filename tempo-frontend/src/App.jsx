import React, { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import { playNote, stopNote, startAudioContext } from './AudioEngine';
import { PianoKeyboard } from './PianoKeyboard';
import { MidiLoader } from './MidiLoader'; 
import { Waterfall } from './Waterfall';
import { Midi } from '@tonejs/midi';

const KEYBOARD_MAP = {
  'a': 'C3', 'w': 'C#3', 's': 'D3', 'e': 'D#3', 'd': 'E3',
  'f': 'F3', 't': 'F#3', 'g': 'G3', 'y': 'G#3', 'h': 'A3',
  'u': 'A#3', 'j': 'B3', 
  'k': 'C4', 'o': 'C#4', 'l': 'D4', 'p': 'D#4', ';': 'E4',
  "'": 'F4', ']': 'F#4', '\\': 'G4' 
};

const normalizeMidiData = (parsedMidi) => {
  const flatToSharp = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
  
  parsedMidi.tracks.forEach(track => {
    track.notes.forEach(note => {
      const baseNote = note.name.slice(0, -1); 
      const octave = note.name.slice(-1);      
      
      if (flatToSharp[baseNote]) {
        note.name = `${flatToSharp[baseNote]}${octave}`;
      }
    });
  });
  return parsedMidi;
};

function App() {
  const { isReady: isMidiReady, activeNotes: midiNotes, error: midiError, emitMidiEvent } = useMidi();
  const [localNotes, setLocalNotes] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [targetSong, setTargetSong] = useState(null); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetKey, setResetKey] = useState(0); 
  const [isWaitMode, setIsWaitMode] = useState(false);

  const scrollWrapperRef = useRef(null);
  
  useEffect(() => {
    if (scrollWrapperRef.current) {
      const scrollTarget = 720 - (window.innerWidth / 2);
      scrollWrapperRef.current.scrollLeft = scrollTarget;
    }
  }, []);

  // --- NEW: Reusable Audio Unlocker ---
  const initAudio = async () => {
    if (!audioEnabled) {
      await startAudioContext();
      setAudioEnabled(true);
    }
  };

  // Piggyback the audio unlock on the Load Sample click
  const loadSampleSong = async () => {
    try {
      await initAudio(); // Unlocks audio instantly!
      
      const response = await fetch('/Happy Birthday MIDI.mid');
      if (!response.ok) throw new Error("Could not find happy_birthday.mid in the public folder!");
      
      const arrayBuffer = await response.arrayBuffer();
      const midiData = new Midi(arrayBuffer);
      const cleanedMidi = normalizeMidiData(midiData);
      
      setTargetSong(cleanedMidi);
      setResetKey(prev => prev + 1);
      setIsPlaying(false);
    } catch (error) {
      console.error("Error loading sample song:", error);
      alert("Make sure happy_birthday.mid is inside your 'public' folder!");
    }
  };

  // Anti-Sticky Key Logic (Window Blur)
  useEffect(() => {
    const handleBlur = () => {
      Object.keys(localNotes).forEach(note => {
        stopNote(note);
        if (emitMidiEvent) emitMidiEvent("note_off", note);
      });
      setLocalNotes({});
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [localNotes, emitMidiEvent]);

  // Computer Keyboard Logic
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.repeat) return; 
      
      // Unlock audio if they just start typing before loading a song
      if (!audioEnabled) {
        await initAudio();
      }

      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note && !localNotes[note]) {
        playNote(note);
        setLocalNotes((prev) => ({ ...prev, [note]: true }));
        if (emitMidiEvent) emitMidiEvent("note_on", note);
      }
    };

    const handleKeyUp = (e) => {
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        stopNote(note);
        setLocalNotes((prev) => {
          const newNotes = { ...prev };
          delete newNotes[note];
          return newNotes;
        });
        if (emitMidiEvent) emitMidiEvent("note_off", note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioEnabled, localNotes, emitMidiEvent]);

  const allActiveNotes = Array.from(
    new Set([...Object.keys(midiNotes || {}), ...Object.keys(localNotes || {})])
  );

  return (
    <div style={{ width: '100vw', margin: 0, padding: 0, overflowX: 'hidden', fontFamily: 'sans-serif', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1>🎹 Tempo</h1>
        <p style={{ fontSize: '1.2rem', color: '#555' }}>Your AI Music Tutor</p>

        {/* Status indicator for audio */}
        {audioEnabled && (
          <div style={{ padding: '0.5rem', backgroundColor: '#e9ecef', borderRadius: '8px', marginBottom: '1rem', display: 'inline-block' }}>
            <p style={{ color: 'green', fontWeight: 'bold', margin: '0', fontSize: '0.9rem' }}>🔊 Audio Engine Active</p>
          </div>
        )}

        {!targetSong ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={loadSampleSong}
              style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🎉 Load Sample: Happy Birthday
            </button>
            <p style={{ margin: 0, color: '#666' }}>- or -</p>
            <MidiLoader onMidiLoaded={async (midiData) => {
              await initAudio(); // Unlocks audio on custom file upload too!
              const cleanedMidi = normalizeMidiData(midiData);
              setTargetSong(cleanedMidi);
              setResetKey(prev => prev + 1); 
              setIsPlaying(false);
            }} />
          </div>
        ) : (
          <div style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '8px', marginTop: '1rem', marginBottom: '1rem', border: '1px solid #c3e6cb' }}>
            <p style={{ color: '#155724', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
              ✅ Song Loaded: {targetSong.name || "Custom MIDI Track"}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: '0.5rem 1.5rem', fontSize: '1.2rem', backgroundColor: isPlaying ? '#ffc107' : '#007bff', color: isPlaying ? 'black' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {isPlaying ? '⏸ Pause' : '▶️ Play'}
              </button>
              
              <button onClick={() => setIsWaitMode(!isWaitMode)} style={{ padding: '0.5rem 1rem', fontSize: '1rem', backgroundColor: isWaitMode ? '#6f42c1' : 'white', color: isWaitMode ? 'white' : 'black', border: '2px solid #6f42c1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isWaitMode ? '🎓 Wait Mode: ON' : '🎓 Wait Mode: OFF'}
              </button>

              <button onClick={() => { setResetKey(prev => prev + 1); setIsPlaying(false); }} style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #999', backgroundColor: '#eee' }}>
                ⏪ Rewind
              </button>
              <button onClick={() => { setTargetSong(null); setIsPlaying(false); setAudioEnabled(false); }} style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
                New Song
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={scrollWrapperRef} style={{ width: '100%', overflowX: 'auto', display: 'flex', paddingBottom: '2rem' }}>
        <div style={{ margin: '0 auto', display: 'inline-flex', flexDirection: 'column' }}>
          <Waterfall song={targetSong} isPlaying={isPlaying} onReset={resetKey} audioEnabled={audioEnabled} activeNotes={allActiveNotes} isWaitMode={isWaitMode} />
          
          <PianoKeyboard 
            activeNotes={allActiveNotes} 
            onPlayNote={async (note) => {
              await initAudio(); // Unlocks audio if they click a key first
              playNote(note);
              setLocalNotes(prev => ({ ...prev, [note]: true }));
              if (emitMidiEvent) emitMidiEvent("note_on", note);
            }}
            onStopNote={(note) => {
              stopNote(note);
              setLocalNotes(prev => {
                const newNotes = { ...prev };
                delete newNotes[note];
                return newNotes;
              });
              if (emitMidiEvent) emitMidiEvent("note_off", note);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;