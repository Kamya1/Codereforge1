'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { useChallengeStore } from '@/store/useChallengeStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';

export function SuggestedFixView() {
  const {
    challenge,
    executionResult,
    fixedCode,
    suggestedFix,
    setSuggestedFix,
  } = useChallengeStore();
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetSuggestion = async () => {
    if (!challenge || !executionResult) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/suggest-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge,
          originalCode: challenge.code,
          executionResult,
          userFixedCode: fixedCode,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error,
        });
        return;
      }

      setSuggestedFix(data.suggestedFix);
    } catch (error: any) {
      console.error('Error fetching suggested fix:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get suggested fix. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!challenge || !executionResult) return null;

  const language = challenge.language || 'cpp';
  const monacoLanguage = language === 'cpp' ? 'cpp' : language;

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
            5
          </span>
          Step 5: Suggest Fix
        </CardTitle>
        <CardDescription>
          Get the correct version of the code by comparing what was wrong in the previous code and how it should be corrected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestedFix && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to get AI-powered suggestions for the correct fix. This will show you:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>The correct version of the code</li>
              <li>What was wrong in the original code</li>
              <li>How it should be corrected</li>
              <li>Key learning points</li>
            </ul>
            <Button
              onClick={handleGetSuggestion}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Get Suggested Fix
                </>
              )}
            </Button>
          </div>
        )}

        {suggestedFix && (
          <div className="space-y-4">
            {/* Explanation */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{suggestedFix.explanation}</p>
              </CardContent>
            </Card>

            {/* Changes List */}
            {suggestedFix.changes && suggestedFix.changes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Line-by-Line Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {suggestedFix.changes.map((change, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-background">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            Line {change.line}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-red-600 dark:text-red-400 font-medium">Original:</span>
                            <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded font-mono text-xs overflow-x-auto">
                              {change.original}
                            </pre>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Corrected:</span>
                            <pre className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded font-mono text-xs overflow-x-auto">
                              {change.corrected}
                            </pre>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Reason:</strong> {change.reason}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Correct Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Corrected Code
                </CardTitle>
                <CardDescription>
                  This is the correct version of the code with the bug fixed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    height="400px"
                    defaultLanguage={monacoLanguage}
                    language={monacoLanguage}
                    value={suggestedFix.correctCode}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Validation Results */}
            {suggestedFix.validation && (
              <Card className={suggestedFix.validation.testsPassed && suggestedFix.validation.executionSuccess 
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${suggestedFix.validation.testsPassed && suggestedFix.validation.executionSuccess ? 'text-green-600' : 'text-yellow-600'}`} />
                    Validation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Test Results */}
                  {suggestedFix.validation.testResults && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Test Cases: {suggestedFix.validation.testResults.passedTests} / {suggestedFix.validation.testResults.totalTests} passed
                      </p>
                      {suggestedFix.validation.testResults.failedTests.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">Failed Tests:</p>
                          {suggestedFix.validation.testResults.failedTests.map((failed, idx) => (
                            <div key={idx} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                              <p><strong>Expected:</strong> {failed.expectedOutput}</p>
                              <p><strong>Actual:</strong> {failed.actualOutput || 'No output'}</p>
                              {failed.error && <p className="text-red-600 dark:text-red-400"><strong>Error:</strong> {failed.error}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Execution Status */}
                  <div>
                    <p className={`text-sm ${suggestedFix.validation.executionSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Execution: {suggestedFix.validation.executionSuccess ? '✓ Success' : '✗ Failed'}
                    </p>
                    {suggestedFix.validation.executionError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{suggestedFix.validation.executionError}</p>
                    )}
                  </div>
                  
                  {/* Static Analysis */}
                  {suggestedFix.validation.staticAnalysis && (
                    <div>
                      <p className={`text-sm ${suggestedFix.validation.staticAnalysis.passed ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        Static Analysis: {suggestedFix.validation.staticAnalysis.passed ? '✓ Passed' : `⚠ ${suggestedFix.validation.staticAnalysis.errorsCount} errors, ${suggestedFix.validation.staticAnalysis.warnings} warnings`}
                      </p>
                      {suggestedFix.validation.staticAnalysis.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {suggestedFix.validation.staticAnalysis.errors.slice(0, 3).map((error, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              {error.line ? `Line ${error.line}: ` : ''}{error.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Overall Status */}
                  {suggestedFix.validation.testsPassed && suggestedFix.validation.executionSuccess && (
                    <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 rounded">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✓ Fix validated: All tests passed and code executes successfully!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Key Points */}
            {suggestedFix.keyPoints && suggestedFix.keyPoints.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                    Key Learning Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {suggestedFix.keyPoints.map((point, idx) => (
                      <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

