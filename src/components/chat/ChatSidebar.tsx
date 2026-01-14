import { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Square,
  X,
  Trash,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatConversation } from '@/hooks/useChatHistory';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onDeleteAll?: () => void;
}

// Group conversations by date
const groupConversationsByDate = (conversations: ChatConversation[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { label: string; conversations: ChatConversation[] }[] = [
    { label: 'Today', conversations: [] },
    { label: 'Yesterday', conversations: [] },
    { label: 'Previous 7 Days', conversations: [] },
    { label: 'Previous 30 Days', conversations: [] },
    { label: 'Older', conversations: [] },
  ];

  conversations.forEach(conv => {
    const date = new Date(conv.updated_at);
    
    if (date >= today) {
      groups[0].conversations.push(conv);
    } else if (date >= yesterday) {
      groups[1].conversations.push(conv);
    } else if (date >= lastWeek) {
      groups[2].conversations.push(conv);
    } else if (date >= lastMonth) {
      groups[3].conversations.push(conv);
    } else {
      groups[4].conversations.push(conv);
    }
  });

  return groups.filter(group => group.conversations.length > 0);
};

export const ChatSidebar = ({
  conversations,
  activeConversationId,
  isLoading,
  isCollapsed,
  onToggleCollapse,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onDeleteMultiple,
  onDeleteAll,
}: ChatSidebarProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  
  // Rename state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const groupedConversations = groupConversationsByDate(conversations);

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (conversationId: string, currentTitle: string) => {
    setConversationToRename(conversationId);
    setNewTitle(currentTitle);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = () => {
    if (conversationToRename && newTitle.trim()) {
      onRenameConversation(conversationToRename, newTitle.trim());
    }
    setRenameDialogOpen(false);
    setConversationToRename(null);
    setNewTitle('');
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleConfirmClearAll = () => {
    onDeleteAll?.();
    setClearAllDialogOpen(false);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleConfirmBulkDelete = () => {
    onDeleteMultiple?.(Array.from(selectedIds));
    setBulkDeleteDialogOpen(false);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-r bg-card flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="text-primary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 h-full border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between gap-2">
          {isSelectionMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectionMode}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            </>
          ) : (
            <>
              <Button
                onClick={onNewChat}
                className="flex-1 gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setIsSelectionMode(true)}
                    disabled={conversations.length === 0}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select chats
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setClearAllDialogOpen(true)}
                    disabled={conversations.length === 0}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Clear all chats
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Selection Mode Actions */}
        {isSelectionMode && (
          <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-xs"
            >
              {selectedIds.size === conversations.length ? (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Deselect all
                </>
              ) : (
                <>
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Select all
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={selectedIds.size === 0}
              className="text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete ({selectedIds.size})
            </Button>
          </div>
        )}

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2 pr-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedConversations.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.conversations.map(conv => (
                        <div
                          key={conv.id}
                          className={cn(
                            "group flex items-center gap-2 pl-2 pr-1 py-2 rounded-lg cursor-pointer transition-colors",
                            activeConversationId === conv.id && !isSelectionMode
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted",
                            isSelectionMode && selectedIds.has(conv.id) && "bg-primary/10"
                          )}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelection(conv.id);
                            } else {
                              onSelectConversation(conv.id);
                            }
                          }}
                        >
                          {isSelectionMode ? (
                            <Checkbox
                              checked={selectedIds.has(conv.id)}
                              onCheckedChange={() => toggleSelection(conv.id)}
                              className="flex-shrink-0"
                            />
                          ) : (
                            <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="flex-1 min-w-0 text-sm truncate">
                            {conv.title}
                          </span>
                          {!isSelectionMode && (
                            <div className="flex-shrink-0 w-6 h-6">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-50 bg-popover">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameClick(conv.id, conv.title);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(conv.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Single Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} and their messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} conversation{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected conversations and all their messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Conversation name"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename} disabled={!newTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
