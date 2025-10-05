import { Plugin } from 'vite';
import path from 'path';

interface DevServerOptions {
  watch?: string[]; // additional paths to watch
  cloudflare?: boolean; // enable cloudflare mode (adjust websocket url)
}

// Lightweight dev server plugin inspired by honojs/vite-plugins dev-server
export default function viteDevServer(opts: DevServerOptions = {}): Plugin {
  const watchPaths = opts.watch || ['../server', '../wrangler.jsonc', '../src'];
  let server: any;

  return {
    name: 'local:vite-dev-server',
    apply: 'serve',
    configureServer(s) {
      server = s;

      // Watch provided paths and trigger full page reload on change
      const resolved = watchPaths.map((p) => path.resolve(process.cwd(), p)).filter(Boolean);

      for (const p of resolved) {
        try {
          s.watcher.add(p);
        } catch (e) {
          // ignore
        }
      }

      s.watcher.on('change', (file: string) => {
        // Only trigger reload for server-side files (outside client)
        const rel = path.relative(path.resolve(process.cwd(), 'src'), file);
        const isServerFile = !file.includes(path.resolve(process.cwd(), 'src'));
        console.debug(`[vite-dev-server] file changed: ${file}, serverFile=${isServerFile}`);

        // If cloudflare option is enabled, notify via full reload so worker changes apply
        if (opts.cloudflare && isServerFile) {
          server.ws.send({ type: 'full-reload' });
          return;
        }

        // For client files, let Vite handle HMR; for others do full reload
        if (isServerFile) {
          server.ws.send({ type: 'full-reload' });
        }
      });

      // Expose config info to the client via virtual module
      s.middlewares.use((req: any, res: any, next: any) => {
        next();
      });
    },
  };
}
