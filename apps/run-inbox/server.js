#!/usr/bin/env node
import http from 'node:http';

import { RunqStore } from '../../src/store.js';

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response, status, body) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8'
  });
  response.end(body);
}

function htmlShell() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RunQ Run Inbox</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172026;
        background: #f6f7f8;
      }
      body {
        margin: 0;
      }
      header {
        border-bottom: 1px solid #dfe4e8;
        background: #ffffff;
        padding: 20px 28px;
      }
      h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 650;
      }
      main {
        display: grid;
        grid-template-columns: minmax(280px, 360px) 1fr;
        gap: 1px;
        min-height: calc(100vh - 73px);
        background: #dfe4e8;
      }
      section {
        background: #ffffff;
        padding: 20px;
      }
      button {
        display: block;
        width: 100%;
        border: 1px solid #d6dde3;
        border-radius: 8px;
        background: #ffffff;
        padding: 12px;
        text-align: left;
        cursor: pointer;
        margin-bottom: 10px;
      }
      button:hover {
        border-color: #788793;
      }
      .meta {
        color: #687782;
        font-size: 12px;
        margin-top: 4px;
      }
      .event {
        border-left: 3px solid #2d6cdf;
        padding: 10px 12px;
        margin-bottom: 10px;
        background: #f8fafc;
      }
      pre {
        overflow: auto;
        font-size: 12px;
        background: #111827;
        color: #f8fafc;
        padding: 12px;
        border-radius: 8px;
      }
      @media (max-width: 760px) {
        main {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>RunQ Run Inbox</h1>
      <div class="meta">Local coding-agent run timeline</div>
    </header>
    <main>
      <section>
        <h2>Sessions</h2>
        <div id="sessions">Loading sessions...</div>
      </section>
      <section>
        <h2>Timeline</h2>
        <div id="timeline">Select a session.</div>
      </section>
    </main>
    <script>
      async function loadSessions() {
        const response = await fetch('/api/sessions');
        const sessions = await response.json();
        const root = document.getElementById('sessions');
        if (sessions.length === 0) {
          root.textContent = 'No sessions captured yet.';
          return;
        }
        root.innerHTML = '';
        for (const session of sessions) {
          const button = document.createElement('button');
          button.innerHTML = '<strong>' + session.session_id + '</strong><div class="meta">' + session.framework + ' · ' + session.event_count + ' events · ' + session.last_event_at + '</div>';
          button.addEventListener('click', () => loadTimeline(session.session_id));
          root.appendChild(button);
        }
      }

      async function loadTimeline(sessionId) {
        const response = await fetch('/api/sessions/' + encodeURIComponent(sessionId) + '/events');
        const events = await response.json();
        const root = document.getElementById('timeline');
        root.innerHTML = '';
        for (const event of events) {
          const node = document.createElement('div');
          node.className = 'event';
          node.innerHTML = '<strong>' + event.event_type + '</strong><div class="meta">' + event.timestamp + '</div><pre>' + JSON.stringify(event.payload, null, 2) + '</pre>';
          root.appendChild(node);
        }
      }

      loadSessions();
    </script>
  </body>
</html>`;
}

export function handleRunInboxRequest({ dbPath }, request, response) {
    const url = new URL(request.url, 'http://127.0.0.1');

    if (request.method === 'GET' && url.pathname === '/') {
      sendHtml(response, 200, htmlShell());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/sessions') {
      const store = new RunqStore(dbPath);
      const sessions = store.listSessions();
      store.close();
      sendJson(response, 200, sessions);
      return;
    }

    const sessionEventsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);
    if (request.method === 'GET' && sessionEventsMatch) {
      const sessionId = decodeURIComponent(sessionEventsMatch[1]);
      const store = new RunqStore(dbPath);
      const events = store.listEventsForSession(sessionId);
      store.close();
      sendJson(response, 200, events);
      return;
    }

    sendJson(response, 404, {
      error: 'not_found'
    });
}

export function createRunInboxServer({ dbPath }) {
  return http.createServer((request, response) => {
    handleRunInboxRequest({ dbPath }, request, response);
  });
}

function parseArgs(args) {
  const dbIndex = args.indexOf('--db');
  const portIndex = args.indexOf('--port');
  return {
    dbPath: dbIndex === -1 ? '.runq/runq.db' : args[dbIndex + 1],
    port: portIndex === -1 ? 4545 : Number(args[portIndex + 1])
  };
}

const isEntrypoint = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;
if (isEntrypoint) {
  const { dbPath, port } = parseArgs(process.argv.slice(2));
  const server = createRunInboxServer({ dbPath });
  server.listen(port, () => {
    console.log(`RunQ Run Inbox listening on http://127.0.0.1:${port}`);
  });
}
