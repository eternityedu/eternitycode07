import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput, FileAttachment } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { DragDropZone } from './DragDropZone';
import { VersionHistory } from './VersionHistory';
import { DiffView } from './DiffView';
import { KeyboardShortcutsSheet, useKeyboardShortcuts } from './KeyboardShortcutsSheet';
import { QuickDeployDialog } from './QuickDeployDialog';
import { useChat } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodePreview, CodeFile } from '@/components/code/CodePreview';
import { extractCodeBlocks } from '@/lib/codeExtractor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  PanelRightClose, PanelRight, Code, Eye, Sparkles, History, 
  GitCompare, Keyboard, RefreshCw, Rocket, Smartphone, Monitor, Tablet,
  ExternalLink, Maximize2, Minimize2, Play, Pause, AlertTriangle, CheckCircle
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  conversationId?: string;
  onFilesChange?: (files: CodeFile[]) => void;
  activeFile?: string;
  onFileSelect?: (fileName: string) => void;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceSize, { width: string; height: string; icon: React.ElementType }> = {
  mobile: { width: '375px', height: '667px', icon: Smartphone },
  tablet: { width: '768px', height: '1024px', icon: Tablet },
  desktop: { width: '100%', height: '100%', icon: Monitor },
};

export function ChatPanel({ conversationId, onFilesChange, activeFile, onFileSelect }: ChatPanelProps) {
  const { messages, isLoading, selectedModel, setSelectedModel, sendMessage, stopGeneration } = useChat(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'code' | 'preview' | 'history' | 'diff'>('preview');
  const [previewFiles, setPreviewFiles] = useState<CodeFile[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [selectedHistoricalVersion, setSelectedHistoricalVersion] = useState<CodeFile[]>([]);
  const [showShortcutsSheet, setShowShortcutsSheet] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployPlatform, setDeployPlatform] = useState<'vercel' | 'netlify' | null>(null);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  // Extract code files from messages
  const codeFiles = useMemo(() => extractCodeBlocks(messages), [messages]);

  // Notify parent of file changes
  useEffect(() => {
    onFilesChange?.(codeFiles);
  }, [codeFiles, onFilesChange]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-run preview when code changes
  useEffect(() => {
    if (codeFiles.length > 0) {
      setPreviewFiles(codeFiles);
    }
  }, [codeFiles]);

  // Generate preview HTML
  const generatePreviewHtml = useCallback((files: CodeFile[]): string => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => 
      f.name.endsWith('.js') || f.name.endsWith('.jsx') || 
      f.name.endsWith('.ts') || f.name.endsWith('.tsx')
    );

    // If there's an HTML file, use it as base
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
                   (jsContent.includes('function ') && jsContent.includes('return'));

    if (isReact && jsContent) {
      // Clean React code for browser execution
      let cleanedCode = jsContent
        .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
        .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
        .replace(/^export\s+default\s+/gm, '')
        .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
        .replace(/^export\s+/gm, '')
        .trim();

      // Ensure App component exists
      const hasApp = /\bfunction\s+App\s*\(/.test(cleanedCode) || /\bconst\s+App\s*=/.test(cleanedCode);
      if (!hasApp) {
        const funcMatch = cleanedCode.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/);
        const constMatch = cleanedCode.match(/const\s+([A-Z][a-zA-Z0-9]*)\s*=/);
        const componentName = funcMatch?.[1] || constMatch?.[1];
        if (componentName && componentName !== 'App') {
          cleanedCode = cleanedCode.replace(
            new RegExp(`(function|const)\\s+${componentName}`, 'g'),
            '$1 App'
          );
          cleanedCode = cleanedCode.replace(
            new RegExp(`<${componentName}(\\s|>|/)`, 'g'),
            '<App$1'
          );
          cleanedCode = cleanedCode.replace(
            new RegExp(`</${componentName}>`, 'g'),
            '</App>'
          );
        }
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
    
    // Icon polyfills
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
    const Trash2 = createIcon([React.createElement('polyline', { key: '1', points: '3 6 5 6 21 6' }), React.createElement('path', { key: '2', d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })]);
    const Edit = createIcon([React.createElement('path', { key: '1', d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }), React.createElement('path', { key: '2', d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })]);
    
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
    window.Trash2 = Trash2;
    window.Edit = Edit;
    
    // Button component polyfill
    const Button = ({ children, className = "", variant = "default", size = "default", onClick, disabled, ...props }) => {
      const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
      const variants = {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-gray-300 bg-transparent hover:bg-gray-100",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
        ghost: "hover:bg-gray-100",
        link: "text-blue-600 underline-offset-4 hover:underline"
      };
      const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      };
      return React.createElement('button', {
        className: baseStyles + " " + (variants[variant] || variants.default) + " " + (sizes[size] || sizes.default) + " " + className,
        onClick,
        disabled,
        ...props
      }, children);
    };
    window.Button = Button;

    // Input component polyfill  
    const Input = ({ className = "", ...props }) => {
      return React.createElement('input', {
        className: "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 " + className,
        ...props
      });
    };
    window.Input = Input;

    // Card components polyfill
    const Card = ({ children, className = "", ...props }) => React.createElement('div', { className: "rounded-lg border bg-white shadow-sm " + className, ...props }, children);
    const CardHeader = ({ children, className = "", ...props }) => React.createElement('div', { className: "flex flex-col space-y-1.5 p-6 " + className, ...props }, children);
    const CardTitle = ({ children, className = "", ...props }) => React.createElement('h3', { className: "text-2xl font-semibold leading-none tracking-tight " + className, ...props }, children);
    const CardDescription = ({ children, className = "", ...props }) => React.createElement('p', { className: "text-sm text-gray-500 " + className, ...props }, children);
    const CardContent = ({ children, className = "", ...props }) => React.createElement('div', { className: "p-6 pt-0 " + className, ...props }, children);
    const CardFooter = ({ children, className = "", ...props }) => React.createElement('div', { className: "flex items-center p-6 pt-0 " + className, ...props }, children);
    window.Card = Card;
    window.CardHeader = CardHeader;
    window.CardTitle = CardTitle;
    window.CardDescription = CardDescription;
    window.CardContent = CardContent;
    window.CardFooter = CardFooter;

    // cn utility
    const cn = (...classes) => classes.filter(Boolean).join(' ');
    window.cn = cn;
    
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
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #ffffff; }
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
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui; min-height: 100vh; background: #fff; }
    ${cssContent}
  </style>
</head>
<body>
  <div class="preview-container"><h1>CSS Preview</h1><p>Your styles are applied.</p></div>
  <script>window.parent.postMessage({ type: 'preview-ready' }, '*');</script>
</body>
</html>`;
    }
    
    return '';
  }, []);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-ready') {
        setIsPreviewReady(true);
        setPreviewError(null);
      } else if (event.data?.type === 'preview-error') {
        setPreviewError(event.data.error);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update preview when files change
  useEffect(() => {
    const filesToPreview = previewFiles.length > 0 ? previewFiles : codeFiles;
    if (filesToPreview.length === 0 || !isLive) return;
    
    setIsPreviewReady(false);
    
    try {
      const htmlContent = generatePreviewHtml(filesToPreview);
      if (iframeRef.current && htmlContent) {
        iframeRef.current.srcdoc = htmlContent;
      }
    } catch (e) {
      setPreviewError((e as Error).message);
    }
  }, [previewFiles, codeFiles, generatePreviewHtml, previewKey, isLive]);

  const handleRefreshPreview = useCallback(() => {
    setPreviewError(null);
    setPreviewKey(prev => prev + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    const filesToPreview = previewFiles.length > 0 ? previewFiles : codeFiles;
    const htmlContent = generatePreviewHtml(filesToPreview);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [previewFiles, codeFiles, generatePreviewHtml]);

  const handleRunCode = useCallback((files: CodeFile[]) => {
    setPreviewFiles(files);
    setRightPanelTab('preview');
  }, []);

  const handleRestoreVersion = useCallback((files: CodeFile[]) => {
    setPreviewFiles(files);
    setRightPanelTab('preview');
  }, []);

  const handleCompareVersion = useCallback((files: CodeFile[]) => {
    setSelectedHistoricalVersion(files);
    setRightPanelTab('diff');
  }, []);

  const handleFilesDropped = useCallback((files: FileAttachment[]) => {
    setPendingAttachments(prev => [...prev, ...files]);
  }, []);

  const handleSendWithAttachments = useCallback((message: string, attachments?: FileAttachment[]) => {
    const allAttachments = [...pendingAttachments, ...(attachments || [])];
    sendMessage(message, allAttachments.length > 0 ? allAttachments : undefined);
    setPendingAttachments([]);
  }, [pendingAttachments, sendMessage]);

  // Keyboard shortcuts handlers
  const shortcutHandlers = useMemo(() => ({
    'preview': () => setRightPanelTab('preview'),
    'code': () => setRightPanelTab('code'),
    'history': () => setRightPanelTab('history'),
    'diff': () => setRightPanelTab('diff'),
    'refresh': handleRefreshPreview,
    'deploy-vercel': () => { setDeployPlatform('vercel'); setShowDeployDialog(true); },
    'deploy-netlify': () => { setDeployPlatform('netlify'); setShowDeployDialog(true); },
    'export': () => setShowDeployDialog(true),
  }), [handleRefreshPreview]);

  useKeyboardShortcuts(shortcutHandlers);

  const suggestions = [
    { label: 'Dashboard', prompt: 'Create a modern analytics dashboard with charts and stats cards using React and Tailwind' },
    { label: 'Landing page', prompt: 'Build a stunning SaaS landing page with hero section, features, pricing, and footer' },
    { label: 'Todo app', prompt: 'Create a beautiful todo app with add, delete, and complete functionality' },
    { label: 'Calculator', prompt: 'Build a sleek calculator with basic and scientific operations' },
    { label: 'Form', prompt: 'Create a multi-step form with validation and progress indicator' },
  ];

  const chatContent = (
    <DragDropZone onFilesDropped={handleFilesDropped}>
      <div className="flex flex-col h-full bg-background">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
                <img src={logo} alt="Eternity Code" className="relative w-24 h-24 rounded-2xl shadow-2xl glow-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-gradient">What would you like to build?</h2>
              <p className="text-muted-foreground max-w-md mb-10 text-lg">
                Describe your app and watch it come to life with instant preview.
              </p>
              <div className="flex flex-wrap gap-3 justify-center max-w-xl">
                {suggestions.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt, undefined)}
                    className="group px-5 py-2.5 text-sm rounded-xl border border-border bg-card/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  role={message.role} 
                  content={message.content} 
                  onViewCode={() => setRightPanelTab('code')}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t bg-card/50 p-3 space-y-3">
          <ChatInput
            onSend={handleSendWithAttachments}
            onStop={stopGeneration}
            isLoading={isLoading}
            placeholder="Describe what you want to build..."
          />
          <div className="flex items-center justify-between px-1">
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowShortcutsSheet(true)}
                title="Keyboard shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => setShowDeployDialog(true)}
              >
                <Rocket className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deploy</span>
              </Button>
              <span className="text-xs text-muted-foreground">
                {isLoading ? 'Generating...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DragDropZone>
  );

  const previewContent = (
    <div className={cn(
      "h-full flex flex-col bg-background",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground mr-2 flex items-center gap-1.5">
          {isPreviewReady ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : previewError ? (
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          ) : (
            <Eye className="w-3 h-3 text-primary" />
          )}
          Live
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
        
        <Button 
          variant={isLive ? "default" : "ghost"} 
          size="icon" 
          className={cn("h-6 w-6", isLive && "bg-green-500 hover:bg-green-600")} 
          onClick={() => { setIsLive(!isLive); if (!isLive) handleRefreshPreview(); }}
          title={isLive ? "Live mode (auto-refresh)" : "Paused"}
        >
          {isLive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </Button>
        
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefreshPreview} title="Refresh">
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
        {(previewFiles.length > 0 || codeFiles.length > 0) ? (
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
              key={previewKey}
              ref={iframeRef}
              className="w-full h-full border-0 bg-white"
              title="Live Preview"
              sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
              style={{ minHeight: '400px' }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-center p-8">
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
        )}
      </div>
    </div>
  );

  const rightPanel = (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as typeof rightPanelTab)}>
          <TabsList className="h-8 bg-secondary/50">
            <TabsTrigger 
              value="preview" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
              {previewError && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
            </TabsTrigger>
            <TabsTrigger 
              value="code" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Code className="w-3.5 h-3.5" />
              Code
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <History className="w-3.5 h-3.5" />
              History
            </TabsTrigger>
            <TabsTrigger 
              value="diff" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Diff
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {codeFiles.length > 0 && !['history', 'diff'].includes(rightPanelTab) && (
          <span className="text-xs text-muted-foreground">
            {codeFiles.length} file{codeFiles.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'code' ? (
          <CodePreview 
            files={codeFiles} 
            onRunCode={handleRunCode}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
        ) : rightPanelTab === 'history' ? (
          <VersionHistory 
            conversationId={conversationId}
            onRestoreVersion={handleRestoreVersion}
            onCompareVersion={handleCompareVersion}
          />
        ) : rightPanelTab === 'diff' ? (
          <DiffView
            currentFiles={previewFiles.length > 0 ? previewFiles : codeFiles}
            historicalFiles={selectedHistoricalVersion}
          />
        ) : (
          previewContent
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toggle button for right panel */}
      <div className="flex items-center justify-end px-3 py-2 border-b bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="gap-2 text-xs h-7"
        >
          {showRightPanel ? (
            <>
              <PanelRightClose className="w-4 h-4" />
              <span className="hidden sm:inline">Hide Panel</span>
            </>
          ) : (
            <>
              <PanelRight className="w-4 h-4" />
              <span className="hidden sm:inline">Show Panel</span>
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {showRightPanel ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} minSize={30}>
              {chatContent}
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/50 transition-colors" />
            <ResizablePanel defaultSize={55} minSize={30}>
              {rightPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          chatContent
        )}
      </div>

      {/* Modals */}
      <KeyboardShortcutsSheet open={showShortcutsSheet} onOpenChange={setShowShortcutsSheet} />
      <QuickDeployDialog 
        open={showDeployDialog} 
        onOpenChange={setShowDeployDialog} 
        files={previewFiles.length > 0 ? previewFiles : codeFiles}
        preferredPlatform={deployPlatform}
      />
    </div>
  );
}
