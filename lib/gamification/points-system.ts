export interface UserScore {
  totalPoints: number;
  level: number;
  badges: string[];
  streak: number;
  lastActivityDate: string;
  challengesCompleted: number;
  conceptsMastered: number;
}

export interface PointsEvent {
  type: 'prediction_correct' | 'prediction_incorrect' | 'challenge_complete' | 'concept_learned' | 'streak_bonus';
  points: number;
  description: string;
}

const POINTS_CONFIG = {
  prediction_correct: 10,
  prediction_incorrect: 2, // Partial credit for trying
  challenge_complete: 50,
  concept_learned: 25,
  streak_bonus: 5, // Per day of streak
} as const;

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000,
  15000, 20000, 30000, 50000, 75000, 100000
];

export function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function calculatePointsForEvent(eventType: PointsEvent['type'], streak: number = 0): number {
  const basePoints = POINTS_CONFIG[eventType];
  
  // Add streak bonus
  if (eventType === 'challenge_complete' && streak > 0) {
    return basePoints + (streak * POINTS_CONFIG.streak_bonus);
  }
  
  return basePoints;
}

export function updateScore(
  currentScore: UserScore,
  event: PointsEvent
): UserScore {
  const newPoints = currentScore.totalPoints + event.points;
  const newLevel = calculateLevel(newPoints);
  
  // Update streak
  const today = new Date().toISOString().split('T')[0];
  const lastDate = currentScore.lastActivityDate;
  let newStreak = currentScore.streak;
  
  if (lastDate === today) {
    // Already active today, maintain streak
    newStreak = currentScore.streak;
  } else if (lastDate) {
    const lastDateObj = new Date(lastDate);
    const todayObj = new Date(today);
    const daysDiff = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      newStreak = currentScore.streak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  } else {
    // First activity
    newStreak = 1;
  }
  
  // Check for badges
  const newBadges = [...currentScore.badges];
  
  if (newLevel > currentScore.level && !newBadges.includes(`level_${newLevel}`)) {
    newBadges.push(`level_${newLevel}`);
  }
  
  if (newStreak >= 7 && !newBadges.includes('streak_7')) {
    newBadges.push('streak_7');
  }
  
  if (newStreak >= 30 && !newBadges.includes('streak_30')) {
    newBadges.push('streak_30');
  }
  
  if (currentScore.challengesCompleted >= 10 && !newBadges.includes('challenges_10')) {
    newBadges.push('challenges_10');
  }
  
  if (currentScore.conceptsMastered >= 20 && !newBadges.includes('concepts_20')) {
    newBadges.push('concepts_20');
  }
  
  return {
    ...currentScore,
    totalPoints: newPoints,
    level: newLevel,
    badges: newBadges,
    streak: newStreak,
    lastActivityDate: today,
  };
}

export function getBadgeName(badgeId: string): string {
  const badgeNames: Record<string, string> = {
    level_5: 'Rising Star',
    level_10: 'Code Master',
    level_15: 'Debugging Legend',
    streak_7: 'Week Warrior',
    streak_30: 'Monthly Champion',
    challenges_10: 'Challenge Seeker',
    challenges_50: 'Challenge Conqueror',
    concepts_20: 'Concept Collector',
    concepts_50: 'Knowledge Keeper',
  };
  
  return badgeNames[badgeId] || badgeId;
}

export function createInitialScore(): UserScore {
  return {
    totalPoints: 0,
    level: 1,
    badges: [],
    streak: 0,
    lastActivityDate: '',
    challengesCompleted: 0,
    conceptsMastered: 0,
  };
}

