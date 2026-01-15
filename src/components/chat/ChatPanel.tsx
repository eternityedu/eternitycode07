import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput, FileAttachment } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { DragDropZone } from './DragDropZone';
import { useChat } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodePreview, CodeFile } from '@/components/code/CodePreview';
import { LivePreview } from '@/components/preview/LivePreview';
import { extractCodeBlocks } from '@/lib/codeExtractor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { PanelRightClose, PanelRight, Code, Eye, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';

interface ChatPanelProps {
  conversationId?: string;
  onFilesChange?: (files: CodeFile[]) => void;
  activeFile?: string;
  onFileSelect?: (fileName: string) => void;
}

export function ChatPanel({ conversationId, onFilesChange, activeFile, onFileSelect }: ChatPanelProps) {
  const { messages, isLoading, selectedModel, setSelectedModel, sendMessage, stopGeneration } = useChat(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'code' | 'preview'>('preview');
  const [previewFiles, setPreviewFiles] = useState<CodeFile[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);

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

  const handleRunCode = useCallback((files: CodeFile[]) => {
    setPreviewFiles(files);
    setRightPanelTab('preview');
  }, []);

  const handleFilesDropped = useCallback((files: FileAttachment[]) => {
    setPendingAttachments(prev => [...prev, ...files]);
  }, []);

  const handleSendWithAttachments = useCallback((message: string, attachments?: FileAttachment[]) => {
    const allAttachments = [...pendingAttachments, ...(attachments || [])];
    sendMessage(message, allAttachments.length > 0 ? allAttachments : undefined);
    setPendingAttachments([]);
  }, [pendingAttachments, sendMessage]);

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
          <span className="text-xs text-muted-foreground">
            {isLoading ? 'Generating...' : 'Ready'}
          </span>
        </div>
      </div>
    </DragDropZone>
  );

  const rightPanel = (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'code' | 'preview')}>
          <TabsList className="h-8 bg-secondary/50">
            <TabsTrigger 
              value="preview" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger 
              value="code" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Code className="w-3.5 h-3.5" />
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {codeFiles.length > 0 && (
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
        ) : (
          <LivePreview files={previewFiles.length > 0 ? previewFiles : codeFiles} />
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
    </div>
  );
}
