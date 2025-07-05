'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GrowthMetrics, registryVPClient } from '@/lib/registry/pluggedin-registry-vp-client';
import { cn } from '@/lib/utils';

interface GrowthChartProps {
  metric?: string;
  defaultPeriod?: string;
  className?: string;
}

const AVAILABLE_METRICS = [
  { value: 'installs', label: 'Installations' },
  { value: 'users', label: 'Active Users' },
  { value: 'api_calls', label: 'API Calls' },
  { value: 'servers', label: 'Servers' },
  { value: 'ratings', label: 'Ratings' },
];

export function GrowthChart({ 
  metric: initialMetric = 'installs', 
  defaultPeriod = 'week',
  className 
}: GrowthChartProps) {
  const { t } = useTranslation();
  const [metric, setMetric] = useState(initialMetric);
  const [period, setPeriod] = useState(defaultPeriod);
  const [data, setData] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const formatMetricLabel = (value: string) => {
    const metric = AVAILABLE_METRICS.find(m => m.value === value);
    return metric ? t(`analytics.metrics.${value}`, metric.label) : value;
  };

  const fetchGrowthData = async () => {
    try {
      setLoading(true);
      const growthData = await registryVPClient.getGrowthMetrics(metric, period);
      setData(growthData);
    } catch (error) {
      console.error('Failed to fetch growth metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthData();
  }, [metric, period]);

  if (loading && !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.current === undefined || data.previous === undefined) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {formatMetricLabel(metric)} {t('analytics.growth', 'Growth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('analytics.noDataAvailable', 'No data available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Simple sparkline visualization
  const renderSparkline = () => {
    if (!data.trend_data || data.trend_data.length === 0) return null;

    const values = data.trend_data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const height = 100;
    const width = 300;
    const step = width / (values.length - 1);

    const points = values
      .map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
        {/* Add dots for data points */}
        {values.map((value, index) => {
          const x = index * step;
          const y = height - ((value - min) / range) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="currentColor"
              className="text-primary"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {(data.growth_rate ?? 0) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              {formatMetricLabel(metric)} {t('analytics.growth', 'Growth')}
            </CardTitle>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-bold">
                {data.current.toLocaleString()}
              </span>
              {data.growth_rate !== undefined && (
                <Badge
                  variant={data.growth_rate >= 0 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {data.growth_rate >= 0 ? '+' : ''}{data.growth_rate.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              vs {data.previous.toLocaleString()} {t('analytics.previous', 'previous')} {period}
            </p>
          </div>
          <div className="space-y-2">
            <Tabs value={metric} onValueChange={setMetric}>
              <TabsList className="grid grid-cols-2 w-[200px]">
                {AVAILABLE_METRICS.slice(0, 2).map(m => (
                  <TabsTrigger key={m.value} value={m.value} className="text-xs">
                    {t(`analytics.metrics.${m.value}`, m.label)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="grid grid-cols-3 w-[200px]">
                <TabsTrigger value="day" className="text-xs">
                  {t('analytics.period.day', 'Day')}
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs">
                  {t('analytics.period.week', 'Week')}
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs">
                  {t('analytics.period.month', 'Month')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {renderSparkline()}
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">
                {t('analytics.momentum', 'Momentum')}
              </p>
              <p className={cn(
                'font-medium',
                data.momentum > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {data.momentum > 0 ? t('analytics.accelerating', 'Accelerating') : t('analytics.decelerating', 'Decelerating')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">
                {t('analytics.periodTotal', 'Period Total')}
              </p>
              <p className="font-medium">
                {data.current.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}