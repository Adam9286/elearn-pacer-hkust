import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/lib/externalSupabase';
import { useChatHistory, ChatMessage } from '@/hooks/useChatHistory';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatConversation } from '@/components/chat/ChatConversation';

const ChatMode = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const sessionId = useMemo(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  // Check authentication status from external Supabase
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await externalSupabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          setIsAuthenticated(true);
        } else {
          setUserId(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    saveMessage,
    switchConversation,
    startNewChat,
    setActiveConversationId,
  } = useChatHistory(userId);

  // Handle sending a message
  const handleSendMessage = async (content: string, attachments: File[]) => {
    if (!userId) return;

    let conversationId = activeConversationId;
    const isFirstMessage = !conversationId;

    // Create new conversation if needed
    if (!conversationId) {
      conversationId = await createConversation('New Chat');
      if (!conversationId) {
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive',
        });
        return;
      }
      setActiveConversationId(conversationId);
    }

    // Upload attachments to Lovable Cloud storage
    const uploadedUrls: string[] = [];
    const attachmentData: Array<{ name: string; url: string; type: string }> = [];

    for (const file of attachments) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
        continue;
      }

      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(uploadData.path);
      uploadedUrls.push(urlData.publicUrl);
      attachmentData.push({
        name: file.name,
        url: urlData.publicUrl,
        type: file.type,
      });
    }

    // Save user message to database
    const userMessage = await saveMessage(conversationId, {
      role: 'user',
      content: content || '📎 Sent attachment(s)',
      attachments: attachmentData.length > 0 ? attachmentData : undefined,
    });

    if (!userMessage) {
      toast({
        title: 'Error',
        description: 'Failed to save message',
        variant: 'destructive',
      });
      return;
    }

    // Update conversation title from first user message
    if (isFirstMessage && content) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await updateConversationTitle(conversationId, title);
    }

    // Call n8n webhook for AI response
    try {
      const response = await fetch(
        'https://smellycat9286.app.n8n.cloud/webhook-test/638fa33f-5871-43b3-a34e-d318a2147001',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: content,
            sessionId,
            attachments: uploadedUrls,
          }),
        }
      );

      const data = await response.json();
      const payload = data.body ?? data;
      const output = payload.output ?? "I received your question and I'm processing it.";
      const source = payload.source_document ?? payload.source;

      // Save AI response to database
      await saveMessage(conversationId, {
        role: 'assistant',
        content: output,
        source: source,
      });

      // Refresh messages
      await switchConversation(conversationId);
    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      
      // Save error message
      await saveMessage(conversationId, {
        role: 'assistant',
        content:
          "Hmm, I couldn't retrieve a course-specific answer right now. Please try rephrasing your question or check back later.",
      });

      await switchConversation(conversationId);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px]">
      {/* Sidebar - only show when authenticated */}
      {isAuthenticated && (
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectConversation={switchConversation}
          onNewChat={startNewChat}
          onDeleteConversation={deleteConversation}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatConversation
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          isAuthenticated={isAuthenticated}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default ChatMode;
