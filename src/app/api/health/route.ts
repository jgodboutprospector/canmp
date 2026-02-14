import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import v8 from 'v8';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, 'healthy' | 'unhealthy' | 'degraded'> = {};

  // Check database connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('users').select('count').limit(1).single();
      checks.database = error ? 'degraded' : 'healthy';
    } else {
      checks.database = 'unhealthy';
    }
  } catch {
    checks.database = 'unhealthy';
  }

  // Check memory usage against the configured heap limit (--max-old-space-size),
  // not the current allocation which starts small and grows on demand.
  const memoryUsage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
  checks.memory = heapUsedMB < heapLimitMB * 0.85 ? 'healthy' : 'degraded';

  const allHealthy = Object.values(checks).every(v => v === 'healthy');
  const anyUnhealthy = Object.values(checks).some(v => v === 'unhealthy');

  const status = anyUnhealthy ? 'unhealthy' : (allHealthy ? 'healthy' : 'degraded');

  const response = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    responseTime: Date.now() - startTime,
    checks,
    memory: {
      heapUsedMB,
      heapTotalMB,
      heapLimitMB,
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    version: process.env.npm_package_version || 'unknown',
  };

  return NextResponse.json(response, {
    status: anyUnhealthy ? 503 : 200
  });
}
