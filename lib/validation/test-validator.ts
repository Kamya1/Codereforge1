import type { Challenge, ExecutionResult, TestCase } from '@/types';

export interface TestValidationResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: Array<{
    testCase: TestCase;
    actualOutput: string;
    expectedOutput: string;
    error?: string;
  }>;
  allTestsPassed: boolean;
}

/**
 * Validates a fix by running it against test cases
 */
export async function validateFixWithTests(
  code: string,
  language: string,
  testCases: TestCase[],
  challenge?: Challenge
): Promise<TestValidationResult> {
  if (!testCases || testCases.length === 0) {
    // If no test cases, just check if code executes successfully
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const result = await response.json();
      return {
        passed: result.success,
        totalTests: 0,
        passedTests: 0,
        failedTests: [],
        allTestsPassed: result.success,
      };
    } catch (error) {
      return {
        passed: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: [],
        allTestsPassed: false,
      };
    }
  }

  const results: TestValidationResult = {
    passed: true,
    totalTests: testCases.length,
    passedTests: 0,
    failedTests: [],
    allTestsPassed: true,
  };

  // Run each test case
  for (const testCase of testCases) {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          input: testCase.input,
        }),
      });

      const executionResult: ExecutionResult = await response.json();

      if (!executionResult.success) {
        results.passed = false;
        results.allTestsPassed = false;
        results.failedTests.push({
          testCase,
          actualOutput: '',
          expectedOutput: testCase.expectedOutput,
          error: executionResult.error || 'Execution failed',
        });
        continue;
      }

      // Normalize outputs for comparison
      const actualOutput = normalizeOutput(executionResult.output);
      const expectedOutput = normalizeOutput(testCase.expectedOutput);

      if (actualOutput === expectedOutput) {
        results.passedTests++;
      } else {
        results.passed = false;
        results.allTestsPassed = false;
        results.failedTests.push({
          testCase,
          actualOutput,
          expectedOutput,
        });
      }
    } catch (error: any) {
      results.passed = false;
      results.allTestsPassed = false;
      results.failedTests.push({
        testCase,
        actualOutput: '',
        expectedOutput: testCase.expectedOutput,
        error: error.message || 'Test execution error',
      });
    }
  }

  return results;
}

/**
 * Normalize output for comparison (trim whitespace, handle newlines)
 */
function normalizeOutput(output: string | string[]): string {
  if (Array.isArray(output)) {
    return output.join('\n').trim();
  }
  return String(output).trim();
}

