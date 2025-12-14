import type { Challenge } from '@/types';

export interface StaticAnalysisResult {
  passed: boolean;
  errors: Array<{
    line?: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    category: 'syntax' | 'logic' | 'style' | 'security';
  }>;
  warnings: number;
  errorsCount: number;
}

/**
 * Performs static analysis on code based on language
 * Note: This is a simplified analyzer. For production, integrate with real tools like:
 * - C++: cppcheck, clang-tidy, ASAN
 * - JavaScript: ESLint, TypeScript compiler
 * - Python: pylint, mypy, flake8
 * 
 * For C/C++ code, you can optionally run cppcheck by setting ENABLE_CPPCHECK=true
 * and ensuring cppcheck is installed: cppcheck --enable=all --inconclusive --std=c11 file.c
 */
export function analyzeCodeStatically(
  code: string,
  language: Challenge['language']
): StaticAnalysisResult {
  const result: StaticAnalysisResult = {
    passed: true,
    errors: [],
    warnings: 0,
    errorsCount: 0,
  };

  switch (language) {
    case 'cpp':
      return analyzeCpp(code);
    case 'javascript':
    case 'typescript':
      return analyzeJavaScript(code);
    case 'python':
      return analyzePython(code);
    default:
      return result;
  }
}

function analyzeCpp(code: string): StaticAnalysisResult {
  const result: StaticAnalysisResult = {
    passed: true,
    errors: [],
    warnings: 0,
    errorsCount: 0,
  };

  const lines = code.split('\n');

  // Check for realloc misuse pattern: ptr = realloc(ptr, ...)
  // This is a critical memory leak pattern - if realloc fails, the original pointer is lost
  const reallocMisusePattern = /(\w+)\s*=\s*realloc\s*\(\s*\1\s*,/;
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Check for realloc misuse
    if (reallocMisusePattern.test(trimmed)) {
      const match = trimmed.match(reallocMisusePattern);
      if (match) {
        const varName = match[1];
        // Check if there's a null check after this line
        let hasNullCheck = false;
        let hasFreeOnFailure = false;
        
        // Look ahead up to 5 lines for null check and free
        for (let i = index + 1; i < Math.min(index + 6, lines.length); i++) {
          const nextLine = lines[i].trim();
          if (nextLine.includes(`if`) && nextLine.includes(`!${varName}`) || nextLine.includes(`${varName} == NULL`)) {
            hasNullCheck = true;
            // Check if there's a free in the error path
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              if (lines[j].includes('free') || lines[j].includes('return')) {
                hasFreeOnFailure = true;
                break;
              }
            }
            break;
          }
        }
        
        if (!hasNullCheck || !hasFreeOnFailure) {
          result.errors.push({
            line: lineNum,
            message: `CRITICAL: realloc misuse detected - "${varName} = realloc(${varName}, ...)" assigns result to same pointer. If realloc fails, the original pointer is lost, causing a memory leak. Use a temporary pointer: "tmp = realloc(${varName}, ...); if (!tmp) { free(${varName}); return NULL; } ${varName} = tmp;"`,
            severity: 'error',
            category: 'security',
          });
          result.errorsCount++;
          result.passed = false;
        }
      }
    }
  });

  // Check for common C++ issues
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Check for array out of bounds patterns
    if (trimmed.match(/\[.*\]/) && !trimmed.includes('sizeof') && !trimmed.includes('std::')) {
      // Look for patterns like arr[i] where i might be out of bounds
      const arrayAccessMatch = trimmed.match(/(\w+)\[([^\]]+)\]/);
      if (arrayAccessMatch) {
        const arrayName = arrayAccessMatch[1];
        const indexExpr = arrayAccessMatch[2];
        
        // Check if index might be >= array size (simple heuristics)
        if (indexExpr.includes('=') && indexExpr.includes('<=')) {
          result.errors.push({
            line: lineNum,
            message: `Potential array out-of-bounds access: ${arrayName}[${indexExpr}]. Check if index can exceed array size.`,
            severity: 'warning',
            category: 'logic',
          });
          result.warnings++;
        }
      }
    }

    // Check for uninitialized variables (simple check)
    if (trimmed.match(/int\s+\w+\s*;/) && !trimmed.includes('=')) {
      const varMatch = trimmed.match(/int\s+(\w+)\s*;/);
      if (varMatch && !code.includes(`${varMatch[1]} =`)) {
        result.errors.push({
          line: lineNum,
          message: `Variable '${varMatch[1]}' may be used uninitialized.`,
          severity: 'warning',
          category: 'logic',
        });
        result.warnings++;
      }
    }

    // Check for memory leaks (new without delete)
    if (trimmed.includes('new ') && !code.includes('delete')) {
      result.errors.push({
        line: lineNum,
        message: 'Potential memory leak: new operator used but no corresponding delete found.',
        severity: 'warning',
        category: 'logic',
      });
      result.warnings++;
    }

    // Check for division by zero
    if (trimmed.includes('/') && !trimmed.includes('//')) {
      const divMatch = trimmed.match(/\/\s*(\w+)/);
      if (divMatch && !trimmed.includes('if') && !trimmed.includes('assert')) {
        result.errors.push({
          line: lineNum,
          message: `Potential division by zero: check if '${divMatch[1]}' can be zero.`,
          severity: 'warning',
          category: 'logic',
        });
        result.warnings++;
      }
    }
  });

  // Check for missing includes
  if (code.includes('cout') && !code.includes('#include <iostream>')) {
    result.errors.push({
      message: 'Missing #include <iostream> for cout',
      severity: 'error',
      category: 'syntax',
    });
    result.errorsCount++;
    result.passed = false;
  }

  if (code.includes('vector') && !code.includes('#include <vector>')) {
    result.errors.push({
      message: 'Missing #include <vector> for vector',
      severity: 'error',
      category: 'syntax',
    });
    result.errorsCount++;
    result.passed = false;
  }

  return result;
}

function analyzeJavaScript(code: string): StaticAnalysisResult {
  const result: StaticAnalysisResult = {
    passed: true,
    errors: [],
    warnings: 0,
    errorsCount: 0,
  };

  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Check for undefined variable access
    if (trimmed.match(/console\.(log|error|warn)/)) {
      // This is fine, just a check
    }

    // Check for potential null/undefined access
    if (trimmed.includes('.') && !trimmed.includes('?.') && !trimmed.includes('if')) {
      const dotAccess = trimmed.match(/(\w+)\.(\w+)/);
      if (dotAccess) {
        result.errors.push({
          line: lineNum,
          message: `Potential null/undefined access: ${dotAccess[1]}.${dotAccess[2]}. Consider optional chaining (?.) or null check.`,
          severity: 'warning',
          category: 'logic',
        });
        result.warnings++;
      }
    }

    // Check for == instead of ===
    if (trimmed.includes(' == ') && !trimmed.includes('===')) {
      result.errors.push({
        line: lineNum,
        message: 'Consider using === instead of == for strict equality comparison.',
        severity: 'warning',
        category: 'style',
      });
      result.warnings++;
    }
  });

  return result;
}

function analyzePython(code: string): StaticAnalysisResult {
  const result: StaticAnalysisResult = {
    passed: true,
    errors: [],
    warnings: 0,
    errorsCount: 0,
  };

  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Check for indentation issues (basic)
    if (trimmed && !trimmed.startsWith('#') && index > 0) {
      const prevLine = lines[index - 1];
      if (prevLine.trim().endsWith(':') && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
        result.errors.push({
          line: lineNum,
          message: 'Expected indentation after colon.',
          severity: 'error',
          category: 'syntax',
        });
        result.errorsCount++;
        result.passed = false;
      }
    }

    // Check for undefined variable access
    if (trimmed.match(/print\s*\(/)) {
      // This is fine
    }
  });

  return result;
}

