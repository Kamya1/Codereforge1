import type { TraceStep, StackFrame, ExecutionResult, VariableChange } from '@/types';

export class CodeTracer {
  private steps: TraceStep[] = [];
  private currentVariables: Record<string, any> = {};
  private previousVariables: Record<string, any> = {};
  private stack: StackFrame[] = [];
  private output: string[] = [];
  private lineNumber: number = 0;
  private codeLines: string[] = [];

  constructor(codeLines?: string[]) {
    this.codeLines = codeLines || [];
    this.reset();
  }

  reset() {
    this.steps = [];
    this.currentVariables = {};
    this.previousVariables = {};
    this.stack = [];
    this.output = [];
    this.lineNumber = 0;
  }

  setCodeLines(lines: string[]) {
    this.codeLines = lines;
  }

  private getVariableChanges(): VariableChange[] {
    const changes: VariableChange[] = [];
    const allVarNames = new Set([
      ...Object.keys(this.previousVariables),
      ...Object.keys(this.currentVariables),
    ]);

    for (const varName of allVarNames) {
      const prevValue = this.previousVariables[varName];
      const currValue = this.currentVariables[varName];

      if (prevValue === undefined && currValue !== undefined) {
        changes.push({
          name: varName,
          previousValue: undefined,
          currentValue: currValue,
          type: 'created',
        });
      } else if (prevValue !== undefined && currValue === undefined) {
        changes.push({
          name: varName,
          previousValue: prevValue,
          currentValue: undefined,
          type: 'deleted',
        });
      } else if (prevValue !== currValue) {
        changes.push({
          name: varName,
          previousValue: prevValue,
          currentValue: currValue,
          type: 'updated',
        });
      }
    }

    return changes;
  }

  addStep(
    line: number, 
    variables: Record<string, any>, 
    condition?: string, 
    explanation?: string,
    codeLine?: string
  ) {
    this.previousVariables = { ...this.currentVariables };
    this.lineNumber = line;
    this.currentVariables = { ...variables };
    
    const variableChanges = this.getVariableChanges();
    const actualCodeLine = codeLine || (line > 0 && line <= this.codeLines.length ? this.codeLines[line - 1] : undefined);
    
    const step: TraceStep = {
      step: this.steps.length + 1,
      line,
      codeLine: actualCodeLine,
      variables: { ...this.currentVariables },
      variableChanges: variableChanges.length > 0 ? variableChanges : undefined,
      stack: [...this.stack],
      output: [...this.output],
      condition,
      explanation,
    };
    
    this.steps.push(step);
  }

  pushStackFrame(functionName: string, variables: Record<string, any>, line: number) {
    this.stack.push({
      functionName,
      variables: { ...variables },
      line,
    });
  }

  popStackFrame() {
    return this.stack.pop();
  }

  addOutput(value: string) {
    this.output.push(value);
  }

  getTrace(): TraceStep[] {
    return this.steps;
  }

  getCurrentStep(): TraceStep | null {
    return this.steps[this.steps.length - 1] || null;
  }
}

// C++ execution tracer (simulated)
// Since we can't execute C++ in the browser, we use static analysis to simulate execution
export async function executeCpp(code: string, input?: string): Promise<ExecutionResult> {
  const lines = code.split('\n');
  const tracer = new CodeTracer(lines);
  const output: string[] = [];
  let error: string | undefined;
  const startTime = Date.now();

  // Parse input into tokens for cin simulation
  // Split by whitespace (spaces, tabs, newlines) to handle multiple values per line
  const inputTokens = input ? input.trim().split(/\s+/).filter(token => token.length > 0) : [];
  let inputIndex = 0;

  // Helper function to evaluate arithmetic expressions
  const evaluateExpression = (expr: string, vars: Record<string, any>): number | undefined => {
    try {
      // Replace variable names with their values
      let evalExpr = expr;
      Object.keys(vars).forEach(varName => {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        evalExpr = evalExpr.replace(regex, String(vars[varName]));
      });
      
      // Evaluate the expression (safe evaluation)
      // Only allow numbers, operators, parentheses, and spaces
      if (/^[0-9+\-*/().\s]+$/.test(evalExpr)) {
        return eval(evalExpr);
      }
    } catch (e) {
      return undefined;
    }
    return undefined;
  };

  try {
    const variables: Record<string, any> = {};
    let i = 0;
    const maxIterations = 1000; // Prevent infinite loops
    let iterations = 0;
    
    // Simple C++ static analysis with loop simulation
    while (i < lines.length && iterations < maxIterations) {
      iterations++;
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#include') || trimmed.startsWith('using')) {
        i++;
        continue;
      }
      
      // Detect cin statements: cin >> x; or cin >> x >> y;
      const cinMatch = trimmed.match(/cin\s*>>\s*(\w+)(?:\s*>>\s*(\w+))?;/);
      if (cinMatch) {
        const varName1 = cinMatch[1];
        const varName2 = cinMatch[2];
        
        if (inputIndex < inputTokens.length) {
          // Handle first variable
          const inputValue1 = inputTokens[inputIndex];
          const numValue1 = parseFloat(inputValue1);
          variables[varName1] = isNaN(numValue1) ? inputValue1 : (numValue1 % 1 === 0 ? parseInt(inputValue1, 10) : numValue1);
          inputIndex++;
          
          // Handle second variable if present
          if (varName2 && inputIndex < inputTokens.length) {
            const inputValue2 = inputTokens[inputIndex];
            const numValue2 = parseFloat(inputValue2);
            variables[varName2] = isNaN(numValue2) ? inputValue2 : (numValue2 % 1 === 0 ? parseInt(inputValue2, 10) : numValue2);
            inputIndex++;
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Read input into ${varName1} = ${variables[varName1]}, ${varName2} = ${variables[varName2]}`,
              line
            );
          } else {
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Read input into ${varName1} = ${variables[varName1]}`,
              line
            );
          }
        } else {
          error = `Runtime error: No input available for cin >> ${varName1}`;
          break;
        }
        i++;
        continue;
      }

      // Detect variable declarations: int x = 5; or int x = (y-x)/2;
      const intVarMatch = trimmed.match(/int\s+(\w+)\s*=\s*(.+?);/);
      if (intVarMatch) {
        const varName = intVarMatch[1];
        const expr = intVarMatch[2].trim();
        const value = evaluateExpression(expr, variables);
        if (value !== undefined) {
          variables[varName] = Math.floor(value); // Integer division
          tracer.addStep(
            i + 1,
            { ...variables },
            undefined,
            `Variable ${varName} initialized to ${variables[varName]}`,
            line
          );
        } else {
          // If can't evaluate, try simple number parsing
          const numValue = parseFloat(expr);
          if (!isNaN(numValue)) {
            variables[varName] = numValue % 1 === 0 ? parseInt(expr, 10) : numValue;
            tracer.addStep(
              i + 1,
              { ...variables },
              undefined,
              `Variable ${varName} initialized to ${variables[varName]}`,
              line
            );
          }
        }
        i++;
        continue;
      }
      
      // Detect variable assignments: x = 10; or a = b - x + 1;
      const assignMatch = trimmed.match(/(\w+)\s*=\s*(.+?);/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const expr = assignMatch[2].trim();
        const value = evaluateExpression(expr, variables);
        if (value !== undefined) {
          variables[varName] = Math.floor(value); // Integer division for C++
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
          }
        }
        i++;
        continue;
      }
      
      // Detect increment: x++;
      const incMatch = trimmed.match(/(\w+)\s*\+\+;/);
      if (incMatch && variables.hasOwnProperty(incMatch[1])) {
        const varName = incMatch[1];
        variables[varName] = (variables[varName] || 0) + 1;
        tracer.addStep(
          i + 1,
          { ...variables },
          undefined,
          `Variable ${varName} incremented to ${variables[varName]}`,
          line
        );
        i++;
        continue;
      }
      
      // Detect addition assignment: sum += i;
      const addAssignMatch = trimmed.match(/(\w+)\s*\+=\s*(\w+);/);
      if (addAssignMatch && variables.hasOwnProperty(addAssignMatch[1]) && variables.hasOwnProperty(addAssignMatch[2])) {
        const varName = addAssignMatch[1];
        const addVar = addAssignMatch[2];
        variables[varName] = (variables[varName] || 0) + (variables[addVar] || 0);
        tracer.addStep(
          i + 1,
          { ...variables },
          undefined,
          `Variable ${varName} += ${addVar}, now ${variables[varName]}`,
          line
        );
        i++;
        continue;
      }
      
      // Detect while loops: while (t--) { or while (i < 5) {
      const whileMatch = trimmed.match(/while\s*\(([^)]+)\)\s*\{/);
      if (whileMatch) {
        const conditionStr = whileMatch[1].trim();
        
        // Handle while(t--) pattern - decrement happens before condition check
        if (conditionStr.match(/^\w+--$/)) {
          const varName = conditionStr.replace('--', '');
          const currentValue = variables[varName] || 0;
          
          // Decrement first, then check if it was > 0 before decrement
          if (currentValue > 0) {
            variables[varName] = currentValue - 1;
            tracer.addStep(
              i + 1,
              { ...variables },
              `while (${varName}--)`,
              `Loop condition true (was ${currentValue}), ${varName} decremented to ${variables[varName]}`,
              line
            );
            i++;
            continue;
          } else {
            // Variable was 0 or less, condition is false, skip loop body
            let braceCount = 1;
            i++;
            while (i < lines.length && braceCount > 0) {
              const nextLine = lines[i].trim();
              if (nextLine.includes('{')) braceCount++;
              if (nextLine.includes('}')) braceCount--;
              i++;
            }
            continue;
          }
        }
        
        // Handle while (var op num) pattern
        const simpleWhileMatch = conditionStr.match(/^\s*(\w+)\s*(<|<=|>|>=|!=|==)\s*(\d+)\s*$/);
        if (simpleWhileMatch) {
          const varName = simpleWhileMatch[1];
          const op = simpleWhileMatch[2];
          const limit = parseInt(simpleWhileMatch[3], 10);
          const currentValue = variables[varName] || 0;
          
          let condition = false;
          if (op === '<') condition = currentValue < limit;
          else if (op === '<=') condition = currentValue <= limit;
          else if (op === '>') condition = currentValue > limit;
          else if (op === '>=') condition = currentValue >= limit;
          else if (op === '!=') condition = currentValue !== limit;
          else if (op === '==') condition = currentValue === limit;
          
          if (!condition) {
            // Skip to closing brace
            let braceCount = 1;
            i++;
            while (i < lines.length && braceCount > 0) {
              const nextLine = lines[i].trim();
              if (nextLine.includes('{')) braceCount++;
              if (nextLine.includes('}')) braceCount--;
              i++;
            }
            continue;
          }
          
          tracer.addStep(
            i + 1,
            { ...variables },
            `while (${varName} ${op} ${limit})`,
            `Loop condition true, ${varName} = ${currentValue}`,
            line
          );
          i++;
          continue;
        }
      }
      
      // Detect closing brace - check if we need to loop back
      if (trimmed === '}') {
        // Find the matching while loop
        let j = i - 1;
        let braceCount = 1;
        while (j >= 0 && braceCount > 0) {
          const prevLine = lines[j].trim();
          if (prevLine.includes('}')) braceCount++;
          if (prevLine.includes('{')) braceCount--;
          if (braceCount === 0 && prevLine.includes('while')) {
            // Check loop condition again
            const whileMatch = prevLine.match(/while\s*\(([^)]+)\)/);
            if (whileMatch) {
              const conditionStr = whileMatch[1].trim();
              
              // Handle while(t--)
              if (conditionStr.match(/^\w+--$/)) {
                const varName = conditionStr.replace('--', '');
                const currentValue = variables[varName] || 0;
                if (currentValue > 0) {
                  i = j;
                  continue;
                }
              } else {
                // Handle while (var op num)
                const simpleWhileMatch = conditionStr.match(/^\s*(\w+)\s*(<|<=|>|>=|!=|==)\s*(\d+)\s*$/);
                if (simpleWhileMatch) {
                  const varName = simpleWhileMatch[1];
                  const op = simpleWhileMatch[2];
                  const limit = parseInt(simpleWhileMatch[3], 10);
                  const currentValue = variables[varName] || 0;
                  
                  let condition = false;
                  if (op === '<') condition = currentValue < limit;
                  else if (op === '<=') condition = currentValue <= limit;
                  else if (op === '>') condition = currentValue > limit;
                  else if (op === '>=') condition = currentValue >= limit;
                  else if (op === '!=') condition = currentValue !== limit;
                  else if (op === '==') condition = currentValue === limit;
                  
                  if (condition) {
                    i = j;
                    continue;
                  }
                }
              }
            }
          }
          j--;
        }
        i++;
        continue;
      }
      
      // Detect cout statements: cout << a << " " << b << endl;
      if (trimmed.includes('cout')) {
        const coutMatch = trimmed.match(/cout\s*<<\s*([^;]+);/);
        if (coutMatch) {
          let outputParts: string[] = [];
          const coutContent = coutMatch[1];
          
          // Split by << and process each part
          const parts = coutContent.split('<<').map(p => p.trim());
          
          for (const part of parts) {
            // Check if it's a variable
            const varMatch = part.match(/^\w+$/);
            if (varMatch && variables.hasOwnProperty(part)) {
              outputParts.push(String(variables[part]));
            } else if (part.match(/^["']/)) {
              // String literal - remove quotes
              outputParts.push(part.replace(/^["']|["']$/g, ''));
            } else if (part === 'endl' || part === '\\n') {
              // Skip endl, we'll join with space
            } else {
              // Try to evaluate as expression
              const evalValue = evaluateExpression(part, variables);
              if (evalValue !== undefined) {
                outputParts.push(String(evalValue));
              } else if (variables.hasOwnProperty(part)) {
                outputParts.push(String(variables[part]));
              }
            }
          }
          
          const outputText = outputParts.join(' ');
          output.push(outputText);
          tracer.addOutput(outputText);
          tracer.addStep(
            i + 1,
            { ...variables },
            undefined,
            `Output: ${outputText}`,
            line
          );
        }
        i++;
        continue;
      }
      
      // Detect function calls: result = factorial(5);
      const funcCallMatch = trimmed.match(/(\w+)\s*=\s*(\w+)\s*\((\d+)\);/);
      if (funcCallMatch) {
        const resultVar = funcCallMatch[1];
        const funcName = funcCallMatch[2];
        const arg = parseInt(funcCallMatch[3], 10);
        
        // Simple factorial simulation
        if (funcName === 'factorial') {
          let fact = 1;
          for (let j = 1; j <= arg; j++) {
            fact *= j;
          }
          variables[resultVar] = fact;
          tracer.addStep(
            i + 1,
            { ...variables },
            undefined,
            `Function ${funcName}(${arg}) called, result = ${fact}`,
            line
          );
        }
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

// JavaScript execution tracer
// This uses a combination of execution and static analysis to create trace steps
export async function executeJavaScript(code: string, input?: string): Promise<ExecutionResult> {
  const lines = code.split('\n');
  const tracer = new CodeTracer(lines);
  const output: string[] = [];
  let error: string | undefined;
  const startTime = Date.now();

  try {
    // Parse input into lines for readline simulation
    const inputLines = input ? input.trim().split('\n').map(line => line.trim()) : [];
    let inputIndex = 0;

    // Create a sandboxed execution environment
    const capturedOutput: string[] = [];
    const capturedLog = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      capturedOutput.push(message);
      output.push(message);
    };

    // Track variables by executing in a controlled environment
    const variableStore: Record<string, any> = {};
    const tracePoints: Array<{ line: number; vars: Record<string, any>; explanation: string }> = [];
    
    // Create a function that captures variable state
    const captureState = (lineNum: number, explanation: string) => {
      tracePoints.push({
        line: lineNum,
        vars: JSON.parse(JSON.stringify(variableStore)), // Deep copy
        explanation,
      });
    };

    // Create input reading function
    const readInput = () => {
      if (inputIndex < inputLines.length) {
        const value = inputLines[inputIndex];
        inputIndex++;
        return value;
      }
      return '';
    };

    // Wrap code to instrument it
    const lines = code.split('\n');
    const instrumentedCode = lines.map((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('//')) return line;
      
      // Handle readline/prompt/input - replace with our input function
      if (trimmed.includes('readline()') || trimmed.includes('prompt(') || trimmed.match(/readline\s*\(/)) {
        const inputMatch = trimmed.match(/(\w+)\s*=\s*(?:readline\(\)|prompt\(\))/);
        if (inputMatch) {
          const varName = inputMatch[1];
          return `const ${varName} = _readInput();\n; _captureState(${lineNum}, "Line ${lineNum}: Read input into ${varName}");`;
        }
      }
      
      // Instrument variable assignments
      if (/^(let|const|var)\s+\w+\s*=/.test(trimmed)) {
        const varName = trimmed.match(/^(let|const|var)\s+(\w+)/)?.[2];
        if (varName) {
          return `${line}\n; _captureState(${lineNum}, "Line ${lineNum}: Variable ${varName} assigned");`;
        }
      }
      
      // Instrument console.log
      if (trimmed.includes('console.log')) {
        return `${line}\n; _captureState(${lineNum}, "Line ${lineNum}: Output logged");`;
      }
      
      // Instrument function calls (simple detection)
      if (trimmed.match(/^\w+\s*\(/) && !trimmed.includes('function') && !trimmed.includes('console')) {
        return `${line}\n; _captureState(${lineNum}, "Line ${lineNum}: Function called");`;
      }
      
      return line;
    }).join('\n');

    // Create execution context
    const wrappedCode = `
      (function(_capturedLog, _captureState, _vars, _readInput) {
        // Override console.log
        console.log = function(...args) {
          _capturedLog(...args);
        };
        
        // Execute instrumented code
        ${instrumentedCode}
        
        // Capture final state
        _captureState(${lines.length}, "Final state");
        
        return _vars;
      })
    `;

    // Execute with state capture
    const func = eval(wrappedCode);
    func(
      capturedLog,
      (lineNum: number, explanation: string) => captureState(lineNum, explanation),
      variableStore,
      readInput
    );

    // Convert trace points to trace steps
    tracePoints.forEach((point) => {
      const codeLine = point.line > 0 && point.line <= lines.length ? lines[point.line - 1] : undefined;
      tracer.addStep(point.line, point.vars, undefined, point.explanation, codeLine);
    });

    // If no trace steps, analyze code statically as fallback
    if (tracer.getTrace().length === 0) {
      const vars: Record<string, any> = {};
      
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;
        
        const lineNum = idx + 1;
        
        // Try to extract variable assignments
        const varMatch = trimmed.match(/^(let|const|var)\s+(\w+)\s*=\s*(.+?);?$/);
        if (varMatch) {
          try {
            const varName = varMatch[2];
            const valueStr = varMatch[3].trim();
            
            // Simple value parsing
            let value: any;
            if (valueStr === 'true') value = true;
            else if (valueStr === 'false') value = false;
            else if (valueStr === 'null') value = null;
            else if (/^\d+$/.test(valueStr)) value = parseInt(valueStr, 10);
            else if (/^\d+\.\d+$/.test(valueStr)) value = parseFloat(valueStr);
            else if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || 
                     (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
              value = valueStr.slice(1, -1);
            } else if (valueStr.startsWith('[')) {
              value = [];
            } else if (valueStr.startsWith('{')) {
              value = {};
            } else {
              // Try to evaluate
              try {
                value = eval(valueStr);
              } catch {
                value = undefined;
              }
            }
            
            vars[varName] = value;
            tracer.addStep(
              lineNum,
              { ...vars },
              undefined,
              `Variable ${varName} = ${JSON.stringify(value)}`,
              line
            );
          } catch (e) {
            // Skip
          }
        }
        
        // Detect console.log
        if (trimmed.includes('console.log')) {
          tracer.addStep(
            lineNum,
            { ...vars },
            undefined,
            `Output logged`,
            line
          );
        }
      });
    }

    // Ensure at least one trace step
    if (tracer.getTrace().length === 0) {
      tracer.addStep(1, {}, undefined, 'Code executed', lines[0] || '');
    }

    return {
      success: true,
      output,
      trace: tracer.getTrace(),
      executionTime: Date.now() - startTime,
    };
  } catch (e: any) {
    error = e.message || 'Execution error';
    
    // Return trace even on error
    return {
      success: false,
      output,
      trace: tracer.getTrace(),
      error,
      executionTime: Date.now() - startTime,
    };
  }
}

// Compare user prediction with actual execution
// Export Python executor (defined in separate file to avoid circular dependencies)
export { executePython } from './python-tracer';

export function findDiscrepancies(
  userTrace: TraceStep[],
  actualTrace: TraceStep[]
): Array<{ step: number; userVariable: any; actualVariable: any; variableName: string; explanation: string }> {
  const discrepancies: Array<{ step: number; userVariable: any; actualVariable: any; variableName: string; explanation: string }> = [];
  
  const maxSteps = Math.max(userTrace.length, actualTrace.length);
  
  for (let i = 0; i < maxSteps; i++) {
    const userStep = userTrace[i];
    const actualStep = actualTrace[i];
    
    if (!userStep || !actualStep) continue;
    
    // Compare variables
    const allVars = new Set([
      ...Object.keys(userStep.variables || {}),
      ...Object.keys(actualStep.variables || {}),
    ]);
    
    for (const varName of allVars) {
      const userValue = userStep.variables?.[varName];
      const actualValue = actualStep.variables?.[varName];
      
      if (JSON.stringify(userValue) !== JSON.stringify(actualValue)) {
        discrepancies.push({
          step: i + 1,
          userVariable: userValue,
          actualVariable: actualValue,
          variableName: varName,
          explanation: `Variable ${varName} differs: you predicted ${JSON.stringify(userValue)}, but actual value is ${JSON.stringify(actualValue)}`,
        });
      }
    }
  }
  
  return discrepancies;
}

