import { createServer, type Server } from 'node:http';
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import { createMcpHandler, type McpServer } from '@modelcontextprotocol/server';

/**
 * Local Streamable HTTP endpoint at http://127.0.0.1:<port>/mcp. No auth: it is only reachable from
 * this machine, and Host/Origin checks stop browsers on other origins (DNS rebinding) from using it.
 */
export async function serveHttp(factory: () => McpServer, port: number): Promise<Server> {
  const handle = toNodeHandler(createMcpHandler(factory));
  const hostOk = localhostHostValidation();
  const originOk = localhostOriginValidation();
  const server = createServer((req, res) => {
    if (!hostOk(req, res) || !originOk(req, res)) return;
    if (req.url?.split('?')[0] !== '/mcp') {
      res.writeHead(404).end();
      return;
    }
    void handle(req, res);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}
