import { useState, useRef, useEffect } from 'react';
import { CodeFile } from '@/components/code/CodePreview';

interface LivePreviewProps {
  files: CodeFile[];
}

export function LivePreview({ files }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length === 0) return;
    
    try {
      // Find HTML file or create one
      let htmlFile = files.find(f => f.name.endsWith('.html'));
      let cssFile = files.find(f => f.name.endsWith('.css'));
      let jsFile = files.find(f => f.name.endsWith('.js') || f.name.endsWith('.jsx') || f.name.endsWith('.ts') || f.name.endsWith('.tsx'));
      
      let htmlContent = htmlFile?.content || '';
      
      // If no HTML file, create a basic one
      if (!htmlFile) {
        const cssContent = cssFile?.content || '';
        const jsContent = jsFile?.content || '';
        
        // For React/JSX code, wrap in a simple renderer
        const isReact = jsFile?.name.endsWith('.jsx') || jsFile?.name.endsWith('.tsx') || 
                       jsContent.includes('import React') || jsContent.includes('useState') ||
                       jsContent.includes('<div') || jsContent.includes('export default');
        
        if (isReact) {
          htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useMemo, useRef } = React;
    
    ${cleanReactCode(jsContent)}
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
        } else {
          htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
    ${cssContent}
  </style>
</head>
<body>
  <script>${jsContent}</script>
</body>
</html>`;
        }
      } else {
        // Inject CSS and JS into existing HTML
        if (cssFile && !htmlContent.includes(cssFile.content)) {
          htmlContent = htmlContent.replace('</head>', `<style>${cssFile.content}</style></head>`);
        }
        if (jsFile && !htmlContent.includes(jsFile.content)) {
          htmlContent = htmlContent.replace('</body>', `<script>${jsFile.content}</script></body>`);
        }
      }

      // Update iframe
      if (iframeRef.current) {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        iframeRef.current.src = url;
        setError(null);
        
        // Cleanup
        return () => URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-zinc-500 text-center p-8">
        <div>
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="font-medium mb-2">Live Preview</h3>
          <p className="text-sm">Your app preview will appear here when you run code.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 text-red-600 text-center p-8">
        <div>
          <div className="text-4xl mb-4">❌</div>
          <h3 className="font-medium mb-2">Preview Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full bg-white border-0"
      title="Live Preview"
      sandbox="allow-scripts allow-forms allow-modals"
    />
  );
}

// Helper to clean React code for browser execution
function cleanReactCode(code: string): string {
  return code
    // Remove imports
    .replace(/^import\s+.*?['"]\s*;\s*$/gm, '')
    // Remove exports (keep the component)
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    // Rename component to App if needed
    .replace(/^(function|const)\s+(\w+)/m, (match, keyword, name) => {
      if (name !== 'App') {
        return `${keyword} App`;
      }
      return match;
    })
    .trim();
}
