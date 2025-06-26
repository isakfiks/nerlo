import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let statsCache = {
  families: 1,
  tasksCompleted: 1,
  totalEarned: 5,
  lastUpdated: Date.now()
};

let apiCallCount = 0;
const CACHE_DURATION = 30000;
const CALL_LIMIT = 10;

async function fetchRealStats() {
  try {
    const { count: familiesCount } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true });

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { data: earningsData } = await supabase
      .from('tasks')
      .select('reward')
      .eq('status', 'approved')
      .not('reward', 'is', null);

    const totalEarned = earningsData?.reduce((sum, task) => sum + (task.reward || 0), 0) || 0;

    return {
      families: Math.max(1, familiesCount || 1),
      tasksCompleted: Math.max(1, tasksCount || 1),
      totalEarned: Math.max(5, totalEarned)
    };
  } catch (error) {
    console.error('Error fetching real stats:', error);
    // Fallback (if other fails)
    return {
      families: 1,
      tasksCompleted: 1,
      totalEarned: 5
    };
  }
}

export async function GET() {
  try {
    apiCallCount++;
    const now = Date.now();
    
    const shouldUpdate = apiCallCount >= CALL_LIMIT || 
                        (now - statsCache.lastUpdated) > CACHE_DURATION;
    
    if (shouldUpdate) {
      const newStats = await fetchRealStats();
      statsCache = {
        ...newStats,
        lastUpdated: now
      };
      apiCallCount = 0; // Reset count
    }

    const formatNumber = (num: number) => {
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k+`;
      }
      return `${num}+`;
    };

    const response = {
      families: formatNumber(statsCache.families),
      tasksCompleted: formatNumber(statsCache.tasksCompleted),
      totalEarned: `$${formatNumber(statsCache.totalEarned)}`,
      lastUpdated: statsCache.lastUpdated,
      nextUpdate: Math.max(0, CACHE_DURATION - (now - statsCache.lastUpdated))
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Stats API error:', error);
    
    // Fallback stats
    return NextResponse.json({
      families: '1+',
      tasksCompleted: '1+',
      totalEarned: '$5+',
      lastUpdated: Date.now(),
      nextUpdate: 30000
    });
  }
}
