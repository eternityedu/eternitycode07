import { useState, useMemo } from 'react';
import { CodeFile } from '@/components/code/CodePreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitCompare, FileCode, ArrowRight, ChevronDown, ChevronRight, Plus, Minus, Equal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffViewProps {
  currentFiles: CodeFile[];
  historicalFiles: CodeFile[];
  onClose?: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff: DiffLine[] = [];
  
  let oldIdx = 0;
  let newIdx = 0;
  
  // Simple LCS-based diff
  const lcs: Map<string, number[]> = new Map();
  
  oldLines.forEach((line, idx) => {
    const existing = lcs.get(line) || [];
    existing.push(idx);
    lcs.set(line, existing);
  });
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx >= oldLines.length) {
      // Remaining new lines are additions
      diff.push({
        type: 'added',
        content: newLines[newIdx],
        lineNumber: { new: newIdx + 1 }
      });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      // Remaining old lines are removals
      diff.push({
        type: 'removed',
        content: oldLines[oldIdx],
        lineNumber: { old: oldIdx + 1 }
      });
      oldIdx++;
    } else if (oldLines[oldIdx] === newLines[newIdx]) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: oldLines[oldIdx],
        lineNumber: { old: oldIdx + 1, new: newIdx + 1 }
      });
      oldIdx++;
      newIdx++;
    } else {
      // Find if this new line appears later in old
      const oldPositions = lcs.get(newLines[newIdx]);
      const foundInOld = oldPositions && oldPositions.some(pos => pos > oldIdx);
      
      if (foundInOld) {
        // Remove old line
        diff.push({
          type: 'removed',
          content: oldLines[oldIdx],
          lineNumber: { old: oldIdx + 1 }
        });
        oldIdx++;
      } else {
        // Add new line
        diff.push({
          type: 'added',
          content: newLines[newIdx],
          lineNumber: { new: newIdx + 1 }
        });
        newIdx++;
      }
    }
  }
  
  return diff;
}

export function DiffView({ currentFiles, historicalFiles, onClose }: DiffViewProps) {
  const [selectedFile, setSelectedFile] = useState<string>(
    currentFiles[0]?.name || historicalFiles[0]?.name || ''
  );
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set([0]));

  const allFileNames = useMemo(() => {
    const names = new Set<string>();
    currentFiles.forEach(f => names.add(f.name));
    historicalFiles.forEach(f => names.add(f.name));
    return Array.from(names);
  }, [currentFiles, historicalFiles]);

  const diff = useMemo(() => {
    const currentFile = currentFiles.find(f => f.name === selectedFile);
    const historicalFile = historicalFiles.find(f => f.name === selectedFile);
    
    const oldContent = historicalFile?.content || '';
    const newContent = currentFile?.content || '';
    
    if (!oldContent && !newContent) return [];
    if (!oldContent) {
      return newContent.split('\n').map((line, idx) => ({
        type: 'added' as const,
        content: line,
        lineNumber: { new: idx + 1 }
      }));
    }
    if (!newContent) {
      return oldContent.split('\n').map((line, idx) => ({
        type: 'removed' as const,
        content: line,
        lineNumber: { old: idx + 1 }
      }));
    }
    
    return computeDiff(oldContent, newContent);
  }, [selectedFile, currentFiles, historicalFiles]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0;
    diff.forEach(line => {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else if (line.type === 'unchanged') unchanged++;
    });
    return { added, removed, unchanged };
  }, [diff]);

  const getFileStatus = (fileName: string) => {
    const inCurrent = currentFiles.some(f => f.name === fileName);
    const inHistorical = historicalFiles.some(f => f.name === fileName);
    if (inCurrent && !inHistorical) return 'added';
    if (!inCurrent && inHistorical) return 'removed';
    return 'modified';
  };

  if (allFileNames.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No files to compare</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/30">
        <GitCompare className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider">Diff View</span>
        
        <Select value={selectedFile} onValueChange={setSelectedFile}>
          <SelectTrigger className="h-7 text-xs w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allFileNames.map(name => {
              const status = getFileStatus(name);
              return (
                <SelectItem key={name} value={name} className="text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3 h-3" />
                    <span className="font-mono">{name}</span>
                    {status === 'added' && <Plus className="w-3 h-3 text-green-500" />}
                    {status === 'removed' && <Minus className="w-3 h-3 text-red-500" />}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <Plus className="w-3 h-3" />
            {stats.added}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <Minus className="w-3 h-3" />
            {stats.removed}
          </span>
        </div>
      </div>

      {/* File status indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/20 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-600">Historical</span>
          <ArrowRight className="w-3 h-3" />
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-600">Current</span>
        </div>
      </div>

      {/* Diff content */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          {diff.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "flex border-b border-border/30",
                line.type === 'added' && "bg-green-500/10",
                line.type === 'removed' && "bg-red-500/10",
                line.type === 'unchanged' && "bg-transparent hover:bg-muted/30"
              )}
            >
              {/* Line numbers */}
              <div className="flex-shrink-0 w-16 flex text-muted-foreground/60 select-none border-r border-border/30">
                <span className={cn(
                  "w-8 px-2 py-0.5 text-right",
                  line.type === 'removed' && "bg-red-500/20"
                )}>
                  {line.lineNumber?.old || ''}
                </span>
                <span className={cn(
                  "w-8 px-2 py-0.5 text-right",
                  line.type === 'added' && "bg-green-500/20"
                )}>
                  {line.lineNumber?.new || ''}
                </span>
              </div>

              {/* Change indicator */}
              <div className={cn(
                "w-5 flex items-center justify-center flex-shrink-0",
                line.type === 'added' && "text-green-600",
                line.type === 'removed' && "text-red-600"
              )}>
                {line.type === 'added' && '+'}
                {line.type === 'removed' && '-'}
                {line.type === 'unchanged' && ' '}
              </div>

              {/* Content */}
              <pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
                {line.content || ' '}
              </pre>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
