import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RunqStore } from '../src/store.js';

const dbPath = join(process.cwd(), '.runq', 'e2e', 'runq.db');

function event(eventId, eventType, timestamp, payload = {}) {
  return {
    runq_version: '0.1.0',
    schema_version: '0.1.0',
    event_id: eventId,
    event_type: eventType,
    timestamp,
    session_id: 'ses_e2e_openclaw',
    run_id: 'run_e2e_openclaw',
    framework: 'openclaw',
    source: 'hook',
    privacy: { level: 'metadata', redacted: true },
    payload
  };
}

function seedDb() {
  for (const suffix of ['', '-shm', '-wal']) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
  const store = new RunqStore(dbPath);
  store.appendEvent(event('evt_e2e_started', 'session.started', '2026-05-05T10:00:00.000Z'));
  store.appendEvent(event('evt_e2e_prompt', 'user.prompt.submitted', '2026-05-05T10:00:30.000Z', {
    prompt_summary: 'Fix the failing verification and explain the result.',
    prompt_length: 51
  }));
  store.appendEvent(event('evt_e2e_model', 'model.call.ended', '2026-05-05T10:01:00.000Z', {
    model: 'MiniMax-M2.7',
    input_tokens: 140,
    output_tokens: 38,
    total_tokens: 178,
    duration_ms: 1200
  }));
  store.appendEvent(event('evt_e2e_tool', 'tool.call.ended', '2026-05-05T10:01:30.000Z', {
    tool_name: 'web_search',
    tool_type: 'web_search',
    status: 'ok',
    duration_ms: 900,
    input_key_count: 1,
    output_key_count: 2
  }));
  store.appendEvent(event('evt_e2e_file', 'file.changed', '2026-05-05T10:02:00.000Z', {
    file_extension: 'js',
    change_kind: 'modified'
  }));
  store.appendEvent(event('evt_e2e_failed_test', 'command.ended', '2026-05-05T10:03:00.000Z', {
    binary: 'npm',
    args_hash: 'sha256:npm-test',
    exit_code: 1,
    is_verification: true
  }));
  store.appendEvent(event('evt_e2e_ended', 'session.ended', '2026-05-05T10:04:00.000Z'));
  store.appendEvent(event('evt_e2e_satisfaction', 'satisfaction.recorded', '2026-05-05T10:05:00.000Z', {
    label: 'abandoned',
    signal: 'developer stopped after failed verification'
  }));
  store.close();
}

test.beforeEach(() => {
  seedDb();
});

test('RunQ product shell supports the primary agent user flow', async ({ page }) => {
  await page.goto('/agents');
  await expect(page.getByRole('heading', { name: 'Agent 总览' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'OpenClaw' })).toBeVisible();

  await page.locator('a[href="/agents/openclaw/sessions"]').click();
  await expect(page).toHaveURL(/\/agents\/openclaw\/sessions$/);
  await expect(page.getByRole('cell', { name: '#ses_e2e_openclaw' })).toBeVisible();
  await expect(page.getByText('质量检查器')).toBeVisible();

  await page.goto('/agents');
  await page.locator('a[href="/agents/openclaw/evaluations"]').click();
  await expect(page).toHaveURL(/\/agents\/openclaw\/evaluations$/);
  await expect(page.getByText('评估队列')).toBeVisible();
  await page.locator('[data-action="open-evaluation-trace"]').click();
  await expect(page).toHaveURL(/\/traces\?session=ses_e2e_openclaw$/);
  await expect(page.locator('[data-selected-session-id="ses_e2e_openclaw"]')).toBeVisible();

  await page.goto('/agents');
  await page.locator('a[href="/agents/openclaw/recommendations"]').click();
  await expect(page).toHaveURL(/\/agents\/openclaw\/recommendations$/);
  await expect(page.getByText('Run targeted verification earlier')).toBeVisible();
  await page.locator('[data-action="recommendation-note"]').fill('Add early targeted verification to the workflow');
  await page.locator('[data-action="accept-recommendation"]').click();
  await expect(page.getByText('备注: Add early targeted verification to the workflow')).toBeVisible();

  await page.goto('/agents');
  await page.locator('a[href="/agents/openclaw/setup"]').click();
  await expect(page.getByRole('heading', { name: '接入 Agent' }).first()).toBeVisible();
  await page.getByRole('link', { name: /检查连接/ }).click();
  await expect(page).toHaveURL(/\/agents\/openclaw\/setup$/);
  await expect(page.getByRole('heading', { name: /OpenClaw .* 接入健康度/ })).toBeVisible();

  await page.locator('a[href="/docs"]').first().click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: '产品文档' })).toBeVisible();
});

test('Trace explorer workflow is readable and opens node details from graph clicks', async ({ page }) => {
  await page.goto('/traces?session=ses_e2e_openclaw');
  await expect(page.locator('[data-selected-session-id="ses_e2e_openclaw"]')).toBeVisible();
  await expect(page.locator('[data-task-workflow="react-flow"]')).toBeVisible();
  await expect(page.locator('[data-workflow-viewport="content-first"]')).toBeVisible();
  await expect(page.locator('[data-selected-event-id="evt_e2e_prompt"]')).toBeVisible();
  // The width/height assertions below target the hydrated ReactFlow nodes (~320px wide),
  // not the SSR-static fallback (~220-260px). Wait for hydration deterministically.
  await expect(page.locator('[data-workflow-mount-state="hydrated"]')).toBeVisible();

  const workflowBox = await page.locator('[data-workflow-canvas-height="compact"]').boundingBox();
  expect(workflowBox?.height).toBeLessThanOrEqual(330);

  const promptBox = await page.locator('[data-flow-action-id="evt_e2e_prompt"]').first().boundingBox();
  expect(promptBox?.width).toBeGreaterThanOrEqual(300);

  await page.locator('[data-flow-action-id="evt_e2e_model"]').click();
  await expect(page.locator('[data-selected-event-id="evt_e2e_model"]')).toBeVisible();
  await expect(page.getByText('model.call.ended').first()).toBeVisible();
});

test('Agent check-up onboards Claude Code: installs hooks and imports history end-to-end', async ({ page, request }) => {
  // Spin up a clean HOME with a fake Claude Code transcript so the test is
  // deterministic regardless of the developer's machine.
  const tmpHome = mkdtempSync(join(tmpdir(), 'runq-e2e-home-'));
  const projectDir = join(tmpHome, '.claude', 'projects', '-repo-fake');
  mkdirSync(projectDir, { recursive: true });
  const transcript = [
    {
      sessionId: 'ses_e2e_onboard',
      cwd: '/repo/fake',
      timestamp: '2026-05-12T10:00:00.000Z',
      type: 'user',
      message: { role: 'user', content: '帮我接入 RunQ' }
    },
    {
      sessionId: 'ses_e2e_onboard',
      timestamp: '2026-05-12T10:00:10.000Z',
      message: {
        id: 'msg_e2e_onboard_1',
        role: 'assistant',
        model: 'claude-opus-4-7',
        content: [
          { type: 'text', text: 'on it' },
          { type: 'tool_use', id: 'too_e2e_onboard_1', name: 'Bash', input: { command: 'ls' } }
        ],
        usage: { input_tokens: 120, output_tokens: 40 }
      }
    },
    {
      sessionId: 'ses_e2e_onboard',
      timestamp: '2026-05-12T10:00:12.000Z',
      message: {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'too_e2e_onboard_1', is_error: false }]
      }
    }
  ];
  writeFileSync(
    join(projectDir, 'ses_e2e_onboard.jsonl'),
    transcript.map((row) => JSON.stringify(row)).join('\n') + '\n'
  );

  // 1) POST the checkup API directly so we exercise the full server flow with
  //    a controlled HOME. The CTA in the UI uses the same endpoint.
  // Non-streaming variant — easier to assert on in a test. The UI uses the
  // streamed NDJSON form so it can render progress.
  const checkupUrl = `/api/agents/claude_code/checkup?home=${encodeURIComponent(tmpHome)}&db=${encodeURIComponent(dbPath)}&stream=0`;
  const response = await request.post(checkupUrl);
  expect(response.ok(), `checkup response ${response.status()}`).toBeTruthy();
  const result = await response.json();
  expect(result.status).toBe('success');
  expect(result.hooks_installed).toBe(true);
  expect(result.imported_sessions).toBeGreaterThanOrEqual(1);
  expect(result.imported_events).toBeGreaterThanOrEqual(5);

  // 2) Hooks must have been written into the tmp HOME's Claude settings file.
  const settingsPath = join(tmpHome, '.claude', 'settings.local.json');
  expect(existsSync(settingsPath)).toBe(true);
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  expect(settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command).toMatch(/adapters\/claude-code\/hook\.js/);

  // 3) The imported session must show up on the health-report page (server-
  //    rendered, reads the same RUNQ_DB the API just wrote to).
  await page.goto('/agents/claude_code/health-report');
  await expect(page.getByRole('heading', { name: /Claude Code/ })).toBeVisible();
  // The summary stat tile labelled "会话总数" should now be 1.
  await expect(page.getByText('会话总数')).toBeVisible();
  // The top-tools panel should contain Bash from the synthetic transcript.
  await expect(page.getByText('Bash').first()).toBeVisible();

  // 4) Re-running the check-up is idempotent (zero new events).
  const second = await request.post(checkupUrl);
  expect(second.ok()).toBeTruthy();
  const secondResult = await second.json();
  expect(secondResult.imported_events).toBe(0);

  // 5) The streaming variant emits NDJSON progress events ending with a
  //    {type:"done", result:{...}} line so the UI can drive a progress modal.
  const streamUrl = checkupUrl.replace('&stream=0', '');
  const streamResp = await request.post(streamUrl);
  expect(streamResp.headers()['content-type']).toContain('application/x-ndjson');
  const ndjsonBody = await streamResp.text();
  const events = ndjsonBody.trim().split('\n').map((line) => JSON.parse(line));
  expect(events.length).toBeGreaterThanOrEqual(3);
  expect(events.some((e) => e.type === 'progress' && e.phase === 'install-hooks')).toBe(true);
  expect(events.some((e) => e.type === 'progress' && e.phase === 'import')).toBe(true);
  const doneEvent = events.find((e) => e.type === 'done');
  expect(doneEvent?.result?.hooks_installed).toBe(true);
  expect(doneEvent?.result?.imported_events).toBe(0);

  rmSync(tmpHome, { recursive: true, force: true });
});

test('RunQ shell fits a mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/agents/openclaw/recommendations');
  await expect(page.getByRole('heading', { name: '建议' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
});
