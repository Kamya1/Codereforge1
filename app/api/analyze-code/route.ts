import { NextRequest, NextResponse } from 'next/server';
import { analyzeCodeStatically } from '@/lib/analysis/static-analyzer';

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
      max_tokens: 1000,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, problemStatement, testCases } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    const config = getApiConfig();
    
    if (!config.apiKey) {
      // Fallback: basic analysis without AI
      return NextResponse.json({
        analysis: {
          hasBug: false,
          description: 'AI analysis unavailable. Please set up your API key for detailed analysis. Basic analysis: Code appears to be syntactically correct.',
          concepts: ['general programming'],
          difficulty: 'medium' as const,
        },
      });
    }

    try {
      let prompt = `You are an expert code reviewer analyzing ${language} code. Your task is to:

1. Determine if the code has any bugs, logical errors, or issues
2. Provide a clear description of what the code does
3. Identify programming concepts used
4. Assess difficulty level
5. If bugs exist, describe them clearly`;

      // Add problem statement context if provided
      if (problemStatement) {
        prompt += `\n\nPROBLEM STATEMENT:\n${problemStatement}\n\nIMPORTANT: Analyze whether the code correctly solves the problem described above. Consider if the code logic matches the problem requirements.`;
      }

      prompt += `\n\nCODE TO ANALYZE:\n\`\`\`${language}\n${code}\n\`\`\``;

      // Add test cases context if provided
      if (testCases && testCases.length > 0) {
        prompt += `\n\nTEST CASES PROVIDED:\n`;
        testCases.forEach((tc: any, idx: number) => {
          prompt += `\nTest Case ${idx + 1}:\n`;
          prompt += `Input: ${tc.input}\n`;
          prompt += `Expected Output: ${tc.expectedOutput}\n`;
          if (tc.description) {
            prompt += `Description: ${tc.description}\n`;
          }
        });
        prompt += `\n\nIMPORTANT: Check if the code would produce the expected outputs for the given test cases. If the code doesn't match expected outputs, mark hasBug as true.`;
      }

      prompt += `\n\nReturn your analysis as a JSON object with this exact structure:
{
  "hasBug": true/false,
  "description": "A clear description of what the code does and its purpose${problemStatement ? '. Also mention if it correctly solves the problem statement.' : ''}",
  "concepts": ["concept1", "concept2", ...],
  "difficulty": "easy" | "medium" | "hard",
  "bugDescription": "If hasBug is true, describe the bug(s) found. If false, omit this field or set to null"
}

CRITICAL RULES:
- "hasBug" should be true if:
  * There are actual bugs, logical errors, or issues that would cause incorrect behavior
  * The code doesn't solve the problem correctly (if problem statement provided)
  * The code doesn't produce expected outputs for test cases (if test cases provided)
- "concepts" should list actual programming concepts demonstrated (e.g., "loops", "recursion", "pointers", "arrays", etc.)
- "difficulty" should reflect the complexity of understanding/debugging the code
- "bugDescription" should be clear and educational, explaining what's wrong and why
- If the code is correct but complex, set hasBug to false but provide a detailed description
- Be thorough but concise`;

      const response = await callAI(
        [
          {
            role: 'system',
            content: 'You are an expert code reviewer specializing in bug detection and code analysis. Always respond in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        config
      );

      // Parse JSON response
      let analysis: {
        hasBug: boolean;
        description: string;
        concepts: string[];
        difficulty: 'easy' | 'medium' | 'hard';
        bugDescription?: string;
      };

      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
        const parsed = JSON.parse(jsonStr);
        
        analysis = {
          hasBug: parsed.hasBug === true,
          description: parsed.description || 'Code analysis completed',
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : ['general programming'],
          difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'medium',
          bugDescription: parsed.bugDescription || undefined,
        };
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback analysis
        analysis = {
          hasBug: false,
          description: 'AI analysis completed but response format was invalid. Please review the code manually.',
          concepts: ['general programming'],
          difficulty: 'medium',
        };
      }

      // Run static analysis
      const staticAnalysis = analyzeCodeStatically(code, language as 'cpp' | 'javascript' | 'python' | 'typescript');

      return NextResponse.json({ 
        analysis,
        staticAnalysis: {
          passed: staticAnalysis.passed,
          errors: staticAnalysis.errors,
          warnings: staticAnalysis.warnings,
          errorsCount: staticAnalysis.errorsCount,
        }
      });
    } catch (error: any) {
      console.error('Error analyzing code with AI:', error);
      // Fallback: basic analysis
      return NextResponse.json({
        analysis: {
          hasBug: false,
          description: `AI analysis failed: ${error.message}. Please review the code manually.`,
          concepts: ['general programming'],
          difficulty: 'medium' as const,
        },
      });
    }
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze code' },
      { status: 500 }
    );
  }
}

