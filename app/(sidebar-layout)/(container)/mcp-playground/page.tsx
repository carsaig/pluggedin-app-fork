'use client';

import {
  Activity,
  CheckCircle,
  Code,
  Loader2,
  MinusCircle,
  Play,
  Power,
  Send,
  Server,
  Settings,
  Terminal,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import {
  endPlaygroundSession,
  executePlaygroundQuery,
  getOrCreatePlaygroundSession,
} from '@/app/actions/mcp-playground';
import {
  getMcpServers,
  toggleMcpServerStatus,
} from '@/app/actions/mcp-servers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { McpServerStatus } from '@/db/schema';
import { useProfiles } from '@/hooks/use-profiles';
import { useToast } from '@/hooks/use-toast';
import { McpServer } from '@/types/mcp-server';

// Connection status type
type McpServerConnectionStatus = 
  | 'CONNECTED'     // Successfully connected
  | 'CONNECTING'    // In the process of connecting
  | 'FAILED'        // Failed to connect
  | 'DISCONNECTED'; // Not attempted connection

export default function McpPlaygroundPage() {
  const { toast } = useToast();
  const { currentProfile } = useProfiles();
  const profileUuid = currentProfile?.uuid || '';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // State for LLM configuration
  const [llmConfig, setLlmConfig] = useState({
    provider: 'anthropic',
    model: 'claude-3-7-sonnet-20250219',
    temperature: 0,
    maxTokens: 1000,
    logLevel: 'info',
  });

  // State for selected servers (will now use active servers instead of selection)
  const [isUpdatingServer, setIsUpdatingServer] = useState<string | null>(null);

  // State for session
  const [isSessionActive, setIsSessionActive] = useState(false);

  // State for chat
  const [messages, setMessages] = useState<
    {
      role: string;
      content: string;
      debug?: string;
      timestamp?: Date;
    }[]
  >([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // State for client logs
  const [clientLogs, setClientLogs] = useState<
    {
      type: 'info' | 'error' | 'connection' | 'execution' | 'response' | 'debug' | 'warn' | 'trace' | 'fatal';
      message: string;
      timestamp: Date;
    }[]
  >([]);

  // Log filter state
  const [logFilters, setLogFilters] = useState<{
    [key in 'info' | 'error' | 'connection' | 'execution' | 'response' | 'debug' | 'warn' | 'trace' | 'fatal']: boolean
  }>({
    info: true,
    error: true,
    connection: true,
    execution: true,
    response: true,
    debug: true,
    warn: true,
    trace: true,
    fatal: true
  });
  
  // Toggle log filter
  const toggleLogFilter = (type: keyof typeof logFilters) => {
    setLogFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // Filtered logs
  const filteredLogs = clientLogs.filter(log => logFilters[log.type]);

  // Auto scroll to bottom of messages and logs
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, clientLogs]);

  // Helper to add a log entry
  const addLog = (type: 'info' | 'error' | 'connection' | 'execution' | 'response' | 'debug' | 'warn' | 'trace' | 'fatal', message: string) => {
    // Strip any remaining ANSI color codes that might have been missed
    const cleanMessage = message.replace(/\u001b\[\d+(;\d+)*m/g, '');
    setClientLogs(prev => [...prev, { type, message: cleanMessage, timestamp: new Date() }]);
  };

  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<Record<string, McpServerConnectionStatus>>({});

  // Fetch MCP servers
  const {
    data: mcpServers,
    isLoading,
    mutate,
  } = useSWR(profileUuid ? `${profileUuid}/mcp-servers` : null, () =>
    getMcpServers(profileUuid)
  );

  // Server name to UUID mapping for log processing
  const serverNameToUuid = useMemo(() => {
    const mapping: Record<string, string> = {};
    mcpServers?.forEach(server => {
      mapping[server.name] = server.uuid;
    });
    return mapping;
  }, [mcpServers]);

  // Toggle server status
  const toggleServerStatus = async (serverUuid: string, status: boolean) => {
    if (!profileUuid) return;

    try {
      setIsUpdatingServer(serverUuid);
      addLog(
        'info',
        `Toggling server ${serverUuid} status to ${status ? 'ACTIVE' : 'INACTIVE'}...`
      );

      await toggleMcpServerStatus(
        profileUuid,
        serverUuid,
        status ? McpServerStatus.ACTIVE : McpServerStatus.INACTIVE
      );

      addLog('connection', `Server status updated successfully`);
      await mutate();
    } catch (error) {
      console.error('Error toggling server status:', error);
      addLog(
        'error',
        `Failed to update server status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      toast({
        title: 'Error',
        description: 'Failed to update server status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingServer(null);
    }
  };

  // Start session
  const startSession = async () => {
    if (mcpServers?.filter((s) => s.status === 'ACTIVE').length === 0) {
      toast({
        title: 'Error',
        description: 'Please activate at least one MCP server.',
        variant: 'destructive',
      });
      addLog('error', 'Failed to start session: No active MCP servers.');
      return;
    }

    try {
      setIsProcessing(true);
      addLog('info', 'Starting MCP playground session...');
      addLog('info', `Active servers: ${mcpServers.filter((s) => s.status === 'ACTIVE').length}`);
      addLog('info', `LLM config: ${llmConfig.provider} ${llmConfig.model} (temp: ${llmConfig.temperature}, log: ${llmConfig.logLevel})`);
      
      // Set all active servers to CONNECTING state
      const initialConnectionStatus: Record<string, McpServerConnectionStatus> = {};
      mcpServers?.filter(s => s.status === 'ACTIVE').forEach(server => {
        initialConnectionStatus[server.uuid] = 'CONNECTING';
      });
      setConnectionStatus(initialConnectionStatus);
      
      const result = await getOrCreatePlaygroundSession(
        profileUuid,
        mcpServers.filter((s) => s.status === 'ACTIVE').map((s) => s.uuid),
        {
          provider: llmConfig.provider as 'openai' | 'anthropic',
          model: llmConfig.model,
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
          logLevel: llmConfig.logLevel,
        }
      );
      
      if (result.success) {
        setIsSessionActive(true);
        setMessages([]);
        addLog('connection', 'MCP playground session started successfully.');
        
        // Add logs for each active server
        const activeServers = mcpServers.filter((s) => s.status === 'ACTIVE');
        activeServers.forEach((server) => {
          addLog('connection', `Connected to "${server.name} (${server.type})"`);
        });
        
        // Process any logs returned from the server
        processLogs(result.logs);
        
        toast({
          title: 'Success',
          description: 'MCP playground session started.',
        });
      } else {
        addLog('error', `Failed to start session: ${result.error || 'Unknown error'}`);
        
        // Process any error logs
        processLogs(result.logs);
        
        toast({
          title: 'Error',
          description: result.error || 'Failed to start session.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      addLog('error', `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // End session
  const endSession = async () => {
    try {
      setIsProcessing(true);
      addLog('info', 'Ending MCP playground session...');
      
      const result = await endPlaygroundSession(profileUuid);
      
      if (result.success) {
        setIsSessionActive(false);
        addLog('connection', 'MCP playground session ended successfully.');
        
        // Process any logs returned from the server
        processLogs(result.logs);
        
        toast({
          title: 'Success',
          description: 'MCP playground session ended.',
        });
      } else {
        addLog('error', `Failed to end session: ${result.error || 'Unknown error'}`);
        
        // Process any error logs
        processLogs(result.logs);
        
        toast({
          title: 'Error',
          description: result.error || 'Failed to end session.',
          variant: 'destructive',
        });
      }
      
      // Reset connection statuses when session ends
      setConnectionStatus({});
    } catch (error) {
      console.error('Failed to end session:', error);
      addLog('error', `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || !isSessionActive) return;

    try {
      setIsProcessing(true);
      
      // Add user message
      const userMessage = { 
        role: 'human', 
        content: inputValue,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      
      addLog('execution', `Executing query: "${userMessage.content}"`);

      // Execute query
      const result = await executePlaygroundQuery(profileUuid, userMessage.content);
      
      if (result.success) {
        addLog('response', 'Query executed successfully');
        
        // Process any logs returned from the server
        processLogs(result.logs);
        
        // Log debug information
        if (result.debug) {
          if (llmConfig.logLevel === 'info') {
            addLog('info', `Messages: ${result.debug.messageCount}, Last content type: ${result.debug.lastMessageContentType}`);
          }
        }
        
        // Add all messages from the result
        if (result.messages) {
          // Filter out messages we already have
          const currentMessageContents = messages.map(m => m.content);
          const newMessages = result.messages.filter(
            (m: any) => !currentMessageContents.includes(m.content)
          );
          
          if (newMessages.length > 0) {
            // Add timestamp to each message
            const timestampedMessages = newMessages.map((m: any) => ({
              ...m,
              timestamp: new Date()
            }));
            
            setMessages(prev => [...prev, ...timestampedMessages]);
            
            // Log tool messages separately
            timestampedMessages.forEach((msg: any) => {
              if (msg.role === 'tool') {
                addLog('execution', `Tool execution: ${msg.name || 'unknown'}`);
              }
            });
          }
        }
      } else {
        addLog('error', `Failed to execute query: ${result.error || 'Unknown error'}`);
        
        // Process any error logs
        processLogs(result.logs);
        
        toast({
          title: 'Error',
          description: result.error || 'Failed to execute query.',
          variant: 'destructive',
        });
        // Add error message to chat
        setMessages(prev => [
          ...prev, 
          { 
            role: 'ai', 
            content: `Error: ${result.error || 'Failed to execute query.'}`,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addLog('error', `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
      // Add error message to chat
      setMessages(prev => [
        ...prev, 
        { 
          role: 'ai', 
          content: 'An unexpected error occurred.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process logs returned from backend actions
  const processLogs = (logs: any[] | undefined) => {
    if (!logs || logs.length === 0) return;
    
    const newConnectionStatuses: Record<string, McpServerConnectionStatus> = { ...connectionStatus };
    
    logs.forEach(log => {
      // Determine log type based on log entry
      let logType: 'info' | 'error' | 'connection' | 'execution' | 'response' | 'debug' | 'warn' | 'trace' | 'fatal' = 'info';
      
      // If it's already an enhanced log entry with type
      if (log.type) {
        logType = log.type as any;
      } 
      // If it's a legacy log format with just level
      else if (log.level) {
        logType = log.level === 'error' ? 'error' : 
                  log.level === 'warn' ? 'warn' : 
                  log.level === 'debug' ? 'debug' : 
                  log.level === 'trace' ? 'trace' : 
                  log.level === 'fatal' ? 'fatal' : 'info';
      }
      
      // Add the log to the client logs
      addLog(logType, log.message);
      
      // Update connection status based on log message
      const serverNameMatch = log.message.match(/MCP server "([^"]+)":/);
      const serverName = serverNameMatch?.[1];
      
      if (serverName && serverNameToUuid[serverName]) {
        const serverUuid = serverNameToUuid[serverName];
        
        if (log.message.includes('connected') && log.type === 'connection') {
          newConnectionStatuses[serverUuid] = 'CONNECTED';
        } else if (log.message.includes('failed to initialize') || 
                  log.message.includes('Connection closed') ||
                  log.message.includes('MCP error')) {
          newConnectionStatuses[serverUuid] = 'FAILED';
        } else if (log.message.includes('initializing') && !newConnectionStatuses[serverUuid]) {
          newConnectionStatuses[serverUuid] = 'CONNECTING';
        }
      }
    });
    
    // Update connection statuses if any changes
    if (Object.keys(newConnectionStatuses).length > 0) {
      setConnectionStatus(prev => ({...prev, ...newConnectionStatuses}));
    }
  };

  return (
    <div className='container mx-auto py-6 space-y-6'>
      {/* Hero Section */}
      <Card className='bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-0 shadow-md overflow-hidden'>
        <CardContent className='p-6 md:p-8'>
          <div className='flex flex-col md:flex-row items-start md:items-center justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl md:text-3xl font-bold tracking-tight'>
                Playground
              </h1>
              <p className='text-muted-foreground max-w-2xl'>
                Test your MCP servers with powerful LLMs. Configure server
                connections, adjust model settings, and interact using natural
                language to see your tools in action.
              </p>
            </div>
            <div className='mt-4 md:mt-0'>
              {!isSessionActive ? (
                <Button
                  size='lg'
                  className='bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                  onClick={startSession}
                  disabled={
                    isProcessing ||
                    mcpServers?.filter((s) => s.status === 'ACTIVE').length ===
                      0
                  }>
                  <Play className='w-4 h-4 mr-2' />
                  Start Playground
                </Button>
              ) : (
                <Button
                  size='lg'
                  variant='destructive'
                  onClick={endSession}
                  disabled={isProcessing}>
                  <Power className='w-4 h-4 mr-2' />
                  End Session
                </Button>
              )}
            </div>
          </div>

          {/* Session Status Indicator */}
          {isSessionActive && (
            <div className='mt-6 flex items-center'>
              <Badge
                variant='outline'
                className='bg-green-500/10 text-green-700 border-green-200 flex items-center gap-1.5'>
                <Activity className='h-3 w-3' />
                Session Active
              </Badge>
              <Separator orientation='vertical' className='mx-3 h-4' />
              <div className='text-sm text-muted-foreground flex items-center gap-1.5'>
                <Server className='h-3.5 w-3.5' />
                {mcpServers?.filter((s) => s.status === 'ACTIVE').length ||
                  0}{' '}
                {mcpServers?.filter((s) => s.status === 'ACTIVE').length === 1
                  ? 'server'
                  : 'servers'}{' '}
                connected
              </div>
              <Separator orientation='vertical' className='mx-3 h-4' />
              <div className='text-sm text-muted-foreground flex items-center gap-1.5'>
                <Code className='h-3.5 w-3.5' />
                {llmConfig.provider}: {llmConfig.model}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Configuration Panel */}
        <div>
          <Card className='shadow-sm'>
            <CardHeader className='pb-3'>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Configure the LLM and select MCP servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue='servers'>
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger value='servers'>Servers</TabsTrigger>
                  <TabsTrigger value='llm'>Model</TabsTrigger>
                  <TabsTrigger value='logs'>Logs</TabsTrigger>
                </TabsList>
                <TabsContent value='servers' className='space-y-4 mt-4'>
                  {isLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                    </div>
                  ) : mcpServers?.length === 0 ? (
                    <div className='text-center p-6 bg-muted/50 rounded-lg'>
                      <Server className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
                      <p className='text-muted-foreground font-medium'>
                        No MCP servers configured.
                      </p>
                      <Button
                        variant='link'
                        className='mt-2'
                        onClick={() => (window.location.href = '/mcp-servers')}>
                        Go to MCP Servers
                      </Button>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {mcpServers?.map((server: McpServer) => (
                        <TooltipProvider key={server.uuid}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex items-center justify-between p-2.5 rounded-md transition-colors ${
                                  server.status === 'ACTIVE'
                                    ? 'bg-secondary/50'
                                    : 'hover:bg-muted/50'
                                }`}>
                                <div className='flex-1'>
                                  <div className='flex items-center'>
                                    <div className='font-medium'>
                                      {server.name}
                                    </div>
                                    {server.status === 'ACTIVE' ? (
                                      connectionStatus[server.uuid] ? (
                                        <Badge
                                          variant='outline'
                                          className={`ml-2 ${
                                            connectionStatus[server.uuid] === 'CONNECTED' 
                                              ? 'bg-green-500/10 text-green-700 border-green-200'
                                              : connectionStatus[server.uuid] === 'FAILED'
                                              ? 'bg-red-500/10 text-red-700 border-red-200'
                                              : 'bg-blue-500/10 text-blue-700 border-blue-200'
                                          }`}>
                                          {connectionStatus[server.uuid] === 'CONNECTED' && (
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                          )}
                                          {connectionStatus[server.uuid] === 'FAILED' && (
                                            <XCircle className="mr-1 h-3 w-3" />
                                          )}
                                          {connectionStatus[server.uuid] === 'CONNECTING' && (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          )}
                                          {connectionStatus[server.uuid]}
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant='outline'
                                          className='ml-2 bg-amber-500/10 text-amber-700 border-amber-200'>
                                          Active
                                        </Badge>
                                      )
                                    ) : (
                                      <Badge
                                        variant='outline'
                                        className='ml-2 bg-amber-500/10 text-amber-700 border-amber-200'>
                                          <MinusCircle className="mr-1 h-3 w-3" />
                                          Inactive
                                        </Badge>
                                    )}
                                  </div>
                                  <div className='text-sm text-muted-foreground flex items-center'>
                                    <Badge
                                      variant='secondary'
                                      className='mr-1.5 py-0 px-1.5 h-5 font-normal'>
                                      {server.type}
                                    </Badge>
                                    {server.description && server.description}
                                  </div>
                                </div>
                                <Switch
                                  checked={server.status === 'ACTIVE'}
                                  onCheckedChange={(checked) =>
                                    toggleServerStatus(server.uuid, checked)
                                  }
                                  disabled={
                                    isSessionActive ||
                                    isUpdatingServer === server.uuid
                                  }
                                  className='ml-2'
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side='right'>
                              <div className='space-y-1 max-w-xs'>
                                <p className='font-medium'>{server.name}</p>
                                <p className='text-xs'>{server.description}</p>
                                <p className='text-xs flex items-center space-x-1'>
                                  <span>Type:</span>
                                  <Badge
                                    variant='secondary'
                                    className='py-0 px-1.5 h-4 font-normal'>
                                    {server.type}
                                  </Badge>
                                </p>
                                {connectionStatus[server.uuid] === 'FAILED' && (
                                  <p className='text-xs text-red-600'>
                                    Connection failed
                                  </p>
                                )}
                                {server.command && (
                                  <p className='text-xs'>
                                    Command: {server.command}
                                  </p>
                                )}
                                {server.url && (
                                  <p className='text-xs'>URL: {server.url}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value='llm' className='space-y-4 mt-4'>
                  <div className='bg-muted/30 p-4 rounded-lg mb-2'>
                    <div className='text-sm font-medium mb-2'>
                      Selected Model
                    </div>
                    <div className='flex items-center'>
                      <Badge className='bg-primary/10 text-primary border-primary/20 py-1.5 px-3'>
                        {llmConfig.provider === 'anthropic'
                          ? 'Anthropic'
                          : 'OpenAI'}
                      </Badge>
                      <Separator orientation='vertical' className='mx-3 h-5' />
                      <div className='text-sm font-medium'>
                        {llmConfig.model}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='provider' className='text-sm font-medium'>
                        Provider
                      </Label>
                      <Select
                        value={llmConfig.provider}
                        onValueChange={(value) =>
                          setLlmConfig({ ...llmConfig, provider: value })
                        }
                        disabled={isSessionActive}>
                        <SelectTrigger className='mt-1.5'>
                          <SelectValue placeholder='Select provider' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='anthropic'>Anthropic</SelectItem>
                          <SelectItem value='openai'>OpenAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='model' className='text-sm font-medium'>
                        Model
                      </Label>
                      <Select
                        value={llmConfig.model}
                        onValueChange={(value) =>
                          setLlmConfig({ ...llmConfig, model: value })
                        }
                        disabled={isSessionActive}>
                        <SelectTrigger className='mt-1.5'>
                          <SelectValue placeholder='Select model' />
                        </SelectTrigger>
                        <SelectContent>
                          {llmConfig.provider === 'anthropic' ? (
                            <>
                              <SelectItem value='claude-3-7-sonnet-20250219'>
                                Claude 3.7 Sonnet
                              </SelectItem>
                              <SelectItem value='claude-3-5-sonnet-20240620'>
                                Claude 3.5 Sonnet
                              </SelectItem>
                              <SelectItem value='claude-3-opus-20240229'>
                                Claude 3 Opus
                              </SelectItem>
                              <SelectItem value='claude-3-sonnet-20240229'>
                                Claude 3 Sonnet
                              </SelectItem>
                              <SelectItem value='claude-3-haiku-20240307'>
                                Claude 3 Haiku
                              </SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value='gpt-4o-2024-05-13'>
                                GPT-4o
                              </SelectItem>
                              <SelectItem value='gpt-4o-mini-2024-07-18'>
                                GPT-4o Mini
                              </SelectItem>
                              <SelectItem value='gpt-4-turbo-2024-04-09'>
                                GPT-4 Turbo
                              </SelectItem>
                              <SelectItem value='gpt-3.5-turbo-0125'>
                                GPT-3.5 Turbo
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className='flex justify-between items-center'>
                        <Label
                          htmlFor='temperature'
                          className='text-sm font-medium'>
                          Temperature
                        </Label>
                        <span className='text-sm text-muted-foreground'>
                          {llmConfig.temperature}
                        </span>
                      </div>
                      <Input
                        id='temperature'
                        type='range'
                        min='0'
                        max='1'
                        step='0.1'
                        value={llmConfig.temperature}
                        onChange={(e) =>
                          setLlmConfig({
                            ...llmConfig,
                            temperature: parseFloat(e.target.value),
                          })
                        }
                        disabled={isSessionActive}
                        className='mt-1.5'
                      />
                      <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    <div>
                      <div className='flex justify-between items-center'>
                        <Label
                          htmlFor='maxTokens'
                          className='text-sm font-medium'>
                          Max Tokens
                        </Label>
                        <span className='text-sm text-muted-foreground'>
                          {llmConfig.maxTokens}
                        </span>
                      </div>
                      <Input
                        id='maxTokens'
                        type='range'
                        min='100'
                        max='4000'
                        step='100'
                        value={llmConfig.maxTokens}
                        onChange={(e) =>
                          setLlmConfig({
                            ...llmConfig,
                            maxTokens: parseInt(e.target.value),
                          })
                        }
                        disabled={isSessionActive}
                        className='mt-1.5'
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value='logs' className='space-y-4 mt-4'>
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='text-sm font-medium flex items-center'>
                      <Terminal className='w-4 h-4 mr-1.5' />
                      MCP Client Logs
                    </div>
                    {clientLogs.length > 0 && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setClientLogs([])}
                        className='h-7 text-xs'>
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Log level filters */}
                  <div className='flex flex-wrap gap-1.5 mb-2'>
                    <Badge 
                      variant={logFilters.trace ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.trace ? "bg-gray-200 hover:bg-gray-300 text-gray-700" : "text-gray-400"}`}
                      onClick={() => toggleLogFilter('trace')}
                    >
                      Trace
                    </Badge>
                    <Badge 
                      variant={logFilters.debug ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.debug ? "bg-blue-100 hover:bg-blue-200 text-blue-700" : "text-blue-400"}`}
                      onClick={() => toggleLogFilter('debug')}
                    >
                      Debug
                    </Badge>
                    <Badge 
                      variant={logFilters.info ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.info ? "bg-blue-200 hover:bg-blue-300 text-blue-800" : "text-blue-400"}`}
                      onClick={() => toggleLogFilter('info')}
                    >
                      Info
                    </Badge>
                    <Badge 
                      variant={logFilters.warn ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.warn ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800" : "text-yellow-400"}`}
                      onClick={() => toggleLogFilter('warn')}
                    >
                      Warn
                    </Badge>
                    <Badge 
                      variant={logFilters.error ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.error ? "bg-red-100 hover:bg-red-200 text-red-800" : "text-red-400"}`}
                      onClick={() => toggleLogFilter('error')}
                    >
                      Error
                    </Badge>
                    <Badge 
                      variant={logFilters.fatal ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.fatal ? "bg-red-500 hover:bg-red-600 text-white" : "text-red-400"}`}
                      onClick={() => toggleLogFilter('fatal')}
                    >
                      Fatal
                    </Badge>
                    <Separator orientation="vertical" className="h-6" />
                    <Badge 
                      variant={logFilters.connection ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.connection ? "bg-green-100 hover:bg-green-200 text-green-800" : "text-green-400"}`}
                      onClick={() => toggleLogFilter('connection')}
                    >
                      Connection
                    </Badge>
                    <Badge 
                      variant={logFilters.execution ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.execution ? "bg-amber-100 hover:bg-amber-200 text-amber-800" : "text-amber-400"}`}
                      onClick={() => toggleLogFilter('execution')}
                    >
                      Execution
                    </Badge>
                    <Badge 
                      variant={logFilters.response ? "default" : "outline"} 
                      className={`cursor-pointer ${logFilters.response ? "bg-purple-100 hover:bg-purple-200 text-purple-800" : "text-purple-400"}`}
                      onClick={() => toggleLogFilter('response')}
                    >
                      Response
                    </Badge>
                  </div>

                  <ScrollArea className='h-[calc(100vh-24rem)] border rounded-md bg-muted/20'>
                    <div className='p-3 font-mono text-xs space-y-1.5'>
                      {clientLogs.length === 0 ? (
                        <div className='text-muted-foreground text-center py-8'>
                          No logs available. Start a session to see logs.
                        </div>
                      ) : (
                        filteredLogs.map((log, index) => (
                          <div key={index} className='flex'>
                            <div className='text-muted-foreground mr-2'>
                              [{log.timestamp.toLocaleTimeString()}]
                            </div>
                            <div
                              className={`
                              ${log.type === 'info' ? 'text-blue-500' : ''}
                              ${log.type === 'debug' ? 'text-blue-300' : ''}
                              ${log.type === 'trace' ? 'text-gray-400' : ''}
                              ${log.type === 'warn' ? 'text-yellow-500' : ''}
                              ${log.type === 'error' ? 'text-red-500' : ''}
                              ${log.type === 'fatal' ? 'text-red-700 font-bold bg-red-100 px-1 rounded' : ''}
                              ${log.type === 'connection' ? 'text-green-500' : ''}
                              ${log.type === 'execution' ? 'text-amber-500' : ''}
                              ${log.type === 'response' ? 'text-purple-500' : ''}
                            `}>
                              [{log.type.toUpperCase()}] {log.message}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className='md:col-span-2'>
          <Card className='flex flex-col h-[calc(100vh-12rem)] shadow-sm'>
            <CardHeader className='pb-3'>
              <CardTitle>Chat Interface</CardTitle>
              <CardDescription>
                Test your MCP servers with natural language
              </CardDescription>
            </CardHeader>
            <CardContent className='flex-1 overflow-hidden'>
              <ScrollArea className='h-[calc(100vh-20rem)] pr-4'>
                {messages.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-full text-center p-8'>
                    <div className='bg-muted/30 rounded-full p-4 mb-4'>
                      <Settings className='h-10 w-10 text-primary/40' />
                    </div>
                    <h3 className='text-lg font-medium mb-2'>MCP Playground</h3>
                    <p className='text-muted-foreground max-w-md'>
                      {isSessionActive
                        ? 'Ask questions or give instructions to test your MCP servers. Try exploring what tools are available or request specific actions.'
                        : 'Select MCP servers and start a session to begin testing your tools with natural language.'}
                    </p>
                    {!isSessionActive && (
                      <Button
                        className='mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                        onClick={startSession}
                        disabled={
                          mcpServers?.filter((s) => s.status === 'ACTIVE')
                            .length === 0
                        }>
                        <Play className='w-4 h-4 mr-2' />
                        Start Session
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className='space-y-4 pb-1'>
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === 'human'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}>
                        <div
                          className={`rounded-lg p-3 max-w-[90%] ${
                            message.role === 'human'
                              ? 'bg-primary text-primary-foreground ml-4'
                              : message.role === 'tool'
                                ? 'bg-muted/80 border border-muted-foreground/10'
                                : 'bg-secondary'
                          }`}>
                          {message.timestamp && (
                            <div className="text-xs text-muted-foreground/70 mb-1">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          )}
                          
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                          
                          {message.debug && (
                            <details className="mt-1 text-xs opacity-50">
                              <summary className="cursor-pointer hover:text-primary">
                                Debug Info
                              </summary>
                              <div className="p-1 mt-1 bg-black/10 rounded">
                                {message.debug}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <Separator />
            <CardFooter className="p-4">
              <div className="flex w-full items-center space-x-2">
                <Textarea
                  placeholder={isSessionActive 
                    ? "Type your message..." 
                    : "Start a session to begin chatting"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={!isSessionActive || isProcessing}
                  className="flex-1 min-h-10 resize-none bg-background border-muted-foreground/20"
                />
                <Button 
                  size="icon"
                  onClick={sendMessage}
                  disabled={!isSessionActive || !inputValue.trim() || isProcessing}
                  className={`transition-all ${isProcessing ? 'animate-pulse' : ''}`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}