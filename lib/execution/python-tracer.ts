import type { TraceStep, ExecutionResult } from '@/types';
import { CodeTracer } from './tracer';

// Re-export CodeTracer if needed, or import it directly
// Since CodeTracer is exported from tracer.ts, we can use it

// Python execution tracer (simulated)
// Since we can't execute Python in the browser, we use static analysis to simulate execution
export async function executePython(code: string, input?: string): Promise<ExecutionResult> {
  const lines = code.split('\n');
  const tracer = new CodeTracer(lines);
  const output: string[] = [];
  let error: string | undefined;
  const startTime = Date.now();

  // Parse input into tokens for input() simulation
  const inputTokens = input ? input.trim().split(/\s+/).filter(token => token.length > 0) : [];
  let inputIndex = 0;

  // Helper function to evaluate Python expressions
  const evaluateExpression = (expr: string, vars: Record<string, any>): any => {
    try {
      // Replace variable names with their values
      let evalExpr = expr;
      Object.keys(vars).forEach(varName => {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        evalExpr = evalExpr.replace(regex, String(vars[varName]));
      });
      
      // Handle Python-specific operations
      // Replace // with Math.floor division
      evalExpr = evalExpr.replace(/(\d+)\s*\/\/\s*(\d+)/g, (match, a, b) => {
        return String(Math.floor(Number(a) / Number(b)));
      });
      
      // Replace ** with Math.pow
      evalExpr = evalExpr.replace(/(\d+)\s*\*\*\s*(\d+)/g, (match, a, b) => {
        return String(Math.pow(Number(a), Number(b)));
      });
      
      // Evaluate the expression (safe evaluation)
      if (/^[0-9+\-*/().\s]+$/.test(evalExpr)) {
        return eval(evalExpr);
      }
      
      // Try to evaluate with Python-like operations
      try {
        // Handle len() function
        if (evalExpr.includes('len(')) {
          // Simple len simulation - would need more context
          return undefined;
        }
        return eval(evalExpr);
      } catch (e) {
        return undefined;
      }
    } catch (e) {
      return undefined;
    }
  };

  try {
    const variables: Record<string, any> = {};
    let i = 0;
    const maxIterations = 1000; // Prevent infinite loops
    let iterations = 0;
    
    // Simple Python static analysis with execution simulation
    while (i < lines.length && iterations < maxIterations) {
      iterations++;
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        i++;
        continue;
      }
      
      // Detect function definitions: def function_name():
      const defMatch = trimmed.match(/^def\s+(\w+)\s*\([^)]*\)\s*:/);
      if (defMatch) {
        // Skip function body for now (would need proper indentation handling)
        let indentLevel = (line.match(/^(\s*)/)?.[1] || '').length;
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextIndent = (nextLine.match(/^(\s*)/)?.[1] || '').length;
          if (nextLine.trim() && nextIndent <= indentLevel) {
            break;
          }
          i++;
        }
        continue;
      }
      
      // Detect input() statements: x = input() or x = int(input())
      const inputMatch = trimmed.match(/(\w+)\s*=\s*(?:int|float|str)?\s*\(?\s*input\s*\([^)]*\)\s*\)?/);
      if (inputMatch) {
        const varName = inputMatch[1];
        const isInt = trimmed.includes('int(');
        const isFloat = trimmed.includes('float(');
        
        if (inputIndex < inputTokens.length) {
          const inputValue = inputTokens[inputIndex];
          if (isInt) {
            variables[varName] = parseInt(inputValue, 10);
          } else if (isFloat) {
            variables[varName] = parseFloat(inputValue);
          } else {
            variables[varName] = inputValue;
          }
          inputIndex++;
          tracer.addStep(
            i + 1,
            { ...variables },
            undefined,
            `Read input into ${varName} = ${variables[varName]}`,
            line
          );
        } else {
          error = `Runtime error: No input available for input()`;
          break;
        }
        i++;
        continue;
      }
      
      // Detect variable assignments: x = 5 or x = y + 1
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const expr = assignMatch[2].trim();
        
        // Handle list literals: arr = [1, 2, 3]
        if (expr.startsWith('[') && expr.endsWith(']')) {
          try {
            // Simple list parsing
            const listContent = expr.slice(1, -1);
            const items = listContent.split(',').map(item => {
              const trimmedItem = item.trim();
              // Replace variables with values
              let evalItem = trimmedItem;
              Object.keys(variables).forEach(v => {
                const regex = new RegExp(`\\b${v}\\b`, 'g');
                evalItem = evalItem.replace(regex, String(variables[v]));
              });
              const num = parseFloat(evalItem);
              return isNaN(num) ? trimmedItem : (num % 1 === 0 ? parseInt(evalItem, 10) : num);
            });
            variables[varName] = items;
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Variable ${varName} assigned to list ${JSON.stringify(items)}`,
              line
            );
          } catch (e) {
            variables[varName] = [];
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Variable ${varName} assigned to empty list`,
              line
            );
          }
          i++;
          continue;
        }
        
        // Handle arithmetic expressions
        const value = evaluateExpression(expr, variables);
        if (value !== undefined) {
          variables[varName] = value;
          tracer.addStep(
            i + 1,
            { ...variables },
            undefined,
            `Variable ${varName} assigned to ${variables[varName]}`,
            line
          );
        } else {
          // Try simple number parsing
          const numValue = parseFloat(expr);
          if (!isNaN(numValue)) {
            variables[varName] = numValue % 1 === 0 ? parseInt(expr, 10) : numValue;
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Variable ${varName} assigned to ${variables[varName]}`,
              line
            );
          } else if (expr.startsWith('"') || expr.startsWith("'")) {
            // String literal
            variables[varName] = expr.slice(1, -1);
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Variable ${varName} assigned to string "${variables[varName]}"`,
              line
            );
          }
        }
        i++;
        continue;
      }
      
      // Detect for loops: for i in range(5): or for item in list:
      const forRangeMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\s*\(([^)]+)\)\s*:/);
      const forInMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(\w+)\s*:/);
      
      if (forRangeMatch) {
        const varName = forRangeMatch[1];
        const rangeExpr = forRangeMatch[2];
        
        // Parse range arguments
        const rangeArgs = rangeExpr.split(',').map(arg => {
          const trimmedArg = arg.trim();
          const val = evaluateExpression(trimmedArg, variables);
          return val !== undefined ? val : (isNaN(parseInt(trimmedArg, 10)) ? 0 : parseInt(trimmedArg, 10));
        });
        
        const start = rangeArgs.length > 1 ? rangeArgs[0] : 0;
        const end = rangeArgs.length > 1 ? rangeArgs[1] : rangeArgs[0];
        const step = rangeArgs.length > 2 ? rangeArgs[2] : 1;
        
        // Find loop body
        let indentLevel = (line.match(/^(\s*)/)?.[1] || '').length;
        const loopStart = i;
        i++;
        
        // Find end of loop body
        let loopBodyEnd = i;
        while (loopBodyEnd < lines.length) {
          const nextLine = lines[loopBodyEnd];
          const nextIndent = (nextLine.match(/^(\s*)/)?.[1] || '').length;
          if (nextLine.trim() && nextIndent <= indentLevel) {
            break;
          }
          loopBodyEnd++;
        }
        
        // Execute loop iterations (simplified - execute body once per iteration)
        for (let val = start; val < end; val += step) {
          variables[varName] = val;
          
          // Process loop body lines
          let bodyIndex = loopStart + 1;
          while (bodyIndex < loopBodyEnd) {
            const bodyLine = lines[bodyIndex];
            const bodyTrimmed = bodyLine.trim();
            
            if (bodyTrimmed) {
              // Process assignments in loop
              const bodyAssignMatch = bodyTrimmed.match(/^(\w+)\s*=\s*(.+)$/);
              if (bodyAssignMatch) {
                const bodyVarName = bodyAssignMatch[1];
                const bodyExpr = bodyAssignMatch[2];
                const bodyValue = evaluateExpression(bodyExpr, variables);
                if (bodyValue !== undefined) {
                  variables[bodyVarName] = bodyValue;
                }
              }
              
              // Process if statements in loop
              const bodyIfMatch = bodyTrimmed.match(/^if\s+(.+)\s*:/);
              if (bodyIfMatch) {
                const bodyCondition = bodyIfMatch[1].trim();
                let bodyConditionResult = false;
                try {
                  let evalCondition = bodyCondition;
                  Object.keys(variables).forEach(v => {
                    const regex = new RegExp(`\\b${v}\\b`, 'g');
                    evalCondition = evalCondition.replace(regex, String(variables[v]));
                  });
                  if (/^[0-9+\-*/().<>=!\s]+$/.test(evalCondition)) {
                    bodyConditionResult = eval(evalCondition);
                  }
                } catch (e) {
                  // Ignore
                }
                
                if (bodyConditionResult) {
                  // Process return in if
                  const nextBodyLine = bodyIndex + 1 < lines.length ? lines[bodyIndex + 1].trim() : '';
                  const returnMatch = nextBodyLine.match(/^return\s+(.+)$/);
                  if (returnMatch) {
                    const returnExpr = returnMatch[1].trim();
                    const returnValue = evaluateExpression(returnExpr, variables);
                    tracer.addStep(
                      bodyIndex + 2,
                      { ...variables },
                      undefined,
                      `Return ${returnValue !== undefined ? returnValue : returnExpr}`,
                      lines[bodyIndex + 1]
                    );
                    // Break out of loop
                    val = end;
                    break;
                  }
                }
              }
            }
            
            bodyIndex++;
          }
          
          tracer.addStep(
            loopStart + 1,
            { ...variables },
            `for ${varName} in range(${start}, ${end})`,
            `Iteration: ${varName} = ${val}`,
            line
          );
        }
        
        // Skip to end of loop
        i = loopBodyEnd;
        continue;
      } else if (forInMatch) {
        // Handle for item in list:
        const varName = forInMatch[1];
        const listName = forInMatch[2];
        const listValue = variables[listName];
        
        if (Array.isArray(listValue)) {
          let indentLevel = (line.match(/^(\s*)/)?.[1] || '').length;
          const loopStart = i;
          i++;
          
          // Find end of loop body
          let loopBodyEnd = i;
          while (loopBodyEnd < lines.length) {
            const nextLine = lines[loopBodyEnd];
            const nextIndent = (nextLine.match(/^(\s*)/)?.[1] || '').length;
            if (nextLine.trim() && nextIndent <= indentLevel) {
              break;
            }
            loopBodyEnd++;
          }
          
          // Execute for each item in list
          for (let idx = 0; idx < listValue.length; idx++) {
            variables[varName] = listValue[idx];
            variables[`${varName}_index`] = idx; // Track index
            
            // Process loop body (simplified)
            let bodyIndex = loopStart + 1;
            while (bodyIndex < loopBodyEnd) {
              const bodyLine = lines[bodyIndex];
              const bodyTrimmed = bodyLine.trim();
              
              if (bodyTrimmed) {
                const bodyAssignMatch = bodyTrimmed.match(/^(\w+)\s*=\s*(.+)$/);
                if (bodyAssignMatch) {
                  const bodyVarName = bodyAssignMatch[1];
                  const bodyExpr = bodyAssignMatch[2];
                  const bodyValue = evaluateExpression(bodyExpr, variables);
                  if (bodyValue !== undefined) {
                    variables[bodyVarName] = bodyValue;
                  }
                }
                
                // Check for return statement
                const returnMatch = bodyTrimmed.match(/^return\s+(.+)$/);
                if (returnMatch) {
                  const returnExpr = returnMatch[1].trim();
                  const returnValue = evaluateExpression(returnExpr, variables);
                  tracer.addStep(
                    bodyIndex + 1,
                    { ...variables },
                    undefined,
                    `Return ${returnValue !== undefined ? returnValue : returnExpr}`,
                    bodyLine
                  );
                  // Break out of loop
                  idx = listValue.length;
                  break;
                }
              }
              bodyIndex++;
            }
            
            tracer.addStep(
              loopStart + 1,
              { ...variables },
              `for ${varName} in ${listName}`,
              `Iteration: ${varName} = ${listValue[idx]}, index = ${idx}`,
              line
            );
          }
          
          i = loopBodyEnd;
          continue;
        }
      }
      
      // Detect if statements: if condition:
      const ifMatch = trimmed.match(/^if\s+(.+)\s*:/);
      if (ifMatch) {
        const condition = ifMatch[1].trim();
        // Simple condition evaluation
        let conditionResult = false;
        try {
          // Replace variables in condition
          let evalCondition = condition;
          Object.keys(variables).forEach(varName => {
            const regex = new RegExp(`\\b${varName}\\b`, 'g');
            evalCondition = evalCondition.replace(regex, String(variables[varName]));
          });
          
          // Evaluate condition
          if (/^[0-9+\-*/().<>=!\s]+$/.test(evalCondition)) {
            conditionResult = eval(evalCondition);
          }
        } catch (e) {
          // Condition evaluation failed
        }
        
        if (!conditionResult) {
          // Skip if block
          let indentLevel = (line.match(/^(\s*)/)?.[1] || '').length;
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            const nextIndent = (nextLine.match(/^(\s*)/)?.[1] || '').length;
            if (nextLine.trim() && nextIndent <= indentLevel && !nextLine.trim().startsWith('elif') && !nextLine.trim().startsWith('else')) {
              break;
            }
            i++;
          }
          continue;
        }
        
        tracer.addStep(
          i + 1,
          { ...variables },
          `if ${condition}`,
          `Condition true`,
          line
        );
        i++;
        continue;
      }
      
      // Detect return statements: return value
      const returnMatch = trimmed.match(/^return\s+(.+)$/);
      if (returnMatch) {
        const returnExpr = returnMatch[1].trim();
        const returnValue = evaluateExpression(returnExpr, variables);
        tracer.addStep(
          i + 1,
          { ...variables },
          undefined,
          `Return ${returnValue !== undefined ? returnValue : returnExpr}`,
          line
        );
        i++;
        continue;
      }
      
      // Detect print statements: print(value) or print(value1, value2)
      const printMatch = trimmed.match(/^print\s*\(([^)]+)\)/);
      if (printMatch) {
        const printArgs = printMatch[1];
        const printParts: string[] = [];
        
        // Split by comma, handling strings
        const parts = printArgs.split(',').map(p => p.trim());
        for (const part of parts) {
          // Check if it's a variable
          if (variables.hasOwnProperty(part)) {
            printParts.push(String(variables[part]));
          } else if (part.startsWith('"') || part.startsWith("'")) {
            // String literal
            printParts.push(part.slice(1, -1));
          } else {
            // Try to evaluate
            const evalValue = evaluateExpression(part, variables);
            if (evalValue !== undefined) {
              printParts.push(String(evalValue));
            } else {
              printParts.push(part);
            }
          }
        }
        
        const outputText = printParts.join(' ');
        output.push(outputText);
        tracer.addOutput(outputText);
        tracer.addStep(
          i + 1,
          { ...variables },
          undefined,
          `Print: ${outputText}`,
          line
        );
        i++;
        continue;
      }
      
      // Default: move to next line
      i++;
    }

    // Ensure at least one trace step
    if (tracer.getTrace().length === 0) {
      tracer.addStep(1, { ...variables }, undefined, 'Code analyzed', lines[0] || '');
    }

    return {
      success: true,
      output,
      trace: tracer.getTrace(),
      executionTime: Date.now() - startTime,
    };
  } catch (e: any) {
    error = e.message || 'Execution error';
    return {
      success: false,
      output,
      trace: tracer.getTrace(),
      error,
      executionTime: Date.now() - startTime,
    };
  }
}

