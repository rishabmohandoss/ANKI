import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let _db = null;

function getAdminDb() {
  if (_db) return _db;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  try {
    const existing = getApps().find(a => a.name === '__admin__');
    const app = existing ?? initializeApp(
      { credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) },
      '__admin__'
    );
    _db = getFirestore(app);
  } catch (e) {
    console.error('Firebase Admin init:', e.message);
  }
  return _db;
}

// $1.00 monthly limit per user
const MONTHLY_LIMIT = 1.00;

// Conservative cost estimates per call type (input + output with 2x buffer)
export const CALL_COST = {
  feynman: 0.005,  // ~150 in + ~500 out tokens
  grading: 0.002,  // ~125 in + ~150 out tokens
  parse:   0.010,  // variable content, high buffer
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "2026-05"
}

/**
 * Atomically check budget and increment usage if under limit.
 * Returns { ok: true } if the call is allowed, { ok: false, spent } if over budget.
 * Fails open (returns ok: true) if Admin SDK is not configured.
 */
export async function checkUsage(uid, cost) {
  const db = getAdminDb();
  if (!db || !uid) return { ok: true };

  const ref = db.collection('usage').doc(uid);
  const mo = currentMonth();

  try {
    return await db.runTransaction(async t => {
      const snap = await t.get(ref);
      const month = (snap.exists ? snap.data()?.[mo] : null) ?? { cost: 0, calls: 0 };

      if (month.cost >= MONTHLY_LIMIT) {
        return { ok: false, spent: month.cost };
      }

      t.set(ref, { [mo]: { cost: month.cost + cost, calls: month.calls + 1 } }, { merge: true });
      return { ok: true, spent: month.cost + cost };
    });
  } catch (e) {
    console.error('checkUsage:', e.message);
    return { ok: true }; // fail open — never block users due to tracking errors
  }
}
