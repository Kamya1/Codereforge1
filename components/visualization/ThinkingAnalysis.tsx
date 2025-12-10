'use client';

import { useChallengeStore } from '@/store/useChallengeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, CheckCircle2, XCircle, AlertCircle, Lightbulb } from 'lucide-react';

export function ThinkingAnalysis() {
  const { thinkingAnalysis } = useChallengeStore();

  if (!thinkingAnalysis) {
    return null;
  }

  const qualityColors = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    needs_improvement: 'text-yellow-600',
    unclear: 'text-red-600',
  };

  const qualityIcons = {
    excellent: CheckCircle2,
    good: CheckCircle2,
    needs_improvement: AlertCircle,
    unclear: XCircle,
  };

  const QualityIcon = qualityIcons[thinkingAnalysis.reasoningQuality];

  return (
    <Card className="border-primary border-2 shadow-lg">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-6 h-6 text-primary" />
          🤖 AI Analysis of Your Thinking
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          This analysis was generated using AI when you submitted your prediction
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reasoning Quality */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <QualityIcon className={`w-5 h-5 ${qualityColors[thinkingAnalysis.reasoningQuality]}`} />
          <div>
            <p className="text-sm font-medium">Reasoning Quality</p>
            <p className={`text-sm capitalize ${qualityColors[thinkingAnalysis.reasoningQuality]}`}>
              {thinkingAnalysis.reasoningQuality.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Strengths */}
        {thinkingAnalysis.strengths && thinkingAnalysis.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {thinkingAnalysis.strengths.map((strength: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {thinkingAnalysis.weaknesses && thinkingAnalysis.weaknesses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              Areas for Improvement
            </h4>
            <ul className="space-y-1">
              {thinkingAnalysis.weaknesses.map((weakness: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-600 mt-1">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Misconceptions */}
        {thinkingAnalysis.misconceptions && thinkingAnalysis.misconceptions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Misconceptions
            </h4>
            <ul className="space-y-1">
              {thinkingAnalysis.misconceptions.map((misconception: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>{misconception}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {thinkingAnalysis.suggestions && thinkingAnalysis.suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {thinkingAnalysis.suggestions.map((suggestion: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Overall Assessment */}
        {thinkingAnalysis.overallAssessment && (
          <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
            <h4 className="text-sm font-semibold mb-2">Overall Assessment</h4>
            <p className="text-sm text-muted-foreground">{thinkingAnalysis.overallAssessment}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

