'use client';

import { useAuth } from '@/components/AuthContext';
import styles from './Header.module.css';

export default function Header({ isStudying, onBack }) {
  const { user, logout } = useAuth();

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.logo}>⬡</span>
          <span className={styles.name}>Conversational Anki</span>
        </div>

        <div className={styles.actions}>
          {isStudying && (
            <button className={styles.backBtn} onClick={onBack}>
              New Deck
            </button>
          )}

          {user && (
            <div className={styles.userSection}>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className={styles.avatar}
                  referrerPolicy="no-referrer"
                />
              )}
              <button className={styles.signOut} onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
