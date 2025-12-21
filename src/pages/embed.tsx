import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Bot, User, Mic, MicOff, Video, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmbedCustomization } from "@/components/EmbedCustomizer";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";
import { VoiceWaveform } from "@/components/VoiceWaveform";

interface Message {
  id: string;
  from: "user" | "bot";
  text: string;
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
  videoUrl?: string;
  videoLoading?: boolean;
  videoError?: boolean;
}

export default function EmbedChat() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
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

  const { 
    isListening, 
    isProcessing,
    showSilenceWarning,
    silenceCountdown,
    audioLevels,
    toggleListening 
  } = useSpeechToText({
    onResult: (text) => {
      setInput(prev => {
        const newText = prev ? prev + " " + text : text;
        return newText.trim();
      });
    },
    onError: (err) => {
      if (!err.includes('speak into the microphone')) {
        toast({ title: "Speech Error", description: err, variant: "destructive" });
      }
    },
    language: "en-US",
    silenceTimeout: 10,
    stopTimeout: 5,
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
      const existingStyle = document.getElementById('embed-custom-css');
      if (existingStyle) {
        existingStyle.remove();
      }

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
          const customizationResponse = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`
          );
          const customizationData = await customizationResponse.json();
          if (customizationData.result) {
            setCustomization(customizationData.result);
          }

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

        (data.messages || []).forEach((msg: any) => {
          if (msg.type === "redirect") {
            const url = msg.content?.replace("Redirecting to: ", "") || msg.content;
            if (url) {
              window.open(url, '_blank');
            }
            return;
          }

          if (msg.type === "branch" && msg.awaitingInput) {
            botMessages.push({
              id: Date.now().toString() + Math.random(),
              from: "bot",
              text: "",
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

  // Function to create video and poll for result
  const createVideoForAnswer = async (text: string, messageId: string) => {
    try {
      const createRes = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/did/create-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );

      const createData = await createRes.json();

      if (!createRes.ok || !createData?.result?.id) {
        throw new Error("Failed to create video");
      }

      const talkId = createData.result.id;

      const maxAttempts = 30;
      let attempts = 0;

      const pollVideo = async (): Promise<string | null> => {
        attempts++;
        const statusRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/did/video-status/${talkId}`
        );
        const statusData = await statusRes.json();

        const status = statusData?.result?.status;
        const videoUrl = statusData?.result?.result_url;

        if (status === "done" && videoUrl) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, videoUrl, videoLoading: false, videoError: false }
                : msg
            )
          );
          return videoUrl;
        } else if (status === "error" || status === "rejected") {
          throw new Error("Video generation failed");
        } else {
          if (attempts >= maxAttempts) {
            throw new Error("Video generation timeout");
          }
          await new Promise((r) => setTimeout(r, 2000));
          return pollVideo();
        }
      };

      pollVideo().catch((err) => {
        console.error("Video polling error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, videoLoading: false, videoError: true }
              : msg
          )
        );
        toast({
          title: "Video Generation Failed",
          description: err.message || "Could not generate video",
          variant: "destructive",
        });
      });

      return talkId;
    } catch (err: any) {
      console.error("Video creation error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, videoLoading: false, videoError: true }
            : msg
        )
      );
      toast({
        title: "Video Generation Failed",
        description: err.message || "Could not create video explanation",
        variant: "destructive",
      });
      return null;
    }
  };

  // Handle Q&A mode after flow ends
  const handleAskQuestion = async () => {
    const question = input.trim();

    if (!question || isLoading) return;

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

      const answerText = data.result.answer || "I couldn't find an answer to that question.";

      const botMessageId = Date.now().toString() + Math.random();
      const botMessage: Message = {
        id: botMessageId,
        from: "bot",
        text: answerText,
        timestamp: new Date(),
        videoLoading: true,
        videoError: false,
      };

      setMessages((prev) => [...prev, botMessage]);

      createVideoForAnswer(answerText, botMessageId);

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

    if (flowFinished) {
      handleAskQuestion();
      return;
    }

    if (!sessionId) return;

    setCurrentPausedFor(null);

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

      (data.messages || []).forEach((msg: any) => {
        if (msg.type === "redirect") {
          const url = msg.content?.replace("Redirecting to: ", "") || msg.content;
          if (url) {
            window.open(url, '_blank');
          }
          return;
        }

        if (msg.type === "branch" && msg.awaitingInput) {
          botMessages.push({
            id: Date.now().toString() + Math.random(),
            from: "bot",
            text: "",
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

      if (data.awaitingInput) {
        setCurrentPausedFor(data.awaitingInput);
      } else {
        setCurrentPausedFor(null);
      }

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
        <div className="p-6 text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No bot ID provided</p>
        </div>
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

  // Get bot avatar URL
  const botAvatarUrl = botData?.videoBotImageUrl || null;

  return (
    <div
      className={`flex flex-col h-full border border-border/20 transition-all duration-200 overflow-hidden ${
        customization?.useChatCustomCSS ? 'embed-chat-container' : ''
      }`}
      style={getContainerStyle()}
    >
      {/* Avatar Section at Top */}
      {botAvatarUrl && (
        <div className="flex-shrink-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center border-b">
          <div className="relative">
            <img
              src={botAvatarUrl}
              alt="Bot Avatar"
              className="w-24 h-24 object-cover rounded-full shadow-lg border-4 border-white dark:border-gray-700"
            />
            {(isLoading) && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div
        className={`flex items-center gap-3 p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all duration-200 ${
          customization?.useChatCustomCSS ? 'embed-chat-header' : ''
        }`}
        style={!botAvatarUrl ? getHeaderStyle() : {}}
      >
        <Avatar className="h-10 w-10 border-2 border-white">
          <AvatarFallback className="bg-white text-blue-600">
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-white">
            {customization?.headerTitle || botData?.name || "Chat Assistant"}
          </h3>
          <p className="text-xs text-white/70">
            {customization?.headerSubtitle || "Online"}
          </p>
        </div>
        {flowFinished && (
          <Badge variant="secondary" className="text-xs">
            Q&A Mode
          </Badge>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 mb-4 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.from === "bot" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={`flex flex-col gap-1 ${msg.from === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
              {msg.text && (
                <div
                  className={`rounded-lg p-3 transition-all duration-200 ${
                    msg.from === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  } ${customization?.useChatCustomCSS 
                    ? (msg.from === "user" ? 'embed-user-message' : 'embed-bot-message')
                    : ''
                  }`}
                  style={msg.from === "user" ? getUserMessageStyle() : getBotMessageStyle()}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              )}
              <span className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Video Display Section */}
              {msg.from === "bot" && (msg.videoUrl || msg.videoLoading) && (
                <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mt-2">
                  {msg.videoLoading && !msg.videoUrl && (
                    <div className="flex items-center justify-center p-8 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Generating video explanation...</span>
                    </div>
                  )}

                  {msg.videoUrl && (
                    <div className="relative">
                      <video
                        src={msg.videoUrl}
                        controls
                        className="w-full max-h-64"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          <Video className="h-3 w-3 mr-1" />
                          AI Avatar
                        </Badge>
                      </div>
                    </div>
                  )}

                  {msg.videoError && !msg.videoUrl && (
                    <div className="flex items-center justify-center p-6 gap-2 text-red-500">
                      <X className="h-4 w-4" />
                      <span className="text-sm">Video generation failed</span>
                    </div>
                  )}
                </div>
              )}

              {msg.showConfirmationButtons && isAwaitingInput && msg.from === "bot" && !flowFinished && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirmationClick("yes")}
                    className="bg-green-600 hover:bg-green-700"
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
                <div className="flex flex-col gap-2 mt-2">
                  {msg.branchOptions.map((opt, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      onClick={() => handleBranchOptionClick(opt, msg.id)}
                      disabled={!!msg.selectedBranch}
                      className={msg.selectedBranch === opt ? "bg-blue-500 text-white border-blue-600" : ""}
                      style={{
                        borderColor: msg.selectedBranch === opt ? customization?.primaryColor || undefined : undefined,
                        backgroundColor: msg.selectedBranch === opt ? `${customization?.primaryColor}20` || undefined : undefined,
                      }}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {msg.from === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-300">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div
        className={`p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0 transition-all duration-200 ${
          customization?.useChatCustomCSS ? 'embed-chat-input' : ''
        }`}
      >
        {/* Voice Waveform */}
        <VoiceWaveform
          audioLevels={audioLevels}
          isListening={isListening}
          showSilenceWarning={showSilenceWarning}
          silenceCountdown={silenceCountdown}
          className="mb-3"
        />

        {/* Processing indicator */}
        {isProcessing && (
          <Alert className="mb-3 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Processing your speech...
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                isListening 
                  ? "Listening... Speak now" 
                  : isProcessing 
                    ? "Processing speech..." 
                    : flowFinished
                      ? "Ask me anything..."
                      : (customization?.placeholder || (canSendText ? "Type your message..." : "Select an option above..."))
              }
              disabled={isLoading || !canSendText || isProcessing}
              className={`flex-1 transition-all duration-200 ${
                botData?.voiceEnabled ? 'pr-10' : ''
              } ${customization?.useChatCustomCSS ? 'embed-input' : ''}`}
              style={getInputStyle()}
            />
            {botData?.voiceEnabled && canSendText && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                disabled={isProcessing}
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                  isListening 
                    ? "text-red-500 animate-pulse" 
                    : isProcessing 
                      ? "text-gray-400" 
                      : "text-muted-foreground hover:text-primary"
                }`}
                title={
                  isProcessing 
                    ? "Processing..." 
                    : isListening 
                      ? "Stop recording" 
                      : "Start voice input"
                }
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading || !canSendText || isListening || isProcessing}
            size="icon"
            className={`transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 ${
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
