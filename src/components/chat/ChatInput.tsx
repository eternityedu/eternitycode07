import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square, Paperclip, Image, X, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'file';
  preview?: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  onStop: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, isLoading, placeholder = 'Describe what you want to build...' }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
      setInput('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: FileAttachment[] = [];
    
    Array.from(files).forEach(file => {
      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        file,
        type,
      };

      // Create preview for images
      if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => 
            prev.map(a => 
              a.id === attachment.id 
                ? { ...a, preview: e.target?.result as string }
                : a
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('pdf') || file.type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map(attachment => (
              <div 
                key={attachment.id}
                className={cn(
                  "relative group rounded-lg border border-border/50 bg-muted/30 overflow-hidden",
                  attachment.type === 'image' ? "w-20 h-20" : "px-3 py-2"
                )}
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <img 
                    src={attachment.preview} 
                    alt={attachment.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getFileIcon(attachment.file);
                      return <IconComponent className="w-4 h-4 text-muted-foreground" />;
                    })()}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium truncate max-w-[150px]">
                        {attachment.file.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatFileSize(attachment.file.size)}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 items-end">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.java,.cpp,.c,.h,.xml,.yaml,.yml,.csv"
            onChange={(e) => handleFileSelect(e, 'file')}
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
          />

          {/* Attachment buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading}
              title="Attach image"
            >
              <Image className="w-4 h-4" />
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[44px] max-h-[200px] resize-none bg-secondary/50 border-border/50 focus:border-primary/50"
            rows={1}
            disabled={isLoading}
          />
          
          {isLoading ? (
            <Button onClick={onStop} variant="destructive" size="icon" className="h-10 w-10 shrink-0">
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!input.trim() && attachments.length === 0} 
              size="icon" 
              className="h-10 w-10 shrink-0 glow-primary"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center">
          Attach files or images for context • Press Enter to send
        </p>
      </div>
    </div>
  );
}