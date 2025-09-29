import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
}

interface FlowNode {
  id: string;
  type: 'message' | 'question' | 'confirmation' | 'branch' | 'redirection';
  data: {
    message?: string;
    variable?: string;
    options?: string[];
    redirectUrl?: string;
  };
}

interface ConversationFlow {
  nodes: FlowNode[];
  edges: { source: string; target: string; id: string; sourceHandle?: string }[];
}

export const PublicBotChatPage = () => {
  const { botId } = useParams<{ botId: string }>();
  const { toast } = useToast();
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [flowCompleted, setFlowCompleted] = useState(false);
  const [collectedVariables, setCollectedVariables] = useState<Record<string, string>>({});
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isListening, toggleListening } = useSpeechToText({
    onResult: (text) => {
      setInputMessage(prev => prev + (prev ? ' ' : '') + text);
    },
    onError: (error) => {
      toast({
        title: "Speech Recognition Error",
        description: error,
        variant: "destructive"
      });
    },
    language: 'en-US'
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize conversation flow on mount - EXACT COPY from ChatBot.tsx
  useEffect(() => {
    if (bot && bot.conversationFlow && bot.conversationFlow.nodes.length > 0 && !flowCompleted) {
      // Find the first node (usually a message node)
      const firstNode = bot.conversationFlow.nodes.find((n: any) => 
        !bot.conversationFlow?.edges.some((e: any) => e.target === n.id)
      );
      
      if (firstNode) {
        setCurrentNodeId(firstNode.id);
        processNode(firstNode);
      } else {
        // No conversation flow, start with regular greeting
        setFlowCompleted(true);
        setMessages([{
          id: "1",
          content: `Hello! I'm ${bot.name}. ${bot.description} How can I help you today?`,
          sender: "bot",
          timestamp: new Date(),
        }]);
      }
    } else if (bot && (!bot.conversationFlow || bot.conversationFlow.nodes.length === 0)) {
      // No conversation flow defined
      setFlowCompleted(true);
      setMessages([{
        id: "1",
        content: `Hello! I'm ${bot.name}. ${bot.description} How can I help you today?`,
        sender: "bot",
        timestamp: new Date(),
      }]);
    }
  }, [bot, flowCompleted]);

  const processNode = (node: FlowNode) => {
    if (!node) return;

    switch (node.type) {
      case 'message':
        // Display message and move to next node
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: node.data.message || '',
          sender: 'bot',
          timestamp: new Date()
        }]);
        
        // Find and process next node
        setTimeout(() => {
          const nextEdge = bot.conversationFlow?.edges.find((e: any) => e.source === node.id);
          if (nextEdge) {
            const nextNode = bot.conversationFlow?.nodes.find((n: any) => n.id === nextEdge.target);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              processNode(nextNode);
            }
          } else {
              // Flow completed
              setFlowCompleted(true);
          }
        }, 1000);
        break;

      case 'question':
        // Display question and wait for user response
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: node.data.message || '',
          sender: 'bot',
          timestamp: new Date()
        }]);
        setAwaitingResponse(true);
        break;

      case 'confirmation':
        // Display confirmation with yes/no options
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: node.data.message || '',
          sender: 'bot',
          timestamp: new Date(),
          showConfirmationButtons: true
        }]);
        setAwaitingResponse(true);
        break;

      case 'branch':
        // Display branch options with buttons
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: node.data.message || 'Please select an option:',
          sender: 'bot',
          timestamp: new Date(),
          showBranchOptions: true,
          branchOptions: node.data.options || []
        }]);
        setAwaitingResponse(true);
        break;

      case 'redirection':
        // Handle redirection
        if (node.data.redirectUrl) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: `Redirecting to: ${node.data.redirectUrl}`,
            sender: 'bot',
            timestamp: new Date()
          }]);
          setTimeout(() => {
            window.open(node.data.redirectUrl, '_blank');
            // Continue flow
            const nextEdge = bot.conversationFlow?.edges.find((e: any) => e.source === node.id);
            if (nextEdge) {
              const nextNode = bot.conversationFlow?.nodes.find((n: any) => n.id === nextEdge.target);
              if (nextNode) {
                setCurrentNodeId(nextNode.id);
                processNode(nextNode);
              }
            } else {
              setFlowCompleted(true);
            }
          }, 2000);
        }
        break;
    }
  };

  const handleFlowResponse = (userInput: string) => {
    const currentNode = bot.conversationFlow?.nodes.find((n: any) => n.id === currentNodeId);
    if (!currentNode) return;

    // Store variable if defined
    if (currentNode.data.variable) {
      setCollectedVariables(prev => ({
        ...prev,
        [currentNode.data.variable]: userInput
      }));
    }

    const allEdgesFromNode = bot.conversationFlow?.edges?.filter((e: any) => e.source === currentNodeId) || [];
    const handleEdges = allEdgesFromNode.filter((e: any) => typeof e.sourceHandle === 'string' && e.sourceHandle.length > 0);
    let nextEdge: typeof allEdgesFromNode[number] | undefined;

    if (currentNode.type === 'confirmation') {
      const normalized = userInput.trim().toLowerCase();
      const isYes = /\b(yes|y|yeah|yep|sure|ok|okay)\b/.test(normalized);
      const chosenHandle = isYes ? 'yes' : 'no';

      if (handleEdges.length > 0) {
        // Only follow handle-specific edges when available
        nextEdge = handleEdges.find((e: any) => e.sourceHandle === chosenHandle);

        if (!nextEdge) {
          // No path for the chosen handle -> complete the flow
          setFlowCompleted(true);
          setAwaitingResponse(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: "Now feel free to ask me any questions!",
            sender: 'bot',
            timestamp: new Date()
          }]);
          return;
        }
      } else {
        // No handle edges exist; fallback to sequential edge (if any)
        nextEdge = allEdgesFromNode.length === 1 ? allEdgesFromNode[0] : allEdgesFromNode[0];
      }
    } else if (currentNode.type === 'branch') {
      const options = currentNode.data.options || [];
      const normalized = userInput.trim().toLowerCase();
      const selectedOption = options.find((option: string) =>
        normalized.includes(option.toLowerCase())
      );

      if (selectedOption) {
        const optionIndex = options.indexOf(selectedOption);
        // Look for edge from the branch node to option node (e.g., "2-to-opt-0")
        const optionNodeId = `${currentNodeId}-opt-${optionIndex}`;
        nextEdge = allEdgesFromNode.find((e: any) => String(e.target) === String(optionNodeId));
        
        if (nextEdge) {
          // Now find the edge from the option node to the next node
          const edgeFromOption = bot.conversationFlow?.edges?.find((e: any) => String(e.source) === String(optionNodeId));
          if (edgeFromOption) {
            const nextNode = bot.conversationFlow?.nodes.find((n: any) => String(n.id) === String(edgeFromOption.target));
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              setAwaitingResponse(false);
              setTimeout(() => processNode(nextNode), 300);
              return;
            }
          } else {
            // No edge from option node - switch to ask API
            setFlowCompleted(true);
            setAwaitingResponse(false);
            return;
          }
        }
      }

      // If no valid option selected, ask again
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Please choose one of the provided options:\n${(options || []).join('\n')}`,
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    } else {
      nextEdge = allEdgesFromNode[0];
    }

    if (nextEdge) {
      const nextNode = bot.conversationFlow?.nodes.find((n: any) => n.id === nextEdge.target);
      if (nextNode) {
        setCurrentNodeId(nextNode.id);
        setAwaitingResponse(false);
        setTimeout(() => processNode(nextNode), 300);
        return;
      }
    }

      // Flow completed - no more edges or invalid next node
      setFlowCompleted(true);
      setAwaitingResponse(false);
  };

  useEffect(() => {
    const fetchBot = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`);
        const data = await res.json();
        setBot(data.result);
      } catch (err) {
        console.error("Failed to fetch bot:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBot();
  }, [botId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Check if we're in conversation flow mode
    if (!flowCompleted && awaitingResponse) {
      // Handle flow response
      handleFlowResponse(userMessage.content);
      return;
    }

    // Otherwise, use the askBot API
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.content,
          botId: botId,
        }),
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer || data.message || "Sorry, I don't have an answer for that.",
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to fetch bot response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "Something went wrong. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (!bot?.is_voice_enabled) return;
    toggleListening();
  };

  if (loading) return <p className="text-center mt-10">Loading bot...</p>;
  if (!bot) return <p className="text-center mt-10 text-red-500">Bot not found</p>;

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center">
      <Card className="w-full max-w-2xl flex flex-col shadow-md border">
        <CardHeader className="border-b bg-gradient-primary text-white">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-white/20">
              <AvatarFallback className="bg-white/20 text-white">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{bot.name}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                  {bot.primary_purpose}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                  {bot.conversation_tone}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  {message.sender === "bot" && (
                    <Avatar className="h-8 w-8 bg-gradient-primary flex-shrink-0">
                      <AvatarFallback className="bg-gradient-primary text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`rounded-lg px-3 py-2 ${message.sender === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                        }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {message.showConfirmationButtons && awaitingResponse && message.sender === "bot" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              content: "Yes",
                              sender: "user",
                              timestamp: new Date(),
                            }]);
                            handleFlowResponse("Yes");
                          }}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              content: "No",
                              sender: "user",
                              timestamp: new Date(),
                            }]);
                            handleFlowResponse("No");
                          }}
                          className="hover:bg-destructive hover:text-destructive-foreground"
                        >
                          No
                        </Button>
                      </div>
                    )}
                    {message.showBranchOptions && awaitingResponse && message.sender === "bot" && message.branchOptions && (
                      <div className="flex flex-wrap gap-2">
                        {message.branchOptions.map((option, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMessages(prev => [...prev, {
                                id: Date.now().toString(),
                                content: option,
                                sender: "user",
                                timestamp: new Date(),
                              }]);
                              handleFlowResponse(option);
                            }}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.sender === "user" && (
                    <Avatar className="h-8 w-8 bg-secondary flex-shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 bg-gradient-primary flex-shrink-0">
                    <AvatarFallback className="bg-gradient-primary text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="border-t p-4 bg-background">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="pr-12"
                />
                {bot.is_voice_enabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceInput}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                      isListening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-primary"
                    }`}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="bg-gradient-primary hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Supported languages:</span>
              {bot.supported_languages}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
