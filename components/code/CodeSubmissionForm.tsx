'use client';

import { useState } from 'react';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Code, Bug, CheckCircle2 } from 'lucide-react';
import { useChallengeStore } from '@/store/useChallengeStore';
import type { Challenge } from '@/types';

export function CodeSubmissionForm() {
  const { setChallenge } = useChallengeStore();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'cpp' | 'javascript' | 'python' | 'typescript'>('cpp');
  const [problemStatement, setProblemStatement] = useState('');
  const [testCases, setTestCases] = useState<Array<{ input: string; expectedOutput: string; description?: string }>>([
    { input: '', expectedOutput: '' }
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    hasBug: boolean;
    description: string;
    concepts: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    bugDescription?: string;
  } | null>(null);

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '' }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: 'input' | 'expectedOutput' | 'description', value: string) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast({
        variant: 'warning',
        title: 'Code Required',
        description: 'Please paste your code before analyzing.',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          language, 
          problemStatement: problemStatement.trim() || undefined,
          testCases: testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim()).length > 0 
            ? testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim())
            : undefined
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: data.error,
        });
        return;
      }

      setAnalysisResult(data.analysis);
      
      toast({
        variant: data.analysis.hasBug ? 'warning' : 'success',
        title: data.analysis.hasBug ? 'Bug Detected!' : 'No Bugs Found',
        description: data.analysis.hasBug 
          ? 'AI found potential issues. You can debug step-by-step.'
          : 'Code looks good! You can trace through it to understand the logic.',
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Error',
        description: 'Failed to analyze code. Please try again.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartDebugging = () => {
    if (!code.trim() || !analysisResult) return;

    const validTestCases = testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim());

    const challenge: Challenge = {
      id: `user-${Date.now()}`,
      title: analysisResult.hasBug ? 'Your Code - Bug Detected' : 'Your Code - Trace & Understand',
      description: analysisResult.description,
      code,
      language,
      difficulty: analysisResult.difficulty,
      concepts: analysisResult.concepts,
      isUserSubmitted: true,
      hasBug: analysisResult.hasBug ? true : false, // Explicitly set to false if no bug
      bugDescription: analysisResult.bugDescription,
      problemStatement: problemStatement.trim() || undefined,
      testCases: validTestCases.length > 0 ? validTestCases.map(tc => ({
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim(),
        description: tc.description?.trim()
      })) : undefined,
    };

    setChallenge(challenge);
    
    toast({
      variant: 'success',
      title: 'Challenge Created!',
      description: analysisResult.hasBug 
        ? 'Start by predicting what the code does and tracing execution.'
        : 'Trace through your code to understand the logic step-by-step.',
    });
  };

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Debug Your Own Code
        </CardTitle>
        <CardDescription>
          Paste your code here. AI will analyze it to detect bugs and help you understand the logic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Problem Statement (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Problem Statement <span className="text-muted-foreground text-xs">(Optional - for contest problems)</span>
          </label>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="Paste the problem statement here... This helps AI understand what the code should do."
            className="w-full p-3 border border-input rounded-md min-h-[100px] bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
          </select>
        </div>

        {/* Code Editor */}
        <div>
          <label className="block text-sm font-medium mb-2">Your Code</label>
          <div className="border rounded-lg overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Paste your ${language} code here...`}
              className="w-full p-4 font-mono text-sm min-h-[300px] bg-background text-foreground placeholder:text-muted-foreground border-0 focus:outline-none resize-y"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Test Cases (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              Test Cases <span className="text-muted-foreground text-xs">(Optional - for contest problems)</span>
            </label>
            <Button
              type="button"
              onClick={addTestCase}
              variant="outline"
              size="sm"
            >
              + Add Test Case
            </Button>
          </div>
          <div className="space-y-2">
            {testCases.map((testCase, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Test Case {index + 1}</span>
                    {testCases.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeTestCase(index)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Input:</label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      placeholder="Test input (one line per input value, e.g., '5\n10' for two integers)"
                      className="w-full p-2 border border-input rounded text-xs font-mono mt-1 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: Each line represents one input value. For C++, use cin >> var; to read.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Expected Output:</label>
                    <textarea
                      value={testCase.expectedOutput}
                      onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                      placeholder="Expected output"
                      className="w-full p-2 border border-input rounded text-xs font-mono mt-1 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!code.trim() || isAnalyzing}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Code with AI...
            </>
          ) : (
            <>
              <Bug className="w-4 h-4 mr-2" />
              Analyze Code
            </>
          )}
        </Button>

        {/* Analysis Result */}
        {analysisResult && (
          <Card className={analysisResult.hasBug ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-green-500 bg-green-50/50 dark:bg-green-900/10'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {analysisResult.hasBug ? (
                  <>
                    <Bug className="w-5 h-5 text-yellow-600" />
                    Bug Detected
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    No Bugs Found
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Analysis:</p>
                <p className="text-sm text-muted-foreground">{analysisResult.description}</p>
              </div>

              {analysisResult.hasBug && analysisResult.bugDescription && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm font-medium mb-1 text-yellow-900 dark:text-yellow-100">Potential Bug:</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{analysisResult.bugDescription}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Concepts:</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.concepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Difficulty: <span className="capitalize">{analysisResult.difficulty}</span></p>
              </div>

              <Button
                onClick={handleStartDebugging}
                className="w-full mt-4"
                variant={analysisResult.hasBug ? 'default' : 'outline'}
              >
                {analysisResult.hasBug ? (
                  <>
                    <Bug className="w-4 h-4 mr-2" />
                    Start Debugging
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 mr-2" />
                    Trace Through Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

