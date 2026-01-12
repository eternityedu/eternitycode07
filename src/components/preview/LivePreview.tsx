import { useState, useRef, useEffect, useCallback } from 'react';
import { CodeFile } from '@/components/code/CodePreview';
import { Button } from '@/components/ui/button';
import { RefreshCw, Maximize2, Minimize2, ExternalLink, Smartphone, Monitor, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LivePreviewProps {
  files: CodeFile[];
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceSize, { width: string; icon: React.ElementType }> = {
  mobile: { width: '375px', icon: Smartphone },
  tablet: { width: '768px', icon: Tablet },
  desktop: { width: '100%', icon: Monitor },
};

export function LivePreview({ files }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [key, setKey] = useState(0);

  const generatePreviewHtml = useCallback((files: CodeFile[]): string => {
    let htmlFile = files.find(f => f.name.endsWith('.html'));
    let cssFile = files.find(f => f.name.endsWith('.css'));
    let jsFile = files.find(f => 
      f.name.endsWith('.js') || 
      f.name.endsWith('.jsx') || 
      f.name.endsWith('.ts') || 
      f.name.endsWith('.tsx')
    );

    let htmlContent = htmlFile?.content || '';
    
    if (!htmlFile) {
      const cssContent = cssFile?.content || '';
      const jsContent = jsFile?.content || '';
      
      const isReact = jsFile?.name.endsWith('.jsx') || 
                     jsFile?.name.endsWith('.tsx') || 
                     jsContent.includes('import React') || 
                     jsContent.includes('useState') ||
                     jsContent.includes('useEffect') ||
                     jsContent.includes('<div') || 
                     jsContent.includes('export default') ||
                     jsContent.includes('function ') ||
                     jsContent.includes('const ');
      
      if (isReact && jsContent) {
        const cleanedCode = cleanReactCode(jsContent);
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: #ffffff;
    }
    #root { min-height: 100vh; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } = React;
    
    ${cleanedCode}
    
    try {
      const container = document.getElementById('root');
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(App));
    } catch (e) {
      document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;"><h3>Render Error:</h3><pre>' + e.message + '</pre></div>';
      console.error('Render error:', e);
    }
  </script>
</body>
</html>`;
      } else if (jsContent) {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #ffffff;
    }
    ${cssContent}
  </style>
</head>
<body>
  <script>
    try {
      ${jsContent}
    } catch (e) {
      document.body.innerHTML = '<div style="color: red;"><h3>Error:</h3><pre>' + e.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
      } else if (cssContent) {
        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      background: #ffffff;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div class="preview-container">
    <h1>CSS Preview</h1>
    <p>Your CSS styles are applied to this page.</p>
  </div>
</body>
</html>`;
      }
    } else {
      if (cssFile && !htmlContent.includes(cssFile.content)) {
        htmlContent = htmlContent.replace('</head>', `<style>${cssFile.content}</style></head>`);
      }
      if (jsFile && !htmlContent.includes(jsFile.content)) {
        htmlContent = htmlContent.replace('</body>', `<script>${jsFile.content}</script></body>`);
      }
    }

    return htmlContent;
  }, []);

  useEffect(() => {
    if (files.length === 0) return;
    
    try {
      const htmlContent = generatePreviewHtml(files);
      
      if (iframeRef.current && htmlContent) {
        // Use srcdoc for better compatibility
        iframeRef.current.srcdoc = htmlContent;
        setError(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [files, generatePreviewHtml, key]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    const htmlContent = generatePreviewHtml(files);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-center p-8">
          <div>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-medium mb-2">Live Preview</h3>
            <p className="text-sm text-muted-foreground/70">
              Click "Run" to preview your code here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Preview</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-destructive/5 text-destructive text-center p-8">
          <div>
            <div className="text-4xl mb-4">❌</div>
            <h3 className="font-medium mb-2">Preview Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full flex flex-col bg-background",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground mr-2">Preview</span>
        
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => {
            const Icon = deviceSizes[size].icon;
            return (
              <Button
                key={size}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  deviceSize === size && "bg-background shadow-sm"
                )}
                onClick={() => setDeviceSize(size)}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            );
          })}
        </div>

        <div className="flex-1" />
        
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefresh}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleOpenExternal}>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsFullscreen(!isFullscreen)}>
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900 flex items-start justify-center p-4">
        <div 
          className={cn(
            "bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300",
            deviceSize !== 'desktop' && "border"
          )}
          style={{ 
            width: deviceSizes[deviceSize].width,
            maxWidth: '100%',
            height: deviceSize === 'desktop' ? '100%' : 'calc(100% - 2rem)',
            minHeight: '400px',
          }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            className="w-full h-full border-0 bg-white"
            title="Live Preview"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
            style={{ minHeight: '400px' }}
          />
        </div>
      </div>
    </div>
  );
}

function cleanReactCode(code: string): string {
  return code
    // Remove import statements
    .replace(/^import\s+.*?from\s+['"'].*?['"'];?\s*$/gm, '')
    .replace(/^import\s+['"'].*?['"'];?\s*$/gm, '')
    // Remove export statements but keep the content
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    // Try to identify and rename the main component to App if needed
    .replace(/^(function|const)\s+(\w+)\s*=/m, (match, keyword, name) => {
      if (name !== 'App' && !code.includes('function App') && !code.includes('const App')) {
        return `${keyword} App =`;
      }
      return match;
    })
    .replace(/^function\s+(\w+)\s*\(/m, (match, name) => {
      if (name !== 'App' && !code.includes('function App') && !code.includes('const App')) {
        return 'function App(';
      }
      return match;
    })
    .trim();
}
