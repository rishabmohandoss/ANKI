'use client';

import { useState } from 'react';
import styles from './StudyCard.module.css';

export default function StudyCard({ card, onReveal, onGrade, gradeResult, isRevealed }) {
  const [userAnswer, setUserAnswer] = useState('');

  const handleReveal = () => onReveal(userAnswer);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey && !isRevealed) handleReveal();
  };

  const handleNextCard = (rating) => {
    setUserAnswer('');
    onGrade(rating);
  };

  return (
    <div className={`${styles.card} animate-fade-in`}>
      {/* Question */}
      <div className={styles.question}>
        <span className={styles.label}>Question</span>
        <p className={styles.questionText}>{card.question}</p>
      </div>

      {/* Input */}
      {!isRevealed && (
        <div className={styles.input}>
          <textarea
            className={styles.textarea}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={3}
            autoFocus
          />
          <div className={styles.inputFooter}>
            <span className={styles.hint}>⌘ Enter to reveal</span>
            <button className={styles.revealBtn} onClick={handleReveal}>
              Show Answer
            </button>
          </div>
        </div>
      )}

      {/* Revealed */}
      {isRevealed && (
        <div className={`${styles.revealed} animate-fade-in`}>
          {userAnswer && (
            <div className={styles.section}>
              <span className={styles.label}>Your answer</span>
              <p className={styles.answerText}>{userAnswer}</p>
            </div>
          )}

          <div className={styles.section}>
            <span className={styles.labelCorrect}>Correct answer</span>
            <p className={styles.correctText}>{card.answer}</p>
          </div>

          {gradeResult && (
            <div className={styles.grade}>
              <div className={styles.gradeHeader}>
                <span className={styles.label}>AI Assessment</span>
                <span
                  className={styles.score}
                  data-level={gradeResult.score >= 70 ? 'good' : gradeResult.score >= 40 ? 'mid' : 'low'}
                >
                  {gradeResult.score}%
                </span>
              </div>
              <p className={styles.feedback}>{gradeResult.feedback}</p>
            </div>
          )}

          {/* Rating */}
          <div className={styles.rating}>
            <span className={styles.ratingLabel}>How well did you know this?</span>
            <div className={styles.ratingBtns}>
              {[
                { key: 'again', text: 'Again' },
                { key: 'hard', text: 'Hard' },
                { key: 'good', text: 'Good' },
                { key: 'easy', text: 'Easy' },
              ].map(({ key, text }) => (
                <button
                  key={key}
                  className={`${styles.ratingBtn} ${styles[key]}`}
                  onClick={() => handleNextCard(key)}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
