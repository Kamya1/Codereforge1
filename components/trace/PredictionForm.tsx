'use client';

import { useState } from 'react';
import { useChallengeStore } from '@/store/useChallengeStore';
import { Button } from '@/components/ui/button';
import type { Prediction, TraceStep } from '@/types';

export function PredictionForm() {
  const { challenge, setPrediction, submitPrediction, setThinkingAnalysis } = useChallengeStore();
  const [description, setDescription] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState({
    line: 1,
    variables: {} as Record<string, any>,
    output: [] as string[],
    explanation: '',
  });

  const addTraceStep = () => {
    if (Object.keys(currentStep.variables).length === 0 && currentStep.output.length === 0) {
      return; // Don't add empty steps
    }

    const newStep: TraceStep = {
      step: traceSteps.length + 1,
      line: currentStep.line,
      variables: { ...currentStep.variables },
      stack: [],
      output: [...currentStep.output],
      explanation: currentStep.explanation,
    };

    setTraceSteps([...traceSteps, newStep]);
    setCurrentStep({
      line: currentStep.line + 1,
      variables: {},
      output: [],
      explanation: '',
    });
  };

  const handleSubmit = async () => {
    const prediction: Prediction = {
      description,
      expectedOutput,
      traceSteps,
      submitted: false,
    };

    setPrediction(prediction);
    
    // Analyze user thinking with AI
    if (challenge) {
      setIsAnalyzing(true);
      try {
        const response = await fetch('/api/analyze-thinking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prediction,
            code: challenge.code,
            challengeDescription: challenge.description,
          }),
        });
        
        const data = await response.json();
        if (data.analysis) {
          setThinkingAnalysis(data.analysis);
        }
      } catch (error) {
        console.error('Error analyzing thinking:', error);
        // Continue even if analysis fails
      } finally {
        setIsAnalyzing(false);
      }
    }
    
    submitPrediction();
  };

  const addVariable = () => {
    const name = prompt('Variable name:');
    if (!name) return;
    const value = prompt('Variable value:');
    if (!value) return;
    
    try {
      const parsedValue = JSON.parse(value);
      setCurrentStep({
        ...currentStep,
        variables: { ...currentStep.variables, [name]: parsedValue },
      });
    } catch {
      setCurrentStep({
        ...currentStep,
        variables: { ...currentStep.variables, [name]: value },
      });
    }
  };

  const addOutput = () => {
    const output = prompt('Output value:');
    if (output) {
      setCurrentStep({
        ...currentStep,
        output: [...currentStep.output, output],
      });
    }
  };

  if (!challenge) return null;

  return (
    <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            What does this code do?
          </label>
          <textarea
            className="w-full p-2 border border-input rounded-md min-h-[80px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the code's purpose..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Expected Output
          </label>
          <textarea
            className="w-full p-2 border border-input rounded-md min-h-[60px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder="What output do you expect?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Manual Trace Steps
          </label>
          <div className="space-y-2 border border-border p-4 rounded-md bg-card">
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                className="w-20 p-1 border border-input rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Line"
                value={currentStep.line}
                onChange={(e) => setCurrentStep({ ...currentStep, line: parseInt(e.target.value) || 1 })}
              />
              <Button onClick={addVariable} variant="outline" size="sm">
                Add Variable
              </Button>
              <Button onClick={addOutput} variant="outline" size="sm">
                Add Output
              </Button>
              <Button onClick={addTraceStep} variant="outline" size="sm">
                Add Step
              </Button>
            </div>

            {Object.keys(currentStep.variables).length > 0 && (
              <div className="text-xs bg-muted text-foreground p-2 rounded">
                Variables: {JSON.stringify(currentStep.variables, null, 2)}
              </div>
            )}

            {currentStep.output.length > 0 && (
              <div className="text-xs bg-muted text-foreground p-2 rounded">
                Output: {currentStep.output.join(', ')}
              </div>
            )}

            <textarea
              className="w-full p-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Explanation for this step..."
              value={currentStep.explanation}
              onChange={(e) => setCurrentStep({ ...currentStep, explanation: e.target.value })}
            />
          </div>

          {traceSteps.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Your Trace Steps:</p>
              {traceSteps.map((step, idx) => (
                <div key={idx} className="text-xs bg-muted text-foreground p-2 rounded">
                  Step {step.step} (Line {step.line}): {JSON.stringify(step.variables)}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!description || !expectedOutput || isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>Analyzing Your Thinking with AI...</>
          ) : (
            <>Submit Prediction & Unlock Execution</>
          )}
        </Button>
        {isAnalyzing && (
          <p className="text-xs text-primary text-center animate-pulse">
            🤖 AI is analyzing your prediction... This will appear below once complete.
          </p>
        )}
        {(!description || !expectedOutput) && !isAnalyzing && (
          <p className="text-xs text-muted-foreground text-center">
            Please fill in description and expected output to submit
          </p>
        )}
    </div>
  );
}

