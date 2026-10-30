/**
 * FAKE STAND-IN for the phase 8 real model (see CLAUDE.md "Feed tab algo").
 * There's no training data/infra yet — this is a hand-tuned formula dressed
 * up to look like a model's output (recency-decayed signal, squashed into a
 * score) so the feed has *something* in the "model" slot today. Swap
 * `scoreArtist` for a real inference call once drift_play_events has enough
 * volume to actually train on — everything else in feedRanking.ts stays the
 * same, this file is the only thing meant to be discarded.
 */

const HALF_LIFE_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type WeightedEvent = { weight: number; createdAt: string };

function recencyDecay(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / MS_PER_DAY;
  return Math.pow(0.5, Math.max(ageDays, 0) / HALF_LIFE_DAYS);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Folds a list of (weight, timestamp) events into a single score in
 * (-1, 1) — 0 for no signal (fresh user / brand-new artist), positive for
 * net-liked/played, negative for net-skipped/unliked. The sigmoid squash is
 * cosmetic (keeps scores bounded like a real classifier's would be), not
 * load-bearing — rankByAffinity only cares about relative order.
 */
export function scoreArtist(events: WeightedEvent[]): number {
  if (events.length === 0) return 0;
  const raw = events.reduce((sum, e) => sum + e.weight * recencyDecay(e.createdAt), 0);
  return 2 * sigmoid(raw) - 1;
}
