import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { externalSupabase } from '@/lib/externalSupabase';
import { useChatHistory } from '@/hooks/useChatHistory';
import type { ChatMessage } from '@/types/chatTypes';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatConversation } from '@/components/chat/ChatConversation';
import { WEBHOOKS } from '@/constants/api';
import { uploadAttachments } from '@/services/attachmentService';

const ChatMode = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deepThinkMode, setDeepThinkMode] = useState(false);
  
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
    deleteMultipleConversations,
    deleteAllConversations,
    saveMessage,
    addMessageLocally,
    removeMessageLocally,
    switchConversation,
    startNewChat,
    setActiveConversationId,
  } = useChatHistory(userId);

  // Loading state for AI response
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);

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

    // Initialize loading state
    setIsWaitingForAI(true);

    // Upload attachments to external Supabase with duplicate detection
    const uploadResults = await uploadAttachments(attachments, userId);
    
    const uploadedUrls = uploadResults.map(r => r.url);
    const attachmentData = uploadResults.map(r => ({
      name: r.name,
      url: r.url,
      type: r.type,
    }));

    // Log any upload failures
    if (uploadResults.length < attachments.length) {
      const failedCount = attachments.length - uploadResults.length;
      toast({
        title: 'Some uploads failed',
        description: `${failedCount} file(s) could not be uploaded`,
        variant: 'destructive',
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
      setIsWaitingForAI(false);
      return;
    }

    // Show user message immediately in UI
    addMessageLocally(userMessage);

    // Update conversation title from first user message
    if (isFirstMessage && content) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await updateConversationTitle(conversationId, title);
    }

    // Add loading message placeholder
    const loadingMessageId = `loading_${Date.now()}`;
    addMessageLocally({
      id: loadingMessageId,
      conversation_id: conversationId,
      role: 'assistant',
      content: "I received your question and I'm processing it…",
      created_at: new Date().toISOString(),
    });

    // Call n8n webhook for AI response
    const startTime = Date.now();

    try {
      const response = await fetch(WEBHOOKS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          sessionId,
          attachments: uploadedUrls,
          mode: deepThinkMode ? 'deepthink' : 'auto',
        }),
      });

      const data = await response.json();
      const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const payload = data.body ?? data;
      const answer = payload.answer ?? payload.output ?? "I received your question and I'm processing it.";
      const citations = payload.citations ?? [];
      const retrievedMaterials = payload.retrieved_materials ?? [];
      // Legacy fallback
      const source = payload.source_document ?? payload.source;

      // Save AI response to database with new citation fields
      const aiMessage = await saveMessage(conversationId, {
        role: 'assistant',
        content: answer,
        citations: citations.length > 0 ? citations : undefined,
        retrieved_materials: retrievedMaterials.length > 0 ? retrievedMaterials : undefined,
        source: retrievedMaterials.length === 0 && citations.length === 0 ? source : undefined, // Fallback to legacy
      });

      // Remove loading message and add real AI response with response time
      removeMessageLocally(loadingMessageId);
      if (aiMessage) {
        addMessageLocally({ ...aiMessage, responseTime });
      }
    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      
      // Save error message
      const errorMessage = await saveMessage(conversationId, {
        role: 'assistant',
        content:
          "Hmm, I couldn't retrieve a course-specific answer right now. Please try rephrasing your question or check back later.",
      });

      // Remove loading message and add error response
      removeMessageLocally(loadingMessageId);
      if (errorMessage) {
        addMessageLocally(errorMessage);
      }
    } finally {
      setIsWaitingForAI(false);
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
          onRenameConversation={updateConversationTitle}
          onDeleteMultiple={deleteMultipleConversations}
          onDeleteAll={deleteAllConversations}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatConversation
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          isAuthenticated={isAuthenticated}
          isWaitingForAI={isWaitingForAI}
          deepThinkMode={deepThinkMode}
          onToggleDeepThink={setDeepThinkMode}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default ChatMode;
