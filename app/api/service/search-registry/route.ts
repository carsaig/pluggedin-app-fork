import { NextRequest, NextResponse } from 'next/server';

import { McpServerSource } from '@/db/schema';
import type { McpIndex, PaginatedSearchResult, SearchIndex } from '@/types/search';

const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3001';

/**
 * Search for MCP servers using the pluggedin-registry microservice
 * This replaces the slow multi-source search with a fast local registry
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category') || '';
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const featured = url.searchParams.get('featured') || '';
  const verified = url.searchParams.get('verified') || '';

  try {
    // Build query params for registry API
    const registryUrl = new URL(`${REGISTRY_URL}/servers`);
    
    if (query) {
      registryUrl.searchParams.append('search', query);
    }
    if (category) {
      registryUrl.searchParams.append('category', category);
    }
    if (featured) {
      registryUrl.searchParams.append('featured', featured);
    }
    if (verified) {
      registryUrl.searchParams.append('verified', verified);
    }
    
    // Calculate page from offset
    const page = Math.floor(offset / pageSize) + 1;
    registryUrl.searchParams.append('page', page.toString());
    registryUrl.searchParams.append('limit', pageSize.toString());

    // Fetch from registry
    const response = await fetch(registryUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Registry API error: ${response.status} ${response.statusText}`);
    }

    const registryServers = await response.json();
    
    // Convert registry format to our SearchIndex format
    const results: SearchIndex = {};
    
    for (const server of registryServers) {
      const key = `registry:${server.id}`;
      
      // Map registry server to McpIndex format
      const mcpServer: McpIndex = {
        name: server.name,
        description: server.description,
        command: server.command || (server.npmPackage ? 'npx' : ''), // Use npx for npm packages
        args: server.args || (server.npmPackage ? [server.npmPackage] : []),
        envs: server.envs || [],
        githubUrl: server.repositoryUrl,
        package_name: server.npmPackage || null,
        github_stars: null, // Could fetch from GitHub API if needed
        package_registry: server.npmPackage ? 'npm' : null,
        package_download_count: null,
        source: McpServerSource.PLUGGEDIN,
        external_id: server.id,
        category: server.category,
        tags: server.tags || [],
        updated_at: server.updatedAt,
        url: server.websiteUrl || null,
        
        // Registry-specific fields
        verified: server.verified,
        featured: server.featured,
        
        // Claim information
        shared_by: server.claimedBy || server.author,
        shared_by_profile_url: server.claimedBy ? `/to/${server.claimedBy}` : null,
      };
      
      results[key] = mcpServer;
    }
    
    // For now, assume we got all results (registry doesn't return total count yet)
    const hasMore = registryServers.length === pageSize;
    
    const paginatedResult: PaginatedSearchResult = {
      results,
      total: offset + registryServers.length + (hasMore ? 1 : 0), // Estimate
      offset,
      pageSize,
      hasMore
    };

    return NextResponse.json(paginatedResult);
  } catch (error) {
    console.error('Registry search error:', error);
    
    // Fallback to empty results if registry is down
    return NextResponse.json({
      results: {},
      total: 0,
      offset,
      pageSize,
      hasMore: false,
      error: 'Registry service unavailable'
    } as PaginatedSearchResult);
  }
}

/**
 * Check if a server would be a duplicate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${REGISTRY_URL}/servers/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Registry API error: ${response.status}`);
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicate' },
      { status: 500 }
    );
  }
}