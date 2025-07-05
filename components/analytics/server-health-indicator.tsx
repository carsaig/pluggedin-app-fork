'use client';

import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { registryVPClient, ServerHealth } from '@/lib/registry/pluggedin-registry-vp-client';
import { cn } from '@/lib/utils';

interface ServerHealthIndicatorProps {
  serverId?: string;
  className?: string;
}

export function ServerHealthIndicator({ serverId, className }: ServerHealthIndicatorProps) {
  const { t } = useTranslation();
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const healthData = await registryVPClient.getServerHealth(serverId);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to fetch server health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refresh every 2 minutes
    const interval = setInterval(fetchHealth, 120000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (loading && !health) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: t('analytics.health.excellent', 'Excellent'), color: 'text-green-600', icon: CheckCircle };
    if (score >= 70) return { label: t('analytics.health.good', 'Good'), color: 'text-yellow-600', icon: Activity };
    if (score >= 50) return { label: t('analytics.health.fair', 'Fair'), color: 'text-orange-600', icon: Clock };
    return { label: t('analytics.health.poor', 'Poor'), color: 'text-red-600', icon: AlertTriangle };
  };

  const status = getHealthStatus(health.health_score);
  const StatusIcon = status.icon;

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {serverId ? t('analytics.serverHealth', 'Server Health') : t('analytics.systemHealth', 'System Health')}
          </span>
          <Badge variant="outline" className={cn('text-xs', status.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t('analytics.healthScore', 'Health Score')}
            </span>
            <span className="text-sm font-bold">
              {health.health_score.toFixed(0)}%
            </span>
          </div>
          <Progress value={health.health_score} className="h-2" />
        </div>

        {/* Uptime */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t('analytics.uptime', 'Uptime')}
            </span>
            <span className="text-sm font-bold">
              {health.uptime_percentage.toFixed(2)}%
            </span>
          </div>
          <Progress value={health.uptime_percentage} className="h-2" />
        </div>

        {/* Response Times */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {t('analytics.responseTimes', 'Response Times')}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted">
              <p className="text-muted-foreground">P50</p>
              <p className="font-medium">{formatResponseTime(health.response_times.p50)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted">
              <p className="text-muted-foreground">P90</p>
              <p className="font-medium">{formatResponseTime(health.response_times.p90)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted">
              <p className="text-muted-foreground">P99</p>
              <p className="font-medium">{formatResponseTime(health.response_times.p99)}</p>
            </div>
          </div>
        </div>

        {/* Last Check */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {t('analytics.lastChecked', 'Last checked')}: {new Date(health.last_check).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}