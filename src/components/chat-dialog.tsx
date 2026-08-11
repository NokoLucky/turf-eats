
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/data';
import { format } from 'date-fns';

interface ChatDialogProps {
  orderId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
}

export function ChatDialog({ orderId, isOpen, onOpenChange, recipientName }: ChatDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !orderId) return null;
    return query(
      collection(firestore, 'orders', orderId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, orderId]);

  const { data: messages } = useCollection<ChatMessage>(messagesQuery);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !user || !firestore) return;

    const messagesRef = collection(firestore, 'orders', orderId, 'messages');
    const newMessage = {
      senderId: user.uid,
      text: messageText.trim(),
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(messagesRef, newMessage);
    setMessageText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-background">
        <div className="bg-primary p-6 text-white shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Chat with {recipientName.split(' ')[0]}</DialogTitle>
                <p className="text-[10px] text-white/70 font-medium uppercase tracking-widest">Order Support</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-muted/20">
          <div className="space-y-4">
            {messages?.length === 0 && (
              <div className="py-20 text-center opacity-30 flex flex-col items-center gap-2">
                <MessageSquare className="h-10 w-10" />
                <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
              </div>
            )}
            {messages?.map((msg) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[80%] gap-1",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    isMe 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-card text-foreground border rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium px-1">
                    {msg.createdAt ? format(msg.createdAt.toDate(), 'p') : 'Sending...'}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 bg-card border-t shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="rounded-xl h-12 bg-muted/50 border-none px-4"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12 rounded-xl bg-primary shadow-lg shadow-primary/20"
              disabled={!messageText.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
