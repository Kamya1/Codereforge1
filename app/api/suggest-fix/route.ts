import { NextRequest, NextResponse } from 'next/server';
import { suggestFix } from '@/lib/ai/fix-suggester';
import type { Challenge, ExecutionResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge, originalCode, executionResult, userFixedCode } = body;

    if (!challenge || !originalCode || !executionResult) {
      return NextResponse.json(
        { error: 'Challenge, original code, and execution result are required' },
        { status: 400 }
      );
    }

    const suggestedFix = await suggestFix(
      challenge as Challenge,
      originalCode as string,
      executionResult as ExecutionResult,
      userFixedCode as string | undefined
    );

    return NextResponse.json({ suggestedFix });
  } catch (error: any) {
    console.error('Fix suggestion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest fix' },
      { status: 500 }
    );
  }
}

