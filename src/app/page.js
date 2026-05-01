'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthContext';
import LoginPage from '@/components/LoginPage';
import Header from '@/components/Header';
import DatasetUploader from '@/components/DatasetUploader';
import StudyCard from '@/components/StudyCard';
import FeynmanExplanation from '@/components/FeynmanExplanation';
import ProgressBar from '@/components/ProgressBar';
import SessionComplete from '@/components/SessionComplete';
import { Hero } from '@/components/ui/animated-hero';
import {
  initializeCard,
  processRating,
  reinsertCard,
  buildStudyQueue,
  calculateStats,
} from '@/lib/spacedRepetition';
import {
  saveDeck,
  updateDeck,
  getUserDecks,
  deleteDeck,
} from '@/lib/firebase';
import styles from './page.module.css';

function formatRelativeDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function deckNameFromData(data) {
  if (data.topics?.length > 0) {
    const t = data.topics[0];
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (data.format === 'anki') return 'Anki Deck';
  return 'Study Deck';
}

export default function Home() {
  const { user, loading } = useAuth();

  // Study state
  const [view, setView] = useState('upload');
  const [allCards, setAllCards] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [studiedCount, setStudiedCount] = useState(0);

  // Persistence state
  const [savedDecks, setSavedDecks] = useState([]);
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [decksLoading, setDecksLoading] = useState(false);

  const studySectionRef = useRef(null);

  // Load saved decks when user logs in
  useEffect(() => {
    if (!user) { setSavedDecks([]); return; }
    setDecksLoading(true);
    getUserDecks(user.uid)
      .then(setSavedDecks)
      .catch(() => {})
      .finally(() => setDecksLoading(false));
  }, [user]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleDatasetParsed = useCallback((data) => {
    const initialized = data.cards.map((card, i) => initializeCard(card, i));
    setAllCards(initialized);
    setQueue(buildStudyQueue(initialized));
    setCurrentIndex(0);
    setStudiedCount(0);
    setIsRevealed(false);
    setGradeResult(null);
    setView('study');

    if (user) {
      saveDeck(user.uid, {
        name: deckNameFromData(data),
        format: data.format,
        topics: data.topics || [],
        cards: initialized,
      }).then(id => {
        if (id) {
          setCurrentDeckId(id);
          setSavedDecks(prev => [{
            id,
            name: deckNameFromData(data),
            format: data.format,
            topics: data.topics || [],
            totalCards: initialized.length,
            cards: initialized,
            accuracy: null,
            cardsStudied: 0,
            createdAt: { toDate: () => new Date() },
            lastStudied: null,
          }, ...prev]);
        }
      }).catch(() => {});
    }
  }, [user]);

  const handleReveal = useCallback(async (userAnswer) => {
    setIsRevealed(true);
    const card = queue[currentIndex];
    if (userAnswer && userAnswer.trim()) {
      try {
        const res = await fetch('/api/grade-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: card.question, correctAnswer: card.answer, userAnswer }),
        });
        try {
          const data = await res.json();
          if (res.ok) setGradeResult(data);
        } catch { /* grading unavailable */ }
      } catch { /* silent */ }
    }
  }, [queue, currentIndex]);

  const handleGrade = useCallback((rating) => {
    const card = queue[currentIndex];
    const updatedCard = processRating(card, rating);
    const updatedAllCards = allCards.map(c => c.id === updatedCard.id ? updatedCard : c);
    setAllCards(updatedAllCards);

    const newQueue = reinsertCard(
      queue.map(c => c.id === updatedCard.id ? updatedCard : c),
      updatedCard,
      rating
    );
    setStudiedCount(prev => prev + 1);

    if (newQueue.length === 0 || currentIndex >= newQueue.length) {
      setQueue(newQueue);
      setView('complete');
      // Save final state to Firestore
      if (user && currentDeckId) {
        const finalStats = calculateStats(updatedAllCards);
        updateDeck(user.uid, currentDeckId, {
          cards: updatedAllCards,
          accuracy: finalStats.accuracy,
          cardsStudied: finalStats.cardsStudied,
        }).catch(() => {});
        setSavedDecks(prev => prev.map(d =>
          d.id === currentDeckId
            ? { ...d, cards: updatedAllCards, accuracy: finalStats.accuracy, cardsStudied: finalStats.cardsStudied, lastStudied: { toDate: () => new Date() } }
            : d
        ));
      }
      return;
    }
    setQueue(newQueue);
    setCurrentIndex(Math.min(currentIndex, newQueue.length - 1));
    setIsRevealed(false);
    setGradeResult(null);
  }, [queue, currentIndex, allCards, user, currentDeckId]);

  const handleRestart = useCallback(() => {
    const resetCards = allCards.map(c => ({
      ...c, history: [], repetitions: 0, lastReview: null,
      nextReview: null, easeFactor: 2.5, interval: 0,
    }));
    setAllCards(resetCards);
    setQueue(buildStudyQueue(resetCards));
    setCurrentIndex(0);
    setStudiedCount(0);
    setIsRevealed(false);
    setGradeResult(null);
    setView('study');
  }, [allCards]);

  const handleNewDeck = useCallback(() => {
    // Persist progress before navigating away
    if (user && currentDeckId && studiedCount > 0) {
      const stats = calculateStats(allCards);
      updateDeck(user.uid, currentDeckId, {
        cards: allCards,
        accuracy: stats.accuracy,
        cardsStudied: stats.cardsStudied,
      }).catch(() => {});
    }
    setAllCards([]);
    setQueue([]);
    setCurrentIndex(0);
    setStudiedCount(0);
    setIsRevealed(false);
    setGradeResult(null);
    setCurrentDeckId(null);
    setView('upload');
  }, [user, currentDeckId, allCards, studiedCount]);

  const handleResumeDeck = useCallback((deck) => {
    setAllCards(deck.cards);
    setQueue(buildStudyQueue(deck.cards));
    setCurrentIndex(0);
    setStudiedCount(0);
    setIsRevealed(false);
    setGradeResult(null);
    setCurrentDeckId(deck.id);
    setView('study');
  }, []);

  const handleDeleteDeck = useCallback((deckId) => {
    setSavedDecks(prev => prev.filter(d => d.id !== deckId));
    if (user) deleteDeck(user.uid, deckId).catch(() => {});
  }, [user]);

  // ── Auth gates ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const stats = calculateStats(allCards);
  const currentCard = queue[currentIndex];

  return (
    <>
      <Header isStudying={view === 'study'} onBack={handleNewDeck} />

      <main className={styles.main}>
        {view === 'upload' && (
          <div className={`${styles.uploadView} animate-fade-in`}>
            <Hero
              onContinue={() => setView('study')}
              onCreate={() => studySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              hasExistingDeck={allCards.length > 0}
            />

            {/* Past decks */}
            {savedDecks.length > 0 && (
              <section className={styles.pastDecks}>
                <p className={styles.pastDecksLabel}>Continue where you left off</p>
                <div className={styles.deckList}>
                  {savedDecks.map(deck => (
                    <div key={deck.id} className={styles.deckItem}>
                      <div className={styles.deckInfo}>
                        <span className={styles.deckName}>{deck.name}</span>
                        <div className={styles.deckMeta}>
                          <span>{deck.totalCards} cards</span>
                          {deck.accuracy != null && (
                            <span>{deck.accuracy}% accuracy</span>
                          )}
                          {deck.lastStudied && (
                            <span>{formatRelativeDate(deck.lastStudied)}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.deckActions}>
                        <button className={styles.resumeBtn} onClick={() => handleResumeDeck(deck)}>
                          Resume
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteDeck(deck.id)}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {decksLoading && (
              <p className={styles.decksLoadingText}>Loading your decks…</p>
            )}

            {/* Upload section */}
            <section ref={studySectionRef} className={styles.uploaderSection}>
              <div className={styles.uploaderHeading}>
                <span className={styles.uploaderTitle}>Upload your notes,</span>
                <span className={styles.uploaderTitleAccent}>Start Studying</span>
              </div>
              <DatasetUploader onDatasetParsed={handleDatasetParsed} />
            </section>

            {/* Scroll-animated features */}
            <section className={styles.features}>
              <motion.div
                className={styles.featuresDivider}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: '-60px' }}
              >
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>How it works</span>
                <div className={styles.dividerLine} />
              </motion.div>

              <div className={styles.featureGrid}>
                {[
                  {
                    number: '01',
                    title: 'Spaced Repetition',
                    desc: 'Cards adapt to your knowledge. Struggle with a concept and it resurfaces. Master it and it fades away.',
                    icon: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83',
                  },
                  {
                    number: '02',
                    title: 'Feynman Explanations',
                    desc: 'One tap for a clear, simple breakdown of any concept. Like having a tutor who speaks your language.',
                    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                  },
                  {
                    number: '03',
                    title: 'Intelligent Grading',
                    desc: 'Write your answer, get an instant AI assessment with a score and specific feedback on gaps.',
                    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.number}
                    className={styles.feature}
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                    viewport={{ once: true, margin: '-60px' }}
                  >
                    <div className={styles.featureVisual}>
                      <div className={styles.featureRing} />
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d={feature.icon} />
                      </svg>
                    </div>
                    <div className={styles.featureContent}>
                      <h3 className={styles.featureTitle}>{feature.title}</h3>
                      <p className={styles.featureDesc}>{feature.desc}</p>
                    </div>
                    <span className={styles.featureNumber}>{feature.number}</span>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className={styles.footer}>
              <p className={styles.footerText}>Open source · Free forever · Built for students</p>
            </section>
          </div>
        )}

        {view === 'study' && currentCard && (
          <div className={`${styles.studyView} animate-fade-in`}>
            <ProgressBar stats={stats} totalCards={allCards.length} currentIndex={studiedCount} />
            <StudyCard
              key={currentCard.id + '-' + currentIndex}
              card={currentCard}
              onReveal={handleReveal}
              onGrade={handleGrade}
              gradeResult={gradeResult}
              isRevealed={isRevealed}
            />
            {isRevealed && (
              <div className={styles.explanationSection}>
                <FeynmanExplanation card={currentCard} />
              </div>
            )}
          </div>
        )}

        {view === 'complete' && (
          <SessionComplete
            stats={stats}
            totalCards={allCards.length}
            onRestart={handleRestart}
            onNewDeck={handleNewDeck}
          />
        )}
      </main>
    </>
  );
}
