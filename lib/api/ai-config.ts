const REGISTRY_URL = process.env.NEXT_PUBLIC_PLUGGEDIN_REGISTRY_URL || 'http://localhost:3001';

export interface AIConfigFixRequest {
  serverData: {
    name: string;
    description?: string;
    command?: string;
    args?: string | string[];
    envs?: string[];
    type?: string;
    url?: string;
  };
  customDirectives?: string;
  userSystem?: {
    os: string;
    platform: string;
    homeDir: string;
    username?: string;
  };
}

export interface AIConfigFixResponse {
  fixed: boolean;
  original: {
    command?: string;
    args?: string | string[];
    envs?: string[];
  };
  suggestion: {
    args: string[];
    envVars: Record<string, string>;
    explanation: string;
    warnings?: string[];
    alternativeConfigs?: Array<{
      name: string;
      args: string[];
      envVars: Record<string, string>;
      description: string;
    }>;
  };
  validation: {
    isValid: boolean;
    issues: string[];
  };
  needsUserInput: boolean;
}

export interface BatchFixRequest {
  serverIds: string[];
  customDirectives?: string;
  userSystem?: {
    os: string;
    platform: string;
    homeDir: string;
  };
}

export interface BatchFixResponse {
  totalServers: number;
  processedServers: number;
  skippedServers: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    serverId: string;
    serverName: string;
    status: 'success' | 'failed' | 'error';
    suggestion?: any;
    validation?: any;
    error?: string;
  }>;
}

/**
 * Get user system information for AI configuration
 * Note: This is a client-side approximation
 */
export function getUserSystemInfo() {
  // Client-side system detection
  const platform = navigator.platform;
  const userAgent = navigator.userAgent;
  
  let os = 'Unknown';
  let platformName = 'unknown';
  
  if (userAgent.indexOf('Win') !== -1) {
    os = 'Windows_NT';
    platformName = 'win32';
  } else if (userAgent.indexOf('Mac') !== -1) {
    os = 'Darwin';
    platformName = 'darwin';
  } else if (userAgent.indexOf('Linux') !== -1) {
    os = 'Linux';
    platformName = 'linux';
  }
  
  // Approximate home directory
  const homeDir = platformName === 'win32' ? 'C:\\Users\\User' : '/Users/user';
  
  return {
    os,
    platform: platformName,
    homeDir,
    username: 'user'
  };
}

/**
 * Fix a single server configuration using AI
 */
export async function fixServerConfiguration(request: AIConfigFixRequest): Promise<AIConfigFixResponse> {
  const response = await fetch(`${REGISTRY_URL}/ai-config/fix-server`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      userSystem: request.userSystem || getUserSystemInfo()
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fix server configuration');
  }

  return response.json();
}

/**
 * Batch fix multiple server configurations
 */
export async function batchFixServers(request: BatchFixRequest): Promise<BatchFixResponse> {
  const response = await fetch(`${REGISTRY_URL}/ai-config/batch-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      userSystem: request.userSystem || getUserSystemInfo()
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to batch fix servers');
  }

  return response.json();
}

/**
 * Get servers that need configuration fixes
 */
export async function getServersNeedingFix(limit = 50): Promise<{
  count: number;
  servers: Array<{
    id: string;
    name: string;
    command?: string;
    args?: string[];
    needsFix: boolean;
  }>;
}> {
  const response = await fetch(`${REGISTRY_URL}/ai-config/servers-needing-fix?limit=${limit}`);

  if (!response.ok) {
    throw new Error('Failed to get servers needing fix');
  }

  return response.json();
}

/**
 * Check if AI configuration service is available
 */
export async function checkAIConfigStatus(): Promise<{
  available: boolean;
  model: string;
  features: string[];
}> {
  try {
    const response = await fetch(`${REGISTRY_URL}/ai-config/status`);
    
    if (!response.ok) {
      return { available: false, model: '', features: [] };
    }

    return response.json();
  } catch (error) {
    console.error('Failed to check AI config status:', error);
    return { available: false, model: '', features: [] };
  }
}

/**
 * Update server configuration in the registry
 */
export async function updateServerInRegistry(serverId: string, config: {
  command: string;
  args: string[];
  envs: string[];
}): Promise<{ success: boolean; server?: any; error?: string }> {
  try {
    const response = await fetch(`${REGISTRY_URL}/ai-config/update-server/${serverId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        success: false, 
        error: error.message || 'Failed to update server' 
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to update server in registry:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}