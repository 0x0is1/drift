/**
 * FAKE STAND-IN for the phase 8 real model (see CLAUDE.md "Feed tab algo").
 * There's no training data/infra yet — this is a hand-tuned formula dressed
 * up to look like a model's output. Swap `scoreArtist` for a real inference
 * call once drift_play_events has enough volume — this is the one file
 * meant to be discarded, everything calling it stays the same.
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

export function scoreArtist(events: WeightedEvent[]): number {
  if (events.length === 0) return 0;
  const raw = events.reduce((sum, e) => sum + e.weight * recencyDecay(e.createdAt), 0);
  return 2 * sigmoid(raw) - 1;
}
