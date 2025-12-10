import type { TraceStep } from '@/types';

export interface ComplexityMetrics {
  timeComplexity: string;
  spaceComplexity: string;
  cyclomaticComplexity: number;
  lineCount: number;
  operationCount: number;
  estimatedBigO: string;
}

export function analyzeComplexity(
  code: string,
  trace: TraceStep[]
): ComplexityMetrics {
  const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
  const lineCount = lines.length;
  
  // Count operations from trace
  const operationCount = trace.length;
  
  // Analyze code structure for complexity
  let cyclomaticComplexity = 1; // Base complexity
  let maxNestedLoops = 0;
  let hasRecursion = false;
  
  // Count control flow statements
  const ifCount = (code.match(/\bif\s*\(/g) || []).length;
  const whileCount = (code.match(/\bwhile\s*\(/g) || []).length;
  const forCount = (code.match(/\bfor\s*\(/g) || []).length;
  const switchCount = (code.match(/\bswitch\s*\(/g) || []).length;
  const caseCount = (code.match(/\bcase\s+/g) || []).length;
  const catchCount = (code.match(/\bcatch\s*\(/g) || []).length;
  
  // Check for recursion
  hasRecursion = /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\w+\s*\(/.test(code) ||
                 /\w+\s*\([^)]*\)\s*\{[^}]*\w+\s*\(/.test(code);
  
  // Calculate cyclomatic complexity
  cyclomaticComplexity = 1 + ifCount + whileCount + forCount + switchCount + caseCount + catchCount;
  
  // Estimate Big-O based on structure
  let estimatedBigO = 'O(1)';
  
  if (hasRecursion) {
    // Check for recursive patterns
    if (code.match(/return\s+\w+\s*\*\s*\w+\s*\(/)) {
      estimatedBigO = 'O(2^n)'; // Exponential recursion
    } else if (code.match(/return\s+\w+\s*\([^)]*n\s*-\s*1/)) {
      estimatedBigO = 'O(n)'; // Linear recursion
    } else {
      estimatedBigO = 'O(log n)'; // Likely logarithmic
    }
  } else if (forCount > 0 || whileCount > 0) {
    // Check for nested loops
    const nestedPattern = /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/g;
    const nestedMatches = (code.match(nestedPattern) || []).length;
    
    if (nestedMatches > 0) {
      estimatedBigO = 'O(n²)'; // Nested loops
    } else {
      estimatedBigO = 'O(n)'; // Single loop
    }
  }
  
  // Estimate time complexity
  let timeComplexity = 'O(1)';
  if (estimatedBigO.startsWith('O(n')) {
    timeComplexity = estimatedBigO;
  } else if (estimatedBigO === 'O(log n)') {
    timeComplexity = 'O(log n)';
  } else if (estimatedBigO === 'O(2^n)') {
    timeComplexity = 'O(2^n)';
  } else {
    timeComplexity = 'O(1)';
  }
  
  // Estimate space complexity (simplified)
  let spaceComplexity = 'O(1)';
  if (hasRecursion) {
    spaceComplexity = 'O(n)'; // Recursion stack
  } else if (code.match(/\[\s*\]|new\s+\w+\[/)) {
    spaceComplexity = 'O(n)'; // Array allocation
  }
  
  return {
    timeComplexity,
    spaceComplexity,
    cyclomaticComplexity,
    lineCount,
    operationCount,
    estimatedBigO,
  };
}

export function formatComplexity(metrics: ComplexityMetrics): string {
  return `Time: ${metrics.timeComplexity}, Space: ${metrics.spaceComplexity}, Cyclomatic: ${metrics.cyclomaticComplexity}`;
}

