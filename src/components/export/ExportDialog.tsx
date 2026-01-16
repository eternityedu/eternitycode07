import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeFile } from '@/components/code/CodePreview';
import { useToast } from '@/hooks/use-toast';
import {
  Download, Upload, Loader2, FileArchive, ExternalLink, CheckCircle,
  Copy, Github, FolderTree, FileCode, RefreshCw, Link, Globe,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: CodeFile[];
  projectName?: string;
}

interface ProjectFile {
  path: string;
  content: string;
}

const VERCEL_KEY = 'eternity_vercel_config';
const NETLIFY_KEY = 'eternity_netlify_config';

export function ExportDialog({ open, onOpenChange, files, projectName = 'my-project' }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('zip');
  const [vercelToken, setVercelToken] = useState('');
  const [netlifyToken, setNetlifyToken] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [deployTarget, setDeployTarget] = useState<'vercel' | 'netlify' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const vConfig = localStorage.getItem(VERCEL_KEY);
    if (vConfig) {
      const parsed = JSON.parse(vConfig);
      setVercelToken(parsed.token || '');
    }
    const nConfig = localStorage.getItem(NETLIFY_KEY);
    if (nConfig) {
      const parsed = JSON.parse(nConfig);
      setNetlifyToken(parsed.token || '');
    }
  }, []);

  const generateProjectFiles = (): ProjectFile[] => {
    const projectFiles: ProjectFile[] = [];
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

  const handleExportZip = async () => {
    if (files.length === 0) { toast({ title: 'No files to export', variant: 'destructive' }); return; }
    setIsExporting(true);
    try {
      const zip = new JSZip();
      generateProjectFiles().forEach(file => zip.file(file.path, file.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${projectName.toLowerCase().replace(/\s+/g, '-')}.zip`);
      toast({ title: 'Export successful!' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Export failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeploy = async (target: 'vercel' | 'netlify') => {
    const token = target === 'vercel' ? vercelToken : netlifyToken;
    if (!token) { toast({ title: `${target} token required`, variant: 'destructive' }); return; }
    if (files.length === 0) { toast({ title: 'No files to deploy', variant: 'destructive' }); return; }
    
    setIsDeploying(true);
    setDeployTarget(target);
    
    try {
      const projectFiles = generateProjectFiles();
      const safeName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (target === 'vercel') {
        const filesPayload = projectFiles.map(f => ({ file: f.path, data: btoa(unescape(encodeURIComponent(f.content))), encoding: 'base64' }));
        const response = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: safeName, files: filesPayload, projectSettings: { buildCommand: 'npm run build', outputDirectory: 'dist', framework: 'vite' } })
        });
        if (!response.ok) throw new Error((await response.json()).error?.message || 'Vercel deployment failed');
        const data = await response.json();
        setDeploymentUrl(`https://${data.url}`);
        localStorage.setItem(VERCEL_KEY, JSON.stringify({ token, projectId: data.projectId, lastDeploymentUrl: `https://${data.url}` }));
      } else {
        // Netlify deployment
        const zip = new JSZip();
        projectFiles.forEach(f => zip.file(f.path, f.content));
        const blob = await zip.generateAsync({ type: 'blob' });
        
        const response = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
          body: blob
        });
        if (!response.ok) throw new Error('Netlify deployment failed');
        const data = await response.json();
        setDeploymentUrl(data.ssl_url || data.url);
        localStorage.setItem(NETLIFY_KEY, JSON.stringify({ token, siteId: data.id, lastDeploymentUrl: data.ssl_url || data.url }));
      }
      
      toast({ title: 'Deployment started!', description: `Deploying to ${target}...` });
    } catch (error) {
      toast({ title: 'Deployment failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsDeploying(false);
      setDeployTarget(null);
    }
  };

  const copyUrl = () => { navigator.clipboard.writeText(deploymentUrl); toast({ title: 'URL copied!' }); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileArchive className="w-5 h-5 text-primary" />Export Project</DialogTitle>
          <DialogDescription>Download as ZIP or deploy to Vercel/Netlify</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="zip" className="gap-2"><FileArchive className="w-4 h-4" />ZIP</TabsTrigger>
            <TabsTrigger value="structure" className="gap-2"><FolderTree className="w-4 h-4" />Files</TabsTrigger>
            <TabsTrigger value="vercel" className="gap-2"><Upload className="w-4 h-4" />Vercel</TabsTrigger>
            <TabsTrigger value="netlify" className="gap-2"><Globe className="w-4 h-4" />Netlify</TabsTrigger>
          </TabsList>

          <TabsContent value="zip" className="mt-4 space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2"><Github className="w-4 h-4" />GitHub-Ready Export</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Complete Vite + React + TypeScript setup</li>
                <li>✓ Tailwind CSS configuration</li>
                <li>✓ Ready for deployment</li>
              </ul>
            </div>
            <Button onClick={handleExportZip} disabled={isExporting || files.length === 0} className="w-full gap-2" size="lg">
              {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Download className="w-4 h-4" />Download ZIP</>}
            </Button>
          </TabsContent>

          <TabsContent value="structure" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[300px] rounded-lg border bg-secondary/30 p-3">
              <div className="font-mono text-xs space-y-0.5">
                {generateProjectFiles().map((file, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5 hover:bg-muted/50 rounded px-1">
                    <FileCode className="w-3 h-3 text-primary/60" /><span className="text-muted-foreground">{file.path}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="vercel" className="mt-4 space-y-4">
            {deploymentUrl && deployTarget === 'vercel' ? (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" />Deployed!</div>
                <div className="flex items-center gap-2">
                  <Input value={deploymentUrl} readOnly className="flex-1 font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyUrl}><Copy className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" asChild><a href={deploymentUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Vercel API Token</Label>
                  <Input type="password" placeholder="Enter your Vercel token" value={vercelToken} onChange={(e) => setVercelToken(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Get from <a href="https://vercel.com/account/tokens" target="_blank" className="text-primary underline">Vercel Settings</a></p>
                </div>
                <Button onClick={() => handleDeploy('vercel')} disabled={isDeploying || !vercelToken} className="w-full gap-2" size="lg">
                  {isDeploying && deployTarget === 'vercel' ? <><Loader2 className="w-4 h-4 animate-spin" />Deploying...</> : <><Upload className="w-4 h-4" />Deploy to Vercel</>}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="netlify" className="mt-4 space-y-4">
            {deploymentUrl && deployTarget === 'netlify' ? (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" />Deployed!</div>
                <div className="flex items-center gap-2">
                  <Input value={deploymentUrl} readOnly className="flex-1 font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyUrl}><Copy className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" asChild><a href={deploymentUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Netlify Personal Access Token</Label>
                  <Input type="password" placeholder="Enter your Netlify token" value={netlifyToken} onChange={(e) => setNetlifyToken(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Get from <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" className="text-primary underline">Netlify Settings</a></p>
                </div>
                <Button onClick={() => handleDeploy('netlify')} disabled={isDeploying || !netlifyToken} className="w-full gap-2" size="lg">
                  {isDeploying && deployTarget === 'netlify' ? <><Loader2 className="w-4 h-4 animate-spin" />Deploying...</> : <><Globe className="w-4 h-4" />Deploy to Netlify</>}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}