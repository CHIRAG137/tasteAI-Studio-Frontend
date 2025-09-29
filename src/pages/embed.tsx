import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Send, Bot, User, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { EmbedCustomization } from "@/components/EmbedCustomizer";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface Message {
  id: string;
  from: "user" | "bot";
  text: string;
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

export default function EmbedChat() {
  const [searchParams] = useSearchParams();
  const botId = searchParams.get("botId");
  const isPreview = searchParams.get("preview") === "true";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customization, setCustomization] = useState<EmbedCustomization | null>(null);
  const [botData, setBotData] = useState<any>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [flowCompleted, setFlowCompleted] = useState(false);
  const [collectedVariables, setCollectedVariables] = useState<Record<string, string>>({});
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, toggleListening } = useSpeechToText({
    onResult: (text) => {
      setInput(prev => prev + (prev ? ' ' : '') + text);
    },
    onError: (error) => {
      console.error("Speech recognition error:", error);
    },
    language: 'en-US'
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for real-time customization updates from parent window
  useEffect(() => {
    if (isPreview) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'CUSTOMIZATION_UPDATE') {
          setCustomization(event.data.customization);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isPreview]);

  const processNode = (node: FlowNode) => {
    if (!node) return;

    switch (node.type) {
      case 'message':
        // Display message and move to next node
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          from: 'bot',
          text: node.data.message || '',
          timestamp: new Date()
        }]);
        
        // Find and process next node
        setTimeout(() => {
          const nextEdge = botData?.conversationFlow?.edges.find((e: any) => e.source === node.id);
          if (nextEdge) {
            const nextNode = botData?.conversationFlow?.nodes.find((n: any) => n.id === nextEdge.target);
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
          from: 'bot',
          text: node.data.message || '',
          timestamp: new Date()
        }]);
        setAwaitingResponse(true);
        break;

      case 'confirmation':
        // Display confirmation with yes/no options
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          from: 'bot',
          text: node.data.message || '',
          timestamp: new Date(),
          showConfirmationButtons: true
        }]);
        setAwaitingResponse(true);
        break;

      case 'branch':
        // Display branch options with buttons
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          from: 'bot',
          text: node.data.message || 'Please select an option:',
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
            from: 'bot',
            text: `Redirecting to: ${node.data.redirectUrl}`,
            timestamp: new Date()
          }]);
          setTimeout(() => {
            window.open(node.data.redirectUrl, '_blank');
            // Continue flow
            const nextEdge = botData?.conversationFlow?.edges.find((e: any) => e.source === node.id);
            if (nextEdge) {
              const nextNode = botData?.conversationFlow?.nodes.find((n: any) => n.id === nextEdge.target);
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
    const currentNode = botData?.conversationFlow?.nodes.find((n: any) => n.id === currentNodeId);
    if (!currentNode) return;

    // Store variable if defined
    if (currentNode.data.variable) {
      setCollectedVariables(prev => ({
        ...prev,
        [currentNode.data.variable]: userInput
      }));
    }

    const allEdgesFromNode = botData?.conversationFlow?.edges?.filter((e: any) => e.source === currentNodeId) || [];
    const handleEdges = allEdgesFromNode.filter(e => typeof e.sourceHandle === 'string' && e.sourceHandle.length > 0);
    let nextEdge: typeof allEdgesFromNode[number] | undefined;

    if (currentNode.type === 'confirmation') {
      const normalized = userInput.trim().toLowerCase();
      const isYes = /\b(yes|y|yeah|yep|sure|ok|okay)\b/.test(normalized);
      const chosenHandle = isYes ? 'yes' : 'no';

      if (handleEdges.length > 0) {
        // Only follow handle-specific edges when available
        nextEdge = handleEdges.find(e => e.sourceHandle === chosenHandle);

        if (!nextEdge) {
          // No path for the chosen handle -> complete the flow
          setFlowCompleted(true);
          setAwaitingResponse(false);
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
        nextEdge = allEdgesFromNode.find(e => String(e.target) === String(optionNodeId));
        
        if (nextEdge) {
          // Now find the edge from the option node to the next node
          const edgeFromOption = botData?.conversationFlow?.edges?.find((e: any) => String(e.source) === String(optionNodeId));
          if (edgeFromOption) {
            const nextNode = botData?.conversationFlow?.nodes.find((n: any) => String(n.id) === String(edgeFromOption.target));
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
        from: 'bot',
        text: `Please choose one of the provided options:\n${(options || []).join('\n')}`,
        timestamp: new Date()
      }]);
      return;
    } else {
      nextEdge = allEdgesFromNode[0];
    }

    if (nextEdge) {
      const nextNode = botData?.conversationFlow?.nodes.find((n: any) => n.id === nextEdge.target);
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

  // Initialize conversation flow on mount - EXACTLY like chatbot.tsx
  useEffect(() => {
    if (botData && botData.conversationFlow && botData.conversationFlow.nodes.length > 0 && !flowCompleted) {
      // Find the first node (usually a message node)
      const firstNode = botData.conversationFlow.nodes.find((n: any) => 
        !botData.conversationFlow?.edges.some((e: any) => e.target === n.id)
      );
      
      if (firstNode) {
        setCurrentNodeId(firstNode.id);
        processNode(firstNode);
      } else {
        // No conversation flow, start with regular greeting
        setFlowCompleted(true);
        setMessages([{
          id: "1",
          from: "bot",
          text: `Hello! I'm ${botData.name}. ${botData.description} How can I help you today?`,
          timestamp: new Date(),
        }]);
      }
    } else if (botData && (!botData.conversationFlow || botData.conversationFlow.nodes.length === 0)) {
      // No conversation flow defined
      setFlowCompleted(true);
      setMessages([{
        id: "1",
        from: "bot",
        text: `Hello! I'm ${botData.name}. ${botData.description} How can I help you today?`,
        timestamp: new Date(),
      }]);
    }
  }, [botData]); // Only depend on botData like chatbot.tsx

  useEffect(() => {
    if (botId) {
      // Only fetch from API if not in preview mode
      if (!isPreview) {
        const fetchData = async () => {
          try {
            // Fetch customization
            const customizationResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`);
            if (customizationResponse.data.result) {
              setCustomization(customizationResponse.data.result);
            }

            // Fetch bot data
            const botResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`);
            setBotData(botResponse.data.result);
            
            // DON'T initialize flow here - let the other useEffect handle it
          } catch (error) {
            console.error('Error loading data:', error);
            setFlowCompleted(true);
            setMessages([{
              id: "init",
              from: "bot",
              text: "Hello! I'm here to help. What would you like to know?",
              timestamp: new Date()
            }]);
          }
        };

        fetchData();
      } else {
        // Preview mode - just set a default message
        setFlowCompleted(true);
        setMessages([{
          id: "init",
          from: "bot",
          text: "Hello! I'm here to help. What would you like to know?",
          timestamp: new Date()
        }]);
      }
    }
  }, [botId, isPreview]);

  // Update welcome message when customization changes in preview mode
  useEffect(() => {
    if (customization && isPreview && messages.length === 1 && messages[0].from === "bot" && flowCompleted) {
      setMessages([{
        id: "init",
        from: "bot",
        text: customization.welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [customization?.welcomeMessage, isPreview, flowCompleted]);

  const sendMessage = async () => {
    if (!input.trim() || !botId || isLoading) return;

    const userMessage: Message = { 
      id: Date.now().toString(),
      from: "user", 
      text: input, 
      timestamp: new Date() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Check if we're in conversation flow mode
    if (!flowCompleted && awaitingResponse) {
      // Handle flow response
      handleFlowResponse(userMessage.text);
      return;
    }

    // Otherwise, use the askBot API (only if not in preview mode)
    setIsLoading(true);

    // In preview mode, just show a demo response
    if (isPreview) {
      setTimeout(() => {
        const botMessage: Message = { 
          id: (Date.now() + 1).toString(),
          from: "bot", 
          text: "This is a preview response. Your actual bot will respond based on your training data.", 
          timestamp: new Date() 
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`, {
        botId,
        question: userMessage.text,
      });
      const botMessage: Message = { 
        id: (Date.now() + 1).toString(),
        from: "bot", 
        text: res.data.answer, 
        timestamp: new Date() 
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, { 
        id: (Date.now() + 2).toString(),
        from: "bot", 
        text: "Sorry, I'm having trouble connecting right now. Please try again.", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (!botData?.voiceEnabled) return;
    toggleListening();
  };

  if (!botId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="p-6 text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No bot ID provided</p>
        </Card>
      </div>
    );
  }

  // Apply custom styles with CSS variables for easier updates
  const customStyles = customization ? {
    '--custom-primary': customization.primaryColor,
    '--custom-bg': customization.backgroundColor,
    '--custom-header-bg': customization.headerBackground,
    '--custom-user-msg': customization.userMessageColor,
    '--custom-bot-msg': customization.botMessageColor,
    '--custom-text': customization.textColor,
    '--custom-radius': `${customization.borderRadius}px`,
    fontFamily: customization.fontFamily
  } as React.CSSProperties : {};

  return (
    <div 
      className="flex flex-col h-full border border-border/20 transition-all duration-200"
      style={{
        backgroundColor: customization?.backgroundColor || undefined,
        color: customization?.textColor || undefined,
        ...customStyles
      }}
    >
      {/* Chat Header */}
      <div 
        className="flex items-center gap-3 p-4 border-b transition-all duration-200"
        style={{
          backgroundColor: customization?.headerBackground || undefined,
          borderRadius: customization ? `${customization.borderRadius}px ${customization.borderRadius}px 0 0` : undefined
        }}
      >
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
          style={{
            backgroundColor: customization?.primaryColor ? `${customization.primaryColor}20` : undefined,
            borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
          }}
        >
          <Bot 
            className="h-4 w-4 transition-colors duration-200"
            style={{ color: customization?.primaryColor || undefined }}
          />
        </div>
        <div>
          <h3 className="font-semibold text-sm transition-all duration-200">
            {customization?.headerTitle || "Chat Assistant"}
          </h3>
          <p className="text-xs opacity-70 transition-all duration-200">
            {customization?.headerSubtitle || "Online"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "bot" && (
                <div 
                  className="flex items-center justify-center w-6 h-6 rounded-full mt-auto transition-all duration-200"
                  style={{
                    backgroundColor: customization?.primaryColor ? `${customization.primaryColor}20` : undefined,
                    borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
                  }}
                >
                  <Bot 
                    className="h-3 w-3 transition-colors duration-200"
                    style={{ color: customization?.primaryColor || undefined }}
                  />
                </div>
              )}
              <div className={`flex flex-col gap-2`}>
                <div className={`max-w-[80%] ${msg.from === "user" ? "ml-auto" : ""}`}>
                  <div 
                    className="p-3 transition-all duration-200"
                    style={{
                      backgroundColor: msg.from === "user" 
                        ? customization?.userMessageColor || undefined
                        : customization?.botMessageColor || undefined,
                      color: msg.from === "user" && customization?.userMessageColor 
                        ? '#ffffff' 
                        : customization?.textColor || undefined,
                      borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : '8px'
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <p className="text-xs opacity-70 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.showConfirmationButtons && awaitingResponse && msg.from === "bot" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          from: "user",
                          text: "Yes",
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
                          from: "user",
                          text: "No",
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
                {msg.showBranchOptions && awaitingResponse && msg.from === "bot" && msg.branchOptions && (
                  <div className="flex flex-wrap gap-2">
                    {msg.branchOptions.map((option, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            from: "user",
                            text: option,
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
              {msg.from === "user" && (
                <div 
                  className="flex items-center justify-center w-6 h-6 rounded-full mt-auto transition-all duration-200"
                  style={{
                    backgroundColor: customization?.primaryColor ? `${customization.primaryColor}20` : undefined,
                    borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
                  }}
                >
                  <User 
                    className="h-3 w-3 transition-colors duration-200"
                    style={{ color: customization?.primaryColor || undefined }}
                  />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div 
                className="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: customization?.primaryColor ? `${customization.primaryColor}20` : undefined,
                  borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
                }}
              >
                <Bot 
                  className="h-3 w-3 transition-colors duration-200"
                  style={{ color: customization?.primaryColor || undefined }}
                />
              </div>
              <div 
                className="p-3 transition-all duration-200"
                style={{
                  backgroundColor: customization?.botMessageColor || undefined,
                  borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : '8px'
                }}
              >
                <div className="flex space-x-1">
                  <div 
                    className="w-2 h-2 opacity-50 rounded-full animate-bounce"
                    style={{ backgroundColor: customization?.textColor || undefined }}
                  ></div>
                  <div 
                    className="w-2 h-2 opacity-50 rounded-full animate-bounce" 
                    style={{ 
                      animationDelay: "0.1s",
                      backgroundColor: customization?.textColor || undefined 
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 opacity-50 rounded-full animate-bounce" 
                    style={{ 
                      animationDelay: "0.2s",
                      backgroundColor: customization?.textColor || undefined 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div 
        className="p-4 border-t transition-all duration-200"
        style={{
          backgroundColor: customization?.headerBackground || undefined,
          borderRadius: customization ? `0 0 ${customization.borderRadius}px ${customization.borderRadius}px` : undefined
        }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={customization?.placeholder || "Type your message..."}
              disabled={isLoading}
              className={`flex-1 transition-all duration-200 ${botData?.voiceEnabled ? 'pr-10' : ''}`}
              style={{
                borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined,
                backgroundColor: customization?.backgroundColor || undefined,
                color: customization?.textColor || undefined
              }}
            />
            {botData?.voiceEnabled && (
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
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 transition-all duration-200"
            style={{
              backgroundColor: customization?.primaryColor || undefined,
              borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}