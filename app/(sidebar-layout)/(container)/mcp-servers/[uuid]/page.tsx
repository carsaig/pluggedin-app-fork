'use client';

// External imports
import { Activity, AlertCircle, ArrowLeft, BarChart3, Clock, Database, Globe, RefreshCw, Save, Server, Terminal, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

// Internal absolute imports (@/)
import {
  deleteMcpServerByUuid,
  getMcpServerByUuid,
  toggleMcpServerStatus,
  updateMcpServer,
} from '@/app/actions/mcp-servers';
import { getToolsForServer } from '@/app/actions/tools';
import { EnvVarsEditor } from '@/components/env-vars-editor';
import InlineEditText from '@/components/InlineEditText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StreamingCliToast } from '@/components/ui/streaming-cli-toast';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { McpServerStatus, McpServerType } from '@/db/schema';
import { useProfiles } from '@/hooks/use-profiles';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { McpServer } from '@/types/mcp-server';
import { ResourceTemplate } from '@/types/resource-template';
import type { Tool } from '@/types/tool';

import { CustomInstructionsEditor } from '../components/custom-instructions-editor'; // Import the new component
import { PromptList } from '../components/prompt-list';
// Internal relative imports
import { ResourceList } from '../components/resource-list';
import { ResourceTemplateList } from '../components/resource-template-list';

export default function McpServerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { currentProfile } = useProfiles();
  const { uuid } = use(params);
  const router = useRouter();
  const { t } = useTranslation(); // Initialize useTranslation
  const { toast } = useToast(); // Initialize useToast
  const [hasChanges, setHasChanges] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false); // Add state for discovery loading
  const [showStreamingToast, setShowStreamingToast] = useState(false);

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      command: '',
      args: '',
      env: '',
      url: '',
      type: McpServerType.STDIO,
      notes: '', // Add notes field
      headers: '', // For Streamable HTTP
      sessionId: '', // For Streamable HTTP
    },
  });

  const {
    data: mcpServer,
    error,
    mutate,
  } = useSWR(
    uuid && currentProfile?.uuid
      ? ['getMcpServerByUuid', uuid, currentProfile?.uuid]
      : null,
    () => getMcpServerByUuid(currentProfile?.uuid || '', uuid!) as Promise<McpServer | undefined>
  );

  // SWR hook for fetching resource templates
  const {
    data: _resourceTemplates,
    error: _templatesError,
    isLoading: _isLoadingTemplates,
  } = useSWR(
    uuid ? `/api/mcp-servers/${uuid}/resource-templates` : null,
    (url: string) => fetch(url).then((res) => res.json()) as Promise<ResourceTemplate[]>
  );

  // SWR hook for fetching tools
  const {
    data: serverTools,
    error: toolsError,
    isLoading: isLoadingTools,
  } = useSWR(
    uuid ? `/${uuid}/tools` : null,
    () => getToolsForServer(uuid!) as Promise<Tool[]>
  );


  // Check for Context7 migration on load
  useEffect(() => {
    if (mcpServer && mcpServer.url && mcpServer.url.includes('mcp.context7.com') && mcpServer.type === McpServerType.SSE) {
      // Auto-migrate Context7 from SSE to Streamable HTTP
      toast({
        title: 'Context7 Migration Required',
        description: 'Context7 now uses Streamable HTTP. The server type has been updated automatically.',
        variant: 'default',
      });
      form.setValue('type', McpServerType.STREAMABLE_HTTP);
    }
  }, [mcpServer, form, toast]);

  useEffect(() => {
    if (mcpServer) {
      // Extract streamableHTTPOptions from env if present
      let headers = '';
      let sessionId = '';
      
      if (mcpServer.type === McpServerType.STREAMABLE_HTTP && mcpServer.streamableHTTPOptions) {
        if (mcpServer.streamableHTTPOptions.headers) {
          headers = Object.entries(mcpServer.streamableHTTPOptions.headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        }
        sessionId = mcpServer.streamableHTTPOptions.sessionId || '';
      }
      
      form.reset({
        name: mcpServer.name,
        description: mcpServer.description || '',
        command: mcpServer.command || '',
        args: mcpServer.args?.join(' ') || '',
        env: Object.entries(mcpServer.env || {})
          .map(([key, value]) => `${key}=${value}`)
          .join('\n'),
        url: mcpServer.url || '',
        type: mcpServer.type,
        notes: mcpServer.notes || '', // Reset notes field
        headers,
        sessionId,
      });
      setHasChanges(false);
    }
  }, [mcpServer, form]);

  // Check for changes in form values
  useEffect(() => {
    // Add type for 'value' parameter
    const subscription = form.watch((value: typeof form.control._defaultValues) => {
      if (mcpServer) {
        let isDifferent =
          value.name !== mcpServer.name ||
          value.description !== (mcpServer.description || '') ||
          value.type !== mcpServer.type ||
          value.notes !== (mcpServer.notes || ''); // Check notes field
          
        if (mcpServer.type === McpServerType.STDIO) {
          isDifferent = isDifferent || 
            value.command !== (mcpServer.command || '') ||
            value.args !== (mcpServer.args?.join(' ') || '') ||
            value.env !== Object.entries(mcpServer.env || {})
              .map(([key, value]) => `${key}=${value}`)
              .join('\n');
        } else if (mcpServer.type === McpServerType.SSE) {
          isDifferent = isDifferent || value.url !== (mcpServer.url || '');
        } else if (mcpServer.type === McpServerType.STREAMABLE_HTTP) {
          isDifferent = isDifferent || value.url !== (mcpServer.url || '');
          
          // Check headers
          const currentHeaders = mcpServer.streamableHTTPOptions?.headers
            ? Object.entries(mcpServer.streamableHTTPOptions.headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            : '';
          isDifferent = isDifferent || value.headers !== currentHeaders;
          
          // Check sessionId
          const currentSessionId = mcpServer.streamableHTTPOptions?.sessionId || '';
          isDifferent = isDifferent || value.sessionId !== currentSessionId;
        }

        setHasChanges(isDifferent);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, mcpServer]);

  const onSubmit = async (data: {
    name: string;
    description: string;
    command: string;
    args: string;
    env: string;
    url: string;
    type: McpServerType;
    notes: string; // Add notes to type
    headers: string; // For Streamable HTTP
    sessionId: string; // For Streamable HTTP
  }) => {
    if (!mcpServer || !currentProfile?.uuid) {
      return;
    }

    // Process args and env before submission
    const processedData: any = {
      ...data,
      args: data.type === McpServerType.STDIO
        ? data.args
          .trim()
          .split(/\s+/)
          .filter((arg) => arg.length > 0)
          .map((arg) => arg.trim())
        : [],
      env: data.type === McpServerType.STDIO
        ? Object.fromEntries(
          data.env
            .split('\n')
            .filter((line: string) => line.includes('=')) // Add type for line
            .map((line: string) => { // Add type for line
              const [key, ...values] = line.split('=');
              return [key.trim(), values.join('=').trim()];
            })
        ) || {}
        : {},
      command: data.type === McpServerType.STDIO ? data.command : undefined,
      url: (data.type === McpServerType.SSE || data.type === McpServerType.STREAMABLE_HTTP) ? data.url : undefined,
      notes: data.notes, // Include notes in processed data
    };
    
    // Add streamableHTTPOptions for Streamable HTTP type
    if (data.type === McpServerType.STREAMABLE_HTTP) {
      const headers: Record<string, string> = {};
      if (data.headers) {
        data.headers.split('\n')
          .filter((line) => line.includes(':'))
          .forEach((line) => {
            const [key, ...values] = line.split(':');
            headers[key.trim()] = values.join(':').trim();
          });
      }
      
      processedData.streamableHTTPOptions = {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        sessionId: data.sessionId || undefined,
      };
    }

    // Ensure processedData aligns with the expected type for updateMcpServer
    // The action now accepts null for description, command, url, notes
    await updateMcpServer(currentProfile.uuid, mcpServer.uuid, processedData);
    await mutate(); // Re-fetch server data after update
    // setHasChanges(false); // Resetting form in useEffect handles this
  };

  const handleDelete = async () => {
    if (!mcpServer || !currentProfile?.uuid) {
      return;
    }
    if (confirm('Are you sure you want to delete this MCP server?')) {
      await deleteMcpServerByUuid(currentProfile.uuid, mcpServer.uuid);
      router.push('/mcp-servers');
    }
  };

  // Add handleDiscover function (adapted from ServerCard)
  const handleDiscover = () => {
    console.log('ServerDetail: handleDiscover called', { 
      profileUuid: currentProfile?.uuid, 
      serverUuid: uuid 
    });
    if (!currentProfile?.uuid || !uuid) { // Use uuid from params
      toast({ title: t('common.error'), description: t('mcpServers.errors.missingInfo'), variant: 'destructive' });
      return;
    }
    setIsDiscovering(true);
    setShowStreamingToast(true);
    console.log('ServerDetail: Discovery state set, isDiscovering: true, showStreamingToast: true');
  };

  const handleDiscoveryComplete = (success: boolean, data?: any) => {
    setIsDiscovering(false);
    if (success) {
      // Don't show additional success toast since streaming interface already shows completion
      // Just revalidate SWR data to refresh the UI
      mutate();
    } else {
      toast({ 
        title: t('common.error'), 
        description: t('mcpServers.errors.discoveryFailed'), 
        variant: 'destructive' 
      });
    }
  };


  if (error) return <div>Failed to load MCP server</div>;
  if (!mcpServer) return <div>Loading...</div>; // Keep simple loading state

  return (
    <div className="container mx-auto py-6">
      <div className='flex justify-between items-center mb-6'>
        <Button
          variant='ghost'
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/mcp-servers');
            }
          }}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'>
          <ArrowLeft size={16} />
          {t('common.backToServerList')}
        </Button>

        <div className='flex gap-2'>
          {hasChanges && (
            <Button
              variant='default'
              className="shadow-sm"
              onClick={form.handleSubmit(onSubmit)}
            >
              <Save className='h-4 w-4 mr-2' />
              {t('common.saveChanges')}
            </Button>
          )}
          {/* Analytics Button - Only show for registry servers */}
          {mcpServer.external_id && (
            <Button
              variant="outline"
              size="default"
              onClick={() => router.push(`/mcp-servers/${uuid}/analytics`)}
              className="shadow-sm"
            >
              <BarChart3 size={16} className="mr-2" />
              {t('mcpServers.actions.analytics', 'Analytics')}
            </Button>
          )}
          {/* Add Discover Button */}
          <Button
            variant="secondary"
            size="default" // Match size of other buttons potentially
            onClick={handleDiscover}
            disabled={isDiscovering}
            className="shadow-sm"
          >
            <RefreshCw size={16} className={`mr-2 ${isDiscovering ? 'animate-spin' : ''}`} />
            {isDiscovering ? t('mcpServers.actions.discovering') : t('mcpServers.actions.discover')}
          </Button>
          <Button variant='destructive' className="shadow-sm" onClick={handleDelete}>
            <Trash2 className='mr-2' size={16} />
            {t('mcpServers.actions.delete')}
          </Button>
        </div>
      </div>

      <Card className="shadow-md border-muted mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <Badge variant={mcpServer.status === McpServerStatus.ACTIVE ? "default" : "secondary"}>
                {mcpServer.status === McpServerStatus.ACTIVE ? t('mcpServers.status.active') : t('mcpServers.status.inactive')}
              </Badge>
              <Badge variant="outline">{mcpServer.type === McpServerType.STDIO ? t('mcpServers.status.stdio') : t('mcpServers.status.sse')}</Badge>
            </div>
            <Switch
              checked={mcpServer.status === McpServerStatus.ACTIVE}
              onCheckedChange={async (checked: boolean) => { // Add type for checked
                if (!currentProfile?.uuid || !mcpServer.uuid) {
                  return;
                }
                await toggleMcpServerStatus(
                  currentProfile.uuid,
                  mcpServer.uuid,
                  checked ? McpServerStatus.ACTIVE : McpServerStatus.INACTIVE
                );
                mutate();
              }}
            />
          </div>
          {/* Removed onClick wrappers */}
          <InlineEditText
            value={form.watch('name')}
            onSave={(newName: string) => form.setValue('name', newName)} // Add type
            placeholder={t('mcpServers.placeholders.serverName')}
          />
          <InlineEditText
            value={form.watch('description')}
            onSave={(newDesc: string) => form.setValue('description', newDesc)} // Add type
            placeholder={t('mcpServers.placeholders.description')}
          />
        </CardHeader>
      </Card>

      {/* Add a section that displays the import information if the server was imported */}
      {mcpServer.notes && mcpServer.notes.includes("Imported from") && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Server Origin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {mcpServer.notes}
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="details">{t('mcpServers.tabs.details')}</TabsTrigger>
            <TabsTrigger value="config">{t('mcpServers.tabs.config')}</TabsTrigger>
            <TabsTrigger value="notes">{t('mcpServers.tabs.notes')}</TabsTrigger>
            <TabsTrigger value="custom-instructions">{t('mcpServers.tabs.customInstructions')}</TabsTrigger>
            <TabsTrigger value="resources">{t('mcpServers.tabs.resources')}</TabsTrigger>
            <TabsTrigger value="templates">{t('mcpServers.tabs.templates')}</TabsTrigger>
            <TabsTrigger value="prompts">{t('mcpServers.tabs.prompts')}</TabsTrigger>
            <TabsTrigger value="tools">{t('mcpServers.tabs.tools')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-medium flex items-center">
                    <Server className="mr-2 h-4 w-4" />
                    {t('mcpServers.details.serverInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-start justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('mcpServers.details.uuid')}</span>
                    <span className="text-sm font-mono">{mcpServer.uuid}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center">
                      <Activity className="mr-1 h-4 w-4" />
                      {t('mcpServers.details.status')}
                    </span>
                    <Badge variant={mcpServer.status === McpServerStatus.ACTIVE ? "default" : "secondary"}>
                      {mcpServer.status === McpServerStatus.ACTIVE ? t('mcpServers.status.active') : t('mcpServers.status.inactive')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {t('mcpServers.details.created')}
                    </span>
                    <span className="text-sm">{new Date(mcpServer.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{t('mcpServers.details.type')}</span>
                    <div className="relative inline-block cursor-pointer group">
                      <select
                        value={form.watch('type')}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.setValue('type', e.target.value as McpServerType)} // Add type for e
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                      >
                        <option value={McpServerType.STDIO}>{t('mcpServers.status.stdio')}</option>
                        <option value={McpServerType.SSE}>{t('mcpServers.status.sse')}</option>
                        <option value={McpServerType.STREAMABLE_HTTP}>Streamable HTTP</option>
                      </select>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "group-hover:bg-muted",
                          form.watch('type') === McpServerType.SSE && "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900"
                        )}
                      >
                        {form.watch('type') === McpServerType.STDIO ? t('mcpServers.status.stdio') : 
                         form.watch('type') === McpServerType.SSE ? t('mcpServers.status.sse') : 
                         'Streamable HTTP'}
                        {form.watch('type') === McpServerType.SSE && (
                          <AlertCircle className="ml-1 h-3 w-3 inline" />
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consider adding a card for Notes preview here if desired */}

            </div>
          </TabsContent>

          <TabsContent value="config">
            <div className="grid grid-cols-1 gap-6">
              {form.watch('type') === McpServerType.STDIO ? (
                <>
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Terminal className="mr-2 h-4 w-4" />
                        {t('mcpServers.config.commandConfig')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('mcpServers.config.command')}</h3>
                        <div className="relative group cursor-text">
                          <Input
                            value={form.watch('command')}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue('command', e.target.value)} // Add type for e
                            className="bg-muted p-3 rounded-md font-mono text-sm"
                            placeholder={t('mcpServers.form.commandPlaceholder')}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('mcpServers.config.arguments')}</h3>
                        <div className="relative group cursor-text">
                          <Input
                            value={form.watch('args')}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue('args', e.target.value)} // Add type for e
                            className="bg-muted p-3 rounded-md font-mono text-sm"
                            placeholder={t('mcpServers.form.argumentsPlaceholder')}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Database className="mr-2 h-4 w-4" />
                        {t('mcpServers.config.envVars')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <EnvVarsEditor
                        value={form.watch('env')}
                        onChange={(value) => form.setValue('env', value)}
                        placeholder={t('mcpServers.form.envVarsPlaceholder')}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : form.watch('type') === McpServerType.SSE ? (
                <>
                  <Card className="shadow-sm mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center text-amber-700 dark:text-amber-400">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        SSE Transport Deprecated
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-amber-600 dark:text-amber-500 mb-3">
                        SSE transport is deprecated. Consider migrating to Streamable HTTP for better performance and features.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-900/30"
                        onClick={async () => {
                          form.setValue('type', McpServerType.STREAMABLE_HTTP);
                          toast({
                            title: 'Migration Started',
                            description: 'Server type changed to Streamable HTTP. Save changes to complete migration.',
                          });
                        }}
                      >
                        Migrate to Streamable HTTP
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        {t('mcpServers.config.serverUrl')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                    <div className="relative group cursor-text">
                      <Input
                        value={form.watch('url')}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue('url', e.target.value)} // Add type for e
                        className="bg-muted p-3 rounded-md font-mono text-sm"
                        placeholder={t('mcpServers.form.serverUrlPlaceholder')}
                      />
                    </div>
                  </CardContent>
                </Card>
                </>
              ) : (
                // Streamable HTTP configuration
                <>
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        {t('mcpServers.config.serverUrl')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="relative group cursor-text">
                        <Input
                          value={form.watch('url')}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue('url', e.target.value)}
                          className="bg-muted p-3 rounded-md font-mono text-sm"
                          placeholder="https://server.smithery.ai/@owner/server/mcp?api_key=..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Terminal className="mr-2 h-4 w-4" />
                        {t('mcpServers.form.headers')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="mb-4">
                        <Textarea
                          value={form.watch('headers')}
                          onChange={(e) => form.setValue('headers', e.target.value)}
                          className="bg-muted p-3 rounded-md font-mono text-sm min-h-[100px]"
                          placeholder="Authorization: Bearer YOUR_TOKEN&#10;X-API-Key: your-api-key&#10;Content-Type: application/json"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          One header per line in format: Header-Name: Header-Value
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Database className="mr-2 h-4 w-4" />
                        {t('mcpServers.form.sessionId')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="relative group cursor-text">
                        <Input
                          value={form.watch('sessionId')}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue('sessionId', e.target.value)}
                          className="bg-muted p-3 rounded-md font-mono text-sm"
                          placeholder={t('mcpServers.form.sessionIdPlaceholder')}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          {t('mcpServers.form.sessionIdHelp')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium">{t('mcpServers.notes.title')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={form.watch('notes')}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.setValue('notes', e.target.value)} // Add type for e
                  placeholder={t('mcpServers.notes.placeholder')}
                  className="min-h-[200px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium">{t('mcpServers.templates.title')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Render ResourceTemplateList instead of manual rendering */}
                <ResourceTemplateList serverUuid={uuid} />
                {/* Remove manual rendering logic below */}
                {/* {isLoadingTemplates && (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}
                {templatesError && (
                  <p className="text-destructive text-sm">
                    Failed to load resource templates.
                  </p>
                )}
                {!isLoadingTemplates && !templatesError && (!resourceTemplates || resourceTemplates.length === 0) && (
                  <p className="text-muted-foreground text-sm">
                    No resource templates found for this server.
                  </p>
                )}
                {!isLoadingTemplates && !templatesError && resourceTemplates && resourceTemplates.length > 0 && (
                  <div className="space-y-4">
                    {resourceTemplates.map((template) => (
                      <div key={template.uuid} className="border p-4 rounded-md bg-muted/50">
                        <p className="font-mono text-sm break-all mb-1">{template.uri_template}</p>
                        {template.template_variables && template.template_variables.length > 0 && (
                           <div className="mb-2">
                             <span className="text-xs font-medium text-muted-foreground mr-2">Variables:</span>
                             {template.template_variables.map((variable: string) => ( // Add type to variable
                               <Badge key={variable} variant="secondary" className="mr-1 font-mono text-xs">{variable}</Badge>
                             ))}
                           </div>
                         )}
                        {template.name && <p className="text-sm font-semibold mb-1">{template.name}</p>}
                        {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
                      </div>
                    ))}
                  </div>
                )} */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab Content */}
          <TabsContent value="resources">
             <Card className="shadow-sm">
               <CardHeader className="pb-2">
                 <CardTitle className="text-md font-medium">{t('mcpServers.resources.title')}</CardTitle>
               </CardHeader>
               <CardContent className="pt-0">
                 {/* Render the ResourceList component */}
                 <ResourceList serverUuid={uuid} />
               </CardContent>
             </Card>
          </TabsContent>

          {/* Add Custom Instructions Tab Content */}
          <TabsContent value="custom-instructions">
             <Card className="shadow-sm">
               <CardHeader className="pb-2">
                 <CardTitle className="text-md font-medium">{t('mcpServers.instructions.title')}</CardTitle>
               </CardHeader>
               <CardContent className="pt-0">
                 {/* Render the CustomInstructionsEditor component */}
                 {/* Need to pass profileUuid which is available via currentProfile */}
                 {currentProfile?.uuid && <CustomInstructionsEditor serverUuid={uuid} profileUuid={currentProfile.uuid} />}
               </CardContent>
             </Card>
          </TabsContent>

          {/* Prompts Tab Content */}
          <TabsContent value="prompts">
             <Card className="shadow-sm">
               <CardHeader className="pb-2">
                 <CardTitle className="text-md font-medium">{t('mcpServers.prompts.title')}</CardTitle>
               </CardHeader>
               <CardContent className="pt-0">
                 {/* Render the PromptList component */}
                 <PromptList serverUuid={uuid} />
               </CardContent>
             </Card>
          </TabsContent>

          {/* Tools Tab Content */}
          <TabsContent value="tools">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium">{t('mcpServers.tools.title')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingTools && (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}
                {toolsError && (
                  <p className="text-destructive text-sm">
                    {t('mcpServers.errors.fetchToolsFailed')}
                  </p>
                )}
                {!isLoadingTools && !toolsError && (!serverTools || serverTools.length === 0) && (
                  <p className="text-muted-foreground text-sm">
                    {t('mcpServers.tools.noTools')}
                  </p>
                )}
                {!isLoadingTools && !toolsError && serverTools && serverTools.length > 0 && (
                  <div className="space-y-4">
                    {serverTools.map((tool: Tool) => (
                      <div key={tool.uuid} className="border p-4 rounded-md bg-muted/50">
                        <p className="font-semibold text-sm mb-1">{tool.name}</p>
                        {tool.description && <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>}
                        {/* Optionally display schema preview */}
                        {tool.toolSchema && (
                          <details className="text-xs mt-2"> {/* Added margin top */}
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t('common.viewSchema')}</summary> {/* Added hover effect */}
                            {/* Use dangerouslySetInnerHTML to avoid quote escaping issues, escape quotes */}
                            <pre className="mt-1 p-2 bg-muted dark:bg-slate-800 rounded text-xs overflow-auto max-h-60">
                              {/* Correctly escape quotes for HTML */}
                              <code dangerouslySetInnerHTML={{ __html: JSON.stringify(tool.toolSchema, null, 2).replace(/"/g, '"') }} />
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </Form>
      
      {/* Streaming CLI Toast for discovery */}
      <StreamingCliToast
        isOpen={showStreamingToast}
        onClose={() => setShowStreamingToast(false)}
        title={`Discovering tools for ${mcpServer?.name || 'server'}`}
        serverUuid={uuid}
        profileUuid={currentProfile?.uuid || ''}
        onComplete={handleDiscoveryComplete}
      />
    </div>
  );
}
