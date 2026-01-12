import { useEffect, useRef, useMemo, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat, Message } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, PanelRightClose, PanelRight } from 'lucide-react';
import { CodePreview, CodeFile } from '@/components/code/CodePreview';
import { extractCodeBlocks } from '@/lib/codeExtractor';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface ChatPanelProps {
  conversationId?: string;
}

export function ChatPanel({ conversationId }: ChatPanelProps) {
  const { messages, isLoading, sendMessage, stopGeneration } = useChat(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCodePanel, setShowCodePanel] = useState(true);

  // Extract code files from messages
  const codeFiles = useMemo(() => extractCodeBlocks(messages), [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatContent = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">What would you like to build?</h2>
            <p className="text-muted-foreground max-w-md">
              Describe your app idea and I'll help you create it. I can generate code, 
              suggest architectures, and guide you through the development process.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {['Dashboard', 'Landing page', 'Todo app', 'Chat interface'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(`Help me build a ${suggestion.toLowerCase()}`)}
                  className="px-3 py-1.5 text-sm rounded-full border hover:bg-muted transition-colors"
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
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toggle button for code panel */}
      <div className="flex items-center justify-end p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCodePanel(!showCodePanel)}
          className="gap-2"
        >
          {showCodePanel ? (
            <>
              <PanelRightClose className="w-4 h-4" />
              Hide Code
            </>
          ) : (
            <>
              <PanelRight className="w-4 h-4" />
              Show Code
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {showCodePanel ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              {chatContent}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <CodePreview files={codeFiles} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          chatContent
        )}
      </div>
    </div>
  );
}
