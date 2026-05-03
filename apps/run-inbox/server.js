#!/usr/bin/env node
import http from 'node:http';

import { getRunInboxEvents, getRunInboxSessions } from '../../src/run-inbox-data.js';

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
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --canvas: #000000;
        --surface-1: #0f1115;
        --surface-2: #171a21;
        --surface-3: #20242c;
        --hairline: rgba(178, 182, 189, 0.14);
        --hairline-soft: rgba(178, 182, 189, 0.08);
        --ink: #ffffff;
        --ink-muted: #b2b6bd;
        --ink-subtle: #656a76;
        --accent-terraform: #7b42f6;
        --accent-vault: #ffd814;
        --accent-consul: #dc477d;
        --accent-waypoint: #14c6cb;
        --accent-vagrant: #1563ff;
        --accent-nomad: #00bc7f;
        color: var(--ink);
        background: var(--canvas);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-width: 320px;
        background: var(--canvas);
      }
      button {
        font: inherit;
      }
      .topbar {
        height: 56px;
        display: grid;
        grid-template-columns: 360px 1fr auto;
        align-items: center;
        gap: 16px;
        padding: 0 20px;
        border-bottom: 1px solid var(--hairline);
        background: var(--canvas);
      }
      .brand {
        display: grid;
        gap: 2px;
      }
      .brand-title {
        font-size: 16px;
        line-height: 1.25;
        font-weight: 700;
      }
      .brand-subtitle,
      .meta,
      .muted {
        color: var(--ink-muted);
        font-size: 12px;
        line-height: 1.35;
      }
      .db-status {
        color: var(--ink-subtle);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .refresh {
        min-width: 84px;
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background: var(--surface-2);
        color: var(--ink);
        padding: 8px 12px;
        cursor: pointer;
      }
      .refresh:hover {
        border-color: rgba(255, 255, 255, 0.28);
      }
      .workbench {
        display: grid;
        grid-template-columns: 360px minmax(520px, 1fr) 360px;
        height: calc(100vh - 56px);
        min-height: 580px;
        background: var(--hairline-soft);
      }
      .pane {
        min-width: 0;
        overflow: auto;
        background: var(--canvas);
        padding: 20px;
        border-right: 1px solid var(--hairline-soft);
      }
      .pane:last-child {
        border-right: 0;
      }
      .pane-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }
      h1, h2, h3, p {
        margin: 0;
      }
      .pane-title {
        color: var(--ink-muted);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.04em;
        line-height: 1.25;
        text-transform: uppercase;
      }
      .segmented {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        border: 1px solid var(--hairline-soft);
        border-radius: 8px;
        background: var(--surface-1);
      }
      .segment {
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--ink-subtle);
        padding: 5px 8px;
        font-size: 12px;
      }
      .segment.active {
        background: var(--surface-3);
        color: var(--ink);
      }
      .run-list {
        display: grid;
        gap: 10px;
      }
      .run-row {
        width: 100%;
        border: 1px solid var(--hairline);
        border-left: 3px solid transparent;
        border-radius: 8px;
        background: var(--surface-1);
        color: var(--ink);
        padding: 12px;
        text-align: left;
        cursor: pointer;
      }
      .run-row:hover {
        background: var(--surface-2);
      }
      .run-row.selected {
        border-color: rgba(123, 66, 246, 0.72);
        border-left-color: var(--accent-terraform);
      }
      .run-row-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      .row-stack {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--hairline);
        border-radius: 999px;
        color: var(--ink-muted);
        background: rgba(255, 255, 255, 0.03);
        padding: 3px 8px;
        font-size: 12px;
        line-height: 1.2;
        white-space: nowrap;
      }
      .chip.good { border-color: rgba(0, 188, 127, 0.46); color: var(--accent-nomad); }
      .chip.warn { border-color: rgba(255, 216, 20, 0.46); color: var(--accent-vault); }
      .chip.bad { border-color: rgba(220, 71, 125, 0.52); color: var(--accent-consul); }
      .chip.info { border-color: rgba(20, 198, 203, 0.42); color: var(--accent-waypoint); }
      .timeline-stream {
        position: relative;
        display: grid;
        gap: 12px;
        padding-left: 18px;
      }
      .timeline-stream::before {
        content: "";
        position: absolute;
        top: 4px;
        bottom: 4px;
        left: 4px;
        width: 1px;
        background: var(--hairline);
      }
      .event-card {
        position: relative;
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background: var(--surface-1);
        padding: 12px;
      }
      .event-card::before {
        content: "";
        position: absolute;
        left: -18px;
        top: 16px;
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: var(--event-accent, var(--accent-vagrant));
        box-shadow: 0 0 0 4px var(--canvas);
      }
      .event-card[data-kind="model"] { --event-accent: var(--accent-waypoint); }
      .event-card[data-kind="file"] { --event-accent: var(--accent-terraform); }
      .event-card[data-kind="command"] { --event-accent: var(--accent-vagrant); }
      .event-card[data-kind="success"] { --event-accent: var(--accent-nomad); }
      .event-card[data-kind="failure"] { --event-accent: var(--accent-consul); }
      .event-card[data-kind="satisfaction"] { --event-accent: var(--accent-terraform); }
      .event-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        font-weight: 600;
      }
      .event-summary {
        margin-top: 8px;
        color: var(--ink-muted);
        font-size: 13px;
        line-height: 1.45;
      }
      details {
        margin-top: 10px;
      }
      summary {
        color: var(--ink-subtle);
        cursor: pointer;
        font-size: 12px;
      }
      pre {
        max-height: 260px;
        overflow: auto;
        border: 1px solid var(--hairline-soft);
        border-radius: 8px;
        background: #050608;
        color: var(--ink-muted);
        padding: 12px;
        font-size: 12px;
        line-height: 1.5;
      }
      .quality-card,
      .recommendation,
      .empty-state {
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background: var(--surface-1);
        padding: 14px;
      }
      .quality-score {
        font-size: 28px;
        line-height: 1.1;
        font-weight: 700;
      }
      .verdict {
        margin-top: 6px;
        color: var(--ink-muted);
        font-size: 13px;
      }
      .metric-list,
      .recommendation-list {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }
      .metric {
        display: grid;
        gap: 6px;
      }
      .metric-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: var(--ink-muted);
        font-size: 12px;
      }
      .metric-track {
        height: 6px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--surface-3);
      }
      .metric-fill {
        height: 100%;
        width: 0%;
        border-radius: inherit;
        background: var(--accent-terraform);
      }
      .recommendation {
        display: grid;
        gap: 8px;
      }
      .recommendation-title {
        font-size: 13px;
        font-weight: 600;
      }
      .section-spacer {
        margin-top: 20px;
      }
      .empty-state {
        color: var(--ink-muted);
        font-size: 13px;
        line-height: 1.5;
      }
      .empty-state code {
        color: var(--ink);
        background: var(--surface-3);
        border-radius: 4px;
        padding: 2px 5px;
      }
      @media (max-width: 1180px) {
        .topbar {
          grid-template-columns: 1fr auto;
        }
        .db-status {
          display: none;
        }
        .workbench {
          grid-template-columns: 320px 1fr;
          height: auto;
          min-height: calc(100vh - 56px);
        }
        .quality-pane {
          grid-column: 2;
          border-top: 1px solid var(--hairline-soft);
        }
      }
      @media (max-width: 760px) {
        .topbar {
          grid-template-columns: 1fr;
          height: auto;
          min-height: 56px;
          padding: 12px 16px;
        }
        .refresh {
          display: none;
        }
        .workbench {
          grid-template-columns: 1fr;
          min-height: auto;
        }
        .pane,
        .quality-pane {
          grid-column: 1;
          border-right: 0;
          border-top: 1px solid var(--hairline-soft);
        }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="brand">
        <div class="brand-title">RunQ</div>
        <div class="brand-subtitle">Run Inbox · local coding-agent reliability</div>
      </div>
      <div class="db-status" id="db-status">Local database · metadata-first telemetry</div>
      <button class="refresh" id="refresh" type="button">Refresh</button>
    </header>
    <main class="workbench">
      <section class="pane" data-pane="runs" aria-labelledby="runs-title">
        <div class="pane-header">
          <h2 class="pane-title" id="runs-title">Runs</h2>
          <div class="segmented" aria-label="Run filters">
            <button class="segment active" type="button">All</button>
            <button class="segment" type="button">Needs review</button>
            <button class="segment" type="button">Accepted</button>
            <button class="segment" type="button">Failed</button>
          </div>
        </div>
        <div id="sessions" class="run-list">Loading runs...</div>
      </section>
      <section class="pane" data-pane="timeline" aria-labelledby="timeline-title">
        <div class="pane-header">
          <h2 class="pane-title" id="timeline-title">Timeline</h2>
          <span class="muted" id="timeline-meta">Select a run</span>
        </div>
        <div id="timeline" class="timeline-stream">
          <div class="empty-state">Select a run to inspect its timeline and quality signals.</div>
        </div>
      </section>
      <section class="pane quality-pane" data-pane="quality" aria-labelledby="quality-title">
        <div class="pane-header">
          <h2 class="pane-title" id="quality-title">Quality Inspector</h2>
        </div>
        <div id="quality">
          <div class="empty-state">
            Select a run to inspect Outcome Confidence, recommendations, and satisfaction.
          </div>
        </div>
      </section>
    </main>
    <script>
      let selectedSessionId = null;
      let sessionCache = [];
      let expandedPayloadEventId = null;

      function escapeHtml(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
      }

      function percent(value) {
        return Math.round(Number(value || 0) * 100);
      }

      function confidenceTone(value) {
        const score = Number(value || 0);
        if (score >= 0.8) return 'good';
        if (score >= 0.5) return 'warn';
        return 'bad';
      }

      function satisfactionTone(label) {
        if (label === 'accepted') return 'good';
        if (label === 'corrected' || label === 'rerun') return 'warn';
        if (label === 'abandoned') return 'bad';
        return '';
      }

      function verdictFor(session) {
        const quality = session?.quality || {};
        const score = Number(quality.outcome_confidence || 0);
        const hasSatisfaction = Boolean(session?.satisfaction?.label);
        if (score >= 0.8) return 'Likely completed';
        if (score >= 0.5) return 'Needs review';
        if (!hasSatisfaction && (quality.verification_coverage || 0) === 0) return 'Insufficient evidence';
        return 'Likely failed';
      }

      function eventKind(event) {
        if (event.event_type.startsWith('model.')) return 'model';
        if (event.event_type === 'file.changed' || event.event_type === 'git.diff.summarized') return 'file';
        if (event.event_type.startsWith('command.')) {
          if (event.payload?.is_verification && Number(event.payload?.exit_code) === 0) return 'success';
          if (Number(event.payload?.exit_code) !== 0 && event.payload?.exit_code !== undefined) return 'failure';
          return 'command';
        }
        if (event.event_type === 'satisfaction.recorded') return 'satisfaction';
        if (event.event_type === 'error.raised') return 'failure';
        return 'default';
      }

      function summarizeEvent(event) {
        const payload = event.payload || {};
        switch (event.event_type) {
          case 'user.prompt.submitted':
            return (payload.prompt_summary || 'Prompt captured') + ' · ' + (payload.prompt_length || 0) + ' chars';
          case 'model.call.started':
            return [payload.provider, payload.model, payload.prompt_length ? payload.prompt_length + ' prompt chars' : null].filter(Boolean).join(' · ') || 'Model call started';
          case 'model.call.ended':
            return [payload.total_tokens ? payload.total_tokens + ' tokens' : null, payload.assistant_summary || 'Model call completed'].filter(Boolean).join(' · ');
          case 'file.changed':
            return (payload.change_kind || 'changed') + ' file · .' + (payload.file_extension || 'unknown');
          case 'command.started':
            return (payload.binary || 'command') + (payload.is_verification ? ' · verification' : '');
          case 'command.ended':
            return (payload.binary || 'command') + ' exited ' + (payload.exit_code ?? 'unknown') + (payload.is_verification ? ' · verification' : '');
          case 'permission.resolved':
            return (payload.decision || 'resolved') + ' · waited ' + (payload.wait_ms || 0) + 'ms';
          case 'satisfaction.recorded':
            return (payload.label || 'unknown') + (payload.signal ? ' · ' + payload.signal : '');
          case 'session.started':
            return 'Session started';
          case 'session.ended':
            return 'Session ended · ' + (payload.ended_reason || 'unknown');
          default:
            return 'Metadata event captured';
        }
      }

      function metric(label, value, tone) {
        const pct = percent(value);
        return '<div class="metric"><div class="metric-head"><span>' + escapeHtml(label) + '</span><span>' + pct + '%</span></div><div class="metric-track"><div class="metric-fill" style="width:' + pct + '%; background: var(--accent-' + tone + ');"></div></div></div>';
      }

      async function loadSessions() {
        const response = await fetch('/api/sessions');
        const sessions = await response.json();
        sessionCache = sessions;
        const root = document.getElementById('sessions');
        if (sessions.length === 0) {
          root.innerHTML = '<div class="empty-state">No runs captured yet. Configure a Claude Code, Codex, or OpenClaw hook to start collecting local run quality events.<br><br><code>bash scripts/install-local.sh</code><br><code>npm run inbox -- --db ~/.runq/runq.db --port 4545</code></div>';
          document.getElementById('db-status').textContent = 'Local database · 0 runs';
          return;
        }
        document.getElementById('db-status').textContent = 'Local database · ' + sessions.length + ' runs';
        root.innerHTML = '';
        for (const session of sessions) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'run-row' + (session.session_id === selectedSessionId ? ' selected' : '');
          const quality = session.quality || {};
          const confidence = percent(quality.outcome_confidence);
          const reasons = (quality.reasons || []);
          const recommendation = (session.recommendations || [])[0];
          const recommendationText = recommendation ? recommendation.title : 'No recommendation yet';
          const satisfaction = session.satisfaction?.label || 'unknown';
          button.innerHTML =
            '<div class="run-row-title">' + escapeHtml(session.session_id) + '</div>' +
            '<div class="meta">' + escapeHtml(session.framework) + ' · ' + session.event_count + ' events · ' + escapeHtml(session.last_event_at) + '</div>' +
            '<div class="row-stack">' +
              '<span class="chip ' + confidenceTone(quality.outcome_confidence) + '">Outcome ' + confidence + '%</span>' +
              '<span class="chip ' + satisfactionTone(satisfaction) + '">' + escapeHtml(satisfaction) + '</span>' +
            '</div>' +
            '<div class="meta">' + escapeHtml(reasons.join(', ') || 'no flags') + '</div>' +
            '<div class="meta">' + escapeHtml(recommendationText) + '</div>';
          button.addEventListener('click', () => selectSession(session.session_id));
          root.appendChild(button);
        }
        if (!selectedSessionId && sessions[0]) {
          selectSession(sessions[0].session_id);
        }
      }

      async function selectSession(sessionId) {
        selectedSessionId = sessionId;
        const response = await fetch('/api/sessions/' + encodeURIComponent(sessionId) + '/events');
        const events = await response.json();
        const session = sessionCache.find((candidate) => candidate.session_id === sessionId);
        renderTimeline(session, events);
        renderQuality(session);
        const rows = document.querySelectorAll('.run-row');
        for (const row of rows) {
          row.classList.toggle('selected', row.textContent.includes(sessionId));
        }
      }

      function renderTimeline(session, events) {
        const root = document.getElementById('timeline');
        document.getElementById('timeline-meta').textContent = session ? session.framework + ' · ' + events.length + ' events' : 'Select a run';
        root.innerHTML = '';
        for (const event of events) {
          const node = document.createElement('div');
          node.className = 'event-card';
          node.dataset.kind = eventKind(event);
          const isExpanded = expandedPayloadEventId === event.event_id ? ' open' : '';
          node.innerHTML =
            '<div class="event-title"><span>' + escapeHtml(event.event_type) + '</span><span class="chip">' + escapeHtml(event.privacy?.level || 'metadata') + '</span></div>' +
            '<div class="meta">' + escapeHtml(event.timestamp) + '</div>' +
            '<div class="event-summary">' + escapeHtml(summarizeEvent(event)) + '</div>' +
            '<details' + isExpanded + '><summary>Raw payload</summary><pre>' + escapeHtml(JSON.stringify(event.payload, null, 2)) + '</pre></details>';
          const details = node.querySelector('details');
          details.addEventListener('toggle', () => {
            expandedPayloadEventId = details.open ? event.event_id : null;
          });
          root.appendChild(node);
        }
      }

      function renderQuality(session) {
        const root = document.getElementById('quality');
        if (!session) {
          root.innerHTML = '<div class="empty-state">Select a run to inspect Outcome Confidence, recommendations, and satisfaction.</div>';
          return;
        }
        const quality = session.quality || {};
        const reasons = quality.reasons || [];
        const recommendations = session.recommendations || [];
        const satisfaction = session.satisfaction?.label || 'unknown';
        const recommendationHtml = recommendations.length
          ? recommendations.map((item) =>
              '<article class="recommendation"><span class="chip info">' + escapeHtml(item.category) + '</span><div class="recommendation-title">' + escapeHtml(item.title) + '</div><p class="meta">' + escapeHtml(item.summary) + '</p><p class="meta">' + escapeHtml(item.suggested_action) + '</p><span class="muted">' + (item.evidence_event_ids || []).length + ' evidence events</span></article>'
            ).join('')
          : '<div class="empty-state">No recommendations for this run. RunQ did not find an evidence-backed workflow improvement yet.</div>';
        root.innerHTML =
          '<section class="quality-card">' +
            '<div class="quality-score">' + percent(quality.outcome_confidence) + '%</div>' +
            '<div class="verdict">' + escapeHtml(verdictFor(session)) + '</div>' +
            '<div class="row-stack">' + reasons.map((reason) => '<span class="chip">' + escapeHtml(reason) + '</span>').join('') + '</div>' +
            '<div class="metric-list">' +
              metric('Verification Coverage', quality.verification_coverage, 'nomad') +
              metric('Rework Risk', quality.rework_risk, 'consul') +
              metric('Permission Friction', quality.permission_friction, 'vault') +
              metric('Loop Risk', quality.loop_risk, 'consul') +
              metric('Cost Efficiency', quality.cost_efficiency, 'waypoint') +
            '</div>' +
          '</section>' +
          '<section class="section-spacer">' +
            '<div class="pane-header"><h3 class="pane-title">Satisfaction</h3><span class="chip ' + satisfactionTone(satisfaction) + '">' + escapeHtml(satisfaction) + '</span></div>' +
            '<p class="meta">' + escapeHtml(session.satisfaction?.signal || 'No human or evaluator judgment recorded yet.') + '</p>' +
          '</section>' +
          '<section class="section-spacer">' +
            '<div class="pane-header"><h3 class="pane-title">Recommendations</h3><span class="muted">' + recommendations.length + '</span></div>' +
            '<div class="recommendation-list">' + recommendationHtml + '</div>' +
          '</section>';
      }

      document.getElementById('refresh').addEventListener('click', loadSessions);
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
      sendJson(response, 200, getRunInboxSessions(dbPath));
      return;
    }

    const sessionEventsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);
    if (request.method === 'GET' && sessionEventsMatch) {
      const sessionId = decodeURIComponent(sessionEventsMatch[1]);
      sendJson(response, 200, getRunInboxEvents(sessionId, dbPath));
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
