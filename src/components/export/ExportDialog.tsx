import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeFile } from '@/components/code/CodePreview';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  Upload,
  Loader2,
  FileArchive,
  ExternalLink,
  CheckCircle,
  Copy,
  Github,
  FolderTree,
  FileCode,
  RefreshCw,
  Link,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: CodeFile[];
  projectName?: string;
  projectId?: string;
}

interface ProjectFile {
  path: string;
  content: string;
}

interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: string;
  createdAt: number;
}

// Store Vercel connection in localStorage
const VERCEL_STORAGE_KEY = 'eternity_vercel_config';

interface VercelConfig {
  token: string;
  projectId?: string;
  projectName?: string;
  lastDeploymentUrl?: string;
}

function getVercelConfig(): VercelConfig | null {
  const stored = localStorage.getItem(VERCEL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

function saveVercelConfig(config: VercelConfig) {
  localStorage.setItem(VERCEL_STORAGE_KEY, JSON.stringify(config));
}

function clearVercelConfig() {
  localStorage.removeItem(VERCEL_STORAGE_KEY);
}

export function ExportDialog({ open, onOpenChange, files, projectName = 'my-project', projectId }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('zip');
  const [vercelToken, setVercelToken] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [vercelConfig, setVercelConfig] = useState<VercelConfig | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);
  const { toast } = useToast();

  // Load saved Vercel config
  useEffect(() => {
    const config = getVercelConfig();
    if (config) {
      setVercelConfig(config);
      setVercelToken(config.token);
      if (config.lastDeploymentUrl) {
        setDeploymentUrl(config.lastDeploymentUrl);
      }
    }
  }, []);

  // Load existing deployments when connected
  useEffect(() => {
    if (vercelConfig?.token && vercelConfig?.projectName) {
      loadDeployments();
    }
  }, [vercelConfig]);

  const loadDeployments = async () => {
    if (!vercelConfig?.token || !vercelConfig?.projectName) return;
    
    setIsLoadingDeployments(true);
    try {
      const response = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${vercelConfig.projectId}&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${vercelConfig.token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDeployments(data.deployments || []);
      }
    } catch (error) {
      console.error('Failed to load deployments:', error);
    } finally {
      setIsLoadingDeployments(false);
    }
  };

  const generateProjectFiles = (): ProjectFile[] => {
    const projectFiles: ProjectFile[] = [];
    
    // Find existing files
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => 
      f.name.endsWith('.tsx') || 
      f.name.endsWith('.jsx') || 
      f.name.endsWith('.ts') || 
      f.name.endsWith('.js')
    );

    const safeName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Generate package.json
    projectFiles.push({
      path: 'package.json',
      content: JSON.stringify({
        name: safeName,
        private: true,
        version: '0.1.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
          'lucide-react': '^0.462.0',
        },
        devDependencies: {
          '@types/react': '^18.3.3',
          '@types/react-dom': '^18.3.0',
          '@vitejs/plugin-react': '^4.3.1',
          autoprefixer: '^10.4.19',
          postcss: '^8.4.38',
          tailwindcss: '^3.4.4',
          typescript: '^5.2.2',
          vite: '^5.3.4',
        },
      }, null, 2),
    });

    // Generate vite.config.ts
    projectFiles.push({
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
    });

    // Generate tsconfig.json
    projectFiles.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      }, null, 2),
    });

    // Generate tsconfig.node.json
    projectFiles.push({
      path: 'tsconfig.node.json',
      content: JSON.stringify({
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true,
        },
        include: ['vite.config.ts'],
      }, null, 2),
    });

    // Generate tailwind.config.js
    projectFiles.push({
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
    });

    // Generate postcss.config.js
    projectFiles.push({
      path: 'postcss.config.js',
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    });

    // Generate index.html
    projectFiles.push({
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    });

    // Generate src/main.tsx
    projectFiles.push({
      path: 'src/main.tsx',
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
    });

    // Generate src/index.css
    projectFiles.push({
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

${cssFile?.content || ''}`,
    });

    // Generate src/App.tsx from the generated code
    if (jsFile) {
      let appContent = jsFile.content;
      
      // Ensure React import
      if (!appContent.includes('import React')) {
        appContent = `import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\n\n${appContent}`;
      }
      
      // Ensure default export
      if (!appContent.includes('export default')) {
        appContent += '\n\nexport default App;';
      }

      projectFiles.push({
        path: 'src/App.tsx',
        content: appContent,
      });
    } else {
      projectFiles.push({
        path: 'src/App.tsx',
        content: `import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">${projectName}</h1>
        <p className="mt-4 text-gray-600">Generated with Eternity Code</p>
      </div>
    </div>
  );
}

export default App;`,
      });
    }

    // Add component files
    files.forEach(file => {
      const isMainFile = 
        file.name.endsWith('.html') || 
        file.name === 'App.tsx' || 
        file.name === 'App.jsx' ||
        file.name === 'index.css' ||
        file.name === 'styles.css';
      
      if (!isMainFile && !projectFiles.find(pf => pf.path.endsWith(file.name))) {
        // Determine proper path based on file type
        let filePath = `src/${file.name}`;
        if (file.name.includes('component') || /^[A-Z]/.test(file.name)) {
          filePath = `src/components/${file.name}`;
        }
        projectFiles.push({
          path: filePath,
          content: file.content,
        });
      }
    });

    // Generate README.md
    projectFiles.push({
      path: 'README.md',
      content: `# ${projectName}

Generated with [Eternity Code](https://eternitycode.dev) - The AI-Powered Vibe Coding Platform

## 🚀 Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## 📦 Building for Production

\`\`\`bash
npm run build
\`\`\`

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this code to a GitHub repository
2. Connect your repository to Vercel
3. Deploy!

---

*Built with Eternity Code*
`,
    });

    // Generate .gitignore
    projectFiles.push({
      path: '.gitignore',
      content: `# Dependencies
node_modules

# Build
dist

# IDE
.vscode
.idea

# Env
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db`,
    });

    // Generate vercel.json
    projectFiles.push({
      path: 'vercel.json',
      content: JSON.stringify({
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        framework: 'vite',
      }, null, 2),
    });

    return projectFiles;
  };

  const handleExportZip = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files to export',
        description: 'Generate some code first before exporting.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();
      const projectFiles = generateProjectFiles();

      // Create proper folder structure
      projectFiles.forEach(file => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const safeName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const fileName = `${safeName}.zip`;
      saveAs(blob, fileName);

      toast({
        title: 'Export successful!',
        description: `Downloaded ${fileName} with ${projectFiles.length} files`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeployVercel = async (isUpdate: boolean = false) => {
    if (!vercelToken) {
      toast({
        title: 'Vercel token required',
        description: 'Please enter your Vercel API token to deploy.',
        variant: 'destructive',
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: 'No files to deploy',
        description: 'Generate some code first before deploying.',
        variant: 'destructive',
      });
      return;
    }

    if (isUpdate) {
      setIsUpdating(true);
    } else {
      setIsDeploying(true);
    }

    try {
      const projectFiles = generateProjectFiles();
      
      const filesPayload = projectFiles.map(file => ({
        file: file.path,
        data: btoa(unescape(encodeURIComponent(file.content))),
        encoding: 'base64',
      }));

      const safeName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const deployPayload: any = {
        name: safeName,
        files: filesPayload,
        projectSettings: {
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          framework: 'vite',
        },
      };

      // If updating existing project, include project ID
      if (isUpdate && vercelConfig?.projectId) {
        deployPayload.project = vercelConfig.projectId;
      }

      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deployPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Deployment failed');
      }

      const data = await response.json();
      const newUrl = `https://${data.url}`;
      setDeploymentUrl(newUrl);

      // Save Vercel config for future updates
      const newConfig: VercelConfig = {
        token: vercelToken,
        projectId: data.projectId,
        projectName: safeName,
        lastDeploymentUrl: newUrl,
      };
      saveVercelConfig(newConfig);
      setVercelConfig(newConfig);

      toast({
        title: isUpdate ? 'Update deployed!' : 'Deployment started!',
        description: 'Your project is being deployed to Vercel.',
      });

      // Reload deployments
      setTimeout(() => loadDeployments(), 2000);
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: 'Deployment failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
      setIsUpdating(false);
    }
  };

  const copyDeploymentUrl = () => {
    navigator.clipboard.writeText(deploymentUrl);
    toast({ title: 'URL copied to clipboard' });
  };

  const handleDisconnect = () => {
    clearVercelConfig();
    setVercelConfig(null);
    setVercelToken('');
    setDeploymentUrl('');
    setDeployments([]);
    toast({ title: 'Disconnected from Vercel' });
  };

  const projectFiles = files.length > 0 ? generateProjectFiles() : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-primary" />
            Export Project
          </DialogTitle>
          <DialogDescription>
            Download as ZIP (GitHub-ready) or deploy directly to Vercel.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="zip" className="gap-2">
              <FileArchive className="w-4 h-4" />
              ZIP
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-2">
              <FolderTree className="w-4 h-4" />
              Structure
            </TabsTrigger>
            <TabsTrigger value="vercel" className="gap-2">
              <Upload className="w-4 h-4" />
              Vercel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zip" className="mt-4 space-y-4 flex-1">
            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub-Ready Export
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Complete Vite + React + TypeScript setup</li>
                <li>✓ Tailwind CSS configuration</li>
                <li>✓ Proper folder structure (src/, components/)</li>
                <li>✓ Ready for `git init` and push</li>
                <li>✓ Vercel deployment config included</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground flex items-center justify-between">
              <span><strong>Files:</strong> {projectFiles.length} files</span>
              <span><strong>Project:</strong> {projectName}</span>
            </div>

            <Button 
              onClick={handleExportZip} 
              disabled={isExporting || files.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating ZIP...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download ZIP
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="structure" className="mt-4 flex-1 overflow-hidden">
            <div className="rounded-lg border bg-secondary/30 h-full overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/50">
                <span className="text-xs font-medium">File Structure Preview</span>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-3 font-mono text-xs space-y-0.5">
                  {projectFiles.map((file, index) => {
                    const depth = file.path.split('/').length - 1;
                    const fileName = file.path.split('/').pop();
                    const isFolder = file.path.includes('/');
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 py-0.5 hover:bg-muted/50 rounded px-1"
                        style={{ paddingLeft: `${depth * 12}px` }}
                      >
                        <FileCode className="w-3 h-3 text-primary/60" />
                        <span className="text-muted-foreground">{file.path}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="vercel" className="mt-4 space-y-4 flex-1 overflow-auto">
            {/* Connected state with deployment history */}
            {vercelConfig?.projectId && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600">
                    <Link className="w-4 h-4" />
                    <span className="font-medium">Connected to Vercel</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-xs">
                    Disconnect
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Project: <span className="font-mono">{vercelConfig.projectName}</span>
                </div>
                
                {deploymentUrl && (
                  <div className="flex items-center gap-2">
                    <Input value={deploymentUrl} readOnly className="flex-1 font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={copyDeploymentUrl}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                )}

                {/* Update button */}
                <Button 
                  onClick={() => handleDeployVercel(true)} 
                  disabled={isUpdating || files.length === 0}
                  className="w-full gap-2"
                  variant="default"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Update Deployment
                    </>
                  )}
                </Button>

                {/* Recent deployments */}
                {deployments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-green-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Recent Deployments</span>
                      <Button variant="ghost" size="sm" onClick={loadDeployments} disabled={isLoadingDeployments}>
                        <RefreshCw className={`w-3 h-3 ${isLoadingDeployments ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {deployments.slice(0, 3).map((deployment) => (
                        <div key={deployment.id} className="flex items-center justify-between text-xs p-2 rounded bg-background/50">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              deployment.state === 'READY' ? 'bg-green-500' : 
                              deployment.state === 'ERROR' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <span className="font-mono truncate max-w-[150px]">{deployment.url}</span>
                          </div>
                          <a 
                            href={`https://${deployment.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New deployment / not connected */}
            {!vercelConfig?.projectId && (
              <>
                {deploymentUrl ? (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Deployment Started!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={deploymentUrl} readOnly className="flex-1 font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={copyDeploymentUrl}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Vercel API Token</Label>
                      <Input
                        type="password"
                        placeholder="Enter your Vercel API token"
                        value={vercelToken}
                        onChange={(e) => setVercelToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your token from{' '}
                        <a 
                          href="https://vercel.com/account/tokens" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Vercel Settings → Tokens
                        </a>
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleDeployVercel(false)} 
                      disabled={isDeploying || files.length === 0 || !vercelToken}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Deploy to Vercel
                        </>
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}