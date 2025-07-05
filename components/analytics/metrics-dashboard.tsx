'use client';

import { Clock, Package, Rocket, Search, Sparkles, Star, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardMetrics, registryVPClient } from '@/lib/registry/pluggedin-registry-vp-client';
import { cn } from '@/lib/utils';

import { MetricsCard } from '../metrics-card';

interface MetricsDashboardProps {
  className?: string;
}

export function MetricsDashboard({ className }: MetricsDashboardProps) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await registryVPClient.getDashboardMetrics(period);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh every minute
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [period]);

  if (loading && !metrics) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Period Selector */}
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
          <TabsList>
            <TabsTrigger value="day">{t('analytics.period.day', 'Day')}</TabsTrigger>
            <TabsTrigger value="week">{t('analytics.period.week', 'Week')}</TabsTrigger>
            <TabsTrigger value="month">{t('analytics.period.month', 'Month')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title={t('analytics.totalInstalls', 'Total Installations')}
          value={metrics.totalInstalls.toLocaleString()}
          icon={TrendingUp}
          trend={metrics.trends.installs}
          color="blue"
          loading={loading}
        />
        <MetricsCard
          title={t('analytics.totalApiCalls', 'Total API Calls')}
          value={metrics.totalApiCalls.toLocaleString()}
          icon={Zap}
          trend={metrics.trends.apiCalls}
          color="green"
          loading={loading}
        />
        <MetricsCard
          title={t('analytics.activeUsers', 'Active Users')}
          value={metrics.activeUsers.toLocaleString()}
          icon={Sparkles}
          trend={metrics.trends.users}
          color="purple"
          loading={loading}
        />
        <MetricsCard
          title={t('analytics.serverHealth', 'Server Health')}
          value={`${metrics.serverHealthScore.toFixed(0)}%`}
          icon={Clock}
          trend={metrics.trends.health}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Additional Widgets */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Install Velocity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              {t('analytics.installVelocity', 'Install Velocity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.installVelocity}/hr</div>
            <p className="text-xs text-muted-foreground">
              {t('analytics.currentRate', 'Current rate')}
            </p>
          </CardContent>
        </Card>

        {/* New Servers Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('analytics.newServersToday', 'New Servers Today')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newServersToday}</div>
            <p className="text-xs text-muted-foreground">
              {t('analytics.addedToday', 'Added today')}
            </p>
          </CardContent>
        </Card>

        {/* Top Rated Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              {t('analytics.topRated', 'Top Rated')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.topRatedCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('analytics.fiveStarServers', '5-star servers')}
            </p>
          </CardContent>
        </Card>

        {/* Search Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t('analytics.searchSuccess', 'Search Success')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.searchSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {t('analytics.conversionRate', 'Conversion rate')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Featured Servers */}
      {(metrics.hottestServer || metrics.newestServer) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {metrics.hottestServer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  {t('analytics.hottestServer', 'Hottest Server')}
                  <Badge variant="secondary" className="ml-auto">
                    {t('analytics.trending', 'Trending')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold">{metrics.hottestServer.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {metrics.hottestServer.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>⭐ {metrics.hottestServer.rating?.toFixed(1) || 'N/A'}</span>
                  <span>📦 {metrics.hottestServer.installation_count || 0} installs</span>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics.newestServer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  {t('analytics.newestServer', 'Newest Server')}
                  <Badge variant="secondary" className="ml-auto">
                    {t('analytics.new', 'New')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold">{metrics.newestServer.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {metrics.newestServer.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>⭐ {metrics.newestServer.rating?.toFixed(1) || 'N/A'}</span>
                  <span>📦 {metrics.newestServer.installation_count || 0} installs</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}