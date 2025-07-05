'use client';

import { motion } from 'framer-motion';
import { Eye, Package, Server, Star, UserCheck, UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { McpServerSource, McpServerType } from '@/db/schema';
import { cn } from '@/lib/utils';
import { McpIndex } from '@/types/search';

interface UnifiedServerCardProps {
  server: McpIndex;
  serverKey: string;
  isInstalled: boolean;
  isOwned: boolean;
  selectable?: boolean;
  isSelected?: boolean;
  onInstallClick: (key: string, server: McpIndex) => void;
  onRateClick: (key: string, server: McpIndex) => void;
  onViewDetailsClick: (e: React.MouseEvent, server: McpIndex) => void;
  onUnshareClick?: (server: McpIndex) => void;
  onItemSelect?: (key: string, selected: boolean) => void;
  onClaimClick?: (key: string, server: McpIndex) => void;
}

// Helper function to get source badge
function SourceBadge({ source }: { source?: McpServerSource }) {
  switch (source) {
    case McpServerSource.REGISTRY:
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Package className="h-3 w-3" />
          Registry
        </Badge>
      );
    case McpServerSource.COMMUNITY:
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Users className="h-3 w-3" />
          Community
        </Badge>
      );
    default:
      return null;
  }
}

// Helper function to get category badge

// Helper function to format rating
function formatRating(rating?: number, count?: number) {
  if (!rating || !count) return null;
  
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(numericRating)) return null;
  
  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{numericRating.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}


export function UnifiedServerCard({
  server,
  serverKey,
  isInstalled,
  isOwned,
  selectable = false,
  isSelected = false,
  onInstallClick,
  onRateClick,
  onViewDetailsClick,
  onUnshareClick,
  onItemSelect,
  onClaimClick,
}: UnifiedServerCardProps) {
  const _t = useTranslation().t;
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, a')) return;
    
    if (selectable && !isInstalled && onItemSelect) {
      onItemSelect(serverKey, !isSelected);
    }
  };
  
  const handleInstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstallClick(serverKey, server);
  };
  
  const handleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRateClick(serverKey, server);
  };
  
  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetailsClick(e, server);
  };
  
  const handleUnshare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnshareClick?.(server);
  };
  
  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClaimClick?.(serverKey, server);
  };
  
  // Determine transport type
  const transportType = server.url ? McpServerType.SSE : McpServerType.STDIO;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          "hover:shadow-md dark:hover:shadow-primary/5",
          selectable && !isInstalled && "hover:border-primary cursor-pointer",
          isSelected && "ring-2 ring-primary",
          isInstalled && "opacity-80"
        )}
        onClick={handleCardClick}
      >
        {/* Main Card Content */}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold leading-tight">
                {server.name}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2 text-sm">
                {server.description}
              </CardDescription>
            </div>
            <SourceBadge source={server.source} />
          </div>
        </CardHeader>
        
        <CardContent className="py-3 min-h-[84px]">
          {/* Badges and Stats Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Transport Type Badge */}
            <Badge variant="outline" className="gap-1">
              <Server className="h-3 w-3" />
              {transportType}
            </Badge>
            
            {/* Claimed Badge */}
            {server.is_claimed && server.source === McpServerSource.COMMUNITY && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <UserCheck className="h-3 w-3" />
                Claimed
              </Badge>
            )}
          </div>
          
          {/* Stats Row - Always show to maintain consistent height */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground min-h-[20px]">
            {formatRating(server.rating, server.ratingCount)}
            {server.installation_count !== undefined && (
              <span>{server.installation_count.toLocaleString()} installs</span>
            )}
          </div>
        </CardContent>
        
        {/* Card Footer - Action Buttons */}
        <CardFooter className="pt-2 pb-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewDetails}
            className="text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Details
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Claim button - only show for unclaimed community servers */}
            {server.source === McpServerSource.COMMUNITY && !server.is_claimed && onClaimClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClaim}
                className="text-xs"
                title="Claim this server"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="sr-only">Claim</span>
              </Button>
            )}
            
            {/* Rate button - only show if not owned */}
            {server.source && server.external_id && !isOwned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRate}
                className="text-xs"
                title="Rate this server"
              >
                <Star className="w-3.5 h-3.5" />
                <span className="sr-only">Rate</span>
              </Button>
            )}
            
            {/* Install/Unshare button */}
            {isOwned ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnshare}
                className="text-xs"
              >
                Unshare
              </Button>
            ) : (
              <Button
                variant={isInstalled ? "secondary" : "default"}
                size="sm"
                onClick={handleInstall}
                disabled={isInstalled}
                className="text-xs"
              >
                {isInstalled ? "Installed" : "Install"}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}