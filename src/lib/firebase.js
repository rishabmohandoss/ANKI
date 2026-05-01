import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization in dev mode)
let app = null;
let db = null;
let auth = null;
let googleProvider = null;

const hasConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_api_key';

if (hasConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
  }
} else {
  console.warn('Firebase not configured. Add your Firebase config to .env.local');
}

// ─── Explanation Cache ───────────────────────────────────────────

/**
 * Get a cached explanation from Firestore.
 * @param {string} questionHash - SHA-256 hash of the question text
 * @returns {object|null} Cached explanation or null
 */
export async function getCachedExplanation(questionHash) {
  try {
    const docRef = doc(db, 'explanations', questionHash);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error reading explanation cache:', error);
    return null;
  }
}

/**
 * Store an explanation in Firestore cache.
 * @param {string} questionHash - SHA-256 hash of the question text
 * @param {object} data - { question, explanation, topic }
 */
export async function cacheExplanation(questionHash, data) {
  try {
    const docRef = doc(db, 'explanations', questionHash);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error writing explanation cache:', error);
  }
}

// ─── Session Data ────────────────────────────────────────────────

/**
 * Save a study session summary to Firestore.
 * @param {string} sessionId - Unique session ID
 * @param {object} data - Session stats and metadata
 */
export async function saveSession(sessionId, data) {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

// ─── Auth ────────────────────────────────────────────────────────

/**
 * Sign in with Google popup.
 * @returns {object} Firebase User object
 */
export async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase is not configured. Please add your Firebase config to .env.local');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 * @param {function} callback - Called with user object or null
 * @returns {function} Unsubscribe function
 */
export function onAuthChange(callback) {
  if (!auth) {
    // No Firebase — immediately report no user, stop loading
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ─── Deck Storage ────────────────────────────────────────────────

export async function saveDeck(uid, { name, format, topics, cards }) {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'decks'), {
      name,
      format,
      topics: topics || [],
      totalCards: cards.length,
      cards,
      accuracy: null,
      cardsStudied: 0,
      createdAt: serverTimestamp(),
      lastStudied: null,
    });
    return ref.id;
  } catch (e) {
    console.error('saveDeck:', e.message);
    return null;
  }
}

export async function updateDeck(uid, deckId, { cards, accuracy, cardsStudied }) {
  if (!db || !deckId) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'decks', deckId),
      { cards, accuracy, cardsStudied, lastStudied: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.error('updateDeck:', e.message);
  }
}

export async function getUserDecks(uid) {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'users', uid, 'decks'), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getUserDecks:', e.message);
    return [];
  }
}

export async function deleteDeck(uid, deckId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'decks', deckId));
  } catch (e) {
    console.error('deleteDeck:', e.message);
  }
}

export { app, db, auth };
