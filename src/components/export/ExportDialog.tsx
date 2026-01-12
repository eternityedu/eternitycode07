import { useState } from 'react';
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
} from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: CodeFile[];
  projectName?: string;
}

export function ExportDialog({ open, onOpenChange, files, projectName = 'my-project' }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('zip');
  const [vercelToken, setVercelToken] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const { toast } = useToast();

  const generateProjectFiles = () => {
    const projectFiles: { path: string; content: string }[] = [];
    
    // Find existing files
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => 
      f.name.endsWith('.tsx') || 
      f.name.endsWith('.jsx') || 
      f.name.endsWith('.ts') || 
      f.name.endsWith('.js')
    );

    // Generate package.json
    projectFiles.push({
      path: 'package.json',
      content: JSON.stringify({
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
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
      
      // Clean up imports and exports for proper React app
      if (!appContent.includes('import React')) {
        appContent = `import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\n\n${appContent}`;
      }
      
      // Ensure there's a default export
      if (!appContent.includes('export default')) {
        appContent = appContent.replace(/^(function|const)\s+(\w+)/m, (match, keyword, name) => {
          return match;
        });
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
        <h1 className="text-4xl font-bold text-gray-900">Welcome to ${projectName}</h1>
        <p className="mt-4 text-gray-600">Start building your app!</p>
      </div>
    </div>
  );
}

export default App;`,
      });
    }

    // Add any additional files from the code
    files.forEach(file => {
      const isMainFile = 
        file.name.endsWith('.html') || 
        file.name === 'App.tsx' || 
        file.name === 'App.jsx' ||
        file.name === 'index.css' ||
        file.name === 'styles.css';
      
      if (!isMainFile && !projectFiles.find(pf => pf.path.endsWith(file.name))) {
        projectFiles.push({
          path: `src/${file.name}`,
          content: file.content,
        });
      }
    });

    // Generate README.md
    projectFiles.push({
      path: 'README.md',
      content: `# ${projectName}

This project was generated with [Eternity Code](https://eternitycode.dev).

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building for Production

\`\`\`bash
npm run build
\`\`\`

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo)

1. Push this code to a GitHub repository
2. Connect your repository to Vercel
3. Deploy!
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

    // Generate vercel.json for Vercel deployment
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

      projectFiles.forEach(file => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const fileName = `${projectName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      saveAs(blob, fileName);

      toast({
        title: 'Export successful!',
        description: `Downloaded ${fileName}`,
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

  const handleDeployVercel = async () => {
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

    setIsDeploying(true);

    try {
      const projectFiles = generateProjectFiles();
      
      // Create deployment payload for Vercel
      const filesPayload = projectFiles.map(file => ({
        file: file.path,
        data: btoa(unescape(encodeURIComponent(file.content))),
        encoding: 'base64',
      }));

      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName.toLowerCase().replace(/\s+/g, '-'),
          files: filesPayload,
          projectSettings: {
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
            framework: 'vite',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Deployment failed');
      }

      const data = await response.json();
      setDeploymentUrl(`https://${data.url}`);

      toast({
        title: 'Deployment started!',
        description: 'Your project is being deployed to Vercel.',
      });
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: 'Deployment failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyDeploymentUrl = () => {
    navigator.clipboard.writeText(deploymentUrl);
    toast({ title: 'URL copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Download your project as a ZIP file or deploy directly to Vercel.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="zip" className="gap-2">
              <FileArchive className="w-4 h-4" />
              ZIP Download
            </TabsTrigger>
            <TabsTrigger value="vercel" className="gap-2">
              <Upload className="w-4 h-4" />
              Vercel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zip" className="mt-4 space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="font-medium mb-2">What's included:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Complete Vite + React + TypeScript setup</li>
                <li>• Tailwind CSS configuration</li>
                <li>• All generated components</li>
                <li>• Ready-to-run package.json</li>
                <li>• Vercel deployment config</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Files to export:</strong> {files.length} file(s)</p>
            </div>

            <Button 
              onClick={handleExportZip} 
              disabled={isExporting || files.length === 0}
              className="w-full gap-2"
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

          <TabsContent value="vercel" className="mt-4 space-y-4">
            {deploymentUrl ? (
              <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Deployment Started!</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your project is being built and deployed. It may take a few minutes.
                </p>
                <div className="flex items-center gap-2">
                  <Input 
                    value={deploymentUrl} 
                    readOnly 
                    className="flex-1 text-sm"
                  />
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
                  <Label htmlFor="vercel-token">Vercel API Token</Label>
                  <Input
                    id="vercel-token"
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
                      className="text-primary hover:underline"
                    >
                      Vercel Settings → Tokens
                    </a>
                  </p>
                </div>

                <Button 
                  onClick={handleDeployVercel} 
                  disabled={isDeploying || !vercelToken || files.length === 0}
                  className="w-full gap-2"
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

            <div className="text-xs text-muted-foreground border-t pt-3">
              <p className="font-medium mb-1">Alternative: Manual deployment</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the ZIP file</li>
                <li>Push to a GitHub repository</li>
                <li>Import in Vercel dashboard</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
