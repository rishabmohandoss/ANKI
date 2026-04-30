'use client';

import { useState, useCallback, useRef } from 'react';
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
import styles from './page.module.css';

export default function Home() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('upload');
  const [allCards, setAllCards] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [studiedCount, setStudiedCount] = useState(0);

  const studySectionRef = useRef(null);

  const handleDatasetParsed = useCallback((data) => {
    const initialized = data.cards.map((card, i) => initializeCard(card, i));
    const studyQueue = buildStudyQueue(initialized);
    setAllCards(initialized);
    setQueue(studyQueue);
    setCurrentIndex(0);
    setStudiedCount(0);
    setIsRevealed(false);
    setGradeResult(null);
    setView('study');
  }, []);

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
        } catch { /* grading unavailable — continue without score */ }
      } catch { /* silent */ }
    }
  }, [queue, currentIndex]);

  const handleGrade = useCallback((rating) => {
    const card = queue[currentIndex];
    const updatedCard = processRating(card, rating);
    setAllCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
    const newQueue = reinsertCard(
      queue.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      updatedCard, rating
    );
    setStudiedCount((prev) => prev + 1);
    if (newQueue.length === 0 || currentIndex >= newQueue.length) {
      setQueue(newQueue);
      setView('complete');
      return;
    }
    setQueue(newQueue);
    setCurrentIndex(Math.min(currentIndex, newQueue.length - 1));
    setIsRevealed(false);
    setGradeResult(null);
  }, [queue, currentIndex]);

  const handleRestart = useCallback(() => {
    const resetCards = allCards.map((c) => ({
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
    setAllCards([]);
    setQueue([]);
    setCurrentIndex(0);
    setStudiedCount(0);
    setIsRevealed(false);
    setGradeResult(null);
    setView('upload');
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return <LoginPage />;
  }

  const stats = calculateStats(allCards);
  const currentCard = queue[currentIndex];

  return (
    <>
      <Header isStudying={view === 'study'} onBack={handleNewDeck} />

      <main className={styles.main}>
        {view === 'upload' && (
          <div className={`${styles.uploadView} animate-fade-in`}>
            {/* Hero */}
            <Hero
              onContinue={() => setView('study')}
              onCreate={() => studySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              hasExistingDeck={allCards.length > 0}
            />

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
