/**
 * SM-2 inspired spaced repetition algorithm.
 *
 * Each card tracks:
 *  - easeFactor: multiplier for interval (starts at 2.5)
 *  - interval: current review interval in sessions
 *  - repetitions: number of consecutive correct reviews
 *  - lastReview: timestamp of last review
 *  - nextReview: timestamp for next scheduled review
 */

/**
 * Create initial card state for spaced repetition.
 * @param {object} card - { question, answer }
 * @param {number} index - Original index in deck
 * @returns {object} Card with SR metadata
 */
export function initializeCard(card, index) {
  return {
    ...card,
    id: `card-${index}-${Date.now()}`,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lastReview: null,
    nextReview: null,
    history: [], // Array of { rating, timestamp }
  };
}

/**
 * Process a rating for a card and update its SR metadata.
 * @param {object} card - Card with SR metadata
 * @param {'again' | 'hard' | 'good' | 'easy'} rating
 * @returns {object} Updated card
 */
export function processRating(card, rating) {
  const now = Date.now();
  const updated = { ...card };

  // Map ratings to quality scores (0-5 scale for SM-2)
  const qualityMap = { again: 0, hard: 2, good: 4, easy: 5 };
  const quality = qualityMap[rating];

  // Update history
  updated.history = [...(card.history || []), { rating, timestamp: now }];
  updated.lastReview = now;

  if (quality < 3) {
    // Failed — reset repetitions
    updated.repetitions = 0;
    updated.interval = 0;
  } else {
    // Passed — increment repetitions
    updated.repetitions += 1;

    if (updated.repetitions === 1) {
      updated.interval = 1;
    } else if (updated.repetitions === 2) {
      updated.interval = 6;
    } else {
      updated.interval = Math.round(updated.interval * updated.easeFactor);
    }
  }

  // Update ease factor (SM-2 formula)
  updated.easeFactor = Math.max(
    1.3,
    updated.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Set next review time
  updated.nextReview = now + updated.interval * 24 * 60 * 60 * 1000;

  return updated;
}

/**
 * Sort and build the study queue from a deck of cards.
 * Prioritizes cards that are due or haven't been studied.
 * @param {object[]} cards - Array of cards with SR metadata
 * @returns {object[]} Ordered study queue
 */
export function buildStudyQueue(cards) {
  const now = Date.now();

  // Separate into buckets
  const newCards = cards.filter((c) => c.repetitions === 0 && !c.lastReview);
  const dueCards = cards.filter(
    (c) => c.lastReview && c.nextReview && c.nextReview <= now
  );
  const reviewCards = cards.filter(
    (c) => c.lastReview && c.nextReview && c.nextReview > now
  );

  // Sort due cards by urgency (most overdue first)
  dueCards.sort((a, b) => a.nextReview - b.nextReview);

  // New cards in original order, due cards by urgency
  return [...dueCards, ...newCards, ...reviewCards];
}

/**
 * Reinsert a card into the queue based on rating.
 * - again: within next 1-3 cards
 * - hard: after 5-8 cards
 * - good: pushed to end
 * - easy: removed (mastered for this session)
 *
 * @param {object[]} queue - Current study queue
 * @param {object} card - Card to reinsert
 * @param {'again' | 'hard' | 'good' | 'easy'} rating
 * @returns {object[]} Updated queue
 */
export function reinsertCard(queue, card, rating) {
  // Remove the card from current position
  const filtered = queue.filter((c) => c.id !== card.id);

  switch (rating) {
    case 'again':
      // Reinsert within next 1-3 cards
      const againPos = Math.min(1 + Math.floor(Math.random() * 3), filtered.length);
      filtered.splice(againPos, 0, card);
      return filtered;

    case 'hard':
      // Reinsert after 5-8 cards
      const hardPos = Math.min(5 + Math.floor(Math.random() * 4), filtered.length);
      filtered.splice(hardPos, 0, card);
      return filtered;

    case 'good':
      // Push to end of queue
      filtered.push(card);
      return filtered;

    case 'easy':
      // Don't reinsert — mastered for this session
      return filtered;

    default:
      filtered.push(card);
      return filtered;
  }
}

/**
 * Calculate session statistics.
 * @param {object[]} cards - All cards in the deck
 * @returns {object} Session statistics
 */
export function calculateStats(cards) {
  const reviewed = cards.filter((c) => c.history && c.history.length > 0);
  const ratings = reviewed.flatMap((c) => c.history.map((h) => h.rating));

  const correct = ratings.filter((r) => r === 'good' || r === 'easy').length;
  const incorrect = ratings.filter((r) => r === 'again' || r === 'hard').length;
  const total = ratings.length;

  return {
    cardsStudied: reviewed.length,
    totalReviews: total,
    correct,
    incorrect,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    mastered: cards.filter((c) => {
      const lastRating = c.history?.[c.history.length - 1]?.rating;
      return lastRating === 'easy';
    }).length,
  };
}
