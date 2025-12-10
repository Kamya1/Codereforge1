'use client';

import { useChallengeStore } from '@/store/useChallengeStore';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface CodeViewerProps {
  currentLine?: number;
  highlightLine?: number;
}

export function CodeViewer({ currentLine, highlightLine }: CodeViewerProps) {
  const { challenge } = useChallengeStore();

  if (!challenge) return null;

  const codeLines = challenge.code.split('\n');
  const lineToHighlight = highlightLine || currentLine;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <pre className="p-4 bg-card text-card-foreground font-mono text-sm overflow-x-auto border rounded-lg">
            <code>
              {codeLines.map((line, index) => {
                const lineNum = index + 1;
                const isHighlighted = lineNum === lineToHighlight;
                const isEmpty = line.trim() === '';

                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-4 px-2 py-1',
                      isHighlighted && 'bg-blue-600/30 dark:bg-blue-500/20 border-l-2 border-blue-500',
                      !isEmpty && isHighlighted && 'bg-blue-600/20 dark:bg-blue-500/10'
                    )}
                  >
                    <span
                      className={cn(
                        'text-right w-8 text-xs select-none',
                        isHighlighted ? 'text-blue-400 dark:text-blue-300 font-bold' : 'text-muted-foreground'
                      )}
                    >
                      {lineNum}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-foreground',
                        isEmpty && 'text-muted-foreground',
                        isHighlighted && 'text-foreground font-semibold'
                      )}
                    >
                      {line || ' '}
                    </span>
                    {isHighlighted && (
                      <span className="text-blue-400 dark:text-blue-300 text-xs">▶</span>
                    )}
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

