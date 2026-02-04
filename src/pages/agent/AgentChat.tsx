import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Send, 
  User, 
  Headphones, 
  CheckCircle,
  RefreshCw,
  Clock,
  Bot,
  MessageSquare
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

interface PreHandoffMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  mode?: "flow" | "qa" | "handoff";
  type?: string;
  isConfirmation?: boolean;
  confirmationResponse?: string;
  isSystemMessage?: boolean;
  isAgentMessage?: boolean;
}

interface HandoffSession {
  _id: string;
  bot: {
    _id: string;
    name: string;
    description?: string;
  };
  sessionId?: string; // Original chat session ID
  flowSession?: {
    _id: string;
    history: any[];
    variables?: Record<string, any>;
  };
  status: "pending" | "active" | "resolved";
  userQuestion: string;
  requestedAt: string;
  acceptedAt?: string;
  messages: Message[];
}

// Helper function to format history entry into readable message
const formatHistoryEntry = (h: any): string => {
  let content = "";
  
  if (h.mode === "qa") {
    content = h.answer || "No match found";
  } else if (h.mode === "handoff") {
    if (h.systemMessage || h.type?.startsWith("handoff_")) {
      content = h.content || "(handoff system message)";
    } else if (h.type === "handoff_initiated") {
      content = `${h.content || "User requested assistance"}`;
    } else if (h.sender === "agent" || (!h.fromUser && h.messageText)) {
      content = `${h.messageText || h.content || "(message)"}`;
    } else if (h.fromUser) {
      content = `${h.messageText || h.content || "(message)"}`;
    } else {
      content = `${h.messageText || h.content || "(handoff event)"}`;
    }
  } else if (h.mode === "flow") {
    switch (h.type) {
      case "branch_select":
        content = h.content?.selected 
          ? `Selected: ${h.content.selected}` 
          : `Branch selected`;
        break;
      case "user_input":
        content = h.content || "(user input)";
        break;
      case "code":
        if (h.content?.success !== undefined) {
          const status = h.content.success ? '✓ Success' : '✗ Failed';
          const result = h.content.result ? `: ${JSON.stringify(h.content.result)}` : "";
          content = `Code executed (${status})${result}`;
        } else {
          content = `Code executed`;
        }
        break;
      case "confirmation":
        if (typeof h.content === "object" && h.content !== null) {
          content = h.content.prompt || h.content.message || JSON.stringify(h.content);
        } else {
          content = h.content ? `${h.content}` : `Confirmation requested`;
        }
        break;
        break;
      case "question":
        if (h.awaitingInput) {
          if (typeof h.content === "object" && h.content !== null) {
            // Handle question object with {prompt, answer, variable}
            content = h.content.prompt || h.content.answer || JSON.stringify(h.content);
          } else {
            content = h.content ? `${h.content}` : `Question presented (awaiting response)`;
          }
        } else {
          if (typeof h.content === "object" && h.content !== null) {
            content = h.content.prompt || h.content.answer || JSON.stringify(h.content);
          } else {
            content = h.content || `Question`;
          }
        }
        break;
      case "message":
        content = h.content || "[Empty message]";
        break;
      case "redirect":
        content = h.content 
          ? `Redirected to: ${h.content}` 
          : `Redirected`;
        break;
      default:
        if (h.content) {
          content = typeof h.content === "object" 
            ? JSON.stringify(h.content) 
            : h.content;
        } else {
          content = `[${h.type || "System event"}]`;
        }
    }
  } else {
    if (h.type === "branch_select" && h.content?.selected) {
      content = `Selected: ${h.content.selected}`;
    } else if (typeof h.content === "object" && h.content !== null) {
      content = JSON.stringify(h.content);
    } else {
      content = h.content || `[${h.type || "Event"}]`;
    }
  }
  
  return content;
};

// Map history to pre-handoff messages
const mapHistoryToPreHandoffMessages = (history: any[]): PreHandoffMessage[] => {
  const messages: PreHandoffMessage[] = [];
  
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    
    // Stop when we hit handoff messages (those will be shown in the handoff section)
    if (h.mode === "handoff") {
      break;
    }
    
    // Handle QA mode - split into question (user) and answer (assistant)
    if (h.mode === "qa") {
      if (h.question) {
        messages.push({
          role: "user",
          content: h.question,
          timestamp: h.timestamp,
          mode: "qa",
          type: "question",
        });
      }
      if (h.answer) {
        messages.push({
          role: "assistant",
          content: h.answer,
          timestamp: h.timestamp,
          mode: "qa",
          type: "answer",
        });
      }
      continue;
    }
    
    // Handle confirmation - look ahead for the response
    if (h.mode === "flow" && h.type === "confirmation" && !h.fromUser) {
      let confirmationResponse: string | undefined;
      for (let j = i + 1; j < history.length; j++) {
        const nextH = history[j];
        if (nextH.mode === "flow" && nextH.type === "user_input" && nextH.fromUser && nextH.nodeId === h.nodeId) {
          confirmationResponse = nextH.content?.toLowerCase() === "yes" || nextH.content?.toLowerCase() === "no" 
            ? nextH.content 
            : undefined;
          break;
        }
        if (nextH.nodeId !== h.nodeId && nextH.type !== "user_input") {
          break;
        }
      }
      
      messages.push({
        role: "assistant",
        content: formatHistoryEntry(h),
        timestamp: h.timestamp,
        mode: h.mode,
        type: h.type,
        isConfirmation: true,
        confirmationResponse,
      });
      continue;
    }
    
    // Skip user_input that was a confirmation response
    if (h.mode === "flow" && h.type === "user_input" && h.fromUser) {
      const prevConfirmation = history.slice(0, i).reverse().find(
        (ph: any) => ph.nodeId === h.nodeId && ph.type === "confirmation"
      );
      if (prevConfirmation && (h.content?.toLowerCase() === "yes" || h.content?.toLowerCase() === "no")) {
        continue;
      }
    }
    
    // Default handling
    messages.push({
      role: h.fromUser ? "user" : "assistant",
      content: formatHistoryEntry(h),
      timestamp: h.timestamp,
      mode: h.mode,
      type: h.type,
    });
  }
  
  return messages;
};

const AgentChat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const sessionId = conversationId;
  const { toast } = useToast();
  const [session, setSession] = useState<HandoffSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [preHandoffMessages, setPreHandoffMessages] = useState<PreHandoffMessage[]>([]);
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

  // Process pre-handoff history from session.flowSession.history
  useEffect(() => {
    if (session?.flowSession?.history && session.flowSession.history.length > 0) {
      const mappedMessages = mapHistoryToPreHandoffMessages(session.flowSession.history);
      setPreHandoffMessages(mappedMessages);
    }
  }, [session?.flowSession?.history]);

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
            {preHandoffMessages.length === 0 && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pre-handoff Chat History */}
                {preHandoffMessages.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Previous Chat History
                      </span>
                    </div>
                    
                    {preHandoffMessages.map((msg, index) => (
                      <div
                        key={`pre-${index}`}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className={
                            msg.role === "user"
                              ? "bg-gradient-to-br from-blue-500 to-purple-500"
                              : "bg-gradient-to-br from-emerald-500 to-teal-500"
                          }>
                            {msg.role === "user" ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : ""}`}>
                          <div className={`flex items-center gap-2 mb-1 ${msg.role === "user" ? "justify-end" : ""}`}>
                            <span className="text-xs font-medium capitalize text-muted-foreground">
                              {msg.role === "user" ? "User" : "Bot"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div
                            className={`inline-block px-4 py-2 rounded-2xl shadow-sm ${
                              msg.role === "user"
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md"
                                : "bg-gray-100 dark:bg-gray-800 text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          
                          {/* Confirmation buttons */}
                          {msg.isConfirmation && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className={`text-xs ${
                                  msg.confirmationResponse?.toLowerCase() === "yes"
                                    ? "bg-green-100 border-green-500 text-green-700"
                                    : ""
                                }`}
                              >
                                Yes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className={`text-xs ${
                                  msg.confirmationResponse?.toLowerCase() === "no"
                                    ? "bg-red-100 border-red-500 text-red-700"
                                    : ""
                                }`}
                              >
                                No
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Separator between pre-handoff and handoff messages */}
                    <div className="flex items-center gap-3 py-4">
                      <Separator className="flex-1" />
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                        <Headphones className="w-3 h-3 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">
                          Handoff Started
                        </span>
                      </div>
                      <Separator className="flex-1" />
                    </div>
                  </>
                )}
                
                {/* Handoff Messages */}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.sender === "agent" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={
                        message.sender === "agent"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                          : "bg-gradient-to-br from-blue-500 to-purple-500"
                      }>
                        {message.sender === "agent" ? (
                          <Headphones className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[75%] ${
                        message.sender === "agent" ? "text-right" : ""
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-1 ${message.sender === "agent" ? "justify-end" : ""}`}>
                        <span className="text-xs font-medium capitalize text-muted-foreground">
                          {message.sender === "agent" ? "You" : "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-2xl shadow-sm ${
                          message.sender === "agent"
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-md"
                            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-bl-md"
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