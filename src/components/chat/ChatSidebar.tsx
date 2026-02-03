import { useState } from "react";
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
  Pencil,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatConversation } from "@/hooks/useChatHistory";
import { cn } from "@/lib/utils";

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

/* ---------------- Group by Date ---------------- */

const groupConversationsByDate = (conversations: ChatConversation[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 604800000);
  const lastMonth = new Date(today.getTime() - 2592000000);

  const groups = [
    { label: "Today", conversations: [] as ChatConversation[] },
    { label: "Yesterday", conversations: [] },
    { label: "Previous 7 Days", conversations: [] },
    { label: "Previous 30 Days", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  conversations.forEach((conv) => {
    const date = new Date(conv.updated_at);
    if (date >= today) groups[0].conversations.push(conv);
    else if (date >= yesterday) groups[1].conversations.push(conv);
    else if (date >= lastWeek) groups[2].conversations.push(conv);
    else if (date >= lastMonth) groups[3].conversations.push(conv);
    else groups[4].conversations.push(conv);
  });

  return groups.filter((g) => g.conversations.length > 0);
};

/* ---------------- Component ---------------- */

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
  onDeleteAll,
}: ChatSidebarProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = searchQuery
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const groupedConversations = groupConversationsByDate(filteredConversations);

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-r bg-card flex flex-col items-center py-3 gap-2">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNewChat}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 h-full border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex gap-2">
          <Button onClick={onNewChat} className="flex-1 gap-2" variant="outline">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
          {conversations.length > 0 && onDeleteAll && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteAllDialogOpen(true)}
              className="text-muted-foreground hover:text-destructive"
              title="Delete all chats"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        {conversations.length > 0 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              groupedConversations.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="text-xs text-muted-foreground px-2 mb-1">{group.label}</p>

                  {group.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors min-w-0 overflow-hidden",
                        activeConversationId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
                      )}
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />

                      <span className="flex-1 min-w-0 truncate text-sm">{conv.title}</span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="
                              h-6 w-6 shrink-0
                              flex items-center justify-center
                              rounded
                              text-muted-foreground
                              opacity-0
                              group-hover:opacity-100
                              transition-opacity
                              hover:text-foreground
                              hover:bg-muted/80
                            "
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setConversationToRename(conv.id);
                              setNewTitle(conv.title);
                              setRenameDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setConversationToDelete(conv.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Enter a new name.</DialogDescription>
          </DialogHeader>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <DialogFooter>
            <Button
              onClick={() => {
                if (conversationToRename && newTitle.trim()) {
                  onRenameConversation(conversationToRename, newTitle.trim());
                }
                setRenameDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={() => {
                if (conversationToDelete) onDeleteConversation(conversationToDelete);
                setDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} and their messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                onDeleteAll?.();
                setDeleteAllDialogOpen(false);
              }}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
