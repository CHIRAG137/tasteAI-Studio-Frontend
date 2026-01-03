import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Send, 
  User, 
  Headphones, 
  Bot, 
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getAgentAuthHeaders, getAgentEmail } from "@/utils/agentAuth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "agent" | "bot";
  senderName?: string;
  timestamp: string;
}

interface ConversationDetails {
  id: string;
  sessionId: string;
  botName: string;
  botId: string;
  userName?: string;
  userEmail?: string;
  status: "pending" | "active" | "resolved";
  createdAt: string;
}

const AgentChat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentEmail = getAgentEmail();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/agent/conversations/${conversationId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch conversation");
      }

      setConversation(data.result?.conversation);
      setMessages(data.result?.messages || []);
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchConversation, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const messageContent = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // Optimistically add the message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender: "agent",
      senderName: agentEmail || "Agent",
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/agent/conversations/${conversationId}/messages`,
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
        throw new Error(data.error || "Failed to send message");
      }

      // Refresh messages
      fetchConversation();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/agent/conversations/${conversationId}/resolve`,
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
        throw new Error(data.error || "Failed to resolve conversation");
      }

      toast({
        title: "Success",
        description: "Conversation marked as resolved",
      });

      navigate("/agent");
    } catch (error: any) {
      console.error("Error resolving conversation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resolve conversation",
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

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case "user":
        return <User className="w-4 h-4" />;
      case "agent":
        return <Headphones className="w-4 h-4" />;
      case "bot":
        return <Bot className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case "user":
        return "bg-blue-100 text-blue-600";
      case "agent":
        return "bg-emerald-100 text-emerald-600";
      case "bot":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

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
                  <h1 className="font-semibold">
                    {conversation?.botName || "Loading..."}
                  </h1>
                  {conversation && (
                    <Badge className={`${getStatusColor(conversation.status)} text-xs`}>
                      {conversation.status}
                    </Badge>
                  )}
                </div>
                {conversation?.userName && (
                  <p className="text-xs text-muted-foreground">
                    {conversation.userName}
                    {conversation.userEmail && ` · ${conversation.userEmail}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchConversation}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {conversation?.status !== "resolved" && (
                <Button 
                  size="sm" 
                  onClick={handleResolve}
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
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender === "agent" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className={`w-8 h-8 ${getSenderColor(message.sender)}`}>
                      <AvatarFallback className={getSenderColor(message.sender)}>
                        {getSenderIcon(message.sender)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[70%] ${
                        message.sender === "agent" ? "text-right" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium capitalize">
                          {message.senderName || message.sender}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          message.sender === "agent"
                            ? "bg-emerald-600 text-white"
                            : message.sender === "bot"
                            ? "bg-purple-100 text-purple-900"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          {conversation?.status !== "resolved" && (
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
                  disabled={isSending}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputMessage.trim() || isSending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {conversation?.status === "resolved" && (
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-muted-foreground">
                This conversation has been resolved
              </p>
            </div>
          )}
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-2 text-center text-xs text-muted-foreground">
        Powered by TasteAI Studio
      </footer>
    </div>
  );
};

export default AgentChat;
