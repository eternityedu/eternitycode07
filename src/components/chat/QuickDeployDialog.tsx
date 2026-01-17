import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CodeFile } from '@/components/code/CodePreview';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, CheckCircle, Copy, ExternalLink, Upload, Globe, 
  RefreshCw, Rocket, ArrowRight, Settings
} from 'lucide-react';
import JSZip from 'jszip';

interface QuickDeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: CodeFile[];
  projectName?: string;
  preferredPlatform?: 'vercel' | 'netlify' | null;
}

const VERCEL_KEY = 'eternity_vercel_config';
const NETLIFY_KEY = 'eternity_netlify_config';

export function QuickDeployDialog({ 
  open, 
  onOpenChange, 
  files, 
  projectName = 'my-project',
  preferredPlatform 
}: QuickDeployDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'vercel' | 'netlify' | null>(preferredPlatform || null);
  const [vercelToken, setVercelToken] = useState('');
  const [netlifyToken, setNetlifyToken] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [lastDeployments, setLastDeployments] = useState<{
    vercel?: { url: string; projectId: string };
    netlify?: { url: string; siteId: string };
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    const vConfig = localStorage.getItem(VERCEL_KEY);
    if (vConfig) {
      const parsed = JSON.parse(vConfig);
      setVercelToken(parsed.token || '');
      if (parsed.lastDeploymentUrl) {
        setLastDeployments(prev => ({ 
          ...prev, 
          vercel: { url: parsed.lastDeploymentUrl, projectId: parsed.projectId } 
        }));
      }
    }
    const nConfig = localStorage.getItem(NETLIFY_KEY);
    if (nConfig) {
      const parsed = JSON.parse(nConfig);
      setNetlifyToken(parsed.token || '');
      if (parsed.lastDeploymentUrl) {
        setLastDeployments(prev => ({ 
          ...prev, 
          netlify: { url: parsed.lastDeploymentUrl, siteId: parsed.siteId } 
        }));
      }
    }
  }, [open]);

  const generateProjectFiles = () => {
    const projectFiles: { path: string; content: string }[] = [];
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => f.name.endsWith('.tsx') || f.name.endsWith('.jsx') || f.name.endsWith('.ts') || f.name.endsWith('.js'));
    const safeName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    projectFiles.push({ path: 'package.json', content: JSON.stringify({
      name: safeName, private: true, version: '0.1.0', type: 'module',
      scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
      dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1', 'lucide-react': '^0.462.0' },
      devDependencies: { '@types/react': '^18.3.3', '@types/react-dom': '^18.3.0', '@vitejs/plugin-react': '^4.3.1', autoprefixer: '^10.4.19', postcss: '^8.4.38', tailwindcss: '^3.4.4', typescript: '^5.2.2', vite: '^5.3.4' }
    }, null, 2) });
    projectFiles.push({ path: 'vite.config.ts', content: `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })` });
    projectFiles.push({ path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${projectName}</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>` });
    projectFiles.push({ path: 'src/main.tsx', content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)` });
    projectFiles.push({ path: 'src/index.css', content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${cssFile?.content || ''}` });
    projectFiles.push({ path: 'tailwind.config.js', content: `export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [] }` });

    if (jsFile) {
      let content = jsFile.content;
      if (!content.includes('import React')) content = `import React, { useState, useEffect } from 'react';\n\n${content}`;
      if (!content.includes('export default')) content += '\n\nexport default App;';
      projectFiles.push({ path: 'src/App.tsx', content });
    } else {
      projectFiles.push({ path: 'src/App.tsx', content: `import React from 'react';\nfunction App() { return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><h1 className="text-4xl font-bold">${projectName}</h1></div>; }\nexport default App;` });
    }

    return projectFiles;
  };

  const handleDeploy = async (isUpdate = false) => {
    if (!selectedPlatform) return;
    
    const token = selectedPlatform === 'vercel' ? vercelToken : netlifyToken;
    if (!token) {
      toast({ title: 'Token required', variant: 'destructive' });
      return;
    }

    setIsDeploying(true);
    setDeploymentUrl('');

    try {
      const projectFiles = generateProjectFiles();
      const safeName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      if (selectedPlatform === 'vercel') {
        const filesPayload = projectFiles.map(f => ({
          file: f.path,
          data: btoa(unescape(encodeURIComponent(f.content))),
          encoding: 'base64'
        }));

        const response = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: safeName,
            files: filesPayload,
            projectSettings: { buildCommand: 'npm run build', outputDirectory: 'dist', framework: 'vite' }
          })
        });

        if (!response.ok) throw new Error((await response.json()).error?.message || 'Vercel deployment failed');
        const data = await response.json();
        const url = `https://${data.url}`;
        setDeploymentUrl(url);
        localStorage.setItem(VERCEL_KEY, JSON.stringify({ token, projectId: data.projectId, lastDeploymentUrl: url }));
        setLastDeployments(prev => ({ ...prev, vercel: { url, projectId: data.projectId } }));
      } else {
        const zip = new JSZip();
        projectFiles.forEach(f => zip.file(f.path, f.content));
        const blob = await zip.generateAsync({ type: 'blob' });

        let endpoint = 'https://api.netlify.com/api/v1/sites';
        if (isUpdate && lastDeployments.netlify?.siteId) {
          endpoint = `https://api.netlify.com/api/v1/sites/${lastDeployments.netlify.siteId}/deploys`;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
          body: blob
        });

        if (!response.ok) throw new Error('Netlify deployment failed');
        const data = await response.json();
        const url = data.ssl_url || data.url;
        setDeploymentUrl(url);
        const siteId = data.site_id || data.id;
        localStorage.setItem(NETLIFY_KEY, JSON.stringify({ token, siteId, lastDeploymentUrl: url }));
        setLastDeployments(prev => ({ ...prev, netlify: { url, siteId } }));
      }

      toast({ 
        title: isUpdate ? 'Deployment updated!' : 'Deployed successfully!',
        description: `Your app is live on ${selectedPlatform}`
      });
    } catch (error) {
      toast({ title: 'Deployment failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(deploymentUrl);
    toast({ title: 'URL copied!' });
  };

  const canUpdate = (platform: 'vercel' | 'netlify') => {
    if (platform === 'vercel') return !!lastDeployments.vercel?.projectId;
    return !!lastDeployments.netlify?.siteId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Quick Deploy
          </DialogTitle>
          <DialogDescription>
            Choose a platform and deploy your current version
          </DialogDescription>
        </DialogHeader>

        {deploymentUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Successfully Deployed!</span>
              </div>
              <div className="flex items-center gap-2">
                <Input value={deploymentUrl} readOnly className="flex-1 font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => {
              setDeploymentUrl('');
              setSelectedPlatform(null);
            }}>
              Deploy to Another Platform
            </Button>
          </div>
        ) : !selectedPlatform ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setSelectedPlatform('vercel')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-semibold">Vercel</span>
              {lastDeployments.vercel && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Previously deployed
                </span>
              )}
            </button>
            
            <button
              onClick={() => setSelectedPlatform('netlify')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#00AD9F] flex items-center justify-center text-white">
                <Globe className="w-6 h-6" />
              </div>
              <span className="font-semibold">Netlify</span>
              {lastDeployments.netlify && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Previously deployed
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${selectedPlatform === 'vercel' ? 'bg-black' : 'bg-[#00AD9F]'}`}>
                {selectedPlatform === 'vercel' ? <Upload className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="font-medium capitalize">{selectedPlatform}</p>
                <p className="text-xs text-muted-foreground">
                  {canUpdate(selectedPlatform) ? 'Ready to update or create new' : 'Create new deployment'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlatform(null)}>
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{selectedPlatform === 'vercel' ? 'Vercel' : 'Netlify'} API Token</Label>
              <Input
                type="password"
                placeholder={`Enter your ${selectedPlatform} token`}
                value={selectedPlatform === 'vercel' ? vercelToken : netlifyToken}
                onChange={(e) => selectedPlatform === 'vercel' ? setVercelToken(e.target.value) : setNetlifyToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get from{' '}
                <a 
                  href={selectedPlatform === 'vercel' ? 'https://vercel.com/account/tokens' : 'https://app.netlify.com/user/applications#personal-access-tokens'} 
                  target="_blank" 
                  className="text-primary underline"
                >
                  {selectedPlatform} Settings
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              {canUpdate(selectedPlatform) && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleDeploy(true)}
                  disabled={isDeploying || !(selectedPlatform === 'vercel' ? vercelToken : netlifyToken)}
                >
                  {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Update Existing
                </Button>
              )}
              <Button
                className="flex-1 gap-2"
                onClick={() => handleDeploy(false)}
                disabled={isDeploying || !(selectedPlatform === 'vercel' ? vercelToken : netlifyToken)}
              >
                {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {canUpdate(selectedPlatform) ? 'New Deployment' : 'Deploy'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
