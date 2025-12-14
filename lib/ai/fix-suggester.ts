import type { Challenge, ExecutionResult, SuggestedFix, TestCase } from '@/types';
import { analyzeCodeStatically } from '@/lib/analysis/static-analyzer';

// API Provider configuration
type ApiProvider = 'groq' | 'openai';

const getApiConfig = () => {
  const rawProvider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  const isGroq = rawProvider === 'groq';
  const isOpenAi = rawProvider === 'openai';

  // Validate provider explicitly to avoid silently falling back
  if (!isGroq && !isOpenAi) {
    throw new Error(
      `Unsupported AI_PROVIDER "${rawProvider}". Valid options are "groq" or "openai".`
    );
  }

  if (isGroq) {
    return {
      provider: 'groq' as const,
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    };
  }

  return {
    provider: 'openai' as const,
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  };
};

async function callAI(messages: Array<{ role: string; content: string }>, config: ReturnType<typeof getApiConfig>) {
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 2200,
      temperature: 0.1, // Very deterministic for reproducible fixes
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Try to extract JSON from error response (sometimes API returns JSON in error)
    try {
      const errorJson = JSON.parse(errorText);
      
      // Check for failed_generation field (OpenAI/Groq sometimes puts the JSON here)
      if (errorJson.error?.failed_generation) {
        try {
          // The failed_generation is a JSON string, so parse it
          const failedGen = JSON.parse(errorJson.error.failed_generation);
          // Return it as a string so it can be parsed again in the main function
          return JSON.stringify(failedGen);
        } catch (parseErr) {
          // If parsing fails, try to extract JSON from the string
          const jsonMatch = errorJson.error.failed_generation.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return jsonMatch[0];
          }
        }
      }
      
      // If error contains a message with JSON, try to extract it
      if (errorJson.error?.message) {
        const jsonInError = errorJson.error.message.match(/\{[\s\S]*"correctCode"[\s\S]*\}/);
        if (jsonInError) {
          return jsonInError[0];
        }
      }
    } catch (e) {
      // If error text contains JSON directly, try to extract it
      const jsonInError = errorText.match(/\{[\s\S]*"correctCode"[\s\S]*\}/);
      if (jsonInError) {
        return jsonInError[0];
      }
    }
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function suggestFix(
  challenge: Challenge,
  originalCode: string,
  executionResult: ExecutionResult,
  userFixedCode?: string
): Promise<SuggestedFix> {
  const config = getApiConfig();
  
  if (!config.apiKey) {
    // Fallback: basic suggestion without AI
    return {
      correctCode: originalCode,
      explanation: 'AI suggestion is unavailable without an API key. Please set up your AI_PROVIDER and API_KEY in .env.local to enable AI-powered fix suggestions.',
      changes: [],
      keyPoints: ['Set up your AI_PROVIDER and API_KEY in .env.local to enable AI-powered fix suggestions.'],
    };
  }

  try {
    // Run static analysis on original code to get findings
    const staticAnalysis = analyzeCodeStatically(originalCode, challenge.language);
    
    const userFixContext = userFixedCode && userFixedCode !== originalCode
      ? `\n\nUSER'S ATTEMPTED FIX (for reference, but provide the CORRECT fix):
\`\`\`${challenge.language}
${userFixedCode}
\`\`\``
      : '';

    const testCasesContext = challenge.testCases && challenge.testCases.length > 0
      ? `\n\nTEST CASES (the fix must pass these):\n${challenge.testCases.map((tc, i) => 
          `Test ${i + 1}:\n  Input: ${tc.input || '(none)'}\n  Expected Output: ${tc.expectedOutput}${tc.description ? `\n  Description: ${tc.description}` : ''}`
        ).join('\n\n')}`
      : '';

    const staticFindingsContext = staticAnalysis.errors.length > 0
      ? `\n\nSTATIC ANALYSIS FINDINGS (these issues MUST be fixed in your solution):\n${staticAnalysis.errors.map((err, i) => 
          `Finding ${i + 1}${err.line ? ` (Line ${err.line})` : ''}: [${err.severity.toUpperCase()}] ${err.message}`
        ).join('\n')}`
      : '';

    const prompt = `You are an expert code reviewer helping a student understand and fix a bug. You MUST provide a fix that passes all test cases and follows best practices.

CHALLENGE INFORMATION:
Title: ${challenge.title}
Description: ${challenge.description}
${challenge.bugDescription ? `Bug Description: ${challenge.bugDescription}` : ''}
Difficulty: ${challenge.difficulty}
Expected Concepts: ${challenge.concepts.join(', ')}${testCasesContext}

ORIGINAL BUGGY CODE:
\`\`\`${challenge.language}
${originalCode}
\`\`\`

EXECUTION RESULT:
Success: ${executionResult.success}
Output: ${JSON.stringify(executionResult.output)}
${executionResult.error ? `Error: ${executionResult.error}` : ''}
${executionResult.trace && executionResult.trace.length > 0 
  ? `\nExecution Trace (showing where the bug occurs):\n${executionResult.trace.slice(0, 5).map((step, i) => 
      `Step ${i + 1} (Line ${step.line}): ${step.codeLine || 'N/A'}\nVariables: ${JSON.stringify(step.variables)}`
    ).join('\n')}`
  : ''}${staticFindingsContext}${userFixContext}

YOUR TASK:
1. Analyze the bug in the original code
2. Provide the CORRECT version of the code that fixes the bug
3. Ensure the fix passes ALL test cases (if provided)
4. Explain what was wrong and how it should be corrected
5. List the specific line-by-line changes made
6. Highlight key learning points

CRITICAL REQUIREMENTS:
- The fix MUST pass all test cases
- The fix MUST be syntactically correct and compile/run without errors
- The fix MUST follow best practices for ${challenge.language}
- The fix MUST be minimal - only change what's necessary to fix the bug

MEMORY SAFETY CHECKLIST (for C/C++ code):
1. Detect direct assignment from realloc to same pointer variable (example: ptr = realloc(ptr, ...))
   - If found, explain that this is unsafe because original pointer will be lost on realloc failure
   - Recommend using a temporary pointer: tmp = realloc(ptr, ...); if (!tmp) { free(ptr); return NULL; } ptr = tmp;
2. Search for missing free() on error paths - all allocated memory must be freed before returning on error
3. Check for null pointer dereferences after malloc/realloc calls
4. Verify that all malloc/calloc/realloc calls have corresponding free() calls
5. Check for use-after-free patterns
6. If realloc misuse is detected, provide corrected code showing the exact lines changed with the temporary pointer pattern

Output format for memory issues:
// BUG: [describe the memory safety issue]
// FIX: [describe the fix]
[corrected code block]

Return your analysis as a JSON object with this EXACT structure (no additional fields):
{
  "correctCode": "The complete corrected code with the bug fixed. Include ALL code, not snippets.",
  "explanation": "A clear explanation of what was wrong in the original code and how it should be corrected. Compare the buggy code with the correct version.",
  "changes": [
    {
      "line": 5,
      "original": "while (i <= 5) {",
      "corrected": "while (i < 5) {",
      "reason": "The condition should be < instead of <= to prevent off-by-one error. When i=5, arr[5] is out of bounds for an array of size 5 (valid indices are 0-4)."
    }
  ],
  "keyPoints": [
    "Array indices start at 0, so an array of size 5 has valid indices 0-4",
    "Loop conditions with <= can cause off-by-one errors when accessing arrays",
    "Always verify loop bounds match array size"
  ]
}

EXAMPLE OUTPUT FORMAT:
{
  "correctCode": "#include <iostream>\nusing namespace std;\n\nint main() {\n  int arr[5] = {1, 2, 3, 4, 5};\n  int sum = 0;\n  for (int i = 0; i < 5; i++) {\n    sum += arr[i];\n  }\n  cout << \"Sum = \" << sum << endl;\n  return 0;\n}",
  "explanation": "The original code had an off-by-one error. The loop started at i=1 and used i<=5, which allowed i to reach 5. Since arrays are 0-indexed, arr[5] is out of bounds for an array of size 5. The fix changes the loop to start at i=0 and use i<5, ensuring we only access valid indices 0-4.",
  "changes": [
    {
      "line": 9,
      "original": "for (int i = 1; i <= 5; i++) {",
      "corrected": "for (int i = 0; i < 5; i++) {",
      "reason": "Changed loop start from 1 to 0 and condition from <=5 to <5 to access valid array indices 0-4"
    }
  ],
  "keyPoints": [
    "Arrays in C++ are 0-indexed: first element is at index 0, last element is at size-1",
    "Loop bounds must match array size: for array of size N, use i < N, not i <= N",
    "Off-by-one errors are common when mixing 1-based thinking with 0-based arrays"
  ]
}

CRITICAL RULES:
- "correctCode" must be the COMPLETE corrected code, not just snippets or diffs
- "explanation" should clearly compare what was wrong vs what is correct
- "changes" should list ALL significant changes with accurate line numbers
- "keyPoints" should highlight 3-5 important learning points
- Focus on educational value - help the student understand WHY the fix works
- If test cases are provided, ensure the fix produces the exact expected outputs
- If the user provided a fix attempt, still provide the correct fix (it may be the same or different)`;

    const response = await callAI(
      [
        {
          role: 'system',
          content: 'You are an expert code reviewer and educator specializing in debugging and teaching programming concepts. Always respond in valid JSON format. Provide clear, educational explanations that help students understand bugs and fixes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      config
    );

    // Parse JSON response
    let suggestedFix: SuggestedFix;
    try {
      // Try to extract JSON from the response
      // First, try to find JSON in markdown code blocks
      let jsonStr = response;
      const jsonBlockMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      } else {
        // Try to find JSON object in the response
        const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }
      
      // Clean up the JSON string - remove any error messages before/after JSON
      // Sometimes the API returns error messages with JSON embedded
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      
      // Handle escaped JSON strings (from failed_generation field)
      let parsed;
      try {
        // First try direct parsing
        parsed = JSON.parse(jsonStr);
        // If the result is a string that looks like JSON, parse it again (double-encoded)
        if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
          parsed = JSON.parse(parsed);
        }
      } catch (e) {
        // If direct parsing fails, try unescaping common escape sequences
        // This handles cases where JSON is escaped in the error response
        try {
          // Replace escaped unicode and common escape sequences
          const unescaped = jsonStr
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')
            .replace(/\\u003c/g, '<')
            .replace(/\\u003e/g, '>')
            .replace(/\\u0026/g, '&');
          parsed = JSON.parse(unescaped);
        } catch (e2) {
          // If that also fails, try to extract just the JSON object
          const jsonMatch = jsonStr.match(/\{[\s\S]*"correctCode"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0]);
            } catch (e3) {
              throw new Error('Failed to parse JSON response after multiple attempts');
            }
          } else {
            throw new Error('Failed to parse JSON response');
          }
        }
      }
      
      const correctCode = parsed.correctCode || originalCode;
      
      // Validate the suggested fix with tests and static analysis
      let validation: SuggestedFix['validation'] = undefined;
      
      try {
        // Run static analysis
        const staticAnalysis = analyzeCodeStatically(correctCode, challenge.language);
        
        // Execute the code to check if it runs (server-side execution)
        const { executeJavaScript, executeCpp, executePython } = await import('@/lib/execution/tracer');
        
        let executionResult: ExecutionResult;
        const input = challenge.testCases && challenge.testCases.length > 0 ? challenge.testCases[0].input : undefined;
        
        if (challenge.language === 'cpp') {
          executionResult = await executeCpp(correctCode, input);
        } else if (challenge.language === 'python') {
          executionResult = await executePython(correctCode, input);
        } else {
          executionResult = await executeJavaScript(correctCode, input);
        }
        
        // Run test validation if test cases exist
        let testResults = undefined;
        if (challenge.testCases && challenge.testCases.length > 0) {
          const { validateFixWithTests } = await import('@/lib/validation/test-validator');
          // We need to call this server-side, so we'll do it manually
          const testValidationResults = {
            passed: true,
            totalTests: challenge.testCases.length,
            passedTests: 0,
            failedTests: [] as any[],
            allTestsPassed: true,
          };
          
          for (const testCase of challenge.testCases) {
            let testExecutionResult: ExecutionResult;
            if (challenge.language === 'cpp') {
              testExecutionResult = await executeCpp(correctCode, testCase.input);
            } else if (challenge.language === 'python') {
              testExecutionResult = await executePython(correctCode, testCase.input);
            } else {
              testExecutionResult = await executeJavaScript(correctCode, testCase.input);
            }
            
            if (!testExecutionResult.success) {
              testValidationResults.passed = false;
              testValidationResults.allTestsPassed = false;
              testValidationResults.failedTests.push({
                testCase,
                actualOutput: '',
                expectedOutput: testCase.expectedOutput,
                error: testExecutionResult.error || 'Execution failed',
              });
            } else {
              const actualOutput = Array.isArray(testExecutionResult.output) 
                ? testExecutionResult.output.join('\n').trim() 
                : String(testExecutionResult.output).trim();
              const expectedOutput = testCase.expectedOutput.trim();
              
              if (actualOutput === expectedOutput) {
                testValidationResults.passedTests++;
              } else {
                testValidationResults.passed = false;
                testValidationResults.allTestsPassed = false;
                testValidationResults.failedTests.push({
                  testCase,
                  actualOutput,
                  expectedOutput,
                });
              }
            }
          }
          
          testResults = testValidationResults;
        }
        
        validation = {
          testsPassed: testResults ? testResults.allTestsPassed : executionResult.success,
          testResults: testResults ? {
            totalTests: testResults.totalTests,
            passedTests: testResults.passedTests,
            failedTests: testResults.failedTests,
          } : undefined,
          staticAnalysis: {
            passed: staticAnalysis.passed,
            errors: staticAnalysis.errors,
            warnings: staticAnalysis.warnings,
            errorsCount: staticAnalysis.errorsCount,
          },
          executionSuccess: executionResult.success,
          executionError: executionResult.error,
        };
      } catch (validationError) {
        console.error('Validation error:', validationError);
        // Continue without validation if it fails
      }
      
      suggestedFix = {
        correctCode,
        explanation: parsed.explanation || 'Fix suggestion generated',
        changes: Array.isArray(parsed.changes) ? parsed.changes : [],
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        validation,
      };
    } catch (parseError: any) {
      // If JSON parsing fails, try to extract JSON from error message or response
      console.error('Failed to parse AI response:', parseError);
      
      // Sometimes the error message contains the JSON
      let extractedJson = null;
      try {
        // Try to find JSON in the response string
        const jsonMatch = response.match(/\{[\s\S]*"correctCode"[\s\S]*\}/);
        if (jsonMatch) {
          extractedJson = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Ignore extraction errors
      }
      
      if (extractedJson) {
        // Use extracted JSON if found
        suggestedFix = {
          correctCode: extractedJson.correctCode || originalCode,
          explanation: extractedJson.explanation || 'Fix suggestion generated',
          changes: Array.isArray(extractedJson.changes) ? extractedJson.changes : [],
          keyPoints: Array.isArray(extractedJson.keyPoints) ? extractedJson.keyPoints : [],
        };
      } else {
        // Fallback: create a structured response
        suggestedFix = {
          correctCode: originalCode,
          explanation: 'AI analysis completed but response format was invalid. The response may contain valid JSON that needs to be extracted. Please try again.',
          changes: [],
          keyPoints: ['The AI response could not be parsed. Please try again or check your API configuration.'],
        };
      }
    }

    return suggestedFix;
  } catch (error: any) {
    console.error('Error suggesting fix with AI:', error);
    // Fallback response
    return {
      correctCode: originalCode,
      explanation: `AI suggestion failed: ${error.message}. Please ensure your API key is valid.`,
      changes: [],
      keyPoints: ['AI suggestion is currently unavailable. Please ensure your API key is valid.'],
    };
  }
}

