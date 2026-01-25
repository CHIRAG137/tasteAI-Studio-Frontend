import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Send, 
  User, 
  Headphones, 
  CheckCircle,
  RefreshCw,
  Clock
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getAgentAuthHeaders } from "@/utils/agentAuth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  sender: "user" | "agent";
  message: string;
  timestamp: string;
  agentId?: string;
}

interface HandoffSession {
  _id: string;
  bot: {
    _id: string;
    name: string;
    description?: string;
  };
  status: "pending" | "active" | "resolved";
  userQuestion: string;
  requestedAt: string;
  acceptedAt?: string;
  messages: Message[];
}

const AgentChat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
const sessionId = conversationId;
  const { toast } = useToast();
  const [session, setSession] = useState<HandoffSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch session details
  const fetchSession = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${sessionId}/messages`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch session");
      }

      // Fetch session details separately if needed
      const sessionResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/sessions?status=all`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );

      const sessionData = await sessionResponse.json();
      const currentSession = sessionData.result?.sessions?.find(
        (s: any) => s._id === sessionId
      );

      if (currentSession) {
        setSession(currentSession);
      }

      setMessages(data.result?.messages || []);
    } catch (error: any) {
      console.error("Error fetching session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Accept session (if pending)
  const handleAccept = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${sessionId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to accept session");
      }

      toast({
        title: "Success",
        description: "Session accepted successfully",
      });

      fetchSession();
    } catch (error: any) {
      console.error("Error accepting session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept session",
        variant: "destructive",
      });
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const messageContent = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // Optimistically add message
    const optimisticMessage: Message = {
      sender: "agent",
      message: messageContent,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${sessionId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
          body: JSON.stringify({ message: messageContent }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      // Refresh messages
      fetchSession();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m !== optimisticMessage));
    } finally {
      setIsSending(false);
    }
  };

  // Resolve session
  const handleResolve = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${sessionId}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
          body: JSON.stringify({ notes: resolveNotes }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resolve session");
      }

      toast({
        title: "Success",
        description: "Session resolved successfully",
      });

      navigate("/agent");
    } catch (error: any) {
      console.error("Error resolving session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resolve session",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "resolved":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p>Session not found</p>
          <Button onClick={() => navigate("/agent")} className="mt-4">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/agent")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">{session.bot.name}</h1>
                  <Badge className={`${getStatusColor(session.status)} text-xs`}>
                    {session.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.userQuestion}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSession}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {session.status === "pending" && (
                <Button 
                  size="sm" 
                  onClick={handleAccept}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Accept
                </Button>
              )}
              {session.status === "active" && (
                <Button 
                  size="sm" 
                  onClick={() => setShowResolveDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 flex flex-col">
        <Card className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.sender === "agent" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={
                        message.sender === "agent"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-blue-100 text-blue-600"
                      }>
                        {message.sender === "agent" ? (
                          <Headphones className="w-5 w-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[70%] ${
                        message.sender === "agent" ? "text-right" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium capitalize">
                          {message.sender}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          message.sender === "agent"
                            ? "bg-emerald-600 text-white"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          {session.status !== "resolved" && (
            <div className="p-4 border-t bg-white/50">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending || session.status === "pending"}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputMessage.trim() || isSending || session.status === "pending"}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {session.status === "pending" && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Accept the session to start chatting
                </p>
              )}
            </div>
          )}

          {session.status === "resolved" && (
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-muted-foreground">
                This session has been resolved
              </p>
            </div>
          )}
        </Card>
      </main>

      {/* Resolve Dialog */}
      {showResolveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4 p-6">
            <h2 className="text-xl font-bold mb-4">Resolve Session</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add any notes about this session (optional)
            </p>
            <Textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Resolution notes..."
              rows={4}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowResolveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                className="bg-green-600 hover:bg-green-700"
              >
                Resolve Session
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AgentChat;