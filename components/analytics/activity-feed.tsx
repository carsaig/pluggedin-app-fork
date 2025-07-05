'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Download, Search, Star, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityEvent, registryVPClient } from '@/lib/registry/pluggedin-registry-vp-client';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  limit?: number;
  type?: string;
  className?: string;
}

const getEventIcon = (type: ActivityEvent['type']) => {
  switch (type) {
    case 'install':
      return <Download className="h-4 w-4 text-blue-500" />;
    case 'rating':
      return <Star className="h-4 w-4 text-yellow-500" />;
    case 'search':
      return <Search className="h-4 w-4 text-green-500" />;
    case 'api_call':
      return <Zap className="h-4 w-4 text-purple-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
};

const getEventText = (event: ActivityEvent, t: any) => {
  switch (event.type) {
    case 'install':
      return t('analytics.activity.install', '{{server}} was installed', {
        server: event.server_name || 'Unknown server',
      });
    case 'rating':
      return t('analytics.activity.rating', '{{server}} received a rating', {
        server: event.server_name || 'Unknown server',
      });
    case 'search':
      return t('analytics.activity.search', 'Search for "{{query}}"', {
        query: event.details?.query || 'unknown',
      });
    case 'api_call':
      return t('analytics.activity.apiCall', 'API call to {{endpoint}}', {
        endpoint: event.details?.endpoint || '/unknown',
      });
    case 'error':
      return t('analytics.activity.error', 'Error on {{server}}', {
        server: event.server_name || 'Unknown server',
      });
    default:
      return t('analytics.activity.unknown', 'Unknown activity');
  }
};

export function ActivityFeed({ limit = 20, type, className }: ActivityFeedProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const data = await registryVPClient.getActivityFeed(limit, type);
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    // Refresh every 10 seconds for real-time feel
    const interval = setInterval(fetchActivity, 10000);
    return () => clearInterval(interval);
  }, [limit, type]);

  if (loading && events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t('analytics.activityFeed', 'Activity Feed')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return t('analytics.justNow', 'Just now');
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return t('analytics.minutesAgo', '{{count}} min ago', { count: minutes });
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return t('analytics.hoursAgo', '{{count}} hr ago', { count: hours });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t('analytics.activityFeed', 'Activity Feed')}
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {t('analytics.live', 'Live')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('analytics.noActivity', 'No activity yet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <motion.div
                  key={event.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    'hover:bg-accent/50 transition-colors'
                  )}
                >
                  <div className="mt-0.5">{getEventIcon(event.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{getEventText(event, t)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}