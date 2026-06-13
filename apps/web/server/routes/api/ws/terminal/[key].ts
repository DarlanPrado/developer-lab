const backendSockets = new Map<string, WebSocket>();

function extractWorkspaceKey(request: Request) {
  const pathname = new URL(request.url).pathname;
  const segments = pathname.split('/').filter(Boolean);
  const terminalIndex = segments.indexOf('terminal');

  if (terminalIndex >= 0 && segments[terminalIndex + 1]) {
    return segments[terminalIndex + 1];
  }

  return pathname.split('/').pop() ?? null;
}

function resolveConnection(peer: { context?: { token?: string; key?: string }; request: Request }) {
  const token = peer.context?.token ?? getTokenFromRequest(peer.request);
  const key = peer.context?.key ?? extractWorkspaceKey(peer.request);

  return { token, key };
}

async function forwardBackendPayload(
  peer: { send: (data: string | Uint8Array) => unknown },
  data: unknown,
) {
  if (typeof data === 'string') {
    peer.send(data);
    return;
  }

  if (data instanceof ArrayBuffer) {
    peer.send(new Uint8Array(data));
    return;
  }

  if (ArrayBuffer.isView(data)) {
    peer.send(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return;
  }

  if (data instanceof Blob) {
    peer.send(new Uint8Array(await data.arrayBuffer()));
  }
}

export default defineWebSocketHandler({
  upgrade(request) {
    const token = getTokenFromRequest(request);

    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const key = extractWorkspaceKey(request);

    if (!key) {
      throw createError({ statusCode: 400, statusMessage: 'Missing workspace key' });
    }

    // crossws@0.3.5 exposes context as read-only — mutate in place instead of reassigning.
    Object.assign(request.context, { token, key });

    return {};
  },

  open(peer) {
    const config = useRuntimeConfig();
    const { token, key } = resolveConnection(peer);

    if (!token || !key) {
      peer.close(4401, 'Unauthorized');
      return;
    }

    const wsBase = String(config.apiUrl).replace(/^http/, 'ws');
    const backendUrl = `${wsBase}/ws/terminal/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`;

    const backend = new WebSocket(backendUrl);
    backendSockets.set(peer.id, backend);

    backend.addEventListener('open', () => {
      // Backend ready — client is already open via Nitro proxy.
    });

    backend.addEventListener('message', (event) => {
      void forwardBackendPayload(peer, event.data);
    });

    backend.addEventListener('close', () => {
      backendSockets.delete(peer.id);
      peer.close();
    });

    backend.addEventListener('error', () => {
      backendSockets.delete(peer.id);
      peer.close();
    });
  },

  message(peer, message) {
    const backend = backendSockets.get(peer.id);

    if (!backend || backend.readyState !== WebSocket.OPEN) {
      return;
    }

    backend.send(message.text());
  },

  close(peer) {
    const backend = backendSockets.get(peer.id);
    backend?.close();
    backendSockets.delete(peer.id);
  },

  error(peer) {
    const backend = backendSockets.get(peer.id);
    backend?.close();
    backendSockets.delete(peer.id);
  },
});
