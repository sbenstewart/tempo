import React from 'react';
import { useStore } from '../lib/store';

const MODES = [
  { id: 'guided', label: 'Guided', icon: '📖', desc: 'Follow the notes' },
  { id: 'freeplay', label: 'Free Play', icon: '🎹', desc: 'Play anything' },
  { id: 'jam', label: 'Jam Session', icon: '🎵', desc: 'Play with AI' },
  { id: 'boss', label: 'Boss Battle', icon: '⚔️', desc: 'Echo challenge' },
  { id: 'ear', label: 'Ear Training', icon: '👂', desc: 'Identify notes' },
];

export function ModeSelector() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          title={m.desc}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: mode === m.id ? '2px solid #007bff' : '1px solid #ddd',
            background: mode === m.id ? '#e8f4fd' : '#fff',
            color: mode === m.id ? '#007bff' : '#666',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: mode === m.id ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </div>
  );
}
