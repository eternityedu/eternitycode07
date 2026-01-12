import { useState } from 'react';
import { CodeFile } from '@/components/code/CodePreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  FileJson,
  FolderOpen,
  Folder,
  Plus,
  Trash2,
  Edit,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
  content?: string;
}

interface FileExplorerProps {
  files: CodeFile[];
  activeFile?: string;
  onFileSelect: (fileName: string) => void;
  onFileCreate?: (name: string, type: 'file' | 'folder') => void;
  onFileDelete?: (name: string) => void;
  onFileRename?: (oldName: string, newName: string) => void;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case 'css':
    case 'scss':
      return <FileText className="w-4 h-4 text-pink-400" />;
    case 'html':
      return <FileText className="w-4 h-4 text-orange-400" />;
    case 'md':
      return <FileText className="w-4 h-4 text-gray-400" />;
    default:
      return <File className="w-4 h-4 text-muted-foreground" />;
  }
}

function buildFileTree(files: CodeFile[]): FileNode[] {
  const root: FileNode[] = [];

  files.forEach((file) => {
    const parts = file.name.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let node = current.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          language: isFile ? file.language : undefined,
          content: isFile ? file.content : undefined,
        };
        current.push(node);
      }

      if (!isFile && node.children) {
        current = node.children;
      }
    });
  });

  // Sort: folders first, then files alphabetically
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };

  return sortNodes(root);
}

function FileTreeItem({
  node,
  path = '',
  activeFile,
  onFileSelect,
  onFileDelete,
  onFileRename,
}: {
  node: FileNode;
  path?: string;
  activeFile?: string;
  onFileSelect: (fileName: string) => void;
  onFileDelete?: (name: string) => void;
  onFileRename?: (oldName: string, newName: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const isActive = activeFile === fullPath || activeFile === node.name;

  if (node.type === 'folder') {
    return (
      <div>
        <ContextMenu>
          <ContextMenuTrigger>
            <button
              className={cn(
                'w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors',
                'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400" />
              ) : (
                <Folder className="w-4 h-4 text-amber-400" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onFileDelete?.(fullPath)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {isExpanded && node.children && (
          <div className="ml-3 border-l border-border pl-2">
            {node.children.map((child) => (
              <FileTreeItem
                key={child.name}
                node={child}
                path={fullPath}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                onFileDelete={onFileDelete}
                onFileRename={onFileRename}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors',
            isActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onFileSelect(node.name)}
        >
          <span className="w-3.5" />
          {getFileIcon(node.name)}
          <span className="truncate">{node.name}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onFileRename?.(fullPath, fullPath)}>
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onFileDelete?.(fullPath)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileExplorer({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
}: FileExplorerProps) {
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const fileTree = buildFileTree(files);

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onFileCreate?.(newFileName.trim(), 'file');
      setNewFileName('');
      setShowNewFileDialog(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
          Files
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => setShowNewFileDialog(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        {fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <FileCode className="w-8 h-8 text-sidebar-foreground/30 mb-2" />
            <p className="text-xs text-sidebar-foreground/50">
              No files yet. Generate code to see files here.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.name}
                node={node}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                onFileDelete={onFileDelete}
                onFileRename={onFileRename}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter file name (e.g., App.tsx)"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
