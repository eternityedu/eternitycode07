import { useState, useRef, useEffect, useCallback } from 'react';
import { CodeFile } from '@/components/code/CodePreview';
import { Button } from '@/components/ui/button';
import { RefreshCw, Maximize2, Minimize2, ExternalLink, Smartphone, Monitor, Tablet, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [isReady, setIsReady] = useState(false);
  const [autoFixAttempts, setAutoFixAttempts] = useState(0);

  // Auto-fix common React errors
  const autoFixCode = useCallback((code: string, errorMsg: string): string => {
    let fixed = code;
    
    // Fix: "App is not defined" - ensure component is named App
    if (errorMsg.includes('App is not defined') || errorMsg.includes('is not defined')) {
      // Find any component and rename to App
      const funcMatch = fixed.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/);
      const constMatch = fixed.match(/const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*(?:\([^)]*\)\s*=>|\(?function)/);
      
      if (funcMatch && funcMatch[1] !== 'App') {
        const name = funcMatch[1];
        fixed = fixed.replace(new RegExp(`function\\s+${name}`, 'g'), 'function App');
        fixed = fixed.replace(new RegExp(`<${name}(\\s|>|\\/)`, 'g'), '<App$1');
        fixed = fixed.replace(new RegExp(`</${name}>`, 'g'), '</App>');
      } else if (constMatch && constMatch[1] !== 'App') {
        const name = constMatch[1];
        fixed = fixed.replace(new RegExp(`const\\s+${name}\\s*=`, 'g'), 'const App =');
        fixed = fixed.replace(new RegExp(`<${name}(\\s|>|\\/)`, 'g'), '<App$1');
        fixed = fixed.replace(new RegExp(`</${name}>`, 'g'), '</App>');
      }
    }
    
    // Fix: missing hooks destructuring
    if (!fixed.includes('const { useState') && !fixed.includes('const {useState')) {
      // Hooks are already provided in the template
    }
    
    return fixed;
  }, []);

  const generatePreviewHtml = useCallback((files: CodeFile[], attemptFix = false): string => {
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
      let jsContent = jsFile?.content || '';
      
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
        let cleanedCode = cleanReactCode(jsContent);
        
        // Apply auto-fix if this is a retry
        if (attemptFix && error) {
          cleanedCode = autoFixCode(cleanedCode, error);
        }
        
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
    const { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, Fragment } = React;
    
    // Lucide React icons polyfill
    const LucideIcon = ({ name, className = "", size = 24 }) => {
      return React.createElement('span', { 
        className: className,
        style: { display: 'inline-block', width: size, height: size }
      }, '⬜');
    };
    
    ${cleanedCode}
    
    try {
      const container = document.getElementById('root');
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(App));
      window.parent.postMessage({ type: 'preview-ready' }, '*');
    } catch (e) {
      window.parent.postMessage({ type: 'preview-error', error: e.message }, '*');
      document.getElementById('root').innerHTML = '<div style="color: #ef4444; padding: 20px; font-family: system-ui;"><h3 style="margin-bottom: 8px;">⚠️ Render Error</h3><pre style="background: #fef2f2; padding: 12px; border-radius: 8px; font-size: 12px; overflow: auto;">' + e.message + '</pre></div>';
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
      window.parent.postMessage({ type: 'preview-ready' }, '*');
    } catch (e) {
      window.parent.postMessage({ type: 'preview-error', error: e.message }, '*');
      document.body.innerHTML = '<div style="color: #ef4444;"><h3>Error:</h3><pre>' + e.message + '</pre></div>';
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
  <script>window.parent.postMessage({ type: 'preview-ready' }, '*');</script>
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
  }, [error, autoFixCode]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-ready') {
        setIsReady(true);
        setError(null);
        setAutoFixAttempts(0);
      } else if (event.data?.type === 'preview-error') {
        const errorMsg = event.data.error;
        setError(errorMsg);
        
        // Auto-fix: retry up to 3 times
        if (autoFixAttempts < 3) {
          setAutoFixAttempts(prev => prev + 1);
          setTimeout(() => {
            setKey(prev => prev + 1);
          }, 100);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoFixAttempts]);

  useEffect(() => {
    if (files.length === 0) return;
    
    setIsReady(false);
    
    try {
      const htmlContent = generatePreviewHtml(files, autoFixAttempts > 0);
      
      if (iframeRef.current && htmlContent) {
        iframeRef.current.srcdoc = htmlContent;
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [files, generatePreviewHtml, key, autoFixAttempts]);

  const handleRefresh = () => {
    setAutoFixAttempts(0);
    setError(null);
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
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-center p-8">
          <div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="font-medium mb-2">Live Preview</h3>
            <p className="text-sm text-muted-foreground/70">
              Your app will appear here automatically.
            </p>
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
        <span className="text-xs font-medium text-muted-foreground mr-2 flex items-center gap-1.5">
          {isReady ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : error ? (
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          ) : null}
          Preview
        </span>
        
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
        
        {autoFixAttempts > 0 && autoFixAttempts < 3 && (
          <span className="text-xs text-amber-500 mr-2">
            Auto-fixing... ({autoFixAttempts}/3)
          </span>
        )}
        
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
  // Remove import statements
  let cleaned = code
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
    // Remove export statements but keep the content
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    .trim();
  
  // Check if App component already exists
  const hasApp = /\bfunction\s+App\s*\(/.test(cleaned) || /\bconst\s+App\s*=/.test(cleaned);
  
  if (!hasApp) {
    // Find the first component function and rename it to App
    const funcMatch = cleaned.match(/^(function)\s+([A-Z][a-zA-Z0-9]*)\s*\(/m);
    const constMatch = cleaned.match(/^(const)\s+([A-Z][a-zA-Z0-9]*)\s*=\s*((\([^)]*\)|[^=])\s*=>|\(?function)/m);
    
    if (funcMatch) {
      const originalName = funcMatch[2];
      cleaned = cleaned.replace(
        new RegExp(`^function\\s+${originalName}\\s*\\(`, 'm'),
        'function App('
      );
      cleaned = cleaned.replace(new RegExp(`<${originalName}(\\s|>|\\/)`, 'g'), '<App$1');
      cleaned = cleaned.replace(new RegExp(`</${originalName}>`, 'g'), '</App>');
    } else if (constMatch) {
      const originalName = constMatch[2];
      cleaned = cleaned.replace(
        new RegExp(`^const\\s+${originalName}\\s*=`, 'm'),
        'const App ='
      );
      cleaned = cleaned.replace(new RegExp(`<${originalName}(\\s|>|\\/)`, 'g'), '<App$1');
      cleaned = cleaned.replace(new RegExp(`</${originalName}>`, 'g'), '</App>');
    }
  }
  
  return cleaned;
}
