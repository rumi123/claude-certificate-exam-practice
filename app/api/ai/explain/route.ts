import { NextResponse } from 'next/server';
import { getAiProvider } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!getAiProvider().enabled) {
    return NextResponse.json({ error: 'AI features are off' }, { status: 501 });
  }
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
