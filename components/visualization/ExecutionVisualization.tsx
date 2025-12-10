'use client';

import { useChallengeStore } from '@/store/useChallengeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, Pause, StepForward, StepBack, AlertCircle } from 'lucide-react';
import { TraceTable } from '@/components/trace/TraceTable';
import { CodeViewer } from './CodeViewer';
import { VariableChanges } from './VariableChanges';
import { CodeFlowDiagram } from './CodeFlowDiagram';
import { useEffect, useState, useRef } from 'react';

export function ExecutionVisualization() {
  const { executionResult, currentStep, setCurrentStep, discrepancies, challenge } = useChallengeStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const currentStepRef = useRef(currentStep);

  // Keep ref in sync with currentStep
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Initialize currentStep to 1 when execution result is available
  useEffect(() => {
    if (executionResult && executionResult.trace && executionResult.trace.length > 0 && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [executionResult, currentStep, setCurrentStep]);

  useEffect(() => {
    if (!isPlaying || !executionResult?.trace || executionResult.trace.length === 0) return;

    const interval = setInterval(() => {
      const maxStep = executionResult.trace.length;
      if (currentStepRef.current >= maxStep) {
        setIsPlaying(false);
        return;
      }
      setCurrentStep(currentStepRef.current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, executionResult, setCurrentStep]);

  if (!executionResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution Result</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Execute the code to see the visualization</p>
        </CardContent>
      </Card>
    );
  }

  if (!executionResult.trace || executionResult.trace.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution Result</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No trace data available. The code executed but no trace steps were generated.</p>
          {executionResult.output && executionResult.output.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Output:</p>
              <pre className="text-xs bg-muted p-2 rounded">
                {executionResult.output.join('\n')}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const safeCurrentStep = Math.max(1, Math.min(currentStep || 1, executionResult.trace.length));
  const currentTraceStep = executionResult.trace[safeCurrentStep - 1] || executionResult.trace[0];
  const hasDiscrepancy = discrepancies.some(d => d.step === safeCurrentStep);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="execution" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="execution">Step-by-Step Execution</TabsTrigger>
          <TabsTrigger value="flow">Control Flow Diagram</TabsTrigger>
        </TabsList>
        
        <TabsContent value="execution" className="space-y-4">
          <Card className={hasDiscrepancy ? 'border-destructive' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Step-by-Step Execution
                {hasDiscrepancy && (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              variant="outline"
              size="sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.max(1, safeCurrentStep - 1))}
              variant="outline"
              size="sm"
              disabled={safeCurrentStep <= 1}
            >
              <StepBack className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.min(executionResult.trace.length, safeCurrentStep + 1))}
              variant="outline"
              size="sm"
              disabled={safeCurrentStep >= executionResult.trace.length}
            >
              <StepForward className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Step {safeCurrentStep} of {executionResult.trace.length}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-xs">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(safeCurrentStep / executionResult.trace.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {currentTraceStep && (
            <div className="space-y-4">
              {/* Code Viewer with Line Highlighting */}
              <CodeViewer highlightLine={currentTraceStep.line} />

              {/* Step Information */}
              <div className={`p-4 rounded-md border-2 ${
                hasDiscrepancy 
                  ? 'bg-destructive/10 border-destructive' 
                  : 'bg-muted border-muted'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">Step {currentTraceStep.step} - Line {currentTraceStep.line}</p>
                    {currentTraceStep.codeLine && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {currentTraceStep.codeLine.trim()}
                      </p>
                    )}
                  </div>
                  {hasDiscrepancy && (
                    <span className="text-xs text-destructive font-semibold">
                      ⚠ Discrepancy
                    </span>
                  )}
                </div>
                {currentTraceStep.explanation && (
                  <p className="text-sm text-muted-foreground mt-2">{currentTraceStep.explanation}</p>
                )}
                {currentTraceStep.condition && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    Condition: {currentTraceStep.condition}
                  </p>
                )}
              </div>

              {/* Variable Changes */}
              {currentTraceStep.variableChanges && currentTraceStep.variableChanges.length > 0 && (
                <VariableChanges changes={currentTraceStep.variableChanges} />
              )}

              {/* Current Variables State */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Current Variables:</p>
                  <pre className="text-xs bg-muted text-foreground p-3 rounded border overflow-x-auto max-h-48 overflow-y-auto font-mono">
                    {JSON.stringify(currentTraceStep.variables, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Output:</p>
                  <div className="text-xs bg-muted text-foreground p-3 rounded border min-h-[60px] max-h-48 overflow-y-auto font-mono">
                    {currentTraceStep.output.length > 0
                      ? currentTraceStep.output.map((out, idx) => (
                          <div key={idx} className="text-foreground">{out}</div>
                        ))
                      : <span className="text-muted-foreground">No output</span>}
                  </div>
                </div>
              </div>

              {hasDiscrepancy && (
                <div className="p-3 bg-destructive/10 rounded-md border border-destructive">
                  {discrepancies
                    .filter(d => d.step === safeCurrentStep)
                    .map((disc, idx) => (
                      <div key={idx} className="text-xs">
                        <p className="font-semibold text-destructive mb-1">
                          {disc.variableName}: Expected {JSON.stringify(disc.userVariable)}, Got {JSON.stringify(disc.actualVariable)}
                        </p>
                        <p className="text-muted-foreground">{disc.explanation}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TraceTable trace={executionResult.trace} />
        </TabsContent>
        
        <TabsContent value="flow">
          {challenge && (
            <CodeFlowDiagram 
              code={challenge.code} 
              language={challenge.language}
              currentLine={currentTraceStep?.line}
            />
          )}
        </TabsContent>
      </Tabs>

      {discrepancies.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Discrepancies Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {discrepancies.map((disc, idx) => (
                <div key={idx} className="p-3 bg-destructive/10 rounded-md">
                  <p className="text-sm font-medium">Step {disc.step}: {disc.variableName}</p>
                  <p className="text-xs text-muted-foreground">
                    You predicted: {JSON.stringify(disc.userVariable)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Actual value: {JSON.stringify(disc.actualVariable)}
                  </p>
                  <p className="text-xs mt-1">{disc.explanation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



