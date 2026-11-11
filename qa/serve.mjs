/**
 * A tiny static server for the QA page.
 *
 * `file://` cannot resolve a module graph with relative imports, so the harness is
 * served over HTTP: one origin, one port, no external dependency.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }

export function serve(port = 0) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    const path = normalize(join(root, decodeURIComponent(url.pathname))).replace(/\/$/u, '/index.html')
    const file = path.endsWith('/') ? join(path, 'index.html') : path
    try {
      const body = await readFile(file)
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
      response.end(body)
    } catch {
      response.writeHead(404).end('not found')
    }
  })
  return new Promise((ready) => server.listen(port, '127.0.0.1', () => ready({ server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}` })))
}
