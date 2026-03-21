import React from 'react';
import { useStore } from '../lib/store';

const COLORS = {
  scales: '#28a745', chords: '#6f42c1', rhythm: '#ffc107',
  technique: '#dc3545', reading: '#007bff', theory: '#e83e8c',
};

export function SkillGraph() {
  const skills = useStore((s) => s.skills);

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#08060d', marginBottom: 12 }}>📊 Skill Progress</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {skills.map((skill) => {
          const color = COLORS[skill.category] || '#007bff';
          const pct = Math.round(skill.mastery * 100);
          return (
            <div key={skill.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, color: '#333' }}>{skill.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#f0f0f0' }}>
                <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(COLORS).map(([cat, color]) => (
          <span key={cat} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: `${color}15`, color, textTransform: 'capitalize', fontWeight: 500,
          }}>{cat}</span>
        ))}
      </div>
    </div>
  );
}
