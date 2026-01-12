import { cn } from '@/lib/utils';
import { User, Bot, Copy, Check, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedContent {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || 'text' });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: 'text', content: text });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-border/50">
      <div className="flex items-center justify-between bg-secondary/80 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-medium">{language}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 hover:text-foreground" onClick={handleCopy}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px', padding: '1rem', background: 'hsl(240 10% 5.5%)' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  const parsedContent = useMemo(() => parseContent(content), [content]);

  return (
    <div className={cn('flex gap-4 p-4 rounded-xl', isUser ? 'bg-secondary/50' : 'bg-card/50 border border-border/30')}>
      <div className={cn(
        'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
        isUser ? 'bg-primary/20 text-primary' : 'bg-primary text-primary-foreground'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-semibold mb-2">{isUser ? 'You' : 'Eternity Code'}</p>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {content ? (
            parsedContent.map((part, index) =>
              part.type === 'code' ? (
                <CodeBlock key={index} code={part.content} language={part.language || 'text'} />
              ) : (
                <p key={index} className="whitespace-pre-wrap mb-2 text-foreground">{part.content}</p>
              )
            )
          ) : (
            <span className="animate-pulse">Generating...</span>
          )}
        </div>
      </div>
    </div>
  );
}
