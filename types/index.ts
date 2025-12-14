// Core types for CodeReforge

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  code: string;
  language: 'javascript' | 'python' | 'typescript' | 'cpp';
  difficulty: 'easy' | 'medium' | 'hard';
  concepts: string[];
  expectedOutput?: string;
  isUserSubmitted?: boolean; // Flag to indicate user-submitted code
  hasBug?: boolean; // Whether AI detected a bug in the code
  bugDescription?: string; // AI-generated description of the bug (if exists)
  problemStatement?: string; // Problem statement for contest problems
  testCases?: TestCase[]; // Test cases with input/output pairs
}

export interface VariableChange {
  name: string;
  previousValue: any;
  currentValue: any;
  type: 'created' | 'updated' | 'deleted';
}

export interface TraceStep {
  step: number;
  line: number;
  codeLine?: string; // The actual code line being executed
  variables: Record<string, any>;
  variableChanges?: VariableChange[]; // What changed in this step
  stack: StackFrame[];
  output: string[];
  condition?: string;
  explanation?: string;
}

export interface StackFrame {
  functionName: string;
  variables: Record<string, any>;
  line: number;
}

export interface Prediction {
  description: string;
  expectedOutput: string;
  traceSteps: TraceStep[];
  submitted: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output: string[];
  trace: TraceStep[];
  error?: string;
  executionTime?: number;
}

export interface Discrepancy {
  step: number;
  userVariable: any;
  actualVariable: any;
  variableName: string;
  explanation: string;
}

export interface MentorQuestion {
  question: string;
  type: 'socratic' | 'hint' | 'reflection';
  relatedStep?: number;
}

export interface ThinkingAnalysis {
  reasoningQuality: 'excellent' | 'good' | 'needs_improvement' | 'unclear';
  strengths: string[];
  weaknesses: string[];
  misconceptions: string[];
  suggestions: string[];
  overallAssessment: string;
}

export interface ConceptCard {
  concept: string;
  description: string;
  learned: boolean;
}

export interface SuggestedFix {
  correctCode: string;
  explanation: string;
  changes: Array<{
    line: number;
    original: string;
    corrected: string;
    reason: string;
  }>;
  keyPoints: string[];
  aiTests?: TestCase[]; // Tests requested from AI
  focusedSnippet?: string; // Snippet sent to AI
  staticFindings?: string[]; // Static analysis findings sent to AI
  retries?: number; // Number of AI retries attempted
  validation?: {
    testsPassed: boolean;
    testResults?: {
      totalTests: number;
      passedTests: number;
      failedTests: Array<{
        testCase: TestCase;
        actualOutput: string;
        expectedOutput: string;
        error?: string;
      }>;
    };
    staticAnalysis?: {
      passed: boolean;
      errors: Array<{
        line?: number;
        message: string;
        severity: 'error' | 'warning' | 'info';
        category: 'syntax' | 'logic' | 'style' | 'security';
      }>;
      warnings: number;
      errorsCount: number;
    };
    executionSuccess: boolean;
    executionError?: string;
  };
}

export interface ChallengeState {
  challenge: Challenge | null;
  prediction: Prediction | null;
  executionResult: ExecutionResult | null;
  discrepancies: Discrepancy[];
  mentorQuestions: MentorQuestion[];
  thinkingAnalysis: ThinkingAnalysis | null;
  isLocked: boolean;
  currentStep: number;
  fixedCode: string | null;
  conceptsLearned: ConceptCard[];
  fixSubmitted: boolean;
  fixValidated: boolean;
  suggestedFix: SuggestedFix | null;
}

