import { useState, useRef, useEffect, useCallback } from 'react';
import { CodeFile } from '@/components/code/CodePreview';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, Maximize2, Minimize2, ExternalLink, 
  Smartphone, Monitor, Tablet, AlertTriangle, CheckCircle,
  Play, Pause, Code2, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewEngineProps {
  files: CodeFile[];
  onError?: (error: string | null) => void;
  onReady?: () => void;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceSize, { width: string; height: string; icon: React.ElementType }> = {
  mobile: { width: '375px', height: '667px', icon: Smartphone },
  tablet: { width: '768px', height: '1024px', icon: Tablet },
  desktop: { width: '100%', height: '100%', icon: Monitor },
};

// Preview Engine API for external updates
export interface PreviewAPI {
  updatePreview: (files: CodeFile[]) => void;
  refresh: () => void;
  getState: () => { isReady: boolean; error: string | null };
}

export function PreviewEngine({ files, onError, onReady }: PreviewEngineProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [key, setKey] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [autoFixAttempts, setAutoFixAttempts] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const maxAutoFixAttempts = 5;

  // Clean and transform React code for preview
  const cleanReactCode = useCallback((code: string): string => {
    let cleaned = code
      // Remove import statements
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
      .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
      // Remove export statements but keep content
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
      .replace(/^export\s+/gm, '')
      .trim();
    
    // Ensure App component exists
    const hasApp = /\bfunction\s+App\s*\(/.test(cleaned) || /\bconst\s+App\s*=/.test(cleaned);
    
    if (!hasApp) {
      // Find first component and rename to App
      const funcMatch = cleaned.match(/^(function)\s+([A-Z][a-zA-Z0-9]*)\s*\(/m);
      const constMatch = cleaned.match(/^(const)\s+([A-Z][a-zA-Z0-9]*)\s*=\s*((\([^)]*\)|[^=])\s*=>|\(?function)/m);
      
      if (funcMatch) {
        const name = funcMatch[2];
        cleaned = cleaned.replace(new RegExp(`^function\\\\s+${name}\\\\s*\\\\(`, 'm'), 'function App(');
        cleaned = cleaned.replace(new RegExp(`<${name}(\\\\s|>|\\\\/)`, 'g'), '<App$1');
        cleaned = cleaned.replace(new RegExp(`</${name}>`, 'g'), '</App>');
      } else if (constMatch) {
        const name = constMatch[2];
        cleaned = cleaned.replace(new RegExp(`^const\\\\s+${name}\\\\s*=`, 'm'), 'const App =');
        cleaned = cleaned.replace(new RegExp(`<${name}(\\\\s|>|\\\\/)`, 'g'), '<App$1');
        cleaned = cleaned.replace(new RegExp(`</${name}>`, 'g'), '</App>');
      }
    }
    
    return cleaned;
  }, []);

  // Auto-fix common errors
  const autoFixCode = useCallback((code: string, errorMsg: string): string => {
    let fixed = code;
    
    // Fix: Component not defined
    if (errorMsg.includes('is not defined')) {
      const match = errorMsg.match(/(\w+) is not defined/);
      if (match) {
        const missing = match[1];
        // If it's a likely component, try to find and rename
        if (/^[A-Z]/.test(missing)) {
          const funcMatch = fixed.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/);
          if (funcMatch && funcMatch[1] !== missing) {
            const name = funcMatch[1];
            fixed = fixed.replace(new RegExp(`function\\\\s+${name}`, 'g'), `function ${missing}`);
          }
        }
      }
    }
    
    // Fix: Missing React fragment
    if (errorMsg.includes('Adjacent JSX elements')) {
      // Wrap in fragment if needed
      if (!fixed.includes('return (') && fixed.includes('return')) {
        fixed = fixed.replace(/return\s*\n?\s*(<)/, 'return (<>$1');
        // Find matching end and add closing fragment
        const lastJsxEnd = fixed.lastIndexOf('/>');
        const lastTagEnd = fixed.lastIndexOf('</');
        const endPos = Math.max(lastJsxEnd, lastTagEnd);
        if (endPos > -1) {
          const afterEnd = fixed.indexOf(')', endPos);
          if (afterEnd > -1) {
            fixed = fixed.slice(0, afterEnd) + '</>)' + fixed.slice(afterEnd + 1);
          }
        }
      }
    }
    
    // Fix: Unexpected token errors (often missing semicolons/brackets)
    if (errorMsg.includes('Unexpected token')) {
      // Basic fixes
      fixed = fixed.replace(/}\s*else\s*{/g, '} else {');
      fixed = fixed.replace(/}\s*catch\s*\(/g, '} catch (');
    }
    
    return fixed;
  }, []);

  // Generate preview HTML
  const generatePreviewHtml = useCallback((projectFiles: CodeFile[], attemptFix = false): string => {
    const htmlFile = projectFiles.find(f => f.name.endsWith('.html'));
    const cssFile = projectFiles.find(f => f.name.endsWith('.css'));
    const jsFile = projectFiles.find(f => 
      f.name.endsWith('.js') || 
      f.name.endsWith('.jsx') || 
      f.name.endsWith('.ts') || 
      f.name.endsWith('.tsx')
    );

    if (htmlFile?.content) {
      let html = htmlFile.content;
      if (cssFile && !html.includes(cssFile.content)) {
        html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
      }
      if (jsFile && !html.includes(jsFile.content)) {
        html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
      }
      return html;
    }

    const cssContent = cssFile?.content || '';
    let jsContent = jsFile?.content || '';
    
    // Detect if React project
    const isReact = jsFile?.name.endsWith('.jsx') || 
                   jsFile?.name.endsWith('.tsx') || 
                   jsContent.includes('import React') || 
                   jsContent.includes('useState') ||
                   jsContent.includes('useEffect') ||
                   jsContent.includes('<div') || 
                   jsContent.includes('export default') ||
                   jsContent.includes('function ') && jsContent.includes('return');
    
    if (isReact && jsContent) {
      let cleanedCode = cleanReactCode(jsContent);
      
      if (attemptFix && error) {
        cleanedCode = autoFixCode(cleanedCode, error);
      }
      
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
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
    .preview-error {
      color: #ef4444;
      padding: 20px;
      font-family: system-ui;
    }
    .preview-error h3 { margin-bottom: 8px; }
    .preview-error pre { 
      background: #fef2f2; 
      padding: 12px; 
      border-radius: 8px; 
      font-size: 12px; 
      overflow: auto;
      white-space: pre-wrap;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, Fragment, memo, forwardRef } = React;
    
    // Polyfill for common Lucide icons
    const createIcon = (paths) => ({ className = "", size = 24, ...props }) => 
      React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        ...props
      }, paths);
    
    const ChevronRight = createIcon([React.createElement('path', { key: '1', d: 'M9 18l6-6-6-6' })]);
    const ChevronDown = createIcon([React.createElement('path', { key: '1', d: 'M6 9l6 6 6-6' })]);
    const X = createIcon([React.createElement('path', { key: '1', d: 'M18 6L6 18' }), React.createElement('path', { key: '2', d: 'M6 6l12 12' })]);
    const Plus = createIcon([React.createElement('path', { key: '1', d: 'M12 5v14' }), React.createElement('path', { key: '2', d: 'M5 12h14' })]);
    const Minus = createIcon([React.createElement('path', { key: '1', d: 'M5 12h14' })]);
    const Check = createIcon([React.createElement('path', { key: '1', d: 'M20 6L9 17l-5-5' })]);
    const Search = createIcon([React.createElement('circle', { key: '1', cx: 11, cy: 11, r: 8 }), React.createElement('path', { key: '2', d: 'M21 21l-4.35-4.35' })]);
    const Menu = createIcon([React.createElement('line', { key: '1', x1: 4, x2: 20, y1: 12, y2: 12 }), React.createElement('line', { key: '2', x1: 4, x2: 20, y1: 6, y2: 6 }), React.createElement('line', { key: '3', x1: 4, x2: 20, y1: 18, y2: 18 })]);
    const Home = createIcon([React.createElement('path', { key: '1', d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' })]);
    const User = createIcon([React.createElement('path', { key: '1', d: 'M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2' }), React.createElement('circle', { key: '2', cx: 12, cy: 7, r: 4 })]);
    const Settings = createIcon([React.createElement('circle', { key: '1', cx: 12, cy: 12, r: 3 }), React.createElement('path', { key: '2', d: 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z' })]);
    const Mail = createIcon([React.createElement('rect', { key: '1', width: 20, height: 16, x: 2, y: 4, rx: 2 }), React.createElement('path', { key: '2', d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' })]);
    const Star = createIcon([React.createElement('polygon', { key: '1', points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })]);
    const Heart = createIcon([React.createElement('path', { key: '1', d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z' })]);
    const ShoppingCart = createIcon([React.createElement('circle', { key: '1', cx: 8, cy: 21, r: 1 }), React.createElement('circle', { key: '2', cx: 19, cy: 21, r: 1 }), React.createElement('path', { key: '3', d: 'M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12' })]);
    const ArrowRight = createIcon([React.createElement('path', { key: '1', d: 'M5 12h14' }), React.createElement('path', { key: '2', d: 'm12 5 7 7-7 7' })]);
    const ArrowLeft = createIcon([React.createElement('path', { key: '1', d: 'M19 12H5' }), React.createElement('path', { key: '2', d: 'm12 19-7-7 7-7' })]);
    const Loader2 = createIcon([React.createElement('path', { key: '1', d: 'M21 12a9 9 0 11-6.219-8.56' })]);
    const AlertCircle = createIcon([React.createElement('circle', { key: '1', cx: 12, cy: 12, r: 10 }), React.createElement('line', { key: '2', x1: 12, y1: 8, x2: 12, y2: 12 }), React.createElement('line', { key: '3', x1: 12, y1: 16, x2: 12.01, y2: 16 })]);
    const CheckCircle = createIcon([React.createElement('path', { key: '1', d: 'M22 11.08V12a10 10 0 11-5.93-9.14' }), React.createElement('polyline', { key: '2', points: '22 4 12 14.01 9 11.01' })]);

    // Make icons available globally
    window.ChevronRight = ChevronRight;
    window.ChevronDown = ChevronDown;
    window.X = X;
    window.Plus = Plus;
    window.Minus = Minus;
    window.Check = Check;
    window.Search = Search;
    window.Menu = Menu;
    window.Home = Home;
    window.User = User;
    window.Settings = Settings;
    window.Mail = Mail;
    window.Star = Star;
    window.Heart = Heart;
    window.ShoppingCart = ShoppingCart;
    window.ArrowRight = ArrowRight;
    window.ArrowLeft = ArrowLeft;
    window.Loader2 = Loader2;
    window.AlertCircle = AlertCircle;
    window.CheckCircle = CheckCircle;
    
    // User code
    ${cleanedCode}
    
    // Render
    (function() {
      try {
        const container = document.getElementById('root');
        if (!container) throw new Error('Root container not found');
        
        if (typeof App === 'undefined') {
          throw new Error('App component is not defined. Make sure your component is named "App" or exported as default.');
        }
        
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(App));
        
        window.parent.postMessage({ type: 'preview-ready' }, '*');
      } catch (e) {
        window.parent.postMessage({ type: 'preview-error', error: e.message, stack: e.stack }, '*');
        const root = document.getElementById('root');
        if (root) {
          root.innerHTML = '<div class="preview-error"><h3>⚠️ Render Error</h3><pre>' + e.message + '</pre></div>';
        }
        console.error('Preview render error:', e);
      }
    })();
  </script>
</body>
</html>`;
    } else if (jsContent) {
      // Plain JavaScript
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
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
      document.body.innerHTML = '<div style="color: #ef4444; padding: 20px;"><h3>Error:</h3><pre>' + e.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
    } else if (cssContent) {
      // CSS-only preview
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview</title>
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
    
    return '';
  }, [cleanReactCode, autoFixCode, error]);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-ready') {
        setIsReady(true);
        setError(null);
        setAutoFixAttempts(0);
        onReady?.();
        onError?.(null);
      } else if (event.data?.type === 'preview-error') {
        const errorMsg = event.data.error;
        setError(errorMsg);
        onError?.(errorMsg);
        
        // Auto-fix: retry automatically
        if (autoFixAttempts < maxAutoFixAttempts && isLive) {
          setAutoFixAttempts(prev => prev + 1);
          setTimeout(() => setKey(prev => prev + 1), 150);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoFixAttempts, isLive, onError, onReady]);

  // Update preview when files change
  useEffect(() => {
    if (files.length === 0 || !isLive) return;
    
    setIsReady(false);
    
    try {
      const htmlContent = generatePreviewHtml(files, autoFixAttempts > 0);
      
      if (iframeRef.current && htmlContent) {
        iframeRef.current.srcdoc = htmlContent;
      }
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      onError?.(msg);
    }
  }, [files, generatePreviewHtml, key, autoFixAttempts, isLive, onError]);

  const handleRefresh = () => {
    setAutoFixAttempts(0);
    setError(null);
    setKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    const htmlContent = generatePreviewHtml(files);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      handleRefresh();
    }
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-center p-8">
          <div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="font-medium mb-2">Live Preview</h3>
            <p className="text-sm text-muted-foreground/70">
              Your app will render here automatically when code is generated.
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
          ) : (
            <Eye className="w-3 h-3 text-primary" />
          )}
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
                title={size}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            );
          })}
        </div>

        <div className="flex-1" />
        
        {autoFixAttempts > 0 && autoFixAttempts < maxAutoFixAttempts && (
          <span className="text-xs text-amber-500 mr-2 animate-pulse">
            Auto-fixing ({autoFixAttempts}/{maxAutoFixAttempts})
          </span>
        )}
        
        <Button 
          variant={isLive ? "default" : "ghost"} 
          size="icon" 
          className={cn("h-6 w-6", isLive && "bg-green-500 hover:bg-green-600")} 
          onClick={toggleLive}
          title={isLive ? "Live mode (auto-refresh)" : "Paused"}
        >
          {isLive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </Button>
        
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefresh} title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleOpenExternal} title="Open in new tab">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsFullscreen(!isFullscreen)} title="Fullscreen">
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
            height: deviceSize === 'desktop' ? '100%' : deviceSizes[deviceSize].height,
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

// Export updatePreview function for external use
export function createPreviewAPI(): PreviewAPI {
  let currentFiles: CodeFile[] = [];
  let isReady = false;
  let currentError: string | null = null;
  
  return {
    updatePreview: (files: CodeFile[]) => {
      currentFiles = files;
      // Dispatch custom event for preview update
      window.dispatchEvent(new CustomEvent('preview-update', { detail: { files } }));
    },
    refresh: () => {
      window.dispatchEvent(new CustomEvent('preview-refresh'));
    },
    getState: () => ({ isReady, error: currentError }),
  };
}
