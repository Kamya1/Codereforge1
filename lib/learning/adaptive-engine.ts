import type { Challenge } from '@/types';

export interface UserProgress {
  userId?: string;
  challengesCompleted: string[];
  conceptsMastered: string[];
  accuracy: number; // 0-1
  averageTime: number; // seconds
  attemptsPerChallenge: Record<string, number>;
  lastDifficulty: 'easy' | 'medium' | 'hard';
}

export function calculateNextDifficulty(progress: UserProgress): 'easy' | 'medium' | 'hard' {
  // If user has high accuracy (>80%) and fast completion (<5 min), suggest hard
  if (progress.accuracy > 0.8 && progress.averageTime < 300) {
    return 'hard';
  }
  
  // If user has decent accuracy (>60%), suggest medium
  if (progress.accuracy > 0.6) {
    return 'medium';
  }
  
  // Otherwise, stick with easy
  return 'easy';
}

export function findWeakConcepts(progress: UserProgress, allConcepts: string[]): string[] {
  const conceptAttempts: Record<string, { correct: number; total: number }> = {};
  
  // This would ideally track per-concept performance
  // For now, return concepts not in mastered list
  return allConcepts.filter(concept => !progress.conceptsMastered.includes(concept));
}

export function recommendChallenges(
  progress: UserProgress,
  allChallenges: Challenge[]
): Challenge[] {
  const nextDifficulty = calculateNextDifficulty(progress);
  const weakConcepts = findWeakConcepts(
    progress,
    Array.from(new Set(allChallenges.flatMap(c => c.concepts)))
  );
  
  // Filter challenges that:
  // 1. Match the recommended difficulty
  // 2. Cover weak concepts
  // 3. Haven't been completed yet
  const recommended = allChallenges.filter(challenge => {
    const notCompleted = !progress.challengesCompleted.includes(challenge.id);
    const matchesDifficulty = challenge.difficulty === nextDifficulty;
    const coversWeakConcepts = challenge.concepts.some(concept => 
      weakConcepts.includes(concept)
    );
    
    return notCompleted && (matchesDifficulty || coversWeakConcepts);
  });
  
  // Sort by relevance (difficulty match first, then concept coverage)
  recommended.sort((a, b) => {
    const aDifficultyMatch = a.difficulty === nextDifficulty ? 1 : 0;
    const bDifficultyMatch = b.difficulty === nextDifficulty ? 1 : 0;
    
    if (aDifficultyMatch !== bDifficultyMatch) {
      return bDifficultyMatch - aDifficultyMatch;
    }
    
    const aConceptCoverage = a.concepts.filter(c => weakConcepts.includes(c)).length;
    const bConceptCoverage = b.concepts.filter(c => weakConcepts.includes(c)).length;
    
    return bConceptCoverage - aConceptCoverage;
  });
  
  return recommended.slice(0, 5);
}

export function updateProgress(
  currentProgress: UserProgress,
  challengeId: string,
  correct: boolean,
  timeSpent: number,
  conceptsLearned: string[]
): UserProgress {
  const attempts = (currentProgress.attemptsPerChallenge[challengeId] || 0) + 1;
  
  // Update completed challenges if correct
  const challengesCompleted = correct && !currentProgress.challengesCompleted.includes(challengeId)
    ? [...currentProgress.challengesCompleted, challengeId]
    : currentProgress.challengesCompleted;
  
  // Update mastered concepts
  const conceptsMastered = Array.from(
    new Set([...currentProgress.conceptsMastered, ...conceptsLearned])
  );
  
  // Calculate new accuracy (simplified - would ideally track per-challenge)
  const totalAttempts = Object.values({
    ...currentProgress.attemptsPerChallenge,
    [challengeId]: attempts,
  }).reduce((sum, count) => sum + count, 0);
  
  const newAccuracy = correct 
    ? Math.min(1, (currentProgress.accuracy * (totalAttempts - 1) + 1) / totalAttempts)
    : Math.max(0, (currentProgress.accuracy * (totalAttempts - 1)) / totalAttempts);
  
  // Update average time
  const newAverageTime = (currentProgress.averageTime + timeSpent) / 2;
  
  return {
    ...currentProgress,
    challengesCompleted,
    conceptsMastered,
    accuracy: newAccuracy,
    averageTime: newAverageTime,
    attemptsPerChallenge: {
      ...currentProgress.attemptsPerChallenge,
      [challengeId]: attempts,
    },
    lastDifficulty: currentProgress.lastDifficulty,
  };
}

