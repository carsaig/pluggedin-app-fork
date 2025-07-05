'use client';

import { Activity, BarChart3, Calendar, Download, Star, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { registryVPClient, ServerStats } from '@/lib/registry/pluggedin-registry-vp-client';
import { cn } from '@/lib/utils';
import { McpServer } from '@/types/mcp-server';

import { ActivityFeed } from './activity-feed';
import { GrowthChart } from './growth-chart';
import { ServerHealthIndicator } from './server-health-indicator';

interface ServerAnalyticsDashboardProps {
  server: McpServer;
  profileUuid: string;
}

export function ServerAnalyticsDashboard({ server, profileUuid }: ServerAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const fetchServerStats = async () => {
    try {
      // If server has external_id (from registry), fetch stats from VP API
      if (server.external_id) {
        const serverStats = await registryVPClient.getServerStats(server.external_id);
        setStats(serverStats);
      }
    } catch (error) {
      console.error('Failed to fetch server stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchServerStats, 300000);
    return () => clearInterval(interval);
  }, [server.external_id]);

  // Metric cards data
  const metricsData = [
    {
      title: t('analytics.totalInstalls', 'Total Installs'),
      value: stats?.installation_count || 0,
      icon: Download,
      color: 'blue',
      trend: { value: 12.5, isPositive: true }, // Mock trend for now
    },
    {
      title: t('analytics.activeInstalls', 'Active Installs'),
      value: stats?.active_installs || 0,
      icon: Activity,
      color: 'green',
      trend: { value: 8.3, isPositive: true },
    },
    {
      title: t('analytics.avgRating', 'Average Rating'),
      value: stats?.rating ? `${stats.rating.toFixed(1)} ⭐` : 'N/A',
      icon: Star,
      color: 'yellow',
      trend: { value: 0.2, isPositive: true },
    },
    {
      title: t('analytics.dailyActiveUsers', 'Daily Active Users'),
      value: stats?.daily_active_users || 0,
      icon: Users,
      color: 'purple',
      trend: { value: 15.0, isPositive: true },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="24h">{t('analytics.last24h', 'Last 24h')}</TabsTrigger>
            <TabsTrigger value="7d">{t('analytics.last7d', 'Last 7 days')}</TabsTrigger>
            <TabsTrigger value="30d">{t('analytics.last30d', 'Last 30 days')}</TabsTrigger>
            <TabsTrigger value="all">{t('analytics.allTime', 'All time')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsData.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', `text-${metric.color}-500`)} />
                    {metric.title}
                  </span>
                  {metric.trend && (
                    <Badge 
                      variant={metric.trend.isPositive ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {metric.trend.isPositive ? '+' : ''}{metric.trend.value}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('analytics.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="performance">{t('analytics.performance', 'Performance')}</TabsTrigger>
          <TabsTrigger value="activity">{t('analytics.activity', 'Activity')}</TabsTrigger>
          <TabsTrigger value="insights">{t('analytics.insights', 'Insights')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Installation Growth */}
            <GrowthChart 
              metric="installs" 
              defaultPeriod="week"
            />

            {/* Server Health */}
            <ServerHealthIndicator 
              serverId={server.external_id}
            />
          </div>

          {/* Rating Distribution */}
          {stats && stats.rating_count > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {t('analytics.ratingDistribution', 'Rating Distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    // Mock distribution for now
                    const percentage = rating === 5 ? 60 : rating === 4 ? 25 : rating === 3 ? 10 : rating === 2 ? 3 : 2;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-12">{rating} ⭐</span>
                        <Progress value={percentage} className="flex-1" />
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <ServerHealthIndicator serverId={server.external_id} />
          
          {/* API Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('analytics.apiUsage', 'API Usage')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('analytics.apiUsageComingSoon', 'Detailed API usage metrics coming soon...')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityFeed 
            type="install" 
            limit={50}
            className="h-[600px]"
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Usage Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('analytics.usagePatterns', 'Usage Patterns')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('analytics.usagePatternsDesc', 'Peak usage times and patterns will be displayed here.')}
                </p>
              </CardContent>
            </Card>

            {/* User Retention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('analytics.userRetention', 'User Retention')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('analytics.userRetentionDesc', 'User retention metrics will be displayed here.')}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}