import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

import { trackServerInstallation } from '@/app/actions/mcp-server-metrics'; // Import trackServerInstallation
import { createMcpServer } from '@/app/actions/mcp-servers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { McpServerSource, McpServerType } from '@/db/schema';
import { useProfiles } from '@/hooks/use-profiles';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { fixServerConfiguration, updateServerInRegistry } from '@/lib/api/ai-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverData: {
    name: string;
    description: string;
    command: string;
    args: string;
    env: string;
    url: string | undefined;
    type: McpServerType;
    source?: McpServerSource;
    external_id?: string;
  };
}

export function InstallDialog({
  open,
  onOpenChange,
  serverData,
}: InstallDialogProps) {
  // Load 'discover' as the default namespace
  const { t } = useTranslation('discover');
  const { currentProfile } = useProfiles();
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  
  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('InstallDialog Debug:', {
        isAdmin,
        needsConfig: needsConfiguration(),
        serverType: serverData.type,
        args: serverData.args,
        adminEnvVar: process.env.NEXT_PUBLIC_ADMIN_USERS
      });
    }
  }, [open, isAdmin, serverData]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [showCustomDirectives, setShowCustomDirectives] = useState(false);
  const [customDirectives, setCustomDirectives] = useState('');
  const [hasBeenFixed, setHasBeenFixed] = useState(false);
  const [isSavingToRegistry, setIsSavingToRegistry] = useState(false);

  const form = useForm({
    defaultValues: {
      name: serverData.name,
      description: serverData.description,
      command: serverData.command,
      args: serverData.args,
      env: serverData.env,
      url: serverData.url,
      type: serverData.type,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: serverData.name,
        description: serverData.description,
        command: serverData.command,
        args: serverData.args,
        env: serverData.env,
        url: serverData.url,
        type: serverData.type,
      });
      setHasBeenFixed(false);
      setShowCustomDirectives(false);
      setCustomDirectives('');
    }
  }, [open, serverData, form]);

  // Check if the server configuration seems incomplete
  const needsConfiguration = () => {
    if (serverData.type !== McpServerType.STDIO) return false;
    
    const args = serverData.args;
    
    // Check for empty or invalid args
    if (!args || args.trim() === '' || args === '[]' || args === '[""]') return true;
    
    // Parse args properly
    let argArray: string[] = [];
    try {
      // Try to parse as JSON array first
      if (args.startsWith('[')) {
        argArray = JSON.parse(args).filter(Boolean);
      } else {
        // Otherwise split by spaces
        argArray = args.trim().split(/\s+/).filter(Boolean);
      }
    } catch {
      // If parsing fails, split by spaces
      argArray = args.trim().split(/\s+/).filter(Boolean);
    }
    
    if (argArray.length === 0) return true;
    
    // Check if it's a filesystem-type server without directory args
    const serverNameLower = serverData.name.toLowerCase();
    if ((serverNameLower.includes('filesystem') || serverNameLower.includes('file')) &&
        !argArray.some(arg => arg.includes('/'))) {
      return true;
    }
    
    // Check for common incomplete patterns
    if (argArray.length === 1 && argArray[0].startsWith('@')) {
      // Single npm package without any config
      return true;
    }
    
    return false;
  };

  const handleAIFix = async () => {
    setIsFixing(true);
    
    try {
      console.log('Sending AI fix request:', {
        name: serverData.name,
        args: serverData.args,
        type: serverData.type,
      });
      
      const response = await fixServerConfiguration({
        serverData: {
          name: serverData.name,
          description: serverData.description,
          command: serverData.command,
          args: serverData.args,
          envs: serverData.env ? serverData.env.split('\n').filter(Boolean) : [],
          type: serverData.type,
          url: serverData.url,
        },
        customDirectives: customDirectives || undefined,
      });

      console.log('AI fix response:', response);

      if (response.fixed && response.suggestion) {
        // Update form with AI suggestions
        // Keep the original command if AI didn't suggest one
        const suggestedCommand = response.suggestion.args && response.suggestion.args.length > 0 && response.suggestion.args[0] === 'npx' 
          ? 'npx' 
          : serverData.command || 'npx';
        
        form.setValue('command', suggestedCommand);
        
        // For npx commands, the package name should be the first argument after npx
        let argsToSet = response.suggestion.args;
        if (suggestedCommand === 'npx' && argsToSet[0] === 'npx') {
          argsToSet = argsToSet.slice(1); // Remove 'npx' from args if it's already the command
        }
        
        form.setValue('args', argsToSet.join(' '));
        
        // Convert env vars to string format
        const envString = Object.entries(response.suggestion.envVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        if (envString) {
          form.setValue('env', envString);
        }

        toast({
          title: 'AI Configuration Applied',
          description: response.suggestion.explanation,
        });
        
        setHasBeenFixed(true);

        // Show warnings if any
        if (response.suggestion.warnings && response.suggestion.warnings.length > 0) {
          setTimeout(() => {
            toast({
              title: 'Configuration Warnings',
              description: response.suggestion.warnings.join('\n'),
              variant: 'default',
            });
          }, 1000);
        }
        
        // Show alternative configurations if this is a monorepo
        if (response.suggestion.alternativeConfigs && response.suggestion.alternativeConfigs.length > 0) {
          setTimeout(() => {
            toast({
              title: 'Alternative Configurations Available',
              description: 'This repository contains multiple MCP servers. You may want to install a specific one:\n' + 
                response.suggestion.alternativeConfigs.map(alt => `• ${alt.name}`).join('\n'),
              variant: 'default',
            });
          }, 2000);
        }
      } else {
        console.log('AI fix response not fixed:', response);
        toast({
          title: 'AI Fix Not Applied',
          description: 'The AI could not suggest a fix for this configuration',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error fixing configuration - Full error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      toast({
        title: 'AI Fix Failed',
        description: error instanceof Error ? error.message : 'Failed to get AI suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
      setShowCustomDirectives(false);
      setCustomDirectives('');
    }
  };

  const handleSaveToRegistry = async () => {
    if (!serverData.external_id) {
      toast({
        title: 'Error',
        description: 'Cannot save: Server ID not found',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingToRegistry(true);
    
    try {
      const formValues = form.getValues();
      
      // Parse args and env vars
      const args = formValues.args.trim().split(/\s+/).filter(Boolean);
      const envs = formValues.env
        .split('\n')
        .filter((line) => line.includes('='))
        .map((line) => line.trim());

      const result = await updateServerInRegistry(serverData.external_id, {
        command: formValues.command,
        args,
        envs,
      });

      if (result.success) {
        toast({
          title: 'Saved to Registry',
          description: 'Server configuration has been updated in the registry.',
        });
        
        // Close dialog after successful save
        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
      } else {
        toast({
          title: 'Save Failed',
          description: result.error || 'Failed to update server in registry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving to registry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration to registry',
        variant: 'destructive',
      });
    } finally {
      setIsSavingToRegistry(false);
    }
  };

  const onSubmit = async (values: {
    name: string;
    description: string;
    command: string;
    args: string;
    env: string;
    url: string | undefined;
    type: McpServerType;
  }) => {
    if (!currentProfile?.uuid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createMcpServer({
        name: values.name,
        profileUuid: currentProfile.uuid,
        description: values.description,
        command: values.command,
        args: values.args.trim().split(/\s+/).filter(Boolean),
        env: Object.fromEntries(
          values.env
            .split('\n')
            .filter((line) => line.includes('='))
            .map((line) => {
              const [key, ...values] = line.split('=');
              return [key.trim(), values.join('=').trim()];
            })
        ),
        type: values.type,
        url: values.url,
        source: serverData.source,
        external_id: serverData.external_id,
      });
      
      if (result.success) {
        toast({
          title: t('common:success'), // Added 'common:' prefix back
          description: t('install.successDescription'), // Belongs to discover namespace
        });

        // Track the installation after successful creation
        if (result.data?.uuid && serverData.external_id && serverData.source) {
          await trackServerInstallation({
            serverUuid: result.data.uuid,
            externalId: serverData.external_id,
            source: serverData.source,
            profileUuid: currentProfile.uuid,
          }).catch(trackError => {
            console.error("Failed to track installation:", trackError);
          });
        } else if (result.data?.uuid && !serverData.external_id) {
           await trackServerInstallation({
            serverUuid: result.data.uuid,
            externalId: result.data.uuid,
            source: McpServerSource.PLUGGEDIN,
            profileUuid: currentProfile.uuid,
          }).catch(trackError => {
            console.error("Failed to track custom installation:", trackError);
          });
        }

        // Refresh the installed servers data
        await mutate(`${currentProfile.uuid}/installed-mcp-servers`);

        onOpenChange(false);
      } else {
        toast({
          title: t('common:error'), // Added 'common:' prefix back
          description: result.error || t('install.errorDescription'), // Belongs to discover namespace
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error installing server:', error);
      toast({
        title: t('common:error'), // Added 'common:' prefix back
        description: t('common:errors.unexpected'), // Used correct key from common.json
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('install.title')}</DialogTitle>
          <DialogDescription>{t('install.description')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isAdmin && needsConfiguration() && !hasBeenFixed && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>This server configuration appears incomplete</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAIFix}
                        disabled={isFixing}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isFixing ? 'Fixing...' : 'Quick Fix'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomDirectives(!showCustomDirectives)}
                        disabled={isFixing}
                      >
                        Custom Fix
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {hasBeenFixed && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  AI configuration has been applied. You can now:
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Click "Save to Registry" to update the server definition for all users</li>
                    <li>Click "Install" to add this server to your personal workspace</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {showCustomDirectives && (
              <div className="space-y-2">
                <FormLabel>Custom AI Directives (Optional)</FormLabel>
                <Textarea
                  placeholder="Add any specific requirements for the AI configuration..."
                  value={customDirectives}
                  onChange={(e) => setCustomDirectives(e.target.value)}
                  className="h-20"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAIFix}
                    disabled={isFixing}
                  >
                    {isFixing ? 'Fixing...' : 'Apply AI Fix'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCustomDirectives(false);
                      setCustomDirectives('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('install.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('install.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverData.type === McpServerType.STDIO ? (
              <>
                <FormField
                  control={form.control}
                  name="command"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('install.command')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="args"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('install.args')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="env"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('install.env')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('install.url')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              
              {hasBeenFixed && isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveToRegistry}
                  disabled={isSavingToRegistry}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  {isSavingToRegistry ? 'Saving...' : 'Save to Registry'}
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.installing') : t('common.install')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
