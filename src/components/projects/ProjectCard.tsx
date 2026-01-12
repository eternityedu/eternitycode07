import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, MessageSquare } from 'lucide-react';
import { Project } from '@/hooks/useProjects';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onOpen, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpen(project)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
          <CardDescription className="text-xs mt-1">
            Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(project); }}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || 'No description'}
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          <span>Click to open chat</span>
        </div>
      </CardContent>
    </Card>
  );
}
