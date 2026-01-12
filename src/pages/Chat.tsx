import { useState, useCallback } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ConversationHistory } from '@/components/chat/ConversationHistory';
import { FileExplorer } from '@/components/files/FileExplorer';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Loader2, 
  MessageSquare, 
  FolderTree,
  PanelLeftClose,
  PanelLeft,
  Settings,
} from 'lucide-react';
import { 
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import logo from '@/assets/logo.png';
import { CodeFile } from '@/components/code/CodePreview';
import { cn } from '@/lib/utils';

export default function Chat() {
  const { projectId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [leftSidebarTab, setLeftSidebarTab] = useState<'chats' | 'files'>('chats');
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');

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
      
      if (existing) {
        setActiveConversationId(existing.id);
        return existing;
      }

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
      setActiveConversationId(newConv.id);
      return newConv;
    },
    enabled: !!projectId && !!user && !!project,
  });

  const handleConversationSelect = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleNewConversation = useCallback(async () => {
    if (!projectId || !user) return;
    
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: 'New Chat',
      })
      .select()
      .single();
    
    if (!error && newConv) {
      setActiveConversationId(newConv.id);
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
    }
  }, [projectId, user, queryClient]);

  const handleFilesChange = useCallback((files: CodeFile[]) => {
    setCodeFiles(files);
  }, []);

  const handleFileSelect = useCallback((fileName: string) => {
    setActiveFile(fileName);
  }, []);

  if (authLoading || projectLoading || conversationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <div className="min-h-screen h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-12 items-center gap-2 px-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          >
            {showLeftSidebar ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </Button>

          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Eternity Code" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-sm hidden sm:inline">Eternity Code</span>
          </Link>

          <div className="w-px h-5 bg-border mx-1" />

          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Projects</span>
            </Link>
          </Button>

          <div className="flex-1 min-w-0 mx-2">
            <h1 className="font-semibold text-sm truncate">{project.name}</h1>
          </div>

          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/settings">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {showLeftSidebar && (
          <div className="w-60 flex-shrink-0 border-r bg-sidebar flex flex-col">
            <Tabs value={leftSidebarTab} onValueChange={(v) => setLeftSidebarTab(v as 'chats' | 'files')} className="flex-1 flex flex-col">
              <TabsList className="h-10 w-full rounded-none border-b bg-sidebar justify-start gap-0 p-0">
                <TabsTrigger 
                  value="chats" 
                  className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chats
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5"
                >
                  <FolderTree className="w-4 h-4" />
                  Files
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chats" className="flex-1 m-0 overflow-hidden">
                <ConversationHistory
                  projectId={projectId!}
                  activeConversationId={activeConversationId}
                  onConversationSelect={handleConversationSelect}
                  onNewConversation={handleNewConversation}
                />
              </TabsContent>
              <TabsContent value="files" className="flex-1 m-0 overflow-hidden">
                <FileExplorer
                  files={codeFiles}
                  activeFile={activeFile}
                  onFileSelect={handleFileSelect}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Chat Panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel 
            conversationId={activeConversationId}
            onFilesChange={handleFilesChange}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
          />
        </main>
      </div>
    </div>
  );
}
