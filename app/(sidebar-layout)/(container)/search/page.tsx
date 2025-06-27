'use client';

import { 
  Search, 
  Filter, 
  Layers, 
  SortDesc, 
  Package, 
  Github, 
  Globe,
  Sparkles,
  CheckCircle,
  X,
  ChevronDown
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { getMcpServers } from '@/app/actions/mcp-servers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { McpServerSource } from '@/db/schema';
import { useAuth } from '@/hooks/use-auth';
import { useProfiles } from '@/hooks/use-profiles';
import { useRegistryCategories } from '@/hooks/use-registry-categories';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { useCategoryCounts } from '@/hooks/use-category-counts';
import { McpServer } from '@/types/mcp-server';
import { McpIndex, McpServerCategory, PaginatedSearchResult } from '@/types/search';
import { getCategoryIcon } from '@/utils/categories';
import { cn } from '@/lib/utils';

import CardGrid from './components/CardGrid';
import { PaginationUi } from './components/PaginationUi';
import { BatchFixDialog } from './components/BatchFixDialog';

const PAGE_SIZE = 12;

type SortOption = 'relevance' | 'popularity' | 'recent' | 'stars' | 'name';

function SearchContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL params
  const query = searchParams.get('query') || '';
  const offset = parseInt(searchParams.get('offset') || '0');
  const sortParam = (searchParams.get('sort') as SortOption) || 'relevance';
  const categoryParam = searchParams.get('category') || '';
  const featuredParam = searchParams.get('featured') === 'true';
  const verifiedParam = searchParams.get('verified') === 'true';
  
  // State
  const [searchQuery, setSearchQuery] = useState(query);
  const [sort, setSort] = useState<SortOption>(sortParam);
  const [category, setCategory] = useState<McpServerCategory | ''>(
    categoryParam as McpServerCategory || ''
  );
  const [showFeatured, setShowFeatured] = useState(featuredParam);
  const [showVerified, setShowVerified] = useState(verifiedParam);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [showBatchFix, setShowBatchFix] = useState(false);
  
  const { currentProfile } = useProfiles();
  const { session } = useAuth();
  const currentUsername = session?.user?.username;
  const profileUuid = currentProfile?.uuid;
  const isAdmin = useIsAdmin();
  
  // Debug logging
  useEffect(() => {
    console.log('Search Page Admin Check:', {
      isAdmin,
      adminEnvVar: process.env.NEXT_PUBLIC_ADMIN_USERS,
      userEmail: session?.user?.email
    });
  }, [isAdmin, session]);
  
  // Use registry categories
  const { categories: registryCategories } = useRegistryCategories();
  const { counts: categoryCounts } = useCategoryCounts();
  
  // Group categories by theme
  const categorizedCategories = useMemo(() => {
    const groups: Record<string, McpServerCategory[]> = {
      'Development': ['Code', 'Developer Tools', 'Design', 'Data', 'File Management'],
      'Communication': ['Chat', 'Email', 'Social', 'News'],
      'Productivity': ['Productivity', 'Project Management', 'Notes', 'Automation'],
      'Business': ['Business', 'Finance', 'Marketing', 'Jobs', 'Legal'],
      'Entertainment': ['Entertainment', 'Gaming', 'Music', 'Video', 'Photos'],
      'Learning': ['Education', 'Language', 'Science', 'Math'],
      'Lifestyle': ['Health', 'Fitness', 'Food', 'Travel', 'Shopping', 'Home'],
      'Other': ['AI', 'Crypto', 'Internet of Things', 'Security', 'Search', 'Utilities', 'Weather']
    };
    
    return groups;
  }, []);

  // Fetch installed servers
  const { data: installedServersData } = useSWR(
    profileUuid ? `${profileUuid}/installed-mcp-servers` : null,
    async () => profileUuid ? getMcpServers(profileUuid) : []
  );

  // Create installed server map
  const installedServerMap = useMemo(() => {
    const map = new Map<string, string>();
    if (installedServersData) {
      installedServersData.forEach((server: McpServer) => {
        if (server.source && server.external_id) {
          map.set(`${server.source}:${server.external_id}`, server.uuid);
        }
      });
    }
    return map;
  }, [installedServersData]);

  // Build API URL with all filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    if (category) {
      params.set('category', category);
    }
    if (showFeatured) {
      params.set('featured', 'true');
    }
    if (showVerified) {
      params.set('verified', 'true');
    }
    
    // Calculate page from offset
    const page = Math.floor(offset / PAGE_SIZE) + 1;
    params.set('page', page.toString());
    params.set('limit', PAGE_SIZE.toString());
    params.set('format', 'paginated');
    
    // Temporarily use registry directly for demo
    return `http://localhost:3001/servers?${params.toString()}`;
  }, [searchQuery, category, showFeatured, showVerified, offset]);

  // Fetch search results
  const { data, error, isLoading, mutate } = useSWR<PaginatedSearchResult>(
    apiUrl,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText} - ${errorText}`);
      }
      const response = await res.json();
      
      // Handle both paginated and non-paginated responses
      const registryServers = response.servers || response;
      const pagination = response.pagination;
      
      // Convert registry format to our SearchIndex format
      const results: SearchIndex = {};
      
      for (const server of registryServers) {
        const key = `registry:${server.id}`;
        
        // Map registry server to McpIndex format
        const mcpServer: McpIndex = {
          name: server.name,
          description: server.description,
          command: server.command || (server.npmPackage ? 'npx' : ''),
          args: server.args || (server.npmPackage ? [server.npmPackage] : []),
          envs: server.envs || [],
          githubUrl: server.repositoryUrl,
          package_name: server.npmPackage || null,
          github_stars: null,
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
      
      // Use pagination data if available, otherwise estimate
      const total = pagination ? pagination.total : offset + registryServers.length + 1;
      const hasMore = pagination ? pagination.hasMore : registryServers.length === PAGE_SIZE;
      
      return {
        results,
        total,
        offset,
        pageSize: PAGE_SIZE,
        hasMore
      } as PaginatedSearchResult;
    }
  );

  // Sort results
  const sortedResults = useMemo(() => {
    if (!data?.results) return {};
    
    const entries = Object.entries(data.results);
    
    switch (sort) {
      case 'name':
        entries.sort(([, a], [, b]) => a.name.localeCompare(b.name));
        break;
      case 'stars':
        entries.sort(([, a], [, b]) => (b.github_stars || 0) - (a.github_stars || 0));
        break;
      case 'recent':
        entries.sort(([, a], [, b]) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        break;
      case 'popularity':
        entries.sort(([, a], [, b]) => 
          (b.package_download_count || 0) - (a.package_download_count || 0)
        );
        break;
      default:
        // relevance - keep original order
        break;
    }
    
    return Object.fromEntries(entries);
  }, [data?.results, sort]);

  // Update URL when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      
      if (searchQuery) params.set('query', searchQuery);
      if (category) params.set('category', category);
      if (showFeatured) params.set('featured', 'true');
      if (showVerified) params.set('verified', 'true');
      if (sort !== 'relevance') params.set('sort', sort);
      params.set('offset', '0'); // Reset to first page
      
      router.push(`/search?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, category, showFeatured, showVerified, sort]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('offset', ((page - 1) * PAGE_SIZE).toString());
    router.push(`/search?${params.toString()}`);
  };

  // Render category icon
  const renderCategoryIcon = (cat: McpServerCategory) => {
    const iconName = getCategoryIcon(cat);
    const IconComponent = (LucideIcons as Record<string, any>)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <Layers className="h-4 w-4" />;
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto py-6 px-4">
          <div className="flex flex-col space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('search.title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('search.subtitle')}
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search.input.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-12 text-lg"
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showFeatured ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFeatured(!showFeatured)}
                className="gap-2"
              >
                <Sparkles className="h-3 w-3" />
                Featured
              </Button>
              
              <Button
                variant={showVerified ? "default" : "outline"}
                size="sm"
                onClick={() => setShowVerified(!showVerified)}
                className="gap-2"
              >
                <CheckCircle className="h-3 w-3" />
                Verified
              </Button>
              
              {/* Admin AI Fix Button */}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchFix(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Fix All
                </Button>
              )}
              
              {/* Sort Dropdown */}
              <div className="ml-auto">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="h-8 px-3 text-sm rounded-md border border-input bg-background"
                >
                  <option value="relevance">{t('search.sortOptions.relevance')}</option>
                  <option value="name">{t('search.sortOptions.name')}</option>
                  <option value="popularity">{t('search.sortOptions.popularity')}</option>
                  <option value="recent">{t('search.sortOptions.recent')}</option>
                  <option value="stars">{t('search.sortOptions.stars')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card className="sticky top-28">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Categories
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoriesOpen(!categoriesOpen)}
                  >
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      categoriesOpen && "rotate-180"
                    )} />
                  </Button>
                </div>
                
                <Collapsible open={categoriesOpen}>
                  <CollapsibleContent>
                    <div className="space-y-1">
                      <Button
                        variant={!category ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setCategory('')}
                      >
                        All Categories
                      </Button>
                      
                      {Object.entries(categorizedCategories).map(([group, cats]) => (
                        <div key={group} className="mt-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {group}
                          </p>
                          {cats.map(cat => (
                            <Button
                              key={cat}
                              variant={category === cat ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full justify-start gap-2"
                              onClick={() => setCategory(cat)}
                            >
                              {renderCategoryIcon(cat)}
                              <span className="truncate">{t(`search.categories.${cat}`)}</span>
                              {categoryCounts[cat] && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {categoryCounts[cat]}
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Active Filters */}
            {(category || showFeatured || showVerified) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {category && (
                  <Badge variant="secondary" className="gap-1">
                    {renderCategoryIcon(category)}
                    {t(`search.categories.${category}`)}
                    <button onClick={() => setCategory('')}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                )}
                
                {showFeatured && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Featured
                    <button onClick={() => setShowFeatured(false)}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                )}
                
                {showVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                    <button onClick={() => setShowVerified(false)}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCategory('');
                    setShowFeatured(false);
                    setShowVerified(false);
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Results Count */}
            {data && (
              <p className="text-sm text-muted-foreground mb-4">
                {data.total} {data.total === 1 ? 'result' : 'results'} found
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            )}

            {/* Results Grid */}
            {error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {t('search.error')}
                  </p>
                </CardContent>
              </Card>
            ) : sortedResults && Object.keys(sortedResults).length > 0 ? (
              <>
                <CardGrid
                  items={sortedResults}
                  installedServerMap={installedServerMap}
                  currentUsername={currentUsername}
                  profileUuid={profileUuid}
                  onRefreshNeeded={() => mutate()}
                />
                
                {/* Pagination */}
                {data && data.total > PAGE_SIZE && (
                  <div className="mt-8">
                    <PaginationUi
                      currentPage={Math.floor(offset / PAGE_SIZE) + 1}
                      totalPages={Math.ceil(data.total / PAGE_SIZE)}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {t('search.noResults')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Batch Fix Dialog */}
      <BatchFixDialog 
        open={showBatchFix} 
        onOpenChange={setShowBatchFix} 
      />
    </div>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('search.loading')}</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}