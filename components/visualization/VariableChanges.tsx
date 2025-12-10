'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, Edit, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { VariableChange } from '@/types';

interface VariableChangesProps {
  changes?: VariableChange[];
}

export function VariableChanges({ changes }: VariableChangesProps) {
  if (!changes || changes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="text-sm font-semibold mb-3 text-foreground">Variable Changes</h4>
        <div className="space-y-2">
          {changes.map((change, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2 p-2 rounded-md border',
                change.type === 'created' && 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
                change.type === 'updated' && 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
                change.type === 'deleted' && 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              )}
            >
              {change.type === 'created' && <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />}
              {change.type === 'updated' && <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              {change.type === 'deleted' && <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />}
              
              <span className="font-mono font-medium text-sm text-foreground">{change.name}</span>
              
              {change.type === 'updated' && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {JSON.stringify(change.previousValue)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-semibold">
                    {JSON.stringify(change.currentValue)}
                  </span>
                </>
              )}
              
              {change.type === 'created' && (
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                  = {JSON.stringify(change.currentValue)}
                </span>
              )}
              
              {change.type === 'deleted' && (
                <span className="text-xs text-muted-foreground line-through">
                  {JSON.stringify(change.previousValue)}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

