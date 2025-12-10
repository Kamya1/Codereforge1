'use client';

import { useChallengeStore } from '@/store/useChallengeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TestCaseResults() {
  const { challenge, executionResult } = useChallengeStore();
  const [testResults, setTestResults] = useState<Array<{
    testCase: { input: string; expectedOutput: string; description?: string };
    actualOutput: string;
    passed: boolean;
  }>>([]);

  useEffect(() => {
    if (!challenge?.testCases || !executionResult) {
      setTestResults([]);
      return;
    }

    // Compare execution output with expected outputs
    const results = challenge.testCases.map((testCase) => {
      const actualOutput = executionResult.output.join('\n').trim();
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      return {
        testCase,
        actualOutput,
        passed,
      };
    });

    setTestResults(results);
  }, [challenge, executionResult]);

  if (!challenge?.testCases || challenge.testCases.length === 0 || !executionResult) {
    return null;
  }

  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Test Case Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {passedCount} / {totalCount} test cases passed
          </span>
          {passedCount === totalCount ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>

        <div className="space-y-3">
          {testResults.map((result, idx) => (
            <Card
              key={idx}
              className={result.passed ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-red-500 bg-red-50/50 dark:bg-red-900/10'}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {result.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    Test Case {idx + 1} {result.passed ? '✓ Passed' : '✗ Failed'}
                  </span>
                </div>

                {result.testCase.description && (
                  <p className="text-xs text-muted-foreground">{result.testCase.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="font-medium mb-1">Input:</p>
                    <pre className="p-2 bg-background rounded font-mono text-xs overflow-x-auto">
                      {result.testCase.input || '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Expected Output:</p>
                    <pre className="p-2 bg-background rounded font-mono text-xs overflow-x-auto">
                      {result.testCase.expectedOutput || '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Actual Output:</p>
                    <pre className={`p-2 bg-background rounded font-mono text-xs overflow-x-auto ${
                      result.passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.actualOutput || '(empty)'}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

