import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  History, 
  RotateCcw, 
  Clock, 
  Code, 
  ChevronDown,
  ChevronRight,
  FileCode,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { extractCodeBlocks } from '@/lib/codeExtractor';
import { CodeFile } from '@/components/code/CodePreview';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface VersionHistoryProps {
  conversationId?: string;
  onRestoreVersion: (files: CodeFile[]) => void;
  onCompareVersion?: (files: CodeFile[]) => void;
}

interface CodeVersion {
  id: string;
  messageId: string;
  content: string;
  createdAt: string;
  files: CodeFile[];
}

export function VersionHistory({ conversationId, onRestoreVersion, onCompareVersion }: VersionHistoryProps) {
  const { toast } = useToast();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  // Get all assistant messages with code
  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Extract code from each message
      const versionsWithCode: CodeVersion[] = [];
      
      data.forEach((msg) => {
        const files = extractCodeBlocks([{ 
          id: msg.id, 
          role: 'assistant', 
          content: msg.content 
        }]);
        
        if (files.length > 0) {
          versionsWithCode.push({
            id: msg.id,
            messageId: msg.id,
            content: msg.content,
            createdAt: msg.created_at,
            files,
          });
        }
      });
      
      return versionsWithCode;
    },
    enabled: !!conversationId,
  });

  const handleRestore = (version: CodeVersion) => {
    onRestoreVersion(version.files);
    toast({
      title: 'Version restored',
      description: `Restored ${version.files.length} file(s) from ${formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}`,
    });
  };

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <History className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Start a conversation to see version history
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Code className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          No code versions yet
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Generated code will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Version History
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {versions.length} version{versions.length !== 1 ? 's' : ''} saved
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {versions.map((version, index) => (
            <Collapsible
              key={version.id}
              open={expandedVersion === version.id}
              onOpenChange={() => 
                setExpandedVersion(expandedVersion === version.id ? null : version.id)
              }
            >
              <div className={cn(
                "rounded-lg border transition-colors",
                expandedVersion === version.id 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-transparent hover:bg-muted/50"
              )}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 p-2 text-left">
                    {expandedVersion === version.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          Version {versions.length - index}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                        <span>•</span>
                        <FileCode className="w-3 h-3" />
                        {version.files.length} file{version.files.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-2 pb-2 space-y-2">
                    <div className="pl-6 space-y-1">
                      {version.files.map((file) => (
                        <div 
                          key={file.name}
                          className="text-xs px-2 py-1 rounded bg-muted/50 font-mono flex items-center gap-2"
                        >
                          <FileCode className="w-3 h-3 text-primary/60" />
                          {file.name}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 ml-6" style={{ width: 'calc(100% - 1.5rem)' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(version);
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </Button>
                      {onCompareVersion && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompareVersion(version.files);
                          }}
                        >
                          <Code className="w-3 h-3" />
                          Compare
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
