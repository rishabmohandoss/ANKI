'use client';

import styles from './SessionComplete.module.css';

export default function SessionComplete({ stats, totalCards, onRestart, onNewDeck }) {
  return (
    <div className={`${styles.wrapper} animate-fade-in`}>
      <div className={styles.content}>
        <h2 className={styles.title}>Session complete</h2>
        <p className={styles.subtitle}>
          {stats.accuracy >= 80
            ? 'Excellent work. You\'re making real progress.'
            : stats.accuracy >= 50
            ? 'Good effort. Keep reviewing the challenging cards.'
            : 'Every session builds understanding. Keep going.'}
        </p>

        <div className={styles.grid}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{stats.cardsStudied}</span>
            <span className={styles.metricLabel}>Cards studied</span>
          </div>
          <div className={styles.metric}>
            <span className={`${styles.metricValue} ${styles.green}`}>{stats.correct}</span>
            <span className={styles.metricLabel}>Correct</span>
          </div>
          <div className={styles.metric}>
            <span className={`${styles.metricValue} ${styles.red}`}>{stats.incorrect}</span>
            <span className={styles.metricLabel}>Incorrect</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{stats.accuracy}%</span>
            <span className={styles.metricLabel}>Accuracy</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onRestart}>Study again</button>
          <button className={styles.secondaryBtn} onClick={onNewDeck}>New deck</button>
        </div>
      </div>
    </div>
  );
}
