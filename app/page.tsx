'use client';

import { useChallengeStore } from '@/store/useChallengeStore';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { PredictionForm } from '@/components/trace/PredictionForm';
import { ExecutionVisualization } from '@/components/visualization/ExecutionVisualization';
import { MentorQuestions } from '@/components/visualization/MentorQuestions';
import { ConceptCard } from '@/components/visualization/ConceptCard';
import { TraceComparison } from '@/components/visualization/TraceComparison';
import { ThinkingAnalysis } from '@/components/visualization/ThinkingAnalysis';
import { TestCaseResults } from '@/components/visualization/TestCaseResults';
import { TraceTable } from '@/components/trace/TraceTable';
import { CodeSubmissionForm } from '@/components/code/CodeSubmissionForm';
import { SuggestedFixView } from '@/components/fix/SuggestedFixView';
import { ComplexityView } from '@/components/analysis/ComplexityView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Play, Lock, CheckCircle2, Home as HomeIcon, BookOpen, Code } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useState, useEffect } from 'react';
import type { Challenge } from '@/types';
import { bugscppChallenges } from '@/lib/data/bugscpp-challenges';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@/lib/utils/keyboard-shortcuts';

// Sample challenges with actual bugs - C++ code
// Includes real-world bugs from BugsCpp dataset: https://github.com/Suresoft-GLaDOS/bugscpp
const sampleChallenges: Challenge[] = [
  ...bugscppChallenges,
  {
    id: '1',
    title: 'Buggy Factorial',
    description: 'This factorial function has a bug. Predict what it will output before running it.',
    code: `#include <iostream>
using namespace std;

int factorial(int n) {
  if (n == 0) {
    return 1;
  }
  return n * factorial(n - 1);
}

int main() {
  int result = factorial(5);
  cout << result << endl;
  return 0;
}`,
    language: 'cpp',
    difficulty: 'easy',
    concepts: ['recursion', 'base cases', 'function calls'],
  },
  {
    id: '2',
    title: 'Off-by-One Loop Bug',
    description: 'This loop should sum numbers from 0 to 4, but something is wrong. Predict the final values.',
    code: `#include <iostream>
using namespace std;

int main() {
  int i = 0;
  int sum = 0;
  
  while (i <= 5) {
    sum += i;
    i++;
  }
  
  cout << "Final i: " << i << endl;
  cout << "Sum: " << sum << endl;
  return 0;
}`,
    language: 'cpp',
    difficulty: 'easy',
    concepts: ['loops', 'off-by-one errors', 'loop conditions'],
  },
  {
    id: '3',
    title: 'Array Reference Bug',
    description: 'This code modifies an array. Predict what will be logged and understand why.',
    code: `#include <iostream>
using namespace std;

int main() {
  int arr[3] = {1, 2, 3};
  int* arr2 = arr;
  arr2[2] = 4;
  
  cout << "arr[2]: " << arr[2] << endl;
  cout << "arr2[2]: " << arr2[2] << endl;
  return 0;
}`,
    language: 'cpp',
    difficulty: 'medium',
    concepts: ['pointers', 'array references', 'memory addresses'],
  },
  {
    id: '4',
    title: 'Variable Scope Mystery',
    description: 'Predict the output. Pay attention to variable scope and shadowing.',
    code: `#include <iostream>
using namespace std;

int x = 10;

void test() {
  int x = 20;
  cout << "x inside function: " << x << endl;
}

int main() {
  test();
  cout << "x outside function: " << x << endl;
  return 0;
}`,
    language: 'cpp',
    difficulty: 'medium',
    concepts: ['variable scope', 'global variables', 'variable shadowing'],
  },
  {
    id: '5',
    title: 'Infinite Loop Bug',
    description: 'This code should count to 5, but something is wrong. Predict what happens.',
    code: `#include <iostream>
using namespace std;

int main() {
  int count = 0;
  
  while (count < 5) {
    cout << "Count: " << count << endl;
  }
  
  cout << "Final count: " << count << endl;
  return 0;
}`,
    language: 'cpp',
    difficulty: 'easy',
    concepts: ['loops', 'increment operators', 'loop termination'],
  },
];

export default function Home() {
  const {
    challenge,
    prediction,
    executionResult,
    isLocked,
    fixedCode,
    fixSubmitted,
    fixValidated,
    thinkingAnalysis,
    completedChallenges,
    setChallenge,
    unlockExecution,
    setExecutionResult,
    setDiscrepancies,
    setMentorQuestions,
    setThinkingAnalysis,
    setFixedCode,
    addConceptLearned,
    setFixSubmitted,
    setFixValidated,
    setSuggestedFix,
    markChallengeComplete,
    clearCurrentChallenge,
  } = useChallengeStore();

  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [mode, setMode] = useState<'challenges' | 'debug'>('challenges');

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.EXECUTE,
      action: () => {
        if (!isLocked && !isExecuting) {
          handleExecute();
        }
      },
    },
  ]);

  const handleExecute = async () => {
    if (!challenge || isLocked) return;

    setIsExecuting(true);
    try {
      const code = challenge.code;
      const userTrace = prediction?.traceSteps || [];
      // Use first test case input if available, otherwise no input
      const input = challenge.testCases && challenge.testCases.length > 0 
        ? challenge.testCases[0].input 
        : undefined;

      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userTrace, language: challenge.language, input }),
      });

      const result = await response.json();
      setExecutionResult(result);
      setDiscrepancies(result.discrepancies || []);

      // Generate mentor questions if there are discrepancies
      if (result.discrepancies && result.discrepancies.length > 0) {
        const mentorResponse = await fetch('/api/mentor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discrepancies: result.discrepancies,
            code,
            trace: result.trace,
          }),
        });

        const mentorData = await mentorResponse.json();
        setMentorQuestions(mentorData.questions || []);
      }
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleChallengeSelect = (selectedChallenge: Challenge) => {
    setChallenge(selectedChallenge);
  };

  const handleSubmitFix = async () => {
    if (!fixedCode || !challenge) {
      toast({
        variant: 'warning',
        title: 'Code Required',
        description: 'Please edit the code first before submitting.',
      });
      return;
    }

    // Check if code was actually changed
    if (fixedCode === challenge.code) {
      toast({
        variant: 'warning',
        title: 'No Changes Detected',
        description: 'Please modify the code to fix the bug before submitting.',
      });
      return;
    }

    // Execute the fixed code to verify it works
    try {
      // Use first test case input if available
      const input = challenge.testCases && challenge.testCases.length > 0 
        ? challenge.testCases[0].input 
        : undefined;

      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fixedCode, language: challenge.language, input }),
      });

      const result = await response.json();
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Execution Error',
          description: result.error || 'Code execution failed',
        });
        return;
      }

      // Use AI to validate the fix (no hardcoded logic)
      try {
        const validationResponse = await fetch('/api/validate-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challenge,
            originalCode: challenge.code,
            fixedCode,
            executionResult: result,
          }),
        });

        const validationData = await validationResponse.json();
        const validation = validationData.validation;

        setFixSubmitted(true);
        setFixValidated(validation.isValid);

        if (validation.isValid) {
          // Mark challenge as complete
          markChallengeComplete(challenge.id);
          
          // Add concept cards for learned concepts (determined by AI, only once)
          if (!fixValidated) {
            validation.conceptsLearned.forEach((concept: string) => {
              addConceptLearned({
                concept,
                description: `You successfully understood and fixed the ${concept} concept!`,
                learned: true,
              });
            });
          }
          toast({
            variant: 'success',
            title: 'Fix Validated Successfully! ✓',
            description: validation.explanation,
          });
        } else {
          const suggestionsText = validation.suggestions && validation.suggestions.length > 0
            ? `\n\nSuggestions:\n${validation.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`
            : '';
          toast({
            variant: 'warning',
            title: 'Fix Needs Improvement',
            description: `${validation.explanation}${suggestionsText}`,
          });
        }
      } catch (validationError) {
        console.error('AI validation error:', validationError);
        // Fallback: basic validation
        const basicValid = fixedCode !== challenge.code && result.success;
        setFixSubmitted(true);
        setFixValidated(basicValid);
        
        if (basicValid) {
          markChallengeComplete(challenge.id);
          challenge.concepts.forEach((concept) => {
            addConceptLearned({
              concept,
              description: `You successfully understood and fixed the ${concept} concept!`,
              learned: true,
            });
          });
          toast({
            variant: 'success',
            title: 'Fix Submitted Successfully! ✓',
            description: 'AI validation unavailable, using basic validation',
          });
        } else {
          toast({
            variant: 'warning',
            title: 'AI Validation Unavailable',
            description: 'Please ensure your API key is configured for AI-powered validation.',
          });
        }
      }
    } catch (error) {
      console.error('Fix submission error:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Failed to submit fix. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold">CodeReforge</h1>
            <p className="text-muted-foreground">
              Rebuild Your Logic — Think Before You Run
            </p>
          </div>
          <ThemeToggle />
        </div>

        {!challenge ? (
          <div className="space-y-6">
            {/* Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Mode</CardTitle>
                <CardDescription>
                  Select how you want to practice debugging and understanding code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card
                    className={`cursor-pointer transition-all ${
                      mode === 'challenges'
                        ? 'border-primary border-2 shadow-lg'
                        : 'hover:border-primary'
                    }`}
                    onClick={() => setMode('challenges')}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Try Challenges
                      </CardTitle>
                      <CardDescription>
                        Practice with pre-saved buggy code snippets
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <Card
                    className={`cursor-pointer transition-all ${
                      mode === 'debug'
                        ? 'border-primary border-2 shadow-lg'
                        : 'hover:border-primary'
                    }`}
                    onClick={() => setMode('debug')}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        Debug My Code
                      </CardTitle>
                      <CardDescription>
                        Paste your own code and debug it step-by-step
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Content based on mode */}
            {mode === 'challenges' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Challenge</CardTitle>
                  <CardDescription>
                    Choose a buggy code snippet to analyze and fix
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {sampleChallenges.map((ch) => (
                      <Card
                        key={ch.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleChallengeSelect(ch)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{ch.title}</CardTitle>
                          <CardDescription>{ch.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1">
                            {ch.concepts.map((concept) => (
                              <span
                                key={concept}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <CodeSubmissionForm />
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Back to Home Button */}
            <div className="flex justify-start">
              <Button
                onClick={clearCurrentChallenge}
                variant="outline"
                className="mb-4"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Back to Challenge List
              </Button>
            </div>
            
            {/* Challenge Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {challenge.isUserSubmitted && (
                    <Code className="w-5 h-5 text-primary" />
                  )}
                  {challenge.title}
                </CardTitle>
                <CardDescription className="space-y-2">
                  {challenge.problemStatement && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Problem Statement:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{challenge.problemStatement}</p>
                    </div>
                  )}
                  <div>{challenge.description}</div>
                  {challenge.testCases && challenge.testCases.length > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-medium mb-1">Test Cases Available: {challenge.testCases.length}</p>
                      {challenge.testCases.slice(0, 2).map((tc, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground mt-1">
                          <span className="font-mono">Input: {tc.input.substring(0, 50)}{tc.input.length > 50 ? '...' : ''}</span>
                          <span className="ml-2 font-mono">Expected: {tc.expectedOutput.substring(0, 50)}{tc.expectedOutput.length > 50 ? '...' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {challenge.isUserSubmitted && challenge.hasBug && challenge.bugDescription && (
                    <span className="block mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-yellow-900 dark:text-yellow-100">
                      <strong>Bug Detected:</strong> {challenge.bugDescription}
                    </span>
                  )}
                  {challenge.isUserSubmitted && challenge.hasBug === false && (
                    <span className="block mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-green-900 dark:text-green-100">
                      <strong>No bugs found!</strong> Trace through the code to understand its logic.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeEditor readOnly={true} height="250px" />
              </CardContent>
            </Card>

            {/* Step 1: Predict Before You Run */}
            {!prediction?.submitted && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      1
                    </span>
                    Step 1: Predict Before You Run
                  </CardTitle>
                  <CardDescription>
                    {challenge.isUserSubmitted && challenge.hasBug === false
                      ? 'Trace through your code step-by-step to understand its logic and execution flow.'
                      : 'Describe what the code does and trace its execution manually. You must complete this step before proceeding.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PredictionForm />
                </CardContent>
              </Card>
            )}

            {/* Step 2: Run the Truth - Only show after Step 1 is complete */}
            {prediction?.submitted && (
              <>
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        2
                      </span>
                      Step 2: Run the Truth
                    </CardTitle>
                    <CardDescription>
                      Execute the code and see how it actually runs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!executionResult && (
                      <Button
                        onClick={handleExecute}
                        disabled={isLocked || isExecuting}
                        className="w-full"
                        size="lg"
                      >
                        {isLocked ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Locked — Complete Prediction First
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            {isExecuting ? 'Executing...' : 'Execute Code & See Results'}
                          </>
                        )}
                      </Button>
                    )}

                    {prediction?.submitted && (
                      <>
                        <Card className="bg-muted/50">
                          <CardHeader>
                            <CardTitle className="text-lg">Your Prediction</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <p className="text-sm">
                                <strong>Description:</strong> {prediction.description}
                              </p>
                              <p className="text-sm">
                                <strong>Expected Output:</strong> {prediction.expectedOutput}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* AI Thinking Analysis */}
                        <ThinkingAnalysis />
                      </>
                    )}

                    {executionResult && (
                      <div className="space-y-4">
                        <ExecutionVisualization />
                        {challenge.testCases && challenge.testCases.length > 0 && (
                          <TestCaseResults />
                        )}
                        {/* Show user's trace if available */}
                        {prediction?.traceSteps && prediction.traceSteps.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Your Predicted Trace</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <TraceTable trace={prediction.traceSteps} isUserTrace={true} />
                            </CardContent>
                          </Card>
                        )}
                        <MentorQuestions />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 3: Fix the Forge - Only show after Step 2 is complete and if bug exists */}
                {executionResult && challenge.hasBug !== false && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          3
                        </span>
                        Step 3: Fix the Forge
                      </CardTitle>
                      <CardDescription>
                        {challenge.isUserSubmitted && challenge.bugDescription
                          ? `Edit the code to fix: ${challenge.bugDescription}`
                          : 'Edit the code to fix the bug'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CodeEditor readOnly={false} height="300px" />
                      <Button 
                        onClick={handleSubmitFix}
                        className="w-full" 
                        variant="outline"
                        disabled={!fixedCode || fixedCode === challenge.code || (fixSubmitted && fixValidated)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {fixSubmitted && fixValidated ? 'Fix Validated ✓' : 'Submit Fix'}
                      </Button>
                      {fixedCode && fixedCode === challenge.code && (
                        <p className="text-xs text-muted-foreground text-center">
                          Edit the code to fix the bug before submitting
                        </p>
                      )}
                      {fixSubmitted && fixValidated && (
                        <p className="text-xs text-green-600 text-center">
                          ✓ Bug fixed successfully! Check the comparison and concept cards below.
                        </p>
                      )}
                      {fixSubmitted && !fixValidated && (
                        <p className="text-xs text-yellow-600 text-center">
                          ⚠ Fix submitted but may not be correct. Review and try again.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Time & Space Complexity */}
                {executionResult && (
                  <ComplexityView />
                )}

                {/* Step 5: Suggest Fix - Show after Step 3 is visible */}
                {executionResult && challenge.hasBug !== false && (
                  <SuggestedFixView />
                )}

                {/* For user-submitted code without bugs, show completion message */}
                {executionResult && challenge.isUserSubmitted && challenge.hasBug === false && (
                  <Card className="border-green-500 bg-green-50/50 dark:bg-green-900/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="w-5 h-5" />
                        Code Analysis Complete
                      </CardTitle>
                      <CardDescription>
                        You&apos;ve successfully traced through your code and understood its logic!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Your code has no bugs. You&apos;ve completed the trace and understand how it works. Great job!
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Show comparison and concepts after fix is submitted OR after tracing user code without bugs */}
                {((fixSubmitted && executionResult) || (challenge.isUserSubmitted && challenge.hasBug === false && executionResult)) && (
                  <div className="space-y-4">
                    <TraceComparison />
                    <ConceptCard />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

