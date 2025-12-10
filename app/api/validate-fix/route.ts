import { NextRequest, NextResponse } from 'next/server';
import { validateFix } from '@/lib/ai/fix-validator';
import type { Challenge, ExecutionResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge, originalCode, fixedCode, executionResult } = body;

    if (!challenge || !originalCode || !fixedCode || !executionResult) {
      return NextResponse.json(
        { error: 'Challenge, original code, fixed code, and execution result are required' },
        { status: 400 }
      );
    }

    const validationResult = await validateFix(
      challenge as Challenge,
      originalCode as string,
      fixedCode as string,
      executionResult as ExecutionResult
    );

    return NextResponse.json({ validation: validationResult });
  } catch (error: any) {
    console.error('Fix validation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate fix' },
      { status: 500 }
    );
  }
}

