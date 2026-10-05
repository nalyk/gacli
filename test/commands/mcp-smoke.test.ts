import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BIN, skipWithoutDist } from '../helpers/dist.js';

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    tools?: Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;
    serverInfo?: { version: string };
    protocolVersion?: string;
  };
  error?: { message: string };
}

async function rpc(messages: object[], args: string[] = []): Promise<JsonRpcResponse[]> {
  return await new Promise((resolveResult, reject) => {
    const proc = spawn('node', [BIN, 'mcp', 'serve', ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    proc.stdout.on('data', (c) => chunks.push(c));
    proc.stderr.on('data', () => {
      // ignore stderr noise (auth warnings) for smoke tests
    });
    proc.on('error', reject);
    proc.on('close', () => {
      const stdout = Buffer.concat(chunks).toString('utf-8');
      const responses = stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as JsonRpcResponse);
      resolveResult(responses);
    });

    for (const m of messages) {
      proc.stdin.write(`${JSON.stringify(m)}\n`);
    }
    proc.stdin.end();
  });
}

describe.skipIf(skipWithoutDist)('mcp serve (stdio smoke)', () => {
  it('responds to initialize handshake', async () => {
    const [resp] = await rpc([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'smoke', version: '1' },
        },
      },
    ]);
    expect(resp.result).toBeDefined();
    expect(resp.error).toBeUndefined();
    const { version } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
    expect(resp.result?.serverInfo?.version).toBe(version);
  });

  const init = (protocolVersion: string) => ({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion, capabilities: {}, clientInfo: { name: 'smoke', version: '1' } },
  });
  const list = { jsonrpc: '2.0', id: 2, method: 'tools/list' };

  it('negotiates 2025-06-18 as well', async () => {
    const [resp] = await rpc([init('2025-06-18')]);
    expect(resp.result?.protocolVersion).toBe('2025-06-18');
  });

  it('exposes only read-only ga_* tools by default', async () => {
    const [, listResp] = await rpc([init('2024-11-05'), list]);
    const tools = listResp.result?.tools ?? [];
    expect(tools.map((t) => t.name)).toContain('ga_report_run');
    expect(tools.length).toBeGreaterThan(30);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.map((t) => t.name)).not.toContain('gacli_report_run');
  });

  it('adds write tools with --allow-write and delete tools with --allow-delete', async () => {
    const names = async (args: string[]) =>
      ((await rpc([init('2024-11-05'), list], args))[1].result?.tools ?? []).map((t) => t.name);
    const write = await names(['--allow-write']);
    expect(write).toContain('ga_admin_custom_dimensions_create');
    expect(write).not.toContain('ga_admin_properties_delete');
    expect(await names(['--allow-delete'])).toContain('ga_admin_properties_delete');
  });
});
