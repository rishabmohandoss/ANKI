'use client';

import styles from './ProgressBar.module.css';

export default function ProgressBar({ stats, totalCards, currentIndex }) {
  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>{stats.cardsStudied} studied</span>
        <span className={styles.divider}>·</span>
        <span className={styles.stat}>{totalCards} total</span>
        <span className={styles.divider}>·</span>
        <span className={styles.stat}>{stats.accuracy}% accuracy</span>
      </div>
    </div>
  );
}
