'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Activity, Code2 } from 'lucide-react';
import { useChallengeStore } from '@/store/useChallengeStore';
import { analyzeComplexity, formatComplexity } from '@/lib/analysis/complexity-analyzer';

export function PerformanceMetrics() {
  const { executionResult, challenge } = useChallengeStore();

  if (!challenge || !executionResult?.trace) {
    return null;
  }

  const metrics = analyzeComplexity(challenge.code, executionResult.trace);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Gauge className="w-4 h-4" />
              Time Complexity
            </p>
            <p className="text-lg font-semibold font-mono">{metrics.timeComplexity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Code2 className="w-4 h-4" />
              Space Complexity
            </p>
            <p className="text-lg font-semibold font-mono">{metrics.spaceComplexity}</p>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground mb-2">Complexity Metrics</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Cyclomatic Complexity:</span>
              <span className="font-mono">{metrics.cyclomaticComplexity}</span>
            </div>
            <div className="flex justify-between">
              <span>Lines of Code:</span>
              <span className="font-mono">{metrics.lineCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Operations:</span>
              <span className="font-mono">{metrics.operationCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Big-O:</span>
              <span className="font-mono font-semibold">{metrics.estimatedBigO}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

