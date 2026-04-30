'use client';

import { useState } from 'react';
import styles from './FeynmanExplanation.module.css';

export default function FeynmanExplanation({ card }) {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState('');

  const fetchExplanation = async () => {
    if (explanation) { setIsOpen(!isOpen); return; }
    setLoading(true);
    setError('');
    setIsOpen(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch('/api/feynman-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: card.question, answer: card.answer, topic: '' }),
        signal: controller.signal,
      });
      let data;
      try { data = await res.json(); } catch {
        throw new Error(`Server error (${res.status}). Check that ANTHROPIC_API_KEY is set in Vercel.`);
      }
      if (!res.ok) throw new Error(data.error);
      setExplanation(data.explanation);
      setCached(data.cached);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err.message || 'Failed to generate explanation');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button className={`${styles.trigger} ${isOpen ? styles.active : ''}`} onClick={fetchExplanation}>
        {loading ? 'Loading...' : isOpen ? 'Hide explanation' : 'Explain this concept'}
      </button>

      {isOpen && (
        <div className={`${styles.panel} animate-slide-down`}>
          {loading && (
            <div className={styles.skeletons}>
              <div className={`${styles.skelLine} skeleton`} style={{ width: '85%' }} />
              <div className={`${styles.skelLine} skeleton`} style={{ width: '70%' }} />
              <div className={`${styles.skelLine} skeleton`} style={{ width: '90%' }} />
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
          {explanation && (
            <div className={styles.content}>
              {cached && <span className={styles.cachedTag}>Cached</span>}
              <div className={styles.text}>
                {explanation.split('\n').map((line, i) => {
                  if (!line.trim()) return <br key={i} />;
                  if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                    return <div key={i} className={styles.bullet}><span>·</span><span>{line.replace(/^[\s\-•]+/, '')}</span></div>;
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
