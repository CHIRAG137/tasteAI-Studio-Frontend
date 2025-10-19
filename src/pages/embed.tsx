import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Bot, User, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  selectedBranch?: string;
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
  const [currentPausedFor, setCurrentPausedFor] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flowFinished, setFlowFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, toggleListening } = useSpeechToText({
    onResult: (text) => setInput(prev => prev + (prev ? " " : "") + text),
    onError: (error) => console.error("Speech recognition error:", error),
    language: "en-US"
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

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

  // Apply custom CSS dynamically
  useEffect(() => {
    if (customization?.useChatCustomCSS && customization?.chatCustomCSS) {
      // Remove previous custom style tag
      const existingStyle = document.getElementById('embed-custom-css');
      if (existingStyle) {
        existingStyle.remove();
      }

      // Create and inject new style tag
      const style = document.createElement('style');
      style.id = 'embed-custom-css';
      style.textContent = customization.chatCustomCSS;
      document.head.appendChild(style);

      return () => {
        const styleToRemove = document.getElementById('embed-custom-css');
        if (styleToRemove) {
          styleToRemove.remove();
        }
      };
    } else {
      const existingStyle = document.getElementById('embed-custom-css');
      if (existingStyle) {
        existingStyle.remove();
      }
    }
  }, [customization?.useChatCustomCSS, customization?.chatCustomCSS]);

  // Fetch bot data and customization
  useEffect(() => {
    if (botId && !isPreview) {
      const fetchData = async () => {
        try {
          // Fetch customization
          const customizationResponse = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`
          );
          const customizationData = await customizationResponse.json();
          if (customizationData.result) {
            setCustomization(customizationData.result);
          }

          // Fetch bot data
          const botResponse = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`
          );
          const botDataResult = await botResponse.json();
          setBotData(botDataResult.result);
        } catch (error) {
          console.error('Error loading data:', error);
          setMessages([{
            id: "init",
            from: "bot",
            text: "Hello! I'm here to help. What would you like to know?",
            timestamp: new Date()
          }]);
        }
      };

      fetchData();
    }
  }, [botId, isPreview]);

  // Set preview messages when in preview mode
  useEffect(() => {
    if (isPreview) {
      setMessages([
        {
          id: "bot-preview-1",
          from: "bot",
          text: "Hello! I'm here to help. What would you like to know?",
          timestamp: new Date(Date.now() - 60000)
        },
        {
          id: "user-preview-1",
          from: "user",
          text: "This is a preview of a user message",
          timestamp: new Date(Date.now() - 30000)
        },
        {
          id: "bot-preview-2",
          from: "bot",
          text: "This is how my responses will look with your customized colors!",
          timestamp: new Date()
        }
      ]);
    }
  }, [isPreview]);

  // Start flow when bot is loaded
  useEffect(() => {
    if (!botData || isPreview) return;

    const initFlow = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/start/${botData._id}`,
          { method: "POST" }
        );
        const data = await res.json();

        if (data.sessionId) setSessionId(data.sessionId);

        const botMessages: Message[] = [];

        // Add all messages to display
        (data.messages || []).forEach((msg: any) => {
          // Handle redirect nodes - don't display, just redirect
          if (msg.type === "redirect") {
            const url = msg.content?.replace("Redirecting to: ", "") || msg.content;
            if (url) {
              window.open(url, '_blank');
            }
            return;
          }

          // For branch nodes with awaitingInput, only show buttons without text
          if (msg.type === "branch" && msg.awaitingInput) {
            botMessages.push({
              id: Date.now().toString() + Math.random(),
              from: "bot",
              text: "", // No text content for branch nodes
              timestamp: new Date(),
              showBranchOptions: true,
              branchOptions: msg.options || [],
            });
            return;
          }

          botMessages.push({
            id: Date.now().toString() + Math.random(),
            from: "bot",
            text: msg.content || msg.message || "",
            timestamp: new Date(),
            showConfirmationButtons: msg.type === "confirmation" && msg.awaitingInput,
            showBranchOptions: false,
            branchOptions: msg.options || [],
          });
        });

        // Check if flow finished immediately
        if (data.finished) {
          setFlowFinished(true);
          setCurrentPausedFor(null);

          botMessages.push({
            id: Date.now().toString() + Math.random(),
            from: "bot",
            text: "Feel free to ask me any questions!",
            timestamp: new Date(),
          });
        } else {
          // Set current paused state only if flow not finished
          if (data.awaitingInput) {
            setCurrentPausedFor(data.awaitingInput);
          } else {
            setCurrentPausedFor(null);
          }
        }

        setMessages(botMessages);
      } catch (err) {
        console.error("Failed to start flow", err);
        setMessages([{
          id: "init",
          from: "bot",
          text: "Hello! I'm here to help. What would you like to know?",
          timestamp: new Date()
        }]);
      }
    };

    initFlow();
  }, [botData, isPreview]);

  // Handle Q&A mode after flow ends
  const handleAskQuestion = async () => {
    const question = input.trim();

    if (!question || isLoading) return;

    // Create user message for display
    const userMessage: Message = {
      id: Date.now().toString(),
      from: "user",
      text: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            botId: botData._id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      // Add bot response
      const botMessage: Message = {
        id: Date.now().toString() + Math.random(),
        from: "bot",
        text: data.result.answer || "I couldn't find an answer to that question.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          from: "bot",
          text: "I'm having trouble answering that. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (overrideInput?: string, isBranchOption?: boolean) => {
    const messageToSend = overrideInput || input.trim();

    if (!messageToSend || isLoading) return;

    // In preview mode, just show a demo response
    if (isPreview) {
      const userMessage: Message = {
        id: Date.now().toString(),
        from: "user",
        text: messageToSend,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

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

    // If flow is finished, use Q&A mode instead
    if (flowFinished) {
      handleAskQuestion();
      return;
    }

    if (!sessionId) return;

    // Clear current paused state immediately to hide buttons
    setCurrentPausedFor(null);

    // Create user message for display
    const userMessage: Message = {
      id: Date.now().toString(),
      from: "user",
      text: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare request body based on the type of input
      let requestBody: any = {};

      if (currentPausedFor?.type === "branch" || isBranchOption) {
        requestBody.optionIndexOrLabel = messageToSend;
      } else {
        requestBody.input = messageToSend;
      }

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const botMessages: Message[] = [];

      // Add all messages to display - these are NEW messages only
      (data.messages || []).forEach((msg: any) => {
        // Handle redirect nodes - don't display, just redirect
        if (msg.type === "redirect") {
          const url = msg.content?.replace("Redirecting to: ", "") || msg.content;
          if (url) {
            window.open(url, '_blank');
          }
          return;
        }

        // For branch nodes with awaitingInput, only show buttons without text
        if (msg.type === "branch" && msg.awaitingInput) {
          botMessages.push({
            id: Date.now().toString() + Math.random(),
            from: "bot",
            text: "", // No text content for branch nodes
            timestamp: new Date(),
            showBranchOptions: true,
            branchOptions: msg.options || [],
          });
          return;
        }

        botMessages.push({
          id: Date.now().toString() + Math.random(),
          from: "bot",
          text: msg.content || msg.message || "",
          timestamp: new Date(),
          showConfirmationButtons: msg.type === "confirmation" && msg.awaitingInput,
          showBranchOptions: false,
          branchOptions: msg.options || [],
        });
      });

      // Set current paused state
      if (data.awaitingInput) {
        setCurrentPausedFor(data.awaitingInput);
      } else {
        setCurrentPausedFor(null);
      }

      // Check if flow finished
      if (data.finished) {
        setFlowFinished(true);
        setCurrentPausedFor(null);

        botMessages.push({
          id: Date.now().toString() + Math.random(),
          from: "bot",
          text: "Thank you! The conversation flow has ended. Feel free to ask me any questions!",
          timestamp: new Date(),
        });
      }

      // Append new bot messages to existing messages
      setMessages((prev) => [...prev, ...botMessages]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          from: "bot",
          text: "Sorry, I'm having trouble connecting right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmationClick = (answer: string) => {
    handleSendMessage(answer, false);
  };

  const handleBranchOptionClick = (option: string, messageId: string) => {
    // Mark the branch as selected in the message
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, selectedBranch: option } : msg
      )
    );
    handleSendMessage(option, true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => botData?.voiceEnabled && toggleListening();

  const isAwaitingInput = currentPausedFor !== null;
  const canSendText = isPreview || flowFinished || (isAwaitingInput &&
    currentPausedFor?.type !== "branch" &&
    !currentPausedFor?.showConfirmationButtons);

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

  // Helper functions for conditional styling
  const getContainerStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      backgroundColor: customization?.backgroundColor || undefined,
      color: customization?.textColor || undefined,
      fontFamily: customization?.fontFamily || undefined
    };
  };

  const getHeaderStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      backgroundColor: customization?.headerBackground || undefined,
      borderRadius: customization ? `${customization.borderRadius}px ${customization.borderRadius}px 0 0` : undefined
    };
  };

  const getBotIconStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      backgroundColor: customization?.primaryColor ? `${customization.primaryColor}20` : undefined,
      borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
    };
  };

  const getUserMessageStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      backgroundColor: customization?.userMessageColor || undefined,
      color: '#ffffff',
      borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : '8px'
    };
  };

  const getBotMessageStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      backgroundColor: customization?.botMessageColor || undefined,
      color: customization?.textColor || undefined,
      borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : '8px'
    };
  };

  const getInputStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined,
      backgroundColor: customization?.backgroundColor || undefined,
      color: customization?.textColor || undefined
    };
  };

  const getSendButtonStyle = () => {
    if (customization?.useChatCustomCSS) return {};
    return {
      backgroundColor: customization?.primaryColor || undefined,
      borderRadius: customization?.borderRadius ? `${customization.borderRadius}px` : undefined
    };
  };

  return (
    <div
      className={`flex flex-col h-full border border-border/20 transition-all duration-200 ${
        customization?.useChatCustomCSS ? 'embed-chat-container' : ''
      }`}
      style={getContainerStyle()}
    >
      {/* Chat Header */}
      <div
        className={`flex items-center gap-3 p-4 border-b transition-all duration-200 ${
          customization?.useChatCustomCSS ? 'embed-chat-header' : ''
        }`}
        style={getHeaderStyle()}
      >
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
            customization?.useChatCustomCSS ? 'embed-bot-icon' : ''
          }`}
          style={getBotIconStyle()}
        >
          <Bot
            className="h-4 w-4 transition-colors duration-200"
            style={customization?.useChatCustomCSS ? {} : { color: customization?.primaryColor || undefined }}
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm transition-all duration-200">
            {customization?.headerTitle || "Chat Assistant"}
          </h3>
          <p className="text-xs opacity-70 transition-all duration-200">
            {customization?.headerSubtitle || "Online"}
          </p>
        </div>
        {flowFinished && (
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: customization?.primaryColor ? `${customization.primaryColor}20` : undefined,
              color: customization?.primaryColor || undefined
            }}
          >
            Q&A Mode
          </Badge>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "bot" && (
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full mt-auto transition-all duration-200 ${
                    customization?.useChatCustomCSS ? 'embed-bot-icon' : ''
                  }`}
                  style={getBotIconStyle()}
                >
                  <Bot
                    className="h-3 w-3 transition-colors duration-200"
                    style={customization?.useChatCustomCSS ? {} : { color: customization?.primaryColor || undefined }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                {msg.text && (
                  <div className={`max-w-[80%] ${msg.from === "user" ? "ml-auto" : ""}`}>
                    <div
                      className={`p-3 transition-all duration-200 ${
                        customization?.useChatCustomCSS 
                          ? (msg.from === "user" ? 'embed-user-message' : 'embed-bot-message')
                          : ''
                      }`}
                      style={msg.from === "user" ? getUserMessageStyle() : getBotMessageStyle()}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}

                {msg.showConfirmationButtons && isAwaitingInput && msg.from === "bot" && !flowFinished && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirmationClick("yes")}
                    >
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirmationClick("no")}
                    >
                      No
                    </Button>
                  </div>
                )}

                {msg.showBranchOptions && msg.from === "bot" && msg.branchOptions && (
                  <div className="flex flex-wrap gap-2">
                    {msg.branchOptions.map((opt, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => handleBranchOptionClick(opt, msg.id)}
                        disabled={!!msg.selectedBranch}
                        style={{
                          borderColor: msg.selectedBranch === opt ? customization?.primaryColor || undefined : undefined,
                          backgroundColor: msg.selectedBranch === opt ? `${customization?.primaryColor}20` || undefined : undefined,
                          color: customization?.primaryColor || undefined,
                        }}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {msg.from === "user" && (
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full mt-auto transition-all duration-200 ${
                    customization?.useChatCustomCSS ? 'embed-bot-icon' : ''
                  }`}
                  style={getBotIconStyle()}
                >
                  <User
                    className="h-3 w-3 transition-colors duration-200"
                    style={customization?.useChatCustomCSS ? {} : { color: customization?.primaryColor || undefined }}
                  />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${
                  customization?.useChatCustomCSS ? 'embed-bot-icon' : ''
                }`}
                style={getBotIconStyle()}
              >
                <Bot
                  className="h-3 w-3 transition-colors duration-200"
                  style={customization?.useChatCustomCSS ? {} : { color: customization?.primaryColor || undefined }}
                />
              </div>
              <div
                className={`p-3 transition-all duration-200 ${
                  customization?.useChatCustomCSS ? 'embed-bot-message' : ''
                }`}
                style={getBotMessageStyle()}
              >
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 opacity-50 rounded-full animate-bounce ${
                        customization?.useChatCustomCSS ? 'embed-loading-dot' : ''
                      }`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        ...(customization?.useChatCustomCSS ? {} : { backgroundColor: customization?.textColor || undefined })
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div
        className={`p-4 border-t transition-all duration-200 ${
          customization?.useChatCustomCSS ? 'embed-chat-header' : ''
        }`}
        style={getHeaderStyle()}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                flowFinished
                  ? "Ask me anything..."
                  : (customization?.placeholder || "Type your message...")
              }
              disabled={isLoading || !canSendText}
              className={`flex-1 transition-all duration-200 ${
                botData?.voiceEnabled ? 'pr-10' : ''
              } ${customization?.useChatCustomCSS ? 'embed-input' : ''}`}
              style={getInputStyle()}
            />
            {botData?.voiceEnabled && canSendText && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                  isListening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-primary"
                }`}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading || !canSendText}
            size="icon"
            className={`shrink-0 transition-all duration-200 ${
              customization?.useChatCustomCSS ? 'embed-send-button' : ''
            }`}
            style={getSendButtonStyle()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
