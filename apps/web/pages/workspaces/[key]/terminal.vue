<script setup lang="ts">
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

const route = useRoute();

const key = computed(() => route.params.key as string);
const containerName = computed(() => {
  const value = route.query.container;
  return typeof value === 'string' ? value : undefined;
});

const { data: workspace } = useWorkspaceQuery(key);

const terminalRef = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!terminalRef.value) return;

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    theme: {
      background: '#0a0a0a',
      foreground: '#e5e7eb',
    },
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalRef.value);
  fitAddon.fit();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const containerQuery = containerName.value
    ? `?container=${encodeURIComponent(containerName.value)}`
    : '';
  const socket = new WebSocket(
    `${protocol}//${window.location.host}/api/ws/terminal/${encodeURIComponent(key.value)}${containerQuery}`,
  );

  socket.addEventListener('open', () => {
    term.writeln(`Conectado ao container ${containerName.value ?? 'principal'}...`);
  });

  socket.addEventListener('message', (event) => {
    if (typeof event.data === 'string') {
      term.write(event.data);
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      term.write(new Uint8Array(event.data));
      return;
    }

    void event.data.arrayBuffer().then((buffer) => {
      term.write(new Uint8Array(buffer));
    });
  });

  socket.addEventListener('close', (event) => {
    if (event.code !== 1000 && event.reason) {
      term.writeln(`\r\nConexão encerrada: ${event.reason}`);
      return;
    }

    term.writeln('\r\nConexão encerrada.');
  });

  term.onData((data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    fitAddon.fit();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'resize',
          rows: term.rows,
          cols: term.cols,
        }),
      );
    }
  });

  resizeObserver.observe(terminalRef.value);

  onBeforeUnmount(() => {
    resizeObserver.disconnect();
    socket.close();
    term.dispose();
  });
});
</script>

<template>
  <div>
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold text-highlighted">
          Terminal — {{ key }}
          <span v-if="containerName" class="text-lg text-muted">/ {{ containerName }}</span>
        </h1>
        <p class="text-muted">Acesso via docker exec</p>
      </div>
      <UButton :to="`/workspaces/${key}`" variant="soft">Voltar</UButton>
    </div>

    <div
      ref="terminalRef"
      class="h-[70vh] overflow-hidden rounded-xl border border-default bg-black p-2"
    />
  </div>
</template>
