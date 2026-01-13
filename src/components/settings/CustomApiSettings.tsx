import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  CustomApiConfig, 
  getCustomApiConfig, 
  setCustomApiConfig, 
  clearCustomApiConfig 
} from '@/lib/customApiStorage';
import { Key, Trash2, Check, ExternalLink } from 'lucide-react';

export function CustomApiSettings() {
  const [config, setConfig] = useState<CustomApiConfig>({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    modelId: '',
    enabled: false,
  });
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = getCustomApiConfig();
    if (stored) {
      setConfig(stored);
    }
  }, []);

  const handleSave = () => {
    if (config.enabled && !config.apiKey) {
      toast({
        title: 'API Key required',
        description: 'Please enter your API key to enable custom API.',
        variant: 'destructive',
      });
      return;
    }

    setCustomApiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    toast({
      title: 'Settings saved',
      description: config.enabled 
        ? 'Your custom API will be used for all generations.' 
        : 'Using built-in Eternity Code AI.',
    });
  };

  const handleClear = () => {
    clearCustomApiConfig();
    setConfig({
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      modelId: '',
      enabled: false,
    });
    toast({ title: 'Custom API settings cleared' });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Custom AI API
        </CardTitle>
        <CardDescription>
          Add your own API key to use your preferred AI provider for code generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div>
            <p className="font-medium">Use Custom API</p>
            <p className="text-xs text-muted-foreground">
              When enabled, your API key will be used instead of Eternity Code AI
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
          />
        </div>

        {config.enabled && (
          <>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={config.provider}
                onValueChange={(provider: 'openai' | 'anthropic' | 'google' | 'custom') => 
                  setConfig(prev => ({ ...prev, provider }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                  <SelectItem value="custom">Custom (OpenAI-compatible)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>

            {config.provider === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={config.baseUrl || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model ID</Label>
                  <Input
                    placeholder="gpt-4o, claude-3-opus, etc."
                    value={config.modelId || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, modelId: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Using your own API key means you'll be billed directly by your provider.
              </p>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1 gap-2">
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
          {config.apiKey && (
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
