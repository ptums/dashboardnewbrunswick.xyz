import type { NeighborhoodData, WalkScoreDetail } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const WALK_SCORE_BASE = 'https://api.walkscore.com/score';

// New Brunswick, NJ city center
const LAT = 40.4862;
const LON = -74.4518;
const ADDRESS = 'New Brunswick, NJ';

// --- Walk Score API response types ---

interface WalkScoreSubScore {
  score: number;
  description: string;
  summary?: string;
}

interface WalkScoreApiResponse {
  status: number;
  walkscore: number;
  description: string;
  transit?: WalkScoreSubScore;
  bike?: WalkScoreSubScore;
}

function isSubScore(v: unknown): v is WalkScoreSubScore {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r['score'] === 'number' && typeof r['description'] === 'string';
}

function isWalkScoreResponse(v: unknown): v is WalkScoreApiResponse {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r['status'] === 'number' && typeof r['walkscore'] === 'number';
}

function toDetail(sub: WalkScoreSubScore | undefined, fallbackDesc: string): WalkScoreDetail {
  if (!sub) return { score: 0, description: fallbackDesc };
  return { score: sub.score, description: sub.description };
}

// ---

async function fetchWalkScoreData(): Promise<NeighborhoodData> {
  const apiKey = process.env['WALK_SCORE_API_KEY'];
  if (!apiKey) throw new Error('WALK_SCORE_API_KEY is not set');

  const params = new URLSearchParams({
    format: 'json',
    address: ADDRESS,
    lat: String(LAT),
    lon: String(LON),
    transit: '1',
    bike: '1',
    wsapikey: apiKey,
  });

  const response = await fetch(`${WALK_SCORE_BASE}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Walk Score API error: ${response.status} ${response.statusText}`);
  }

  const raw: unknown = await response.json();

  if (!isWalkScoreResponse(raw)) {
    throw new Error('Walk Score API returned unexpected response format');
  }

  // status 1 = score returned; status 2 = still calculating (treat as unavailable)
  if (raw.status !== 1) {
    throw new Error(`Walk Score API returned status ${raw.status} — score unavailable`);
  }

  return {
    source: 'Walk Score',
    sourceUrl: 'https://www.walkscore.com',
    lastUpdated: new Date().toISOString(),
    walkScore: { score: raw.walkscore, description: raw.description },
    transitScore: toDetail(
      isSubScore(raw.transit) ? raw.transit : undefined,
      'Transit data unavailable',
    ),
    bikeScore: toDetail(
      isSubScore(raw.bike) ? raw.bike : undefined,
      'Bike data unavailable',
    ),
  };
}

export function getNeighborhood(): Promise<NeighborhoodData> {
  return fetchWithCache<NeighborhoodData>(
    'neighborhood',
    'walkscore',
    fetchWalkScoreData,
    30,
  );
}
