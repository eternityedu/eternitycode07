import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat, Message } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles } from 'lucide-react';

interface ChatPanelProps {
  conversationId?: string;
}

export function ChatPanel({ conversationId }: ChatPanelProps) {
  const { messages, isLoading, sendMessage, stopGeneration } = useChat(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
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
          <div className="space-y-4 max-w-4xl mx-auto">
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
}
