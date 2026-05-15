// Universal scoring signals — apply to ANY agent (coding or conversation).
//
// These observe the human ↔ agent loop, not the agent ↔ LLM loop. Each signal
// produces score contributions with the same shape as the legacy scoring
// pipeline (`{ reason, impact }`), so they merge cleanly into scoreRun's
// existing total.
//
// Why these exist:
//   The legacy scoring relied on coding-specific signals (verification
//   commands, exit codes, file changes). That produces 0 score-evidence for
//   sessions where the agent isn't running shell commands — which is most
//   Hermes / OpenClaw / conversational use, and any future non-coding adapter.
//   These signals fill that gap by observing the user's behavior directly:
//   were they stuck (prompt repeats), did they bail (no session.ended), did
//   they sign off positively or angrily.

function scoreContribution(reason, impact) {
  return { reason, impact };
}

function eventTs(event) {
  const t = Date.parse(event?.timestamp || '');
  return Number.isFinite(t) ? t : 0;
}

const POSITIVE_ACK_TOKENS = [
  'thanks', 'thank you', 'perfect', 'great', 'looks good', 'awesome',
  'got it', 'works', 'fixed', 'solved',
  // Chinese — the user base is partly zh, and the live hook captures the
  // first 160 chars of the prompt verbatim, so these match.
  '好的', '不错', '搞定', '完美', '可以了', '成了'
];
const NEGATIVE_ACK_TOKENS = [
  'no', 'wrong', 'incorrect', 'try again', 'not what i', 'broken',
  'doesn\'t work', 'still failing', 'undo', 'revert',
  '不对', '错了', '重做', '重试', '不行', '搞砸'
];

function containsAny(haystack, tokens) {
  if (!haystack) return false;
  const text = haystack.toLowerCase();
  return tokens.some((token) => text.includes(token));
}

// Apply the universal signals to an event stream. Returns:
//   { contributions: [{reason, impact}], reasons: [string] }
// where reasons is a deduplicated list of qualitative signal names that the
// caller can surface in the UI (similar to existing quality.reasons).
export function applyUniversalSignals(events = []) {
  const contributions = [];
  const reasons = [];

  const promptEvents = events
    .filter((event) => event?.event_type === 'user.prompt.submitted')
    .sort((a, b) => String(a.timestamp ?? '').localeCompare(String(b.timestamp ?? '')));

  // -- Signal 1: prompt_repeat ---------------------------------------------
  // Same prompt_hash appearing more than once in the same session is a strong
  // "user is stuck and re-asking" signal.
  if (promptEvents.length >= 2) {
    const hashCounts = new Map();
    for (const event of promptEvents) {
      const hash = event.payload?.prompt_hash;
      if (!hash || hash === '[redacted]') continue;
      hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
    }
    const maxRepeat = Math.max(0, ...hashCounts.values());
    // -1 because the first occurrence isn't a "repeat"; only extras count.
    const extras = Math.max(0, maxRepeat - 1);
    if (extras >= 2) {
      contributions.push(scoreContribution('prompt_repeated', -Math.min(15, extras * 4)));
      reasons.push('prompt_repeated');
    }
  }

  // -- Signal 2: rapid_retry_pattern ---------------------------------------
  // Three or more prompts within <30s of the previous one signals the user
  // hammering the agent. Healthy interaction has thinking gaps.
  if (promptEvents.length >= 3) {
    let rapidCount = 0;
    for (let i = 1; i < promptEvents.length; i += 1) {
      const gap = eventTs(promptEvents[i]) - eventTs(promptEvents[i - 1]);
      if (gap > 0 && gap < 30_000) rapidCount += 1;
    }
    if (rapidCount >= 3) {
      contributions.push(scoreContribution('rapid_retry_pattern', -Math.min(10, rapidCount * 2)));
      reasons.push('rapid_retry_pattern');
    }
  }

  // -- Signal 3: acknowledge_signal ---------------------------------------
  // The user's last message often telegraphs how the session went. "thanks"
  // → +6, "no, try again" → -8. Neutral closes contribute nothing.
  if (promptEvents.length >= 1) {
    const lastPrompt = promptEvents[promptEvents.length - 1];
    const summary = lastPrompt.payload?.prompt_summary || '';
    if (containsAny(summary, POSITIVE_ACK_TOKENS)) {
      contributions.push(scoreContribution('acknowledged_positive', 6));
      reasons.push('acknowledged_positive');
    } else if (containsAny(summary, NEGATIVE_ACK_TOKENS)) {
      contributions.push(scoreContribution('acknowledged_negative', -8));
      reasons.push('acknowledged_negative');
    }
  }

  // -- Signal 4: session_abandoned ----------------------------------------
  // A real session ends with a session.ended event from the agent runtime. If
  // we have multiple events but no session.ended, the user likely closed the
  // terminal mid-task. Only fire when the session is substantial (≥5 events)
  // — short sessions without session.ended are usually just imports.
  const sessionEnded = events.find((event) => event?.event_type === 'session.ended');
  if (!sessionEnded && events.length >= 5) {
    contributions.push(scoreContribution('session_abandoned', -5));
    reasons.push('session_abandoned');
  }

  // -- Signal 5: prompt_revision_growth ------------------------------------
  // Each successive prompt getting longer signals the user re-explaining
  // themselves because the agent didn't understand the previous attempt.
  // Only meaningful with 3+ prompts.
  if (promptEvents.length >= 3) {
    const lengths = promptEvents
      .map((event) => Number(event.payload?.prompt_length))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (lengths.length >= 3) {
      let growthSteps = 0;
      for (let i = 1; i < lengths.length; i += 1) {
        if (lengths[i] > lengths[i - 1] * 1.4) growthSteps += 1;
      }
      if (growthSteps >= 2) {
        contributions.push(scoreContribution('prompt_revision_growth', -Math.min(8, growthSteps * 3)));
        reasons.push('prompt_revision_growth');
      }
    }
  }

  return { contributions, reasons };
}
