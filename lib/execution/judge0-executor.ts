/**
 * Judge0 API Integration for Real Code Execution
 * 
 * Judge0 is a code execution API that supports multiple languages.
 * Free tier: https://api.judge0.com (100 requests/day)
 * Self-hosted: https://github.com/judge0/judge0
 * 
 * Language IDs:
 * - C++: 54 (gcc 9.4.0)
 * - Python: 92 (3.8.1)
 * - JavaScript: 63 (Node.js 12.14.0)
 */

interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  wall_time_limit?: number;
}

interface Judge0Response {
  token: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
}

// Language ID mapping for Judge0
const LANGUAGE_IDS: Record<string, number> = {
  cpp: 54,      // C++ (GCC 9.4.0)
  python: 92,   // Python 3.8.1
  javascript: 63, // Node.js 12.14.0
  typescript: 63, // Use Node.js for TypeScript (would need compilation step)
};

// Judge0 API configuration
const getJudge0Config = () => {
  const apiUrl = process.env.JUDGE0_API_URL || 'https://api.judge0.com';
  const apiKey = process.env.JUDGE0_API_KEY || ''; // Optional for free tier
  
  return {
    baseUrl: apiUrl,
    apiKey,
    // Use rapidapi if configured
    rapidApiKey: process.env.JUDGE0_RAPIDAPI_KEY || '',
    rapidApiHost: process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com',
  };
};

/**
 * Submit code for execution to Judge0
 */
async function submitCode(
  code: string,
  language: string,
  input?: string
): Promise<string> {
  const config = getJudge0Config();
  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const submission: Judge0Submission = {
    source_code: code,
    language_id: languageId,
    stdin: input || '',
    cpu_time_limit: 5, // 5 seconds
    memory_limit: 128000, // 128 MB
    wall_time_limit: 10, // 10 seconds
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authentication if using RapidAPI
  if (config.rapidApiKey) {
    headers['X-RapidAPI-Key'] = config.rapidApiKey;
    headers['X-RapidAPI-Host'] = config.rapidApiHost;
  } else if (config.apiKey) {
    headers['X-Auth-Token'] = config.apiKey;
  }

  const url = config.rapidApiKey 
    ? `https://${config.rapidApiHost}/submissions?base64_encoded=false&wait=false`
    : `${config.baseUrl}/submissions?base64_encoded=false&wait=false`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Judge0 submission failed: ${response.status}`, errorText);
      throw new Error(`Judge0 submission failed: ${response.status} - ${errorText}`);
    }

    const data: Judge0Response = await response.json();
    if (!data.token) {
      throw new Error('Judge0 did not return a token');
    }
    return data.token;
  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error(`Network error connecting to Judge0: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get execution result from Judge0
 */
async function getResult(token: string): Promise<Judge0Result> {
  const config = getJudge0Config();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.rapidApiKey) {
    headers['X-RapidAPI-Key'] = config.rapidApiKey;
    headers['X-RapidAPI-Host'] = config.rapidApiHost;
  } else if (config.apiKey) {
    headers['X-Auth-Token'] = config.apiKey;
  }

  const url = config.rapidApiKey
    ? `https://${config.rapidApiHost}/submissions/${token}?base64_encoded=false`
    : `${config.baseUrl}/submissions/${token}?base64_encoded=false`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Judge0 result fetch failed: ${response.status}`, errorText);
      throw new Error(`Judge0 result fetch failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.message && error.message.includes('Judge0')) {
      throw error;
    }
    throw new Error(`Network error fetching Judge0 result: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Wait for execution to complete (polling)
 */
async function waitForExecution(token: string, maxWaitTime: number = 30000): Promise<Judge0Result> {
  const startTime = Date.now();
  const pollInterval = 500; // Poll every 500ms

  while (Date.now() - startTime < maxWaitTime) {
    const result = await getResult(token);
    
    // Status IDs: 1=In Queue, 2=Processing, 3=Accepted (completed)
    // Other statuses indicate completion (error, timeout, etc.)
    if (result.status.id !== 1 && result.status.id !== 2) {
      return result;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout - get final result
  return await getResult(token);
}

/**
 * Execute code using Judge0 API
 */
export async function executeWithJudge0(
  code: string,
  language: string,
  input?: string
): Promise<{
  success: boolean;
  output: string[];
  error?: string;
  compileError?: string;
  executionTime?: number;
  memory?: number;
  status: string;
}> {
  try {
    // Submit code
    const token = await submitCode(code, language, input);
    
    // Wait for execution (with timeout)
    const result = await waitForExecution(token, 30000);

    // Parse result
    const output: string[] = [];
    let error: string | undefined;
    let compileError: string | undefined;
    let success = false;

    // Status IDs:
    // 3 = Accepted (success)
    // 4 = Wrong Answer
    // 5 = Time Limit Exceeded
    // 6 = Compilation Error
    // 7 = Runtime Error
    // 8 = etc.

    if (result.status.id === 3) {
      // Success
      success = true;
      if (result.stdout) {
        output.push(...result.stdout.split('\n').filter(line => line !== ''));
      }
    } else if (result.status.id === 6) {
      // Compilation error
      compileError = result.compile_output || result.message || 'Compilation failed';
      error = compileError;
    } else if (result.status.id === 7) {
      // Runtime error
      error = result.stderr || result.message || 'Runtime error occurred';
    } else {
      // Other errors (timeout, wrong answer, etc.)
      error = result.message || result.stderr || result.status.description || 'Execution failed';
      if (result.stdout) {
        output.push(...result.stdout.split('\n').filter(line => line !== ''));
      }
    }

    return {
      success,
      output,
      error,
      compileError,
      executionTime: result.time ? parseFloat(result.time) * 1000 : undefined, // Convert to ms
      memory: result.memory || undefined,
      status: result.status.description,
    };
  } catch (err: any) {
    return {
      success: false,
      output: [],
      error: err.message || 'Failed to execute code',
      status: 'Error',
    };
  }
}

/**
 * Check if Judge0 is available/configured
 */
export function isJudge0Available(): boolean {
  // Allow disabling Judge0 via environment variable
  if (process.env.DISABLE_JUDGE0 === 'true') {
    return false;
  }
  
  const config = getJudge0Config();
  // Judge0 free tier works without API key, so we can always try
  // But check if we have a valid base URL
  return !!config.baseUrl;
}

