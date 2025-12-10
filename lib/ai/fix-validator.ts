import type { Challenge, ExecutionResult } from '@/types';

// API Provider configuration
type ApiProvider = 'groq' | 'openai';

const getApiConfig = () => {
  const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase() as ApiProvider;
  
  if (provider === 'groq') {
    return {
      provider: 'groq' as const,
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    };
  } else {
    return {
      provider: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4',
    };
  }
};

export interface FixValidationResult {
  isValid: boolean;
  explanation: string;
  conceptsLearned: string[];
  suggestions?: string[];
}

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
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function validateFix(
  challenge: Challenge,
  originalCode: string,
  fixedCode: string,
  executionResult: ExecutionResult
): Promise<FixValidationResult> {
  const config = getApiConfig();
  
  if (!config.apiKey) {
    // Fallback: basic validation without AI
    return {
      isValid: fixedCode !== originalCode && executionResult.success,
      explanation: 'AI validation is unavailable without an API key. Basic validation: code changed and executes successfully.',
      conceptsLearned: challenge.concepts,
      suggestions: ['Set up your AI_PROVIDER and API_KEY in .env.local to enable AI-powered validation.'],
    };
  }

  try {
    const prompt = `You are an expert code reviewer analyzing a bug fix. 

CHALLENGE INFORMATION:
Title: ${challenge.title}
Description: ${challenge.description}
Difficulty: ${challenge.difficulty}
Expected Concepts: ${challenge.concepts.join(', ')}

ORIGINAL BUGGY CODE:
\`\`\`cpp
${originalCode}
\`\`\`

FIXED CODE:
\`\`\`cpp
${fixedCode}
\`\`\`

EXECUTION RESULT:
Success: ${executionResult.success}
Output: ${JSON.stringify(executionResult.output)}
${executionResult.error ? `Error: ${executionResult.error}` : ''}

YOUR TASK:
1. Analyze if the fix actually resolves the bug described in the challenge
2. Determine if the code changes are meaningful (not just whitespace/formatting)
3. Identify which programming concepts were demonstrated/learned by fixing this bug
4. Provide constructive feedback

Return your analysis as a JSON object with this exact structure:
{
  "isValid": true/false,
  "explanation": "A clear explanation of why the fix is valid or invalid. If invalid, explain what's missing or wrong.",
  "conceptsLearned": ["concept1", "concept2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...] (optional, only if fix is invalid or could be improved)
}

CRITICAL RULES:
- "isValid" should be true ONLY if the bug is actually fixed, not just if code changed
- "conceptsLearned" should list the actual concepts demonstrated, not just copy the challenge concepts
- Be strict but fair - a fix that changes code but doesn't fix the bug should be marked invalid
- If the fix is valid, "suggestions" can be empty or contain improvement tips
- If the fix is invalid, "suggestions" should explain how to fix it properly`;

    const response = await callAI(
      [
        {
          role: 'system',
          content: 'You are an expert code reviewer specializing in bug fixes and code analysis. Always respond in valid JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      config
    );

    // Parse JSON response
    let validationResult: FixValidationResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      const parsed = JSON.parse(jsonStr);
      
      validationResult = {
        isValid: parsed.isValid === true,
        explanation: parsed.explanation || 'Fix analyzed',
        conceptsLearned: Array.isArray(parsed.conceptsLearned) ? parsed.conceptsLearned : challenge.concepts,
        suggestions: parsed.suggestions || [],
      };
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      console.error('Failed to parse AI response:', parseError);
      validationResult = {
        isValid: fixedCode !== originalCode && executionResult.success,
        explanation: 'AI analysis completed but response format was invalid. Using basic validation.',
        conceptsLearned: challenge.concepts,
        suggestions: ['The AI response could not be parsed. Please try again.'],
      };
    }

    return validationResult;
  } catch (error: any) {
    console.error('Error validating fix with AI:', error);
    // Fallback to basic validation
    return {
      isValid: fixedCode !== originalCode && executionResult.success,
      explanation: `AI validation failed: ${error.message}. Using basic validation.`,
      conceptsLearned: challenge.concepts,
      suggestions: ['AI validation is currently unavailable. Please ensure your API key is valid.'],
    };
  }
}

