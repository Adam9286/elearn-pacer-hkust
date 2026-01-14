import { useState, useEffect, useCallback } from 'react';
import { externalSupabase } from '@/lib/externalSupabase';

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  responseTime?: string; // Debug timer - local only, not persisted
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  created_at: string;
}

export const useChatHistory = (userId: string | null) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Fetch all conversations for the user
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    
    setIsLoadingConversations(true);
    try {
      const { data, error } = await externalSupabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [userId]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await externalSupabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (title: string = 'New Chat'): Promise<string | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await externalSupabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [userId]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const { error } = await externalSupabase
        .from('chat_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title, updated_at: new Date().toISOString() } 
            : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await externalSupabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If deleting the active conversation, reset
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [activeConversationId]);

  // Delete multiple conversations
  const deleteMultipleConversations = useCallback(async (conversationIds: string[]) => {
    if (!userId || conversationIds.length === 0) return;

    try {
      const { error } = await externalSupabase
        .from('chat_conversations')
        .delete()
        .in('id', conversationIds);

      if (error) throw error;
      
      setConversations(prev => prev.filter(conv => !conversationIds.includes(conv.id)));
      
      // If deleting the active conversation, reset
      if (activeConversationId && conversationIds.includes(activeConversationId)) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting multiple conversations:', error);
    }
  }, [userId, activeConversationId]);

  // Delete all conversations for the user
  const deleteAllConversations = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await externalSupabase
        .from('chat_conversations')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    } catch (error) {
      console.error('Error deleting all conversations:', error);
    }
  }, [userId]);

  // Save a message to the database
  const saveMessage = useCallback(async (
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'conversation_id' | 'created_at'>
  ): Promise<ChatMessage | null> => {
    try {
      const { data, error } = await externalSupabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          source: message.source || null,
          attachments: message.attachments || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update conversation's updated_at
      await externalSupabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Move conversation to top of list
      setConversations(prev => {
        const conv = prev.find(c => c.id === conversationId);
        if (!conv) return prev;
        return [
          { ...conv, updated_at: new Date().toISOString() },
          ...prev.filter(c => c.id !== conversationId)
        ];
      });

      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }, []);

  // Add message to local state immediately (optimistic update)
  const addMessageLocally = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update message in local state (for replacing loading messages)
  const updateMessageLocally = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Remove message from local state
  const removeMessageLocally = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Switch to a different conversation
  const switchConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await fetchMessages(conversationId);
  }, [fetchMessages]);

  // Start a new chat
  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  return {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    fetchConversations,
    fetchMessages,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    deleteMultipleConversations,
    deleteAllConversations,
    saveMessage,
    addMessageLocally,
    updateMessageLocally,
    removeMessageLocally,
    switchConversation,
    startNewChat,
    setActiveConversationId,
  };
};
