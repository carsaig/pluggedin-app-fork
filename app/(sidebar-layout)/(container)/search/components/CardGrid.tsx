'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle,
  Check,
  CheckCircle,
  Download,
  ExternalLink,
  Github,
  Globe,
  Package,
  Shield,
  Sparkles,
  Star,
  Terminal,
  ThumbsUp,
  Trash,
  UserPlus,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { McpServerSource, McpServerType } from '@/db/schema';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { InstallDialog } from './InstallDialog';
import { AuthRequiredDialog } from './AuthRequiredDialog';
import { RateServerDialog } from './RateServerDialog';
import { ReviewsDialog } from './ReviewsDialog';

function ServerTypeBadge({ serverType }: { serverType?: 'STDIO' | 'Streamable HTTP' | 'SSE' | 'HTTP' }) {
  if (!serverType) {
    return null;
  }

  const isHttp = serverType === 'Streamable HTTP' || serverType === 'HTTP' || serverType === 'SSE';
  const icon = isHttp ? <Globe className="h-3 w-3" /> : <Terminal className="h-3 w-3" />;
  const text = isHttp ? 'HTTP' : 'STDIO';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1">
            {icon}
            {text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{serverType} Server</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {category}
    </Badge>
  );
}

export default function CardGrid({
  items,
  installedServerMap,
  currentUsername,
  onRefreshNeeded,
  profileUuid,
  selectable = false,
  selectedItems = [],
  onItemSelect,
}: {
  items: SearchIndex;
  installedServerMap: Map<string, string>;
  currentUsername?: string | null;
  onRefreshNeeded?: () => void;
  profileUuid?: string;
  selectable?: boolean;
  selectedItems?: string[];
  onItemSelect?: (serverId: string, selected: boolean) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated, signIn } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authDialogMessage, setAuthDialogMessage] = useState<{ key: string; defaultMsg: string } | null>(null);

  // Helper function to check authentication
  const requireAuth = (descriptionKey: string, descriptionDefault: string): boolean => {
    if (!isAuthenticated) {
      setAuthDialogMessage({ key: descriptionKey, defaultMsg: descriptionDefault });
      setShowAuthDialog(true);
      return false;
    }
    return true;
  };

  const [selectedServer, setSelectedServer] = useState<{
    name: string;
    description: string;
    command: string;
    args: string;
    env: string;
    url: string | undefined;
    type: McpServerType;
    source?: McpServerSource;
    external_id?: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // For rating dialog
  const [rateServer, setRateServer] = useState<{
    name: string;
    source?: McpServerSource;
    external_id?: string;
  } | null>(null);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  // State for reviews dialog
  const [reviewServer, setReviewServer] = useState<{
    name: string;
    source?: McpServerSource;
    external_id?: string;
  } | null>(null);
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);

  const handleInstallClick = (key: string, item: any) => {
    if (!requireAuth('auth:loginToInstall', 'You must be logged in to install servers.')) return;
    
    const isSSE = item.url || false;
    
    setSelectedServer({
      name: item.name,
      description: item.description,
      command: isSSE ? '' : item.command || '',
      args: isSSE ? '' : (Array.isArray(item.args) ? item.args.join(' ') : item.args || ''),
      env: isSSE ? '' : (Array.isArray(item.envs) ? item.envs.join('\n') : item.envs || ''),
      url: isSSE ? item.url : undefined,
      type: item.serverType || (isSSE ? McpServerType.SSE : McpServerType.STDIO),
      source: item.source,
      external_id: item.external_id,
    });
    
    setDialogOpen(true);
  };

  // Handle clicking the rate button
  const handleRateClick = (key: string, item: any) => {
    if (!requireAuth('auth:loginToRate', 'You must be logged in to rate servers.')) return;
    setRateServer({
      name: item.name,
      source: item.source,
      external_id: item.external_id,
    });
    
    setRateDialogOpen(true);
  };

  // Handle clicking the reviews count
  const handleReviewsClick = (item: any) => {
    setReviewServer({
      name: item.name,
      source: item.source,
      external_id: item.external_id,
    });
    setReviewsDialogOpen(true);
  };

  // Helper to format ratings
  const formatRating = (rating?: number, count?: number) => {
    if (rating === undefined || rating === null || !count) {
      return null;
    }
    
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    
    if (isNaN(numericRating)) {
      return null;
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center hover:text-primary transition-colors"
              onClick={() => handleReviewsClick({ rating: numericRating, ratingCount: count })}
            >
              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
              {numericRating.toFixed(1)}
              <span className="text-muted-foreground ml-1">({count})</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to view reviews</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Helper to check if server is owned by current user
  const isOwnServer = (item: any) => {
    return item.shared_by === currentUsername;
  };

  // Handle unshare click
  const handleUnshareClick = async (item: any) => {
    if (!profileUuid) {
      toast({
        title: t('common.error'),
        description: t('search.error.profileNotFound'),
        variant: 'destructive',
      });
      return;
    }
    
    const sharedServerUuid = item.source === McpServerSource.COMMUNITY ? item.external_id : item.shared_uuid;
    if (!sharedServerUuid) {
       toast({
         title: t('common.error'),
         description: t('search.error.missingShareId'),
         variant: 'destructive',
       });
       return;
    }

    try {
      const result = await unshareServer(profileUuid, sharedServerUuid);
      if (result.success) {
        toast({
          title: t('common.success'),
          description: t('search.unshareSuccess', { name: item.name }),
        });
        setTimeout(() => {
          onRefreshNeeded?.();
        }, 500);
      } else {
        throw new Error(result.error || t('search.error.unshareFailed'));
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('search.error.unshareFailed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {Object.entries(items).map(([key, item]) => {
          const installedUuid = item.source && item.external_id
            ? installedServerMap.get(`${item.source}:${item.external_id}`)
            : undefined;

          const isOwned = isOwnServer(item);
          const isSelected = selectedItems.includes(key);
          const isInstalled = Boolean(installedUuid);

          return (
          <Card
            key={key}
            className={cn(
              "flex flex-col transition-all hover:shadow-lg",
              selectable && !isInstalled && "cursor-pointer hover:border-primary",
              isSelected && "ring-2 ring-primary",
              isInstalled && "opacity-70"
            )}
            onClick={() => {
              if (selectable && !isInstalled && onItemSelect) {
                onItemSelect(key, !isSelected);
              }
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg leading-tight flex items-center gap-2">
                    <span className="truncate">{item.name}</span>
                    {item.verified && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified Server</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {item.featured && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Sparkles className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Featured Server</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isInstalled && (
                    <Badge variant="secondary" className="text-xs">
                      Installed
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="line-clamp-2 mt-1">
                {item.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className='flex-grow space-y-3'>
              {/* Installation info */}
              {item.command && (
                <div className="bg-muted/50 rounded-md p-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ServerTypeBadge serverType={item.serverType} />
                    <span>Installation</span>
                  </div>
                  <code className="text-primary">
                    {item.command} {Array.isArray(item.args) ? item.args.join(' ') : item.args || ''}
                  </code>
                </div>
              )}
              
              {/* Categories and Tags */}
              <div className="flex flex-wrap gap-1.5">
                {item.category && (
                  <CategoryBadge category={item.category} />
                )}
                
                {Array.isArray(item.envs) && item.envs.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          {item.envs.length} env {item.envs.length === 1 ? 'var' : 'vars'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold mb-1">Required environment variables:</p>
                        <ul className="text-xs">
                          {item.envs.map((env: string) => (
                            <li key={env}>• {env}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {item.tags?.slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant='outline' className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {item.tags && item.tags.length > 2 && (
                  <Badge variant='outline' className="text-xs">
                    +{item.tags.length - 2}
                  </Badge>
                )}
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {formatRating(item.rating, item.ratingCount)}
                
                {item.installation_count !== undefined && item.installation_count > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        {formatNumber(item.installation_count)}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.installation_count} installations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {item.github_stars !== undefined && item.github_stars !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {formatNumber(item.github_stars)}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.github_stars} GitHub stars</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {item.package_download_count !== undefined && item.package_download_count !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {formatNumber(item.package_download_count)}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.package_download_count} downloads</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Community info */}
              {item.source === McpServerSource.COMMUNITY && item.shared_by && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Shared by{' '}
                    {item.shared_by_profile_url ? (
                      <Link
                        href={item.shared_by_profile_url}
                        className="hover:underline text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.shared_by}
                      </Link>
                    ) : (
                      <span>{item.shared_by}</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className='pt-3 pb-4 gap-2'>
              {item.githubUrl && (
                <Button 
                  variant='outline' 
                  size="sm" 
                  asChild 
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={item.githubUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <Github className='w-4 h-4' />
                    <span className="ml-2">View on GitHub</span>
                  </Link>
                </Button>
              )}
              
              {!isOwned && (
                <Button 
                  variant='outline' 
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRateClick(key, item);
                  }}
                >
                  <ThumbsUp className='w-4 h-4' />
                  <span className="ml-2">Rate</span>
                </Button>
              )}
              
              {isOwned ? (
                <Button
                  variant='destructive'
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnshareClick(item);
                  }}
                >
                  <Trash2 className='w-4 h-4' />
                  <span className="ml-2">Unshare</span>
                </Button>
              ) : isInstalled ? (
                <Button 
                  variant='secondary' 
                  size="sm" 
                  disabled 
                  className="flex-1"
                >
                  Installed
                </Button>
              ) : (
                <Button
                  variant='default'
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInstallClick(key, item);
                  }}
                >
                  <Download className='w-4 h-4' />
                  <span className="ml-2">Install</span>
                </Button>
              )}
            </CardFooter>
          </Card>
          );
        })}
      </div>

      {selectedServer && (
        <InstallDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          serverData={selectedServer}
        />
      )}
      
      {rateServer && (
        <RateServerDialog
          open={rateDialogOpen}
          onOpenChange={setRateDialogOpen}
          serverData={rateServer}
          onRatingSubmitted={onRefreshNeeded}
        />
      )}

      {reviewServer && (
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={setReviewsDialogOpen}
          serverData={reviewServer}
        />
      )}

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth:loginRequired', 'Login Required')}</DialogTitle>
            <DialogDescription>
              {authDialogMessage ? t(authDialogMessage.key, authDialogMessage.defaultMsg) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="default"
              onClick={() => {
                setShowAuthDialog(false);
                signIn();
              }}
            >
              {t('auth:login', 'Login')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAuthDialog(false);
                window.location.href = '/auth/register';
              }}
            >
              {t('auth:register', 'Register')}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel', 'Cancel')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}