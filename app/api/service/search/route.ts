import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getServerRatingMetrics } from '@/app/actions/mcp-server-metrics';
import { db } from '@/db';
import { McpServerSource, profilesTable, projectsTable, sharedMcpServersTable, users } from '@/db/schema';
import { registryVPClient } from '@/lib/registry/pluggedin-registry-vp-client';
import { transformPluggedinRegistryToMcpIndex } from '@/lib/registry/registry-transformer';
import type { PaginatedSearchResult, SearchIndex } from '@/types/search';
// Legacy imports - commented out as these sources are deprecated
// import {
//   fetchAwesomeMcpServersList,
//   getGitHubRepoAsMcpServer,
//   getRepoPackageJson,
//   searchGitHubRepos,
// } from '@/utils/github';
// import { getNpmPackageAsMcpServer, searchNpmPackages } from '@/utils/npm';
// import {
//   fetchSmitheryServerDetails,
//   getMcpServerFromSmitheryServer,
//   updateMcpServerWithDetails,
// } from '@/utils/smithery';

// Cache TTL in minutes for each source
const CACHE_TTL: Record<McpServerSource, number> = {
  [McpServerSource.PLUGGEDIN]: 1440, // 24 hours
  [McpServerSource.COMMUNITY]: 15, // 15 minutes - community content may change frequently
  [McpServerSource.REGISTRY]: 1, // 1 minute for registry - to quickly reflect newly claimed servers
};

// Note: We no longer cache all registry servers since VP API provides efficient filtering

/**
 * Search for MCP servers
 * Default source: all sources
 * 
 * @param request NextRequest object
 * @returns NextResponse with search results
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const source = (url.searchParams.get('source') as McpServerSource) || null;
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
  const sort = url.searchParams.get('sort') as 'relevance' | 'popularity' | 'recent' | 'stars' | null;
  
  // New filter parameters for VP API
  const packageRegistry = url.searchParams.get('packageRegistry') as 'npm' | 'docker' | 'pypi' | null;
  const repositorySource = url.searchParams.get('repositorySource');
  const latestOnly = url.searchParams.get('latest') === 'true';
  const version = url.searchParams.get('version');

  try {
    let results: SearchIndex = {};

    // If source is specified, only search that source
    if (source) {
      // Handle community source (keep existing functionality)
      if (source === McpServerSource.COMMUNITY) {
        results = await searchCommunity(query, true, sort); // Pass flag to exclude claimed servers and sort option
        const paginated = paginateResults(results, offset, pageSize);
        return NextResponse.json(paginated);
      }

      // Handle registry source - stats already included from VP API
      if (source === McpServerSource.REGISTRY) {
        results = await searchRegistry(query, { packageRegistry, repositorySource, latestOnly, version }, sort);
        const paginated = paginateResults(results, offset, pageSize);
        return NextResponse.json(paginated);
      }

      // For PLUGGEDIN source, check cache
      if (source === McpServerSource.PLUGGEDIN) {
        const cachedResults = await checkCache(source, query);
        
        if (cachedResults) {
          // Enrich cached results with metrics
          const enrichedResults = await enrichWithMetrics(cachedResults);
          // Paginate enriched results
          const paginatedResults = paginateResults(enrichedResults, offset, pageSize);
          return NextResponse.json(paginatedResults);
        }
        
        // TODO: Implement PLUGGEDIN source search
        // For now, return empty results
        return NextResponse.json({
          results: {},
          total: 0,
          offset,
          pageSize,
          hasMore: false,
        } as PaginatedSearchResult);
      }
      
      // Any other source is unsupported
      return NextResponse.json({
        results: {},
        total: 0,
        offset,
        pageSize,
        hasMore: false,
      } as PaginatedSearchResult);
    }
    
    // If no source specified, search registry and community
    const registryEnabled = process.env.REGISTRY_ENABLED !== 'false';
    
    if (registryEnabled) {
      // Get registry results - these already include stats from VP API
      const registryResults = await searchRegistry(query, { packageRegistry, repositorySource, latestOnly, version }, sort);
      Object.assign(results, registryResults);
    }
    
    // Always include community results - these need local metrics enrichment
    const communityResults = await searchCommunity(query, false, sort); // Include claimed servers when showing all
    Object.assign(results, communityResults);
    
    // Apply sorting to combined results if specified and not relevance
    if (sort && sort !== 'relevance') {
      results = sortResults(results, sort);
    }
    
    // Paginate and return results
    const paginatedResults = paginateResults(results, offset, pageSize);
    return NextResponse.json(paginatedResults);
  } catch (_error) {
    console.error('Search error:', _error);
    console.error('Error stack:', _error instanceof Error ? _error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to search for MCP servers' },
      { status: 500 }
    );
  }
}

interface RegistryFilters {
  packageRegistry?: 'npm' | 'docker' | 'pypi' | null;
  repositorySource?: string | null;
  latestOnly?: boolean;
  version?: string | null;
}

/**
 * Search for MCP servers in the Plugged.in Registry using VP API
 */
async function searchRegistry(query: string, filters: RegistryFilters = {}, sort?: string | null): Promise<SearchIndex> {
  console.log('searchRegistry called with query:', query, 'filters:', filters, 'sort:', sort);
  try {
    // Use VP API to get servers with stats included
    const servers = await registryVPClient.searchServersWithStats(query, McpServerSource.REGISTRY);
    
    // Transform and index
    const indexed: SearchIndex = {};
    for (const server of servers) {
      const mcpIndex = transformPluggedinRegistryToMcpIndex(server);
      
      // Add stats from VP API response
      mcpIndex.installation_count = server.installation_count || 0;
      mcpIndex.rating = server.rating || 0;
      mcpIndex.ratingCount = server.rating_count || 0;
      
      // Debug log for special servers
      if (server.name?.includes('youtube') || server.name?.includes('sqlite')) {
        console.log('[Search API] Transforming server with stats:', {
          name: server.name,
          packages: server.packages,
          stats: {
            installation_count: server.installation_count,
            rating: server.rating,
            rating_count: server.rating_count
          },
          transformed: mcpIndex
        });
      }
      
      indexed[server.id] = mcpIndex;
    }
    
    console.log(`[Search API] Found ${Object.keys(indexed).length} servers with stats`);
    
    // Apply sorting if specified (since VP API doesn't support sort yet)
    if (sort && sort !== 'relevance') {
      return sortResults(indexed, sort);
    }
    
    // Return results - no need to enrich with metrics as stats are already included
    return indexed;
    
  } catch (error) {
    console.error('Registry search failed:', error);
    return {}; // Return empty results on error
  }
}


/**
 * Sort search results based on the specified sort option
 */
function sortResults(results: SearchIndex, sort: string): SearchIndex {
  const entries = Object.entries(results);
  let sortedEntries: [string, McpIndex][];
  
  switch (sort) {
    case 'popularity':
      sortedEntries = entries.sort((a, b) => {
        const aCount = a[1].installation_count || 0;
        const bCount = b[1].installation_count || 0;
        return bCount - aCount;
      });
      break;
      
    case 'recent':
      sortedEntries = entries.sort((a, b) => {
        // Use updated_at for sorting recent items
        const aDate = a[1].updated_at ? new Date(a[1].updated_at).getTime() : 0;
        const bDate = b[1].updated_at ? new Date(b[1].updated_at).getTime() : 0;
        return bDate - aDate;
      });
      break;
      
    case 'stars':
      sortedEntries = entries.sort((a, b) => {
        const aRating = a[1].rating || 0;
        const bRating = b[1].rating || 0;
        // Sort by rating first, then by rating count as a tiebreaker
        if (aRating !== bRating) {
          return bRating - aRating;
        }
        const aCount = a[1].ratingCount || 0;
        const bCount = b[1].ratingCount || 0;
        return bCount - aCount;
      });
      break;
      
    default:
      // Default to original order (relevance)
      sortedEntries = entries;
  }
  
  return Object.fromEntries(sortedEntries);
}

/**
 * Enrich search results with rating and installation metrics
 */
async function enrichWithMetrics(results: SearchIndex): Promise<SearchIndex> {
  const enrichedResults = { ...results };
  
  for (const [_key, server] of Object.entries(enrichedResults)) {
    if (!server.source || !server.external_id) {
      continue;
    }
    
    try {
      // Get metrics for this server
      const metricsResult = await getServerRatingMetrics({
        source: server.source,
        externalId: server.external_id
      });
      
      if (metricsResult.success && metricsResult.metrics) {
        // Add metrics to server data
        server.rating = metricsResult.metrics.averageRating;
        server.ratingCount = metricsResult.metrics.ratingCount;
        server.installation_count = metricsResult.metrics.installationCount;
      }
    } catch (_error) {
      console.error(`Failed to get metrics for ${_key}:`, _error);
      // Continue with next server even if metrics fail
    }
  }
  
  return enrichedResults;
}

/**
 * Search for MCP servers in Smithery
 * DEPRECATED - Legacy source no longer supported
 * 
 * @param query Search query
 * @returns SearchIndex of results
 */
/*
async function searchSmithery(query: string): Promise<SearchIndex> {
  const apiKey = process.env.SMITHERY_API_KEY;
  if (!apiKey) {
    throw new Error('SMITHERY_API_KEY is not defined');
  }

  const url = new URL('https://registry.smithery.ai/servers');
  if (query) {
    url.searchParams.append('q', query);
  }
  url.searchParams.append('pageSize', '50'); // Get a reasonable number of results

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Smithery API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as SmitherySearchResponse;
  
  // Convert to our SearchIndex format
  const results: SearchIndex = {};
  
  for (const server of data.servers) {
    let mcpServer = getMcpServerFromSmitheryServer(server);
    try {
      // Fetch details to get command/args/url
      const details = await fetchSmitheryServerDetails(server.qualifiedName);
      mcpServer = updateMcpServerWithDetails(mcpServer, details);
    } catch (detailError) {
      console.error(`Failed to fetch details for Smithery server ${server.qualifiedName}:`, detailError);
      // Continue with the basic info if details fail
    }
    results[server.qualifiedName] = mcpServer;
  }

  // Enrich results with metrics
  return await enrichWithMetrics(results);
}
*/

/**
 * Search for MCP servers on NPM
 * DEPRECATED - Legacy source no longer supported
 * 
 * @param query Search query
 * @returns SearchIndex of results
 */
/*
async function searchNpm(query: string): Promise<SearchIndex> {
  try {
    const data = await searchNpmPackages(query);
    
    // Convert to our SearchIndex format
    const results: SearchIndex = {};
    
    for (const item of data.objects) {
      const mcpServer = getNpmPackageAsMcpServer(item.package);
      results[item.package.name] = mcpServer;
    }
    
    // Enrich results with metrics
    return await enrichWithMetrics(results);
  } catch (_error) {
    console.error('NPM search error:', _error);
    return {}; // Return empty results on error
  }
}
*/

/**
 * Search for MCP servers on GitHub
 * DEPRECATED - Legacy source no longer supported
 * 
 * @param query Search query
 * @returns SearchIndex of results
 */
/*
async function searchGitHub(query: string): Promise<SearchIndex> {
  try {
    // Try to search GitHub for repos
    const repos = await searchGitHubRepos(query);
    
    // Also fetch from awesome-mcp-servers list if no query
    let awesomeRepos: any[] = [];
    if (!query) {
      try {
        awesomeRepos = await fetchAwesomeMcpServersList();
      } catch (_error) {
        console.error('Error fetching awesome-mcp-servers list:', _error);
      }
    }
    
    // Combine and deduplicate
    const allRepos = [...repos];
    for (const repo of awesomeRepos) {
      if (!allRepos.some(r => r.full_name === repo.full_name)) {
        allRepos.push(repo);
      }
    }
    
    // Convert to our SearchIndex format
    const results: SearchIndex = {};
    
    for (const repo of allRepos) {
      // Try to fetch package.json for better metadata
      let packageJson = null;
      try {
        packageJson = await getRepoPackageJson(repo);
      } catch (_error) {
        // Continue without package.json
      }
      
      const mcpServer = getGitHubRepoAsMcpServer(repo, packageJson);
      results[repo.full_name] = mcpServer;
    }
    
    // Enrich results with metrics
    return await enrichWithMetrics(results);
  } catch (_error) {
    console.error('GitHub search error:', _error);
    return {}; // Return empty results on error
  }
}
*/

/**
 * Search for community MCP servers - implementation to show shared servers
 * 
 * @param query Search query
 * @param excludeClaimed Whether to exclude servers that have been claimed
 * @param sort Sort option
 * @returns SearchIndex of results
 */
async function searchCommunity(query: string, excludeClaimed: boolean = true, sort?: string | null): Promise<SearchIndex> {
  try {
    // Get shared MCP servers, joining through profiles and projects to get user info
    const sharedServersQuery = db
      .select({
        sharedServer: sharedMcpServersTable,
        profile: profilesTable,
        user: users, // Select user data
      })
      .from(sharedMcpServersTable)
      .innerJoin(profilesTable, eq(sharedMcpServersTable.profile_uuid, profilesTable.uuid))
      .innerJoin(projectsTable, eq(profilesTable.project_uuid, projectsTable.uuid)) // Join to projects
      .innerJoin(users, eq(projectsTable.user_id, users.id)) // Join to users
      .where((() => {
        const conditions = [eq(sharedMcpServersTable.is_public, true)];
        
        if (excludeClaimed) {
          conditions.push(eq(sharedMcpServersTable.is_claimed, false));
        }
        
        if (query) {
          conditions.push(
            or(
              ilike(sharedMcpServersTable.title, `%${query}%`),
              ilike(sharedMcpServersTable.description || '', `%${query}%`),
              ilike(users.username, `%${query}%`), // Search by username from users table
              ilike(users.email, `%${query}%`) // Also search by user email
            )!
          );
        }
        
        return and(...conditions);
      })());

    // Apply sorting based on sort parameter
    if (sort === 'recent') {
      sharedServersQuery.orderBy(desc(sharedMcpServersTable.created_at));
    } else if (sort === 'popularity') {
      // For now, order by created_at until we have install count in the query
      sharedServersQuery.orderBy(desc(sharedMcpServersTable.created_at));
    } else if (sort === 'stars') {
      // For now, order by created_at until we have rating in the query
      sharedServersQuery.orderBy(desc(sharedMcpServersTable.created_at));
    } else {
      // Default: relevance (order by created_at for consistency)
      sharedServersQuery.orderBy(desc(sharedMcpServersTable.created_at));
    }
    
    sharedServersQuery.limit(50); // Limit to 50 results

    const resultsWithJoins = await sharedServersQuery;

    // Convert to our SearchIndex format
    const results: SearchIndex = {};

    for (const { sharedServer, user } of resultsWithJoins) {
      // We'll use the template field which contains the sanitized MCP server data
      const template = sharedServer.template as Record<string, any>;

      if (!template) continue;

      // Create an entry with metadata from the shared server
      const serverKey = `${sharedServer.uuid}`;

      // Fetch rating metrics for this shared server
      let rating = 0;
      let ratingCount = 0;
      let installationCount = 0; // Declare installationCount here
      try {
        // For community servers, metrics are linked via external_id (which is the sharedServer.uuid) and source
        const metricsResult = await getServerRatingMetrics({ // Pass args as a single object
          source: McpServerSource.COMMUNITY,
          externalId: sharedServer.uuid
        });
        if (metricsResult.success && metricsResult.metrics) {
          rating = metricsResult.metrics.averageRating;
          ratingCount = metricsResult.metrics.ratingCount;
          installationCount = metricsResult.metrics.installationCount; // Assign value here
        }
      } catch (metricsError) {
        console.error(`Failed to get metrics for community server ${serverKey}:`, metricsError);
      }

      // Determine the display name for 'shared_by' - Use username from users table first, then fallback
      const sharedByName = user?.username || 'Unknown User';
      const profileUrl = user?.username ? `/to/${user.username}` : null;

      results[serverKey] = {
        name: sharedServer.title,
        description: sharedServer.description || '',
        command: template.command || '',
        args: template.args || [],
        envs: Array.isArray(template.env) ? template.env : Object.keys(template.env || {}),
        url: template.url || null,
        source: McpServerSource.COMMUNITY,
        external_id: sharedServer.uuid,
        githubUrl: null,
        package_name: null,
        github_stars: null,
        package_registry: null,
        package_download_count: null,
        // Add additional metadata
        category: template.category,
        tags: template.tags,
        qualifiedName: `community:${sharedServer.uuid}`,
        updated_at: sharedServer.updated_at.toISOString(),
        // Add shared_by and profile URL
        shared_by: sharedByName,
        shared_by_profile_url: profileUrl,
        rating: rating,
        ratingCount: ratingCount,
        installation_count: installationCount, // Use the declared variable
        // Add claim information
        is_claimed: sharedServer.is_claimed || false,
        claimed_by_user_id: sharedServer.claimed_by_user_id || null,
        claimed_at: sharedServer.claimed_at ? sharedServer.claimed_at.toISOString() : null,
        registry_server_uuid: sharedServer.registry_server_uuid || null,
      };
    }

    console.log(`Found ${Object.keys(results).length} community servers`);
    
    // Apply sorting if specified and not relevance
    if (sort && sort !== 'relevance') {
      return sortResults(results, sort);
    }
    
    return results; // Return directly as metrics are fetched inside
  } catch (error) {
    console.error('Community search error:', error);
    return {}; // Return empty results on error
  }
}

/**
 * Check cache for search results
 * 
 * @param source Source to check
 * @param query Search query
 * @returns SearchIndex if cache hit, null if miss
 */
async function checkCache(source: McpServerSource, query: string): Promise<SearchIndex | null> {
  const cachedEntry = await db.query.searchCacheTable.findFirst({
    where: (table, { eq, and, gt }) => (
      and(
        eq(table.source, source),
        eq(table.query, query),
        gt(table.expires_at, new Date())
      )
    ),
  });

  if (cachedEntry) {
    return cachedEntry.results as SearchIndex;
  }

  return null;
}


/**
 * Paginate search results
 * 
 * @param results Full search results
 * @param offset Offset for pagination
 * @param pageSize Page size
 * @returns Paginated results
 */
function paginateResults(results: SearchIndex, offset: number, pageSize: number): PaginatedSearchResult {
  const keys = Object.keys(results);
  const totalResults = keys.length;
  
  const paginatedKeys = keys.slice(offset, offset + pageSize);
  const paginatedResults: SearchIndex = {};
  
  for (const key of paginatedKeys) {
    paginatedResults[key] = results[key];
  }
  
  return {
    results: paginatedResults,
    total: totalResults,
    offset,
    pageSize,
    hasMore: offset + pageSize < totalResults,
  };
}