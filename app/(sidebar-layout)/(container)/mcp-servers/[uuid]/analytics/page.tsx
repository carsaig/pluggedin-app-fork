'use client';

import { ArrowLeft, BarChart3, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { getMcpServerByUuid } from '@/app/actions/mcp-servers';
import { ServerAnalyticsDashboard } from '@/components/analytics/server-analytics-dashboard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfiles } from '@/hooks/use-profiles';
import { McpServer } from '@/types/mcp-server';

export default function McpServerAnalyticsPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { currentProfile } = useProfiles();

  const {
    data: mcpServer,
    error,
    isLoading,
  } = useSWR(
    uuid && currentProfile?.uuid
      ? ['getMcpServerByUuid', uuid, currentProfile?.uuid]
      : null,
    () => getMcpServerByUuid(currentProfile?.uuid || '', uuid!) as Promise<McpServer | undefined>
  );

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">
            {t('error.serverNotFound', 'Server not found')}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t('error.serverNotFoundDesc', 'The server you are looking for does not exist or you do not have access to it.')}
          </p>
          <Button onClick={() => router.push('/mcp-servers')} className="mt-4">
            {t('common.backToServers', 'Back to Servers')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !mcpServer) {
    return (
      <div className="container py-8">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/mcp-servers/${uuid}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              {mcpServer.name} {t('analytics.title', 'Analytics')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('analytics.serverAnalyticsDesc', 'View detailed analytics and performance metrics for this server')}
            </p>
          </div>
        </div>
        <Link href={`/mcp-servers/${uuid}`}>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            {t('common.backToDetails', 'Back to Details')}
          </Button>
        </Link>
      </div>

      {/* Analytics Dashboard */}
      <ServerAnalyticsDashboard 
        server={mcpServer}
        profileUuid={currentProfile?.uuid || ''}
      />
    </div>
  );
}