import { Plugin } from 'vite';
import path from 'path';

interface DevServerOptions {
  watch: string[]; // additional paths to watch
  cloudflare?: boolean; // enable cloudflare mode (adjust websocket url)
}

// Lightweight dev server plugin inspired by honojs/vite-plugins dev-server
export default function viteDevServer(opts: DevServerOptions): Plugin {
  const watchPaths = opts.watch;
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
        // Consider a file a "server file" when it's outside the `client` folder.
        // Previously this checked for `worker` and the logic was inverted which
        // caused client files to be treated as server files and trigger full reloads.
        const clientDir = path.resolve(process.cwd(), 'client');
        const normalizedFile = path.normalize(file);

        // Ignore Cloudflare/Wrangler local state files and sqlite temp files
        // which are written by local emulators and should not trigger reloads.
        const wranglerStateDir = path.normalize(path.join(clientDir, '.wrangler'));
        if (normalizedFile.includes(wranglerStateDir)) {
          return;
        }

        // Ignore client-level wrangler.jsonc (some tools rewrite it)
        const clientWrangler = path.normalize(path.join(clientDir, 'wrangler.jsonc'));
        if (normalizedFile === clientWrangler) return;

        // Ignore sqlite temporary files which are noisy (e.g. -shm, -wal)
        if (normalizedFile.match(/\.sqlite(-shm|-wal)?$/i) || normalizedFile.match(/\.db$/i)) {
          return;
        }

        const isServerFile = !normalizedFile.includes(path.normalize(clientDir));
        console.debug(`[vite-dev-server] file changed: ${file}, serverFile=${isServerFile}`);

        // If cloudflare option is enabled, notify via full reload so worker changes apply
        if (opts.cloudflare && isServerFile) {
          try {
            server.ws && server.ws.send && server.ws.send({ type: 'full-reload' });
          } catch (err) {
            const e: any = err;
            console.warn(
              '[vite-dev-server] ws send error (cloudflare full-reload):',
              e && e.message ? e.message : e
            );
          }
          return;
        }

        // For client files, let Vite handle HMR; for others do full reload
        if (isServerFile) {
          try {
            server.ws && server.ws.send && server.ws.send({ type: 'full-reload' });
          } catch (err) {
            const e: any = err;
            console.warn(
              '[vite-dev-server] ws send error (full-reload):',
              e && e.message ? e.message : e
            );
          }
        }
      });

      // Expose config info to the client via virtual module
      s.middlewares.use((req: any, res: any, next: any) => {
        next();
      });

      // Attach a non-fatal error handler to the websocket server object to avoid process crash
      try {
        if (server && server.ws && typeof server.ws.on === 'function') {
          server.ws.on('error', (err: any) => {
            console.warn(
              '[vite-dev-server] ws server error (ignored):',
              err && err.message ? err.message : err
            );
          });
        }
      } catch (e) {
        // ignore
      }
    },
  };
}
