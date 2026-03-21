import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../lib/store';

export function CoachChat({ wsRef, matcherState, songName }) {
  const [input, setInput] = useState('');
  const messages = useStore((s) => s.coachMessages);
  const addMessage = useStore((s) => s.addCoachMessage);
  const replaceLastMessage = useStore((s) => s.replaceLastCoachMessage);
  const isThinking = useStore((s) => s.isCoachThinking);
  const setThinking = useStore((s) => s.setCoachThinking);
  const scrollRef = useRef(null);
  const streamBufferRef = useRef('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking]);

  // Listen for coach responses from WebSocket
  useEffect(() => {
    function handleWsMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'coach_chunk') {
          streamBufferRef.current += data.text;
          replaceLastMessage(streamBufferRef.current);
        }
        if (data.action === 'coach_done') {
          setThinking(false);
          streamBufferRef.current = '';
        }
        if (data.action === 'coach_response') {
          replaceLastMessage(data.text);
          setThinking(false);
          streamBufferRef.current = '';
        }
      } catch {}
    }
    const ws = wsRef?.current;
    if (ws) {
      ws.addEventListener('message', handleWsMessage);
      return () => ws.removeEventListener('message', handleWsMessage);
    }
  }, [wsRef, replaceLastMessage, setThinking]);

  function sendToCoach(text) {
    const userMsg = text || input.trim();
    if (!userMsg && !matcherState?.sessionStats?.totalNotes) return;

    const ws = wsRef?.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addMessage({ role: 'system', content: 'Server not connected. Run: cd backend && python server.py' });
      return;
    }

    if (userMsg) {
      addMessage({ role: 'learner', content: userMsg });
      setInput('');
    }

    setThinking(true);
    streamBufferRef.current = '';
    addMessage({ role: 'coach', content: '...' });

    const stats = matcherState?.sessionStats || {};
    const accuracy = stats.totalNotes > 0 ? Math.round((stats.correctNotes / stats.totalNotes) * 100) : 0;

    ws.send(JSON.stringify({
      type: 'coach_request',
      message: userMsg || null,
      performance: {
        accuracy: `${accuracy}%`, streak: stats.streak || 0, bestStreak: stats.bestStreak || 0,
        totalNotes: stats.totalNotes || 0, correctNotes: stats.correctNotes || 0,
        phrasesCompleted: stats.phrasesCompleted || 0, errorTypes: stats.totalErrorsByType || {},
      },
      song: songName || 'Unknown',
    }));
  }

  function requestFeedback() {
    const stats = matcherState?.sessionStats || {};
    const accuracy = stats.totalNotes > 0 ? Math.round((stats.correctNotes / stats.totalNotes) * 100) : 0;
    sendToCoach(`Session stats: ${accuracy}% accuracy, ${stats.correctNotes || 0}/${stats.totalNotes || 0} notes, best streak: ${stats.bestStreak || 0}. Give me coaching.`);
  }

  const styles = {
    container: { background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 },
    header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #eee' },
    avatar: { width: 32, height: 32, borderRadius: 8, background: '#e8f4fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#007bff' },
    title: { fontWeight: 600, fontSize: 14, color: '#08060d' },
    status: { fontSize: 11, color: '#999', fontFamily: 'monospace' },
    feedbackBtn: { marginLeft: 'auto', padding: '4px 12px', fontSize: 12, borderRadius: 6, border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', fontWeight: 600 },
    messages: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
    empty: { textAlign: 'center', padding: '20px 0', color: '#999', fontSize: 13 },
    msgRow: (role) => ({ display: 'flex', justifyContent: role === 'learner' ? 'flex-end' : 'flex-start' }),
    bubble: (role) => ({
      maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
      ...(role === 'coach' ? { background: '#f8f9fa', color: '#333', border: '1px solid #eee' }
        : role === 'learner' ? { background: '#007bff', color: 'white' }
        : { background: '#fff3cd', color: '#856404', border: '1px solid #ffc107', fontSize: 11 }),
    }),
    inputRow: { display: 'flex', gap: 6 },
    input: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, outline: 'none' },
    sendBtn: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#007bff', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.avatar}>🤖</div>
        <div>
          <div style={styles.title}>AI Coach</div>
          <div style={styles.status}>{isThinking ? 'thinking...' : 'ready'}</div>
        </div>
        {matcherState?.sessionStats?.totalNotes > 0 && (
          <button style={styles.feedbackBtn} onClick={requestFeedback}>Get Feedback</button>
        )}
      </div>

      <div style={styles.messages} ref={scrollRef}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <p>Play some notes and I'll coach you!</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Or ask me anything about piano.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={styles.msgRow(msg.role)}>
            <div style={styles.bubble(msg.role)}>{msg.content}</div>
          </div>
        ))}
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendToCoach()}
          placeholder="Ask your coach anything..."
        />
        <button style={styles.sendBtn} onClick={() => sendToCoach()} disabled={!input.trim() || isThinking}>
          Send
        </button>
      </div>
    </div>
  );
}
