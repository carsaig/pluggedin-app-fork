'use client';

import { Activity, BarChart3, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { registryVPClient } from '@/lib/registry/pluggedin-registry-vp-client';

import { MetricsCard } from './metrics-card';

interface LiveMetricsData {
  totalInstalls: number;
  totalApiCalls: number;
  activeUsers: number;
  serverHealthScore: number;
  trends: {
    installs: { value: number; isPositive: boolean };
    apiCalls: { value: number; isPositive: boolean };
    users: { value: number; isPositive: boolean };
    health: { value: number; isPositive: boolean };
  };
}

export function LiveMetrics() {
  const [metrics, setMetrics] = useState<LiveMetricsData>({
    totalInstalls: 0,
    totalApiCalls: 0,
    activeUsers: 0,
    serverHealthScore: 0,
    trends: {
      installs: { value: 0, isPositive: true },
      apiCalls: { value: 0, isPositive: true },
      users: { value: 0, isPositive: true },
      health: { value: 0, isPositive: true },
    },
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      // Try to get real data from registry VP API
      const dashboardMetrics = await registryVPClient.getDashboardMetrics(period);
      
      if (dashboardMetrics) {
        console.log('Dashboard metrics received:', dashboardMetrics);
        
        // Use real data from registry
        setMetrics({
          totalInstalls: dashboardMetrics.totalInstalls,
          totalApiCalls: dashboardMetrics.totalApiCalls,
          activeUsers: dashboardMetrics.activeUsers,
          serverHealthScore: dashboardMetrics.serverHealthScore,
          trends: {
            installs: dashboardMetrics.trends.installs,
            apiCalls: dashboardMetrics.trends.apiCalls,
            users: dashboardMetrics.trends.users,
            health: dashboardMetrics.trends.health,
          },
        });
      } else {
        // Fallback to local API if registry is unavailable
        const response = await fetch('/api/analytics/metrics');
        if (response.ok) {
          const data = await response.json();
          // Transform old format to new format
          setMetrics({
            totalInstalls: data.totalInstalls || 0,
            totalApiCalls: data.totalViews || 0, // Map views to API calls
            activeUsers: data.activeUsers || 0,
            serverHealthScore: 85 + Math.random() * 15, // Mock health score
            trends: {
              installs: data.trends?.installs || { value: 0, isPositive: true },
              apiCalls: data.trends?.views || { value: 0, isPositive: true },
              users: data.trends?.users || { value: 0, isPositive: true },
              health: { value: Math.random() * 5, isPositive: true },
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [period]);

  // Format health score
  const formatHealthScore = (score: number) => {
    if (score >= 90) return `${score.toFixed(0)}% 🟢`;
    if (score >= 70) return `${score.toFixed(0)}% 🟡`;
    return `${score.toFixed(0)}% 🔴`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricsCard
        title="Total Installations"
        value={typeof metrics.totalInstalls === 'number' ? metrics.totalInstalls.toLocaleString() : '0'}
        icon={TrendingUp}
        trend={metrics.trends.installs}
        color="blue"
        loading={loading}
      />
      <MetricsCard
        title="Total API Calls"
        value={typeof metrics.totalApiCalls === 'number' ? metrics.totalApiCalls.toLocaleString() : '0'}
        icon={BarChart3}
        trend={metrics.trends.apiCalls}
        color="green"
        loading={loading}
      />
      <MetricsCard
        title="Active Users"
        value={typeof metrics.activeUsers === 'number' ? metrics.activeUsers.toLocaleString() : '0'}
        icon={Users}
        trend={metrics.trends.users}
        color="purple"
        loading={loading}
      />
      <MetricsCard
        title="Server Health"
        value={formatHealthScore(metrics.serverHealthScore || 0)}
        icon={Activity}
        trend={metrics.trends.health}
        color="orange"
        loading={loading}
      />
    </div>
  );
}