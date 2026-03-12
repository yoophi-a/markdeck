import fs from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

const DEFAULT_ROOT = path.resolve(process.cwd(), '..', '..');
const CONTENT_ROOT = path.resolve(process.env.MARKDECK_CONTENT_ROOT ?? DEFAULT_ROOT);

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function assertSafePath(relativePath: string) {
  const resolvedPath = path.resolve(CONTENT_ROOT, relativePath);
  const relativeToRoot = path.relative(CONTENT_ROOT, resolvedPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Unsafe path outside of content root');
  }

  return resolvedPath;
}

export async function GET(_: Request, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await context.params;
    const relativePath = slug.join('/');
    const absolutePath = assertSafePath(relativePath);
    const [buffer, stats] = await Promise.all([fs.readFile(absolutePath), fs.stat(absolutePath)]);
    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[extension] ?? 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'content-type': contentType,
        'content-length': String(stats.size),
        'cache-control': 'private, max-age=60',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
