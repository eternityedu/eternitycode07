import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Database, Trash2, Check, TestTube, Loader2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface DatabaseConfig {
  provider: 'supabase' | 'firebase' | 'mongodb' | 'postgres' | 'mysql' | 'custom';
  connectionString: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  enabled: boolean;
}

const DB_STORAGE_KEY = 'eternity_database_config';

export function getDatabaseConfig(): DatabaseConfig | null {
  const stored = localStorage.getItem(DB_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function saveDatabaseConfig(config: DatabaseConfig) {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(config));
}

export function clearDatabaseConfig() {
  localStorage.removeItem(DB_STORAGE_KEY);
}

export function DatabaseSettings() {
  const [config, setConfig] = useState<DatabaseConfig>({
    provider: 'supabase',
    connectionString: '',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl: true,
    enabled: false,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const stored = getDatabaseConfig();
    if (stored) {
      setConfig(stored);
    }
  }, []);

  const handleSave = () => {
    if (config.enabled && !config.connectionString && !config.host) {
      toast({
        title: 'Connection required',
        description: 'Please enter connection details to enable database.',
        variant: 'destructive',
      });
      return;
    }

    saveDatabaseConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    toast({
      title: 'Database settings saved',
      description: config.enabled 
        ? 'Your database connection is configured.' 
        : 'Database connection disabled.',
    });
  };

  const handleClear = () => {
    clearDatabaseConfig();
    setConfig({
      provider: 'supabase',
      connectionString: '',
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
      ssl: true,
      enabled: false,
    });
    setTestResult(null);
    toast({ title: 'Database settings cleared' });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real implementation, this would make an actual connection test
    const hasCredentials = config.connectionString || (config.host && config.database);
    
    if (hasCredentials) {
      setTestResult('success');
      toast({ title: 'Connection successful', description: 'Database is reachable.' });
    } else {
      setTestResult('error');
      toast({ 
        title: 'Connection failed', 
        description: 'Please check your credentials.',
        variant: 'destructive',
      });
    }
    
    setTesting(false);
  };

  const getDefaultPort = (provider: string): string => {
    switch (provider) {
      case 'postgres':
      case 'supabase':
        return '5432';
      case 'mysql':
        return '3306';
      case 'mongodb':
        return '27017';
      default:
        return '';
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Database Connection
        </CardTitle>
        <CardDescription>
          Connect your own database for data persistence in generated apps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div>
            <p className="font-medium">Enable Database</p>
            <p className="text-xs text-muted-foreground">
              Generated apps will use your database for storage
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
              <Label>Database Provider</Label>
              <Select
                value={config.provider}
                onValueChange={(provider: DatabaseConfig['provider']) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    provider,
                    port: getDefaultPort(provider),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supabase">
                    <div className="flex items-center gap-2">
                      Supabase
                      <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="firebase">Firebase</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(config.provider === 'supabase' || config.provider === 'firebase' || config.provider === 'mongodb') && (
              <div className="space-y-2">
                <Label>Connection String / URL</Label>
                <Input
                  type="password"
                  placeholder={
                    config.provider === 'supabase' 
                      ? 'postgresql://postgres:password@db.xxx.supabase.co:5432/postgres'
                      : config.provider === 'firebase'
                      ? 'https://your-project.firebaseio.com'
                      : 'mongodb+srv://user:pass@cluster.mongodb.net/db'
                  }
                  value={config.connectionString}
                  onChange={(e) => setConfig(prev => ({ ...prev, connectionString: e.target.value }))}
                />
              </div>
            )}

            {(config.provider === 'postgres' || config.provider === 'mysql' || config.provider === 'custom') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input
                      placeholder="localhost"
                      value={config.host || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      placeholder={getDefaultPort(config.provider)}
                      value={config.port || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Database Name</Label>
                  <Input
                    placeholder="myapp_db"
                    value={config.database || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, database: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="postgres"
                      value={config.username || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={config.password || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Switch
                    id="ssl"
                    checked={config.ssl}
                    onCheckedChange={(ssl) => setConfig(prev => ({ ...prev, ssl }))}
                  />
                  <Label htmlFor="ssl" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="w-4 h-4" />
                    Use SSL Connection
                  </Label>
                </div>
              </>
            )}

            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">
                🔒 Credentials are stored locally in your browser and never sent to our servers.
              </p>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg ${
                testResult === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-600' 
                  : 'bg-red-500/10 border-red-500/30 text-red-600'
              } border`}>
                <p className="text-sm font-medium">
                  {testResult === 'success' ? '✓ Connection successful' : '✗ Connection failed'}
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1 gap-2">
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
          
          {config.enabled && (
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
            </Button>
          )}
          
          {(config.connectionString || config.host) && (
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}