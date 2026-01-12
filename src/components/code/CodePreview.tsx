import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, FileCode, Download, Play, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface CodeFile {
  name: string;
  language: string;
  content: string;
}

interface CodePreviewProps {
  files: CodeFile[];
  onRunCode?: (files: CodeFile[]) => void;
  activeFile?: string;
  onFileSelect?: (fileName: string) => void;
}

export function CodePreview({ files, onRunCode, activeFile: externalActiveFile, onFileSelect }: CodePreviewProps) {
  const [internalActiveFile, setInternalActiveFile] = useState(files[0]?.name || '');
  const [editedFiles, setEditedFiles] = useState<Map<string, string>>(new Map());
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const activeFile = externalActiveFile || internalActiveFile;

  const handleFileChange = (fileName: string) => {
    setInternalActiveFile(fileName);
    onFileSelect?.(fileName);
  };

  useEffect(() => {
    if (files.length > 0 && !files.find(f => f.name === activeFile)) {
      handleFileChange(files[0].name);
    }
  }, [files, activeFile]);

  const currentFile = files.find(f => f.name === activeFile);
  const currentContent = currentFile 
    ? (editedFiles.get(currentFile.name) ?? currentFile.content)
    : '';

  const hasEdits = currentFile ? editedFiles.has(currentFile.name) : false;

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!currentFile || value === undefined) return;
    
    if (value === currentFile.content) {
      setEditedFiles(prev => {
        const next = new Map(prev);
        next.delete(currentFile.name);
        return next;
      });
    } else {
      setEditedFiles(prev => new Map(prev).set(currentFile.name, value));
    }
  }, [currentFile]);

  const handleReset = () => {
    if (!currentFile) return;
    setEditedFiles(prev => {
      const next = new Map(prev);
      next.delete(currentFile.name);
      return next;
    });
    toast({ title: 'Code reset to original' });
  };

  const handleRun = () => {
    if (!onRunCode) return;
    
    const updatedFiles = files.map(f => ({
      ...f,
      content: editedFiles.get(f.name) ?? f.content,
    }));
    onRunCode(updatedFiles);
    toast({ title: 'Running preview...' });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    toast({ title: 'Code copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([currentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-900">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <FileCode className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-zinc-100">No Code Yet</h3>
        <p className="text-zinc-400 max-w-sm text-sm">
          Ask the AI to generate code and it will appear here for editing and preview.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-700 px-2 py-1">
        <Tabs value={activeFile} onValueChange={handleFileChange} className="flex-1">
          <TabsList className="h-8 bg-transparent">
            {files.map((file) => (
              <TabsTrigger
                key={file.name}
                value={file.name}
                className="h-7 text-xs text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
              >
                {file.name}
                {editedFiles.has(file.name) && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          {hasEdits && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-zinc-400 hover:text-zinc-100" 
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100" 
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100" 
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          {onRunCode && (
            <Button 
              size="sm" 
              className="h-7 px-3 gap-1.5 bg-primary hover:bg-primary/90" 
              onClick={handleRun}
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1">
        {currentFile && (
          <Editor
            height="100%"
            language={currentFile.language}
            value={currentContent}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 12 },
              tabSize: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
