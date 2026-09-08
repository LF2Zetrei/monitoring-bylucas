import { spawn } from 'child_process';
import { isKnownAppService, isKnownInfraService } from '@/lib/manifest';

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  if (!isKnownAppService(name) && !isKnownInfraService(name)) {
    return new Response('Service inconnu', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // -f : suit le journal en direct. -n 0 : ne renvoie rien de l'historique,
      // seulement ce qui arrive à partir de maintenant.
      const proc = spawn('journalctl', ['-u', name, '-f', '-n', '0', '-o', 'json']);

      proc.stdout.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n').filter(Boolean)) {
          try {
            const entry = JSON.parse(line);
            const payload = JSON.stringify({
              time: entry.__REALTIME_TIMESTAMP
                ? new Date(parseInt(entry.__REALTIME_TIMESTAMP, 10) / 1000).toISOString()
                : null,
              priority: entry.PRIORITY,
              message: entry.MESSAGE,
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } catch {
            // ligne non-JSON, on l'ignore silencieusement
          }
        }
      });

      proc.on('close', () => {
        try {
          controller.close();
        } catch {
          // déjà fermé, rien à faire
        }
      });

      // Essentiel : sans ça, journalctl -f continue de tourner indéfiniment
      // côté serveur même après que le navigateur a fermé la connexion.
      req.signal.addEventListener('abort', () => {
        proc.kill();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
