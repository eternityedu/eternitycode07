import { useParams, Navigate, Link } from 'react-router-dom';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function Chat() {
  const { projectId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Get or create conversation for this project
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', projectId],
    queryFn: async () => {
      if (!projectId || !user) return null;
      
      // Try to find existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existing) return existing;

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          user_id: user.id,
          title: project?.name || 'New Chat',
        })
        .select()
        .single();
      
      if (error) throw error;
      return newConv;
    },
    enabled: !!projectId && !!user && !!project,
  });

  if (authLoading || projectLoading || conversationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!project) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate">{project.description}</p>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatPanel conversationId={conversation?.id} />
      </main>
    </div>
  );
}
