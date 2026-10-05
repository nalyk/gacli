import { InMemoryTransport, type McpServer } from '@modelcontextprotocol/server';

interface RpcResponse {
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Minimal JSON-RPC client over the SDK's in-memory transport (no client package needed). */
export async function mcpSession(server: McpServer, protocolVersion = '2025-06-18') {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const pending = new Map<number, (r: RpcResponse) => void>();
  clientSide.onmessage = (msg) => {
    const m = msg as unknown as RpcResponse;
    if (typeof m.id === 'number') pending.get(m.id)?.(m);
  };
  await server.connect(serverSide);
  await clientSide.start();
  let nextId = 1;
  const request = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<RpcResponse>((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      void clientSide.send({ jsonrpc: '2.0', id, method, params });
    });
  const init = await request('initialize', {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: 'test', version: '1' },
  });
  await clientSide.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return {
    init,
    request,
    callTool: (name: string, args: Record<string, unknown>) =>
      request('tools/call', { name, arguments: args }),
    close: () => clientSide.close(),
  };
}
