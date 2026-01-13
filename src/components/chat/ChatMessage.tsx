import { cn } from '@/lib/utils';
import { User, Sparkles, FileCode, Eye, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  onViewCode?: () => void;
}

interface ParsedContent {
  type: 'text' | 'code-reference';
  content: string;
  language?: string;
  filename?: string;
}

// Parse content but hide code blocks - show only references
function parseContentNoCode(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let codeBlockCount = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }
    
    codeBlockCount++;
    const language = match[1] || 'code';
    const codeContent = match[2].trim();
    
    // Try to extract filename from the code or context
    const filenameMatch = content.slice(Math.max(0, match.index - 100), match.index)
      .match(/`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`|([a-zA-Z0-9_\-]+\.[a-zA-Z]+)\s*:?\s*$/);
    const filename = filenameMatch?.[1] || filenameMatch?.[2] || `file${codeBlockCount}.${getExtension(language)}`;
    
    parts.push({ 
      type: 'code-reference', 
      content: codeContent,
      language,
      filename 
    });
    
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: 'text', content: text });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    typescript: 'tsx', tsx: 'tsx', ts: 'ts',
    javascript: 'js', jsx: 'jsx', js: 'js',
    python: 'py', css: 'css', html: 'html',
    json: 'json', sql: 'sql', bash: 'sh',
  };
  return extensions[language.toLowerCase()] || 'txt';
}

function CodeReference({ filename, language, lineCount }: { filename: string; language: string; lineCount: number }) {
  return (
    <div className="my-3 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3 group hover:bg-primary/10 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
        <FileCode className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{filename}</p>
        <p className="text-xs text-muted-foreground">
          {language} • {lineCount} lines • Generated
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-primary flex items-center gap-1">
          <Eye className="w-3 h-3" />
          View in Code Panel
        </span>
      </div>
    </div>
  );
}

export function ChatMessage({ role, content, onViewCode }: ChatMessageProps) {
  const isUser = role === 'user';
  const parsedContent = useMemo(() => parseContentNoCode(content), [content]);
  const hasCode = parsedContent.some(p => p.type === 'code-reference');

  return (
    <div className={cn('flex gap-4 p-4 rounded-xl', isUser ? 'bg-secondary/50' : 'bg-card/50 border border-border/30')}>
      <div className={cn(
        'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden',
        isUser ? 'bg-primary/20 text-primary' : 'bg-gradient-to-br from-primary to-primary/60'
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <img src={logo} alt="Eternity Code" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          {isUser ? 'You' : (
            <>
              <span className="text-gradient">Eternity Code</span>
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            </>
          )}
        </p>
        <div className="text-sm leading-relaxed">
          {content ? (
            parsedContent.map((part, index) =>
              part.type === 'code-reference' ? (
                <CodeReference 
                  key={index} 
                  filename={part.filename || 'code'} 
                  language={part.language || 'code'}
                  lineCount={part.content.split('\n').length}
                />
              ) : (
                <p key={index} className="whitespace-pre-wrap mb-2 text-foreground/90">{part.content}</p>
              )
            )
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-muted-foreground">Generating...</span>
            </div>
          )}
        </div>
        
        {/* Quick action to view code */}
        {hasCode && onViewCode && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 gap-2 text-xs h-7"
            onClick={onViewCode}
          >
            <ExternalLink className="w-3 h-3" />
            View All Code in Panel
          </Button>
        )}
      </div>
    </div>
  );
}
