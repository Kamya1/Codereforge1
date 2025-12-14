'use client';

import { analyzeComplexity } from '@/lib/analysis/complexity-analyzer';
import { useChallengeStore } from '@/store/useChallengeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ComplexityView() {
  const { challenge, fixedCode } = useChallengeStore();
  if (!challenge) return null;

  const code = fixedCode || challenge.code || '';
  const result = analyzeComplexity(code);

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
            4
          </span>
          Step 4: Time &amp; Space Complexity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><strong>Time Complexity:</strong> {result.time}</p>
        <p><strong>Space Complexity:</strong> {result.space}</p>
        <p><strong>Explanation:</strong> {result.explanation}</p>
      </CardContent>
    </Card>
  );
}

