import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
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
