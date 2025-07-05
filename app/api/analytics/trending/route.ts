import { NextResponse } from 'next/server';

import { registryVPClient } from '@/lib/registry/pluggedin-registry-vp-client';
import { analytics } from '@/lib/analytics/analytics-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // First, try to get trending servers from VP API
    try {
      console.log('[Trending API] Fetching from VP API...');
      const vpTrendingServers = await registryVPClient.getTrendingServers(limit);
      
      if (vpTrendingServers && vpTrendingServers.length > 0) {
        // Transform VP API data to match frontend format
        const servers = vpTrendingServers.map((server, index) => ({
          id: server.id,
          name: server.name,
          description: server.description || '',
          score: Math.round((server.rating || 0) * 20), // Convert 0-5 rating to 0-100 score
          installations: server.installation_count || 0,
          views: server.active_installs || 0, // Use active installs as a proxy for views
          rank: index + 1,
          change: server.weekly_growth ? Math.round(server.weekly_growth) : 0,
        }));
        
        console.log(`[Trending API] Found ${servers.length} trending servers from VP API`);
        return NextResponse.json({ data: servers });
      }
    } catch (vpError) {
      console.error('[Trending API] VP API failed:', vpError);
    }
    
    // Fall back to analytics service if VP API fails or returns no data
    const analyticsEnabled = process.env.ANALYTICS_ENABLED === 'true';
    
    if (analyticsEnabled) {
      console.log('[Trending API] Falling back to analytics service...');
      const trending = await analytics.getTrendingServers(limit);
      
      // The analytics API returns { servers: [...] } with each server having:
      // server_id, server_name, description, trending_score, install_growth, usage_growth, recent_installs
      const trendingData = trending && (trending as any).servers ? (trending as any).servers : trending;
      const trendingArray = Array.isArray(trendingData) ? trendingData : [];
      
      if (trendingArray.length > 0) {
        // Transform the data to match the expected format
        const servers = trendingArray.map((server: any, index: number) => {
          return {
            id: server.server_id || server.serverId,
            name: server.server_name || server.name || `Server ${index + 1}`,
            description: server.description || 'Trending MCP server',
            score: server.trending_score || server.score || 0,
            installations: server.recent_installs || server.installations || 0,
            views: server.views || 0,
            rank: index + 1,
            change: server.install_growth || 0,
          };
        });
        
        console.log(`[Trending API] Found ${servers.length} trending servers from analytics service`);
        return NextResponse.json({ data: servers });
      }
    }
    
    // If both sources fail, throw error to return empty data
    throw new Error('No trending data available from VP API or analytics service');
  } catch (error) {
    console.error('[Trending API] All sources failed:', error);
    
    // Return empty array - let the frontend handle empty state gracefully
    return NextResponse.json({ 
      data: [],
      error: 'Unable to fetch trending servers at this time'
    });
  }
}