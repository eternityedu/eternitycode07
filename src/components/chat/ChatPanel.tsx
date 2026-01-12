import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodePreview, CodeFile } from '@/components/code/CodePreview';
import { LivePreview } from '@/components/preview/LivePreview';
import { extractCodeBlocks } from '@/lib/codeExtractor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { PanelRightClose, PanelRight, Code, Eye } from 'lucide-react';
import logo from '@/assets/logo.png';

interface ChatPanelProps {
  conversationId?: string;
  onFilesChange?: (files: CodeFile[]) => void;
  activeFile?: string;
  onFileSelect?: (fileName: string) => void;
}

export function ChatPanel({ conversationId, onFilesChange, activeFile, onFileSelect }: ChatPanelProps) {
  const { messages, isLoading, sendMessage, stopGeneration } = useChat(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'code' | 'preview'>('preview');
  const [previewFiles, setPreviewFiles] = useState<CodeFile[]>([]);

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

  const chatContent = (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <img src={logo} alt="Eternity Code" className="w-20 h-20 rounded-2xl mb-6" />
            <h2 className="text-2xl font-bold mb-2">What would you like to build?</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Describe your app idea and I'll help you create it with live code editing and instant preview.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Dashboard', 'Landing page', 'Todo app', 'Calculator', 'Form'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(`Create a ${suggestion.toLowerCase()} component in React with Tailwind CSS`)}
                  className="px-4 py-2 text-sm rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} role={message.role} content={message.content} />
            ))}
          </div>
        )}
      </ScrollArea>
      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isLoading={isLoading}
        placeholder="Describe what you want to build..."
      />
    </div>
  );

  const rightPanel = (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center justify-between border-b px-2 py-1 bg-muted/50">
        <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'code' | 'preview')}>
          <TabsList className="h-8 bg-transparent">
            <TabsTrigger 
              value="preview" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger 
              value="code" 
              className="h-7 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Code className="w-3.5 h-3.5" />
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
      <div className="flex items-center justify-end p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="gap-2"
        >
          {showRightPanel ? (
            <>
              <PanelRightClose className="w-4 h-4" />
              Hide Panel
            </>
          ) : (
            <>
              <PanelRight className="w-4 h-4" />
              Show Panel
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
            <ResizableHandle withHandle />
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
