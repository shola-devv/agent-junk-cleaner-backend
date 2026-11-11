import { aiProvider } from './ai';
import { isMongoReady } from './mongo.service';

let shuttingDown = false;
export const markShuttingDown = () => {
  shuttingDown = true;
};

export interface ReadinessReport {
  ready: boolean;
  checks: Record<string, { ok: boolean; detail?: string }>;
}

export async function checkReadiness(): Promise<ReadinessReport> {
  const checks: ReadinessReport['checks'] = {};

  checks.shutdown = { ok: !shuttingDown, ...(shuttingDown ? { detail: 'shutting down' } : {}) };

  try {
    const ok = await aiProvider.isReady();
    checks.aiProvider = { ok, detail: aiProvider.name };
  } catch {
    checks.aiProvider = { ok: false, detail: aiProvider.name };
  }

  try {
    checks.mongodb = { ok: await isMongoReady() };
  } catch {
    checks.mongodb = { ok: false, detail: 'unavailable' };
  }

  return { ready: Object.values(checks).every((c) => c.ok), checks };
}
