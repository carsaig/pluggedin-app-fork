'use server';

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';

import { getMcpServers } from '@/app/actions/mcp-servers';
import { 
  convertMcpToLangchainTools, 
  McpServerCleanupFn,
  EnhancedLogCapture
} from '@/lib/langchain-mcp-tools-ts/dist/langchain-mcp-tools.js';
import {
  LogEntry
} from '@/lib/langchain-mcp-tools-ts/dist/logger.js';

// Cache for Anthropic models with last fetch time
interface ModelCache {
  models: Array<{id: string, name: string}>;
  lastFetched: Date;
}

const anthropicModelsCache: ModelCache = {
  models: [],
  lastFetched: new Date(0) // Set to epoch time initially
};

// Store active sessions with cleanup functions
interface McpPlaygroundSession {
  agent: ReturnType<typeof createReactAgent>;
  cleanup: McpServerCleanupFn;
  lastActive: Date;
  logs: LogEntry[];
}

// Map to store active sessions by profile UUID
const activeSessions: Map<string, McpPlaygroundSession> = new Map();

// Clean up sessions that haven't been active for more than 30 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

function cleanupInactiveSessions() {
  const now = new Date();
  for (const [profileUuid, session] of activeSessions.entries()) {
    if (now.getTime() - session.lastActive.getTime() > SESSION_TIMEOUT) {
      // Run cleanup function and delete from activeSessions
      session.cleanup().catch(console.error);
      activeSessions.delete(profileUuid);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupInactiveSessions, 10 * 60 * 1000);

// Function to safely process message content
function safeProcessContent(content: any): any {
  if (content === null || content === undefined) {
    return 'No content';
  }
  
  if (typeof content === 'string') {
    return content;
  }
  
  // Handle arrays - preserve structure for frontend visualization
  if (Array.isArray(content)) {
    try {
      // Return array directly if it's not too large
      if (content.length <= 100) {
        return content;
      }
      // For larger arrays, convert to string
      return content.map(item => {
        if (typeof item === 'object') {
          return JSON.stringify(item);
        }
        return String(item);
      }).join('\n');
    } catch (e) {
      return `[Array content: ${content.length} items]`;
    }
  }
  
  // Handle objects - preserve structure for frontend visualization
  if (typeof content === 'object') {
    try {
      // Special handling for objects with type and text fields (common pattern in some frameworks)
      if (content.type === 'text' && typeof content.text === 'string') {
        return content.text;
      }
      
      // If it has a toString method that's not the default Object.toString
      if (content.toString && content.toString !== Object.prototype.toString) {
        const stringValue = content.toString();
        if (stringValue !== '[object Object]') {
          return stringValue;
        }
      }
      
      // Check if object is not too complex (fewer than 100 keys at top level)
      if (Object.keys(content).length <= 100) {
        // Return object directly for frontend visualization
        return content;
      }
      
      // Last resort: stringify the object
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return `[Complex object: ${Object.keys(content).join(', ')}]`;
    }
  }
  
  // For any other types
  return String(content);
}

// Initialize chat model based on provider
function initChatModel(config: {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const { provider, model, temperature = 0, maxTokens } = config;
  
  if (provider === 'openai') {
    return new ChatOpenAI({
      modelName: model,
      temperature,
      maxTokens,
    });
  } else if (provider === 'anthropic') {
    return new ChatAnthropic({
      modelName: model,
      temperature,
      maxTokens,
    });
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Fetch available Anthropic models
export async function getAnthropicModels() {
  try {
    // Check if cache is still valid (less than 24 hours old)
    const now = new Date();
    const cacheAge = now.getTime() - anthropicModelsCache.lastFetched.getTime();
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (cacheAge < CACHE_TTL && anthropicModelsCache.models.length > 0) {
      // Use cached data
      return { 
        success: true, 
        models: anthropicModelsCache.models,
        fromCache: true
      };
    }
    
    // Need to fetch from API
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error("Anthropic API key not found");
    }
    
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Format and filter for Claude models only
    const claudeModels = data.models
      .filter((model: any) => model.id.startsWith('claude'))
      .map((model: any) => ({
        id: model.id,
        name: formatModelName(model.id)
      }));
    
    // Update cache
    anthropicModelsCache.models = claudeModels;
    anthropicModelsCache.lastFetched = now;
    
    return { 
      success: true, 
      models: claudeModels,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching Anthropic models:', error);
    
    // Return cached data if available, even if outdated
    if (anthropicModelsCache.models.length > 0) {
      return { 
        success: true, 
        models: anthropicModelsCache.models,
        fromCache: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Helper to format model names for display
function formatModelName(modelId: string): string {
  if (modelId.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet';
  if (modelId.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
  if (modelId.includes('claude-3-opus')) return 'Claude 3 Opus';
  if (modelId.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
  if (modelId.includes('claude-3-haiku')) return 'Claude 3 Haiku';
  
  // For any other models, capitalize and format nicely
  return modelId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Get or create a playground session for a profile
export async function getOrCreatePlaygroundSession(
  profileUuid: string,
  selectedServerUuids: string[],
  llmConfig: {
    provider: 'openai' | 'anthropic';
    model: string;
    temperature?: number;
    maxTokens?: number;
    logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  }
) {
  // If session exists and is active, return it
  const existingSession = activeSessions.get(profileUuid);
  if (existingSession) {
    // Update last active timestamp
    existingSession.lastActive = new Date();
    return { 
      success: true,
      logs: existingSession.logs
    };
  }

  // Create a enhanced log capture instance for detailed logs
  const enhancedLogCapture = new EnhancedLogCapture();

  try {
    // Get all MCP servers for the profile
    const allServers = await getMcpServers(profileUuid);
    
    // Filter servers based on selected UUIDs
    const selectedServers = allServers.filter(server => 
      selectedServerUuids.includes(server.uuid)
    );
    
    // Format servers for conversion
    const mcpServersConfig: Record<string, any> = {};
    selectedServers.forEach(server => {
      mcpServersConfig[server.name] = {
        command: server.command,
        args: server.args,
        env: server.env,
        url: server.url,
        type: server.type
      };
      
      // Manually add initialization log
      enhancedLogCapture.capture(
        'info', 
        `Initializing MCP server "${server.name}" (${server.type || 'custom'})`,
        undefined,
        'app'
      );
    });
    
    // Initialize LLM
    const llm = initChatModel(llmConfig);
    
    // Convert MCP servers to LangChain tools with enhanced logging
    const { tools, cleanup, logs } = await convertMcpToLangchainTools(
      mcpServersConfig,
      { 
        logLevel: llmConfig.logLevel || 'info',
        enhancedLogCapture 
      }
    );
    
    // Create agent - cast the tools array to the expected type
    const agent = createReactAgent({
      llm,
      tools: tools as any,
      checkpointSaver: new MemorySaver(),
    });
    
    // Store session with enhanced logs
    activeSessions.set(profileUuid, {
      agent,
      cleanup,
      lastActive: new Date(),
      logs: enhancedLogCapture.getAll()
    });
    
    // Return success with logs
    return { 
      success: true,
      logs: enhancedLogCapture.getAll()
    };
  } catch (error) {
    console.error('Failed to create playground session:', error);
    
    // Return error with any logs captured
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: enhancedLogCapture.getAll()
    };
  }
}

// Execute a query using the active playground session
export async function executePlaygroundQuery(
  profileUuid: string,
  query: string
) {
  const session = activeSessions.get(profileUuid);
  if (!session) {
    return { 
      success: false, 
      error: 'No active session. Start a new session before executing queries.' 
    };
  }

  // Create a new log capture for this query execution
  const queryLogCapture = new EnhancedLogCapture();
  
  // Add initial query log
  queryLogCapture.capture(
    'info',
    `Executing query: "${query}"`,
    undefined,
    'app'
  );

  try {
    // Update last active timestamp
    session.lastActive = new Date();
    
    const { agent } = session;
    const messages: { role: string; content: any; name?: string }[] = [];
    
    // Execute the query
    const result = await agent.invoke(
      {
        messages: [new HumanMessage(query)]
      },
      {
        configurable: {
          thread_id: `${profileUuid}-${Date.now()}`
        }
      }
    );
    
    // Add the user message
    messages.push({
      role: 'human',
      content: query
    });
    
    // Process tool messages from the agent trace
    if (result && result.steps) {
      for (const step of result.steps) {
        // If this is a tool action step
        if (step.action && step.action.tool) {
          const toolName = step.action.tool;
          const toolInput = step.action.toolInput;
          
          // Log tool usage
          queryLogCapture.capture(
            'info',
            `Tool called: ${toolName}`,
            toolInput,
            'execution'
          );
          
          // Add tool request message
          messages.push({
            role: 'tool_request',
            content: typeof toolInput === 'object' ? JSON.stringify(toolInput, null, 2) : String(toolInput),
            name: toolName
          });
          
          // Add tool response message if available
          if (step.observation !== undefined) {
            messages.push({
              role: 'tool',
              content: step.observation,
              name: toolName
            });
            
            // Log tool response
            queryLogCapture.capture(
              'info',
              `Tool response: ${toolName}`,
              step.observation,
              'response'
            );
          }
        }
      }
    }
    
    // Add the AI response
    if (result && result.messages && result.messages.length > 0) {
      const aiMessage = result.messages[result.messages.length - 1];
      messages.push({
        role: 'ai',
        content: safeProcessContent(aiMessage.content)
      });
      
      // Log AI response
      queryLogCapture.capture(
        'info',
        'AI response generated',
        undefined,
        'response'
      );
    }
    
    // Debug information
    const debug = {
      messageCount: messages.length,
      toolMessages: messages.filter(m => m.role === 'tool' || m.role === 'tool_request').length,
      lastMessageContentType: messages.length > 0 
        ? typeof messages[messages.length - 1].content 
        : 'none',
      agentSteps: result.steps ? result.steps.length : 0
    };
    
    // Merge query logs with session logs
    session.logs = [...session.logs, ...queryLogCapture.getAll()];
    
    return { 
      success: true, 
      messages,
      debug,
      logs: queryLogCapture.getAll()
    };
  } catch (error) {
    console.error('Error executing query:', error);
    
    // Log the error
    queryLogCapture.capture(
      'error',
      `Query execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error,
      'error'
    );
    
    // Merge error logs with session logs
    session.logs = [...session.logs, ...queryLogCapture.getAll()];
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during query execution',
      logs: queryLogCapture.getAll()
    };
  }
}

// End a playground session for a profile
export async function endPlaygroundSession(
  profileUuid: string
) {
  const session = activeSessions.get(profileUuid);
  if (session) {
    try {
      // Create a log capture for cleanup
      const cleanupLogCapture = new EnhancedLogCapture();
      
      // Log cleanup start
      cleanupLogCapture.capture(
        'info',
        'Ending MCP playground session...',
        undefined,
        'app'
      );
      
      // Run cleanup
      await session.cleanup();
      
      // Log success
      cleanupLogCapture.capture(
        'info',
        'MCP playground session ended successfully.',
        undefined,
        'connection'
      );
      
      // Remove session
      activeSessions.delete(profileUuid);
      
      return { 
        success: true,
        logs: cleanupLogCapture.getAll()
      };
    } catch (error) {
      console.error('Error ending playground session:', error);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        logs: [{
          level: 'error',
          type: 'error',
          message: `Failed to end session: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }]
      };
    }
  }
  
  return { success: true }; // Session doesn't exist, so consider it ended
} 