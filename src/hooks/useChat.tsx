import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { DEFAULT_MODEL, isCustomModel } from '@/lib/models';
import { FileAttachment } from '@/components/chat/ChatInput';
import { getCustomApiConfig } from '@/lib/customApiStorage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: {
    name: string;
    type: 'image' | 'file';
    preview?: string;
    content?: string;
  }[];
}

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const hasLoadedMessages = useRef(false);

  // Load existing messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      hasLoadedMessages.current = false;
      return;
    }

    // Skip if we've already loaded messages for this conversation
    if (hasLoadedMessages.current) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load messages:', error);
        return;
      }

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        setMessages(loadedMessages);
        hasLoadedMessages.current = true;
      }
    };

    loadMessages();
  }, [conversationId]);

  // Reset loaded flag when conversation changes
  useEffect(() => {
    hasLoadedMessages.current = false;
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, attachments?: FileAttachment[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    // Process attachments
    let processedAttachments: Message['attachments'] = undefined;
    let attachmentContext = '';

    if (attachments && attachments.length > 0) {
      processedAttachments = [];
      
      for (const attachment of attachments) {
        const processed: NonNullable<Message['attachments']>[number] = {
          name: attachment.file.name,
          type: attachment.type,
          preview: attachment.preview,
        };

        // Read file content for text files
        if (attachment.type === 'file') {
          try {
            const text = await attachment.file.text();
            processed.content = text;
            attachmentContext += `\n\n--- File: ${attachment.file.name} ---\n${text}\n--- End of ${attachment.file.name} ---\n`;
          } catch (e) {
            console.error('Failed to read file:', e);
          }
        } else if (attachment.type === 'image' && attachment.preview) {
          attachmentContext += `\n\n[Attached image: ${attachment.file.name}]`;
        }

        processedAttachments.push(processed);
      }
    }

    const fullContent = content + attachmentContext;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      attachments: processedAttachments,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database if we have a conversation
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: fullContent, // Save with attachment context
      });
    }

    abortControllerRef.current = new AbortController();
    let assistantContent = '';

    try {
      // Check if using custom API
      const customApiConfig = getCustomApiConfig();
      const useCustomApi = isCustomModel(selectedModel) && customApiConfig?.enabled;
      
      const requestBody: any = {
        messages: [...messages, { role: 'user', content: fullContent }].map(m => ({
          role: m.role,
          content: m.content,
        })),
        model: useCustomApi ? undefined : selectedModel,
      };
      
      // If using custom API, include the config
      if (useCustomApi && customApiConfig) {
        requestBody.customApi = {
          enabled: true,
          provider: customApiConfig.provider,
          apiKey: customApiConfig.apiKey,
          baseUrl: customApiConfig.baseUrl,
          modelId: customApiConfig.modelId,
        };
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (conversationId && assistantContent) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading, conversationId, selectedModel, toast]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    hasLoadedMessages.current = false;
  }, []);

  return {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
  };
}
