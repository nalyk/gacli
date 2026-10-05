import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { serveHttp } from '../../src/commands/mcp/http.js';
import { createServerFactory } from '../../src/core/mcp-adapter.js';
import { defineOperation } from '../../src/core/operation.js';

const op = defineOperation({
  id: 'demo.ping.get',
  summary: 'Ping',
  category: 'read',
  kind: 'resource',
  input: z.object({}),
  output: z.object({ ok: z.boolean() }),
  run: async () => ({ ok: true }),
});

let server: Awaited<ReturnType<typeof serveHttp>>;
let port: number;

function post(body: object, host = `127.0.0.1:${port}`): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          host,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => {
          text += c;
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
      },
    );
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });
}

const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } },
};

beforeAll(async () => {
  server = await serveHttp(createServerFactory([op], { version: '9.9.9', globals: {} as never }), 0);
  port = (server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('mcp serve --http', () => {
  it('binds to 127.0.0.1', () => {
    expect((server.address() as AddressInfo).address).toBe('127.0.0.1');
  });

  it('answers initialize and tools/call on /mcp', async () => {
    const init = await post(initialize);
    expect(init.status).toBe(200);
    expect(init.text).toContain('9.9.9');
    const call = await post({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'ga_demo_ping_get', arguments: {} },
    });
    expect(call.status).toBe(200);
    expect(call.text).toContain('"ok":true');
  });

  it('rejects a foreign Host header (DNS rebinding)', async () => {
    const r = await post(initialize, 'evil.com');
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.text).not.toContain('9.9.9');
  });
});
