'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getServersNeedingFix, batchFixServers } from '@/lib/api/ai-config';
import { useToast } from '@/components/ui/use-toast';

interface BatchFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FixResult {
  serverId: string;
  serverName: string;
  status: 'success' | 'failed' | 'error';
  suggestion?: any;
  validation?: any;
  error?: string;
}

export function BatchFixDialog({ open, onOpenChange }: BatchFixDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [serversNeedingFix, setServersNeedingFix] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FixResult[]>([]);
  const [customDirectives, setCustomDirectives] = useState('');
  const [showCustomDirectives, setShowCustomDirectives] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      analyzeServers();
    } else {
      // Reset state
      setIsAnalyzing(false);
      setIsFixing(false);
      setServersNeedingFix([]);
      setProgress(0);
      setResults([]);
      setCustomDirectives('');
      setShowCustomDirectives(false);
    }
  }, [open]);

  const analyzeServers = async () => {
    setIsAnalyzing(true);
    try {
      const data = await getServersNeedingFix(50);
      setServersNeedingFix(data.servers);
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze servers',
        variant: 'destructive',
      });
      onOpenChange(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startBatchFix = async () => {
    setIsFixing(true);
    setProgress(0);
    setResults([]);

    try {
      const serverIds = serversNeedingFix.map(s => s.id);
      const response = await batchFixServers({
        serverIds,
        customDirectives: customDirectives || undefined,
      });

      setResults(response.results);
      setProgress(100);

      toast({
        title: 'Batch Fix Complete',
        description: `Fixed ${response.successCount} of ${response.processedServers} servers`,
      });
    } catch (error) {
      toast({
        title: 'Batch Fix Failed',
        description: error instanceof Error ? error.message : 'Failed to fix servers',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Batch Configuration Fix</DialogTitle>
          <DialogDescription>
            Automatically fix server configurations using AI
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Analyzing servers...</span>
          </div>
        )}

        {!isAnalyzing && !isFixing && serversNeedingFix.length > 0 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Found {serversNeedingFix.length} servers that may need configuration fixes
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomDirectives(!showCustomDirectives)}
              >
                {showCustomDirectives ? 'Hide' : 'Add'} Custom Directives
              </Button>

              {showCustomDirectives && (
                <div className="space-y-2">
                  <Label>Custom AI Directives (Optional)</Label>
                  <Textarea
                    placeholder="Add any specific requirements for the AI configuration..."
                    value={customDirectives}
                    onChange={(e) => setCustomDirectives(e.target.value)}
                    className="h-20"
                  />
                </div>
              )}
            </div>

            <ScrollArea className="h-64 border rounded p-2">
              <div className="space-y-1">
                {serversNeedingFix.map((server) => (
                  <div key={server.id} className="text-sm">
                    • {server.name}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={startBatchFix}>
                Start Batch Fix
              </Button>
            </div>
          </div>
        )}

        {isFixing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing servers...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </div>
        )}

        {!isFixing && results.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {results.filter(r => r.status === 'success').length}
                </div>
                <div className="text-sm text-muted-foreground">Success</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {results.filter(r => r.status === 'failed').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {results.filter(r => r.status === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Error</div>
              </div>
            </div>

            <ScrollArea className="h-64 border rounded p-2">
              <div className="space-y-2">
                {results.map((result) => (
                  <div key={result.serverId} className="flex items-start gap-2 text-sm">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium">{result.serverName}</div>
                      {result.error && (
                        <div className="text-muted-foreground text-xs">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {!isAnalyzing && serversNeedingFix.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">All servers have complete configurations!</p>
            <p className="text-sm text-muted-foreground mt-2">
              No servers need configuration fixes at this time.
            </p>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}