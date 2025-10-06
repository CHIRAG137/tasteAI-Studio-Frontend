import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Clock, User } from "lucide-react";
import { useState } from "react";

interface Session {
  id: string;
  userId: string;
  timestamp: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  duration?: string;
}

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
}

// Mock data - replace with actual API call
const mockSessions: Session[] = [
  {
    id: "session-1",
    userId: "user-123",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: "5m 23s",
    messages: [
      {
        role: "user",
        content: "Hello, I need help with my order",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        role: "assistant",
        content: "Hi! I'd be happy to help you with your order. Could you please provide your order number?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1000).toISOString(),
      },
      {
        role: "user",
        content: "It's ORDER-12345",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
      },
      {
        role: "assistant",
        content: "Thank you! I found your order. It's currently being processed and should ship within 2 business days.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 32000).toISOString(),
      },
    ],
  },
  {
    id: "session-2",
    userId: "user-456",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: "3m 45s",
    messages: [
      {
        role: "user",
        content: "What are your business hours?",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        role: "assistant",
        content: "We're open Monday through Friday, 9 AM to 6 PM EST. How can I assist you today?",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1000).toISOString(),
      },
    ],
  },
];

export const SessionsModal = ({ isOpen, onClose, botId, botName }: SessionsModalProps) => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Sessions for {botName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[600px]">
          {/* Sessions List */}
          <div className="w-1/3 border-r">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {mockSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSession?.id === session.id ? 'border-primary shadow-md' : ''
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{session.userId}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {session.messages.length} msgs
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.timestamp)}
                      </div>
                      {session.duration && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {session.duration}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {session.messages[0]?.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {mockSessions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Session Replay */}
          <div className="flex-1">
            {selectedSession ? (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="font-semibold text-lg">Session Replay</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedSession.timestamp)} at {formatTime(selectedSession.timestamp)}
                      </p>
                    </div>
                    {selectedSession.duration && (
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedSession.duration}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedSession.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`flex flex-col gap-1 ${
                            message.role === 'user' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`rounded-lg px-4 py-2 max-w-[80%] ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a session to view the replay</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
