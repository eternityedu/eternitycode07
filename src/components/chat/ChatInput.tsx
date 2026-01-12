import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, isLoading, placeholder = 'Describe what you want to build...' }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
          disabled={isLoading}
        />
        {isLoading ? (
          <Button onClick={onStop} variant="destructive" size="icon" className="shrink-0">
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!input.trim()} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
