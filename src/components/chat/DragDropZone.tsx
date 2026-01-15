import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, Image, FileText } from 'lucide-react';
import { FileAttachment } from './ChatInput';

interface DragDropZoneProps {
  children: React.ReactNode;
  onFilesDropped: (attachments: FileAttachment[]) => void;
}

export function DragDropZone({ children, onFilesDropped }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const attachments: FileAttachment[] = [];
    
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/');
      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        file,
        type: isImage ? 'image' : 'file',
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          // Re-trigger to update with preview
          onFilesDropped([...attachments]);
        };
        reader.readAsDataURL(file);
      }

      attachments.push(attachment);
    });

    onFilesDropped(attachments);
  }, [onFilesDropped]);

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Image className="w-7 h-7 text-primary" />
              </div>
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary">Drop files here</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Images, code files, and documents supported
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
