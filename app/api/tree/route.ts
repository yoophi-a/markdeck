import { NextResponse } from 'next/server';

import { buildDocumentTree } from '@/shared/lib/content';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const relativePath = searchParams.get('path')?.trim() ?? '';
  const segments = relativePath ? relativePath.split('/').filter(Boolean) : [];

  try {
    const nodes = await buildDocumentTree(segments, 1);
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ message: 'Failed to load tree nodes.' }, { status: 400 });
  }
}
