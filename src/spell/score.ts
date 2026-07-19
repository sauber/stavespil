import type { WordResult, ScoreResult } from "./types.ts";

/**
 * Calculate error rate score from total errors across 20 words.
 *
 * Scoring: 0 errors → 100, 1 → 80, 2 → 60, 3 → 40, ≥4 → 20.
 * Linear interpolation between breakpoints.
 *
 * @param totalErrors - Sum of wrong letters across all words
 * @returns Error score (0–100)
 */
export function calculateErrorScore(totalErrors: number): number {
  const breakpoints = [
    { errors: 0, score: 100 },
    { errors: 1, score: 80 },
    { errors: 2, score: 60 },
    { errors: 3, score: 40 },
    { errors: 4, score: 20 },
  ];

  if (totalErrors <= 0) return 100;
  if (totalErrors >= 4) return 20;

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const low = breakpoints[i];
    const high = breakpoints[i + 1];
    if (totalErrors >= low.errors && totalErrors <= high.errors) {
      const t = (totalErrors - low.errors) / (high.errors - low.errors);
      return Math.round(low.score + t * (high.score - low.score));
    }
  }

  return 20;
}

/**
 * Map difficulty level (1–100) to a time multiplier (1.0–3.0).
 */
function difficultyMultiplier(difficulty: number): number {
  const clamped = Math.max(1, Math.min(100, difficulty));
  return 1.0 + ((clamped - 1) / 99) * 2.0;
}

/**
 * Calculate time score averaged over all words.
 *
 * Expected time per letter = 2 seconds × difficulty multiplier.
 * Per-word score = min(150, (expected / actual) × 100).
 * Final score is the average normalized to 0–100.
 *
 * @param wordResults - Results for all completed words
 * @param difficulty - Difficulty level (1–100)
 * @returns Time score (0–100)
 */
export function calculateTimeScore(
  wordResults: WordResult[],
  difficulty: number,
): number {
  if (wordResults.length === 0) return 0;

  const multiplier = difficultyMultiplier(difficulty);
  const expectedPerLetter = 2 * multiplier;

  let totalScore = 0;

  for (const result of wordResults) {
    const letterCount = result.word.length;
    const expectedTime = expectedPerLetter * letterCount;
    const actualTime = (result.endTime - result.startTime) / 1000;

    if (actualTime <= 0) {
      totalScore += 150;
      continue;
    }

    const wordScore = Math.min(150, (expectedTime / actualTime) * 100);
    totalScore += wordScore;
  }

  const average = totalScore / wordResults.length;
  return Math.min(100, Math.round(average));
}

/**
 * Calculate combined score from error and time scores.
 *
 * Formula: (errorScore × 0.6) + (timeScore × 0.4)
 *
 * @param errorScore - Error rate score (0–100)
 * @param timeScore - Time score (0–100)
 * @returns Combined score (0–100)
 */
export function calculateCombinedScore(
  errorScore: number,
  timeScore: number,
): number {
  return Math.round(errorScore * 0.6 + timeScore * 0.4);
}

/**
 * Determine rank change from combined score.
 *
 * @param score - Combined score (0–100)
 * @returns +1 (rank up), 0 (unchanged), or -1 (rank down)
 */
export function calculateRankChange(score: number): -1 | 0 | 1 {
  if (score >= 75) return 1;
  if (score >= 40) return 0;
  return -1;
}

/**
 * Calculate total round time in seconds.
 *
 * @param wordResults - Results for all completed words
 * @returns Total time in seconds
 */
export function calculateTotalTime(wordResults: WordResult[]): number {
  let total = 0;
  for (const result of wordResults) {
    total += (result.endTime - result.startTime) / 1000;
  }
  return Math.round(total * 10) / 10;
}

/**
 * Calculate the longest streak of consecutive error-free words.
 *
 * @param wordResults - Results for all completed words
 * @returns Maximum streak length
 */
export function calculateMaxStreak(wordResults: WordResult[]): number {
  let maxStreak = 0;
  let currentStreak = 0;

  for (const result of wordResults) {
    if (result.errors === 0) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Compute the full score result for a completed round.
 *
 * @param wordResults - Results for all completed words
 * @param difficulty - Difficulty level played (1–100)
 * @returns Complete score breakdown
 */
export function computeScore(
  wordResults: WordResult[],
  difficulty: number,
): ScoreResult {
  const totalErrors = wordResults.reduce((sum, r) => sum + r.errors, 0);
  const errorScore = calculateErrorScore(totalErrors);
  const timeScore = calculateTimeScore(wordResults, difficulty);
  const combinedScore = calculateCombinedScore(errorScore, timeScore);
  const rankChange = calculateRankChange(combinedScore);
  const totalTime = calculateTotalTime(wordResults);

  return {
    errorScore,
    timeScore,
    combinedScore,
    rankChange,
    totalTime,
  };
}
