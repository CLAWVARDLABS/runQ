import { RunqStore } from '../../../../../../../src/store.js';
import { recordRecommendationFeedback } from '../../../../../../../src/recommendation-feedback.js';
import { defaultRunInboxDbPath } from '../../../../../../../src/run-inbox-data.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const { sessionId, recommendationId } = await params;
  const body = await request.json().catch(() => ({}));
  const decision = body?.decision;
  const note = body?.note ?? null;

  const store = new RunqStore(defaultRunInboxDbPath());
  try {
    const event = recordRecommendationFeedback(store, {
      sessionId: decodeURIComponent(sessionId),
      recommendationId: decodeURIComponent(recommendationId),
      decision,
      note
    });
    return Response.json({ ok: true, event_id: event.event_id, event_type: event.event_type });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  } finally {
    store.close();
  }
}
