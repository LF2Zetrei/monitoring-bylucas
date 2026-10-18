import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { MAX_UPLOAD_BYTES, UPLOAD_PATH } from '@/lib/minecraft';

// Étape 1 : reçoit le zip brut (corps de la requête) et l'écrit en flux sur le
// disque, avec plafond de taille. Rien n'est appliqué tant que /world/import
// n'est pas appelé.
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  if (!req.body) return NextResponse.json({ error: 'Corps vide' }, { status: 400 });

  let received = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      received += chunk.length;
      if (received > MAX_UPLOAD_BYTES) return cb(new Error('too-large'));
      cb(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(req.body as WebReadableStream),
      limiter,
      fs.createWriteStream(UPLOAD_PATH, { mode: 0o600 }),
    );
    audit('minecraft', `upload-world ${received} octets`);
    return NextResponse.json({ success: true, bytes: received });
  } catch (e) {
    fs.rmSync(UPLOAD_PATH, { force: true });
    const tooLarge = (e as Error)?.message === 'too-large';
    return NextResponse.json({ error: tooLarge ? 'File too large (max 4 GB)' : 'Upload failed' }, { status: tooLarge ? 413 : 500 });
  }
}
