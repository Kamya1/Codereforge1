import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChallengeState, Challenge, Prediction, ExecutionResult, Discrepancy, MentorQuestion, ConceptCard, ThinkingAnalysis, SuggestedFix } from '@/types';
import type { UserScore } from '@/lib/gamification/points-system';
import type { UserProgress } from '@/lib/learning/adaptive-engine';

interface ChallengeStore extends ChallengeState {
  // Actions
  setChallenge: (challenge: Challenge) => void;
  setPrediction: (prediction: Prediction) => void;
  submitPrediction: () => void;
  setExecutionResult: (result: ExecutionResult) => void;
  setDiscrepancies: (discrepancies: Discrepancy[]) => void;
  setMentorQuestions: (questions: MentorQuestion[]) => void;
  setThinkingAnalysis: (analysis: ThinkingAnalysis | null) => void;
  unlockExecution: () => void;
  setCurrentStep: (step: number) => void;
  setFixedCode: (code: string | null) => void;
  addConceptLearned: (concept: ConceptCard) => void;
  setFixSubmitted: (submitted: boolean) => void;
  setFixValidated: (validated: boolean) => void;
  setSuggestedFix: (suggestedFix: SuggestedFix | null) => void;
  hintCount: number;
  incrementHintCount: () => void;
  resetHintCount: () => void;
  reset: () => void;
  clearCurrentChallenge: () => void;
  // Progress tracking
  completedChallenges: string[];
  markChallengeComplete: (challengeId: string) => void;
  // Gamification
  userScore: UserScore;
  updateScore: (points: number, eventType: string) => void;
  // Adaptive learning
  userProgress: UserProgress;
  updateProgress: (challengeId: string, correct: boolean, timeSpent: number, conceptsLearned: string[]) => void;
}

import { createInitialScore } from '@/lib/gamification/points-system';
import { updateScore, calculatePointsForEvent } from '@/lib/gamification/points-system';
import { updateProgress as updateUserProgress } from '@/lib/learning/adaptive-engine';

const initialState: ChallengeState & { 
  completedChallenges: string[];
  userScore: UserScore;
  userProgress: UserProgress;
} = {
  challenge: null,
  prediction: null,
  executionResult: null,
  discrepancies: [],
  mentorQuestions: [],
  thinkingAnalysis: null,
  isLocked: true,
  currentStep: 0,
  fixedCode: null,
  conceptsLearned: [],
  fixSubmitted: false,
  fixValidated: false,
  suggestedFix: null,
  hintCount: 0,
  completedChallenges: [],
  userScore: createInitialScore(),
  userProgress: {
    challengesCompleted: [],
    conceptsMastered: [],
    accuracy: 0,
    averageTime: 0,
    attemptsPerChallenge: {},
    lastDifficulty: 'easy',
  },
};

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set) => ({
      ...initialState,
  
  setChallenge: (challenge) => set({ 
    challenge, 
    isLocked: true, 
    currentStep: 0,
    prediction: null,
    executionResult: null,
    discrepancies: [],
    mentorQuestions: [],
    thinkingAnalysis: null,
    fixedCode: null,
    fixSubmitted: false,
    fixValidated: false,
    suggestedFix: null,
    hintCount: 0,
  }),
  
  setPrediction: (prediction) => set({ prediction }),
  
  submitPrediction: () => set((state) => ({
    prediction: state.prediction ? { ...state.prediction, submitted: true } : null,
    isLocked: false, // Unlock execution after prediction is submitted
  })),
  
  setExecutionResult: (result) => set({ executionResult: result }),
  
  setDiscrepancies: (discrepancies) => set({ discrepancies }),
  
  setMentorQuestions: (mentorQuestions) => set({ mentorQuestions }),
  
  setThinkingAnalysis: (thinkingAnalysis) => set({ thinkingAnalysis }),
  
  unlockExecution: () => set({ isLocked: false }),
  
  setCurrentStep: (currentStep) => set({ currentStep }),
  
  setFixedCode: (fixedCode) => set({ fixedCode: fixedCode || null }),
  
  addConceptLearned: (concept) => set((state) => {
    // Prevent duplicate concepts
    const exists = state.conceptsLearned.some(c => c.concept === concept.concept);
    if (exists) return state;
    return {
      conceptsLearned: [...state.conceptsLearned, concept],
    };
  }),
  
  setFixSubmitted: (fixSubmitted) => set({ fixSubmitted }),
  
  setFixValidated: (fixValidated) => set({ fixValidated }),
  
  setSuggestedFix: (suggestedFix) => set({ suggestedFix }),
  
  incrementHintCount: () => set((state) => ({ hintCount: Math.min(state.hintCount + 1, 3) })),
  
  resetHintCount: () => set({ hintCount: 0 }),
  
  markChallengeComplete: (challengeId: string) => set((state) => {
    if (!state.completedChallenges.includes(challengeId)) {
      const newScore = updateScore(state.userScore, {
        type: 'challenge_complete',
        points: calculatePointsForEvent('challenge_complete', state.userScore.streak),
        description: 'Completed challenge',
      });
      
      return {
        completedChallenges: [...state.completedChallenges, challengeId],
        userScore: {
          ...newScore,
          challengesCompleted: newScore.challengesCompleted + 1,
        },
      };
    }
    return state;
  }),
  
  updateScore: (points: number, eventType: string) => set((state) => {
    const event: any = {
      type: eventType,
      points,
      description: `${eventType} event`,
    };
    return {
      userScore: updateScore(state.userScore, event),
    };
  }),
  
  updateProgress: (challengeId: string, correct: boolean, timeSpent: number, conceptsLearned: string[]) => set((state) => ({
    userProgress: updateUserProgress(state.userProgress, challengeId, correct, timeSpent, conceptsLearned),
  })),
  
  reset: () => set(initialState),
  
  clearCurrentChallenge: () => set({
    challenge: null,
    prediction: null,
    executionResult: null,
    discrepancies: [],
    mentorQuestions: [],
    thinkingAnalysis: null,
    isLocked: true,
    currentStep: 0,
    fixedCode: null,
    fixSubmitted: false,
    fixValidated: false,
    suggestedFix: null,
    hintCount: 0,
    // Keep progress (concepts learned, completed challenges)
  }),
    }),
    {
      name: 'codereforge-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist progress (completed challenges, concepts learned, gamification)
      // DO NOT persist current challenge state - users should start fresh each time
      partialize: (state) => ({
        conceptsLearned: state.conceptsLearned,
        completedChallenges: state.completedChallenges,
        userScore: state.userScore,
        userProgress: state.userProgress,
        // Explicitly exclude current challenge state
      }),
    }
  )
);

