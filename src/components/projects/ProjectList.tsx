import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';
import { CreateProjectDialog } from './CreateProjectDialog';
import { Button } from '@/components/ui/button';
import { useProjects, Project } from '@/hooks/useProjects';
import { Plus, FolderOpen } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function ProjectList() {
  const navigate = useNavigate();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleOpenProject = (project: Project) => {
    navigate(`/chat/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    // For now, just navigate to chat - could add edit modal later
    navigate(`/chat/${project.id}`);
  };

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      await deleteProject.mutateAsync(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Your Projects</h2>
          <p className="text-muted-foreground">Manage your app projects</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Create your first project to start building with AI
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={handleOpenProject}
              onEdit={handleEditProject}
              onDelete={setProjectToDelete}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => {
          createProject.mutate(data);
          setShowCreateDialog(false);
        }}
        isLoading={createProject.isPending}
      />

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
