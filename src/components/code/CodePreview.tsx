import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, FileCode, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface CodeFile {
  name: string;
  language: string;
  content: string;
}

interface CodePreviewProps {
  files: CodeFile[];
}

export function CodePreview({ files }: CodePreviewProps) {
  const [activeFile, setActiveFile] = useState(files[0]?.name || '');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (files.length > 0 && !files.find(f => f.name === activeFile)) {
      setActiveFile(files[0].name);
    }
  }, [files, activeFile]);

  const currentFile = files.find(f => f.name === activeFile);

  const handleCopy = async () => {
    if (!currentFile) return;
    await navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    toast({ title: 'Code copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/30">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileCode className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Code Yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Ask the AI to generate code and it will appear here for preview and editing.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-2 py-1">
        <Tabs value={activeFile} onValueChange={setActiveFile} className="flex-1">
          <TabsList className="h-8 bg-transparent">
            {files.map((file) => (
              <TabsTrigger
                key={file.name}
                value={file.name}
                className="h-7 text-xs data-[state=active]:bg-muted"
              >
                {file.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1">
        {currentFile && (
          <Editor
            height="100%"
            language={currentFile.language}
            value={currentFile.content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
}
