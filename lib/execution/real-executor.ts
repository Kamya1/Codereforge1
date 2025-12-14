/**
 * Real Code Execution Service
 * Uses Judge0 API for actual code execution, with static analysis fallback
 */

import { executeWithJudge0, isJudge0Available } from './judge0-executor';
import type { ExecutionResult, TraceStep } from '@/types';
import { executeCppStatic } from './tracer';
import { executePythonStatic } from './python-tracer';

/**
 * Generate basic trace steps from execution output
 * This creates a simplified trace for visualization
 */
function generateTraceFromOutput(
  code: string,
  output: string[],
  variables?: Record<string, any>
): TraceStep[] {
  const lines = code.split('\n');
  const trace: TraceStep[] = [];
  let stepNumber = 1;

  // Create a trace step for each significant line
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Skip empty lines, comments, and includes
    if (!trimmed || 
        trimmed.startsWith('//') || 
        trimmed.startsWith('#') || 
        trimmed.startsWith('using') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*/')) {
      return;
    }

    // Create a trace step
    trace.push({
      step: stepNumber++,
      line: index + 1,
      codeLine: line,
      variables: variables || {},
      variableChanges: [],
      stack: [],
      output: [],
      explanation: `Executing line ${index + 1}`,
    });
  });

  // Add final output step
  if (output.length > 0) {
    trace.push({
      step: stepNumber,
      line: lines.length,
      codeLine: '',
      variables: variables || {},
      variableChanges: [],
      stack: [],
      output: output,
      explanation: 'Program output',
    });
  }

  return trace;
}

/**
 * Execute C++ code using Judge0, with static analysis fallback
 */
export async function executeCpp(
  code: string,
  input?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Try Judge0 first if available
  if (isJudge0Available()) {
    try {
      const result = await executeWithJudge0(code, 'cpp', input);
      
      if (result.success) {
        // Generate trace from output
        const trace = generateTraceFromOutput(code, result.output);
        
        return {
          success: true,
          output: result.output,
          trace,
          executionTime: result.executionTime || (Date.now() - startTime),
        };
      } else {
        // Execution failed - return error but still provide trace
        const trace = generateTraceFromOutput(code, result.output || []);
        
        return {
          success: false,
          output: result.output || [],
          trace,
          error: result.error || result.compileError || 'Execution failed',
          executionTime: result.executionTime || (Date.now() - startTime),
        };
      }
    } catch (error: any) {
      // Judge0 failed - fall back to static analysis
      console.warn('Judge0 execution failed, falling back to static analysis:', error.message);
      console.error('Judge0 error details:', error);
      try {
        return await executeCppStatic(code, input);
      } catch (fallbackError: any) {
        console.error('Static analysis fallback also failed:', fallbackError);
        // Return a basic error result
        return {
          success: false,
          output: [],
          trace: [],
          error: `Execution failed: ${error.message}. Fallback also failed: ${fallbackError.message}`,
          executionTime: Date.now() - startTime,
        };
      }
    }
  }

  // Judge0 not available - use static analysis
  return await executeCppStatic(code, input);
}

/**
 * Execute Python code using Judge0, with static analysis fallback
 */
export async function executePython(
  code: string,
  input?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Try Judge0 first if available
  if (isJudge0Available()) {
    try {
      const result = await executeWithJudge0(code, 'python', input);
      
      if (result.success) {
        // Generate trace from output
        const trace = generateTraceFromOutput(code, result.output);
        
        return {
          success: true,
          output: result.output,
          trace,
          executionTime: result.executionTime || (Date.now() - startTime),
        };
      } else {
        // Execution failed - return error but still provide trace
        const trace = generateTraceFromOutput(code, result.output || []);
        
        return {
          success: false,
          output: result.output || [],
          trace,
          error: result.error || result.compileError || 'Execution failed',
          executionTime: result.executionTime || (Date.now() - startTime),
        };
      }
    } catch (error: any) {
      // Judge0 failed - fall back to static analysis
      console.warn('Judge0 execution failed, falling back to static analysis:', error.message);
      console.error('Judge0 error details:', error);
      try {
        return await executePythonStatic(code, input);
      } catch (fallbackError: any) {
        console.error('Static analysis fallback also failed:', fallbackError);
        // Return a basic error result
        return {
          success: false,
          output: [],
          trace: [],
          error: `Execution failed: ${error.message}. Fallback also failed: ${fallbackError.message}`,
          executionTime: Date.now() - startTime,
        };
      }
    }
  }

  // Judge0 not available - use static analysis
  return await executePythonStatic(code, input);
}

/**
 * Check if real execution is available
 */
export function isRealExecutionAvailable(): boolean {
  return isJudge0Available();
}

