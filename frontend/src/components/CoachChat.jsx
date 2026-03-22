import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../lib/store';

function technicalAccuracyPercent(matcherState) {
  const total = matcherState?.sessionStats?.totalNotesConsidered || 0;
  const correct = matcherState?.sessionStats?.correctNotes || 0;
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function buildSessionPayload(matcherState, songName, mode) {
  const pendingAttempt = (matcherState?.attemptPlayedNotes?.length || matcherState?.attemptErrors?.length)
    ? {
        exercise: {
          name: songName || 'Unknown',
          tempo_bpm: null,
          expected_notes: matcherState?.attemptExpectedNotes || [],
        },
        played_notes: matcherState?.attemptPlayedNotes || [],
        errors: matcherState?.attemptErrors || [],
        attempt_context: {
          attempt_number: (matcherState?.sessionStats?.attemptsCompleted || 0) + 1,
          attempt_played_note_count: matcherState?.attemptPlayedNotes?.length || 0,
          attempt_error_count: matcherState?.attemptErrors?.length || 0,
        },
      }
    : null;

  return {
    exercise: {
      name: songName || 'Unknown',
      tempo_bpm: null,
      expected_notes: [],
    },
    played_notes: [],
    errors: [],
    attempt_context: {
      attempt_number: matcherState?.sessionStats?.attemptsCompleted || 0,
      attempt_played_note_count: matcherState?.attemptPlayedNotes?.length || 0,
      attempt_error_count: matcherState?.attemptErrors?.length || 0,
    },
    session_context: {
      friendly_score_percent: (() => {
        const played = matcherState?.uiStats?.playedNotes || 0;
        const correct = matcherState?.uiStats?.correctPlayedNotes || 0;
        return played > 0 ? Math.round((correct / played) * 100) : 0;
      })(),
      technical_session_accuracy_percent: technicalAccuracyPercent(matcherState),
      played_notes_count: matcherState?.uiStats?.playedNotes || 0,
      correct_played_notes_count: matcherState?.uiStats?.correctPlayedNotes || 0,
      recurring_errors: Object.entries(matcherState?.recurringErrors || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern} (${count})`),
      streak: matcherState?.sessionStats?.streak || 0,
      best_streak: matcherState?.sessionStats?.bestStreak || 0,
      attempts_completed: matcherState?.sessionStats?.attemptsCompleted || 0,
      skipped_notes_count: matcherState?.sessionStats?.skippedNotes || 0,
    },
    recent_attempts: pendingAttempt
      ? [pendingAttempt, ...(matcherState?.attemptHistory || [])]
      : (matcherState?.attemptHistory || []),
    mode: mode || 'guided',
  };
}

export function CoachChat({ wsRef, matcherState, songName, mode, lastAttemptSummary }) {
  const [userMsg, setUserMsg] = useState('');
  const messages = useStore((s) => s.coachMessages) || [];
  const addCoachMessage = useStore((s) => s.addCoachMessage);

  const debugStats = useMemo(() => {
    const played = matcherState?.uiStats?.playedNotes || 0;
    const correctPlayed = matcherState?.uiStats?.correctPlayedNotes || 0;
    const friendly = played > 0 ? Math.round((correctPlayed / played) * 100) : 0;

    return {
      friendly,
      technical: technicalAccuracyPercent(matcherState),
      skipped: matcherState?.sessionStats?.skippedNotes || 0,
      played,
      attempts: matcherState?.sessionStats?.attemptsCompleted || 0,
    };
  }, [matcherState]);

  useEffect(() => {
    if (!lastAttemptSummary) return;

    const playedCount = lastAttemptSummary?.attempt_context?.attempt_played_note_count || 0;
    if (playedCount === 0) return;

    const ws = wsRef?.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'coach_request',
      request_kind: 'attempt_feedback',
      coach_payload: lastAttemptSummary,
    }));
  }, [lastAttemptSummary, wsRef]);

  const sendToCoach = (isFullAnalysis = false) => {
    const ws = wsRef?.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addCoachMessage({
        role: 'system',
        content: '⚠️ AI Coach is offline. Make sure the backend server is running.'
      });
      return;
    }

    const trimmed = userMsg.trim();
    if (!isFullAnalysis && !trimmed) return;

    // Add user message to UI
    addCoachMessage({ role: 'user', content: isFullAnalysis ? 'Get full analysis' : trimmed });

    const payload = {
      type: 'coach_request',
      request_kind: isFullAnalysis ? 'full_session' : 'chat',
      message: isFullAnalysis
        ? 'Give me a full coaching summary of this practice session.'
        : trimmed,
      coach_payload: isFullAnalysis
        ? buildSessionPayload(matcherState, songName, mode)
        : (lastAttemptSummary || buildSessionPayload(matcherState, songName, mode)),
    };

    ws.send(JSON.stringify(payload));
    setUserMsg('');
  };

  return (
    <div className="kf-coach">
      <div className="kf-coach-header">
        <div className="kf-coach-avatar">🤖</div>
        <div>
          <strong>AI Coach</strong>
          <div className="kf-coach-status">Live feedback</div>
        </div>
        <button className="kf-btn kf-btn-sm kf-btn-accent" onClick={() => sendToCoach(true)}>
          Analysis
        </button>
      </div>

      <div style={{ padding: '0 16px', fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: 'var(--text-dim)', marginBottom: '8px' }}>
        <div><strong>Technical:</strong> {debugStats.technical}%</div>
        <div><strong>Score:</strong> {debugStats.friendly}%</div>
        <div><strong>Played:</strong> {debugStats.played}</div>
        <div><strong>Skipped:</strong> {debugStats.skipped}</div>
        <div><strong>Attempts:</strong> {debugStats.attempts}</div>
        <div><strong>Song:</strong> {songName || '—'}</div>
      </div>

      <div className="kf-coach-messages">
        {messages.length === 0 ? (
          <div className="kf-coach-empty">
            <p>No messages yet. Try playing some notes and I'll help!</p>
          </div>
        ) : (
          [...messages].reverse().map((msg) => {
            const msgRole = msg.role === 'assistant' ? 'coach' : msg.role === 'user' ? 'learner' : 'system';
            return (
              <div key={msg.id} className={`kf-msg kf-msg-${msgRole}`}>
                <div className={`kf-msg-bubble kf-msg-bubble-${msgRole}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="kf-coach-input">
        <input
          type="text"
          value={userMsg}
          onChange={(e) => setUserMsg(e.target.value)}
          placeholder="Ask for tips..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendToCoach(false);
          }}
        />
        <button onClick={() => sendToCoach(false)} className="kf-btn kf-btn-sm kf-btn-accent">
          Send
        </button>
      </div>
    </div>
  );
}
