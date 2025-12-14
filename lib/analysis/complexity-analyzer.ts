// Simple heuristic complexity analyzer
// This is not a full parser; it estimates complexity from loop/recursion patterns.

export interface ComplexityResult {
  time: string;
  space: string;
  explanation: string;
  loops: string[];
  recursion: boolean;
}

function countLoopDepth(code: string): { depth: number; loops: string[] } {
  const lines = code.split('\n');
  let depth = 0;
  let maxDepth = 0;
  const loops: string[] = [];

  const loopRegex = /\b(for|while|foreach|forEach)\b/;
  const stack: number[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (loopRegex.test(trimmed)) {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
      loops.push(`Loop at line ${idx + 1}: ${trimmed}`);
      stack.push(idx);
    }

    // crude block end detection
    if (trimmed.endsWith('}') || trimmed.endsWith('end') || trimmed === '') {
      if (depth > 0) depth -= 1;
    }
  });

  return { depth: Math.max(maxDepth, 0), loops };
}

function detectRecursion(code: string): boolean {
  // detect function name and self-call
  const fnMatch = code.match(/(?:function|[\w<>:*&\s]+)\s+([A-Za-z_]\w*)\s*\(/);
  if (!fnMatch) return false;
  const name = fnMatch[1];
  const selfCall = new RegExp(`\\b${name}\\s*\\(`);
  const occurrences = code.match(selfCall);
  return occurrences ? occurrences.length > 1 : false;
}

export function analyzeComplexity(code: string): ComplexityResult {
  const { depth, loops } = countLoopDepth(code);
  const recursion = detectRecursion(code);

  let time = 'O(1)';
  if (depth >= 1) time = `O(n${depth > 1 ? '^' + depth : ''})`;
  if (recursion && depth === 0) time = 'O(n)';
  if (recursion && depth >= 1) time = `O(n${depth > 1 ? '^' + depth : ''})`;

  let space = 'O(1)';
  if (recursion) space = 'O(n) // recursion stack';

  const explanationParts: string[] = [];
  if (depth > 0) explanationParts.push(`Detected loop nesting depth ${depth} from ${loops.length} loop(s).`);
  if (recursion) explanationParts.push('Recursive call detected; adds stack space.');
  if (explanationParts.length === 0) explanationParts.push('No loops or recursion; operations are constant-time.');

  return {
    time,
    space,
    explanation: explanationParts.join(' '),
    loops,
    recursion,
  };
}
import type { TraceStep } from '@/types';

// (Legacy analyzer removed to avoid duplicate exports)

