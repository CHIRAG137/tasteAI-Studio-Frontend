import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, User, Send, Mic, MicOff, Video, Loader2, X } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";
import { VoiceWaveform } from "@/components/VoiceWaveform";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
  videoUrl?: string;
  videoLoading?: boolean;
  videoError?: boolean;
}

export const PublicBotChatPage = () => {
  const { botId } = useParams<{ botId: string }>();
  const { toast } = useToast();
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPausedFor, setCurrentPausedFor] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flowFinished, setFlowFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    isListening, 
    isProcessing,
    showSilenceWarning,
    silenceCountdown,
    audioLevels,
    toggleListening 
  } = useSpeechToText({
    onResult: (text) => {
      setInputMessage(prev => {
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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(scrollToBottom, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch bot details
  useEffect(() => {
    const fetchBot = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`);
        const data = await res.json();
        setBot(data.result);
      } catch (err) {
        console.error("Failed to fetch bot:", err);
        toast({
          title: "Error",
          description: "Failed to load bot",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBot();
  }, [botId]);

  // Start flow when bot is loaded
  useEffect(() => {
    if (!bot) return;

    const initFlow = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/start/${bot._id}`,
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
              content: "",
              sender: "bot",
              timestamp: new Date(),
              showBranchOptions: true,
              branchOptions: msg.options || [],
            });
            return;
          }

          botMessages.push({
            id: Date.now().toString() + Math.random(),
            content: msg.content || msg.message || "",
            sender: "bot",
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
            content: "Feel free to ask me any questions!",
            sender: "bot",
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
        toast({
          title: "Error",
          description: "Failed to start conversation",
          variant: "destructive"
        });
      }
    };

    initFlow();
  }, [bot]);

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
    const question = inputMessage.trim();

    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            botId: bot._id,
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
        content: answerText,
        sender: "bot",
        timestamp: new Date(),
        videoLoading: true,
        videoError: false,
      };

      setMessages((prev) => [...prev, botMessage]);

      createVideoForAnswer(answerText, botMessageId);

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive"
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          content: "I'm having trouble answering that. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (overrideInput?: string, isBranchOption?: boolean) => {
    if (flowFinished) {
      handleAskQuestion();
      return;
    }

    const messageToSend = overrideInput || inputMessage.trim();

    if (!messageToSend || isLoading || !sessionId) return;

    setCurrentPausedFor(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
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
            content: "",
            sender: "bot",
            timestamp: new Date(),
            showBranchOptions: true,
            branchOptions: msg.options || [],
          });
          return;
        }

        botMessages.push({
          id: Date.now().toString() + Math.random(),
          content: msg.content || msg.message || "",
          sender: "bot",
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
          content: "Thank you! The conversation flow has ended. Feel free to ask me any questions!",
          sender: "bot",
          timestamp: new Date(),
        });
      }

      setMessages((prev) => [...prev, ...botMessages]);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive"
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          content: "Something went wrong. Please try again.",
          sender: "bot",
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

  const handleVoiceInput = () => bot?.is_voice_enabled && toggleListening();

  const isAwaitingInput = currentPausedFor !== null;
  const canSendText = flowFinished || (isAwaitingInput &&
    currentPausedFor?.type !== "branch" &&
    !currentPausedFor?.showConfirmationButtons);

  if (loading) return <p className="text-center mt-10">Loading bot...</p>;
  if (!bot) return <p className="text-center mt-10 text-red-500">Bot not found</p>;

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center items-center">
      <div className="w-full max-w-2xl h-[600px] flex flex-col shadow-2xl rounded-xl overflow-hidden border bg-background/95 backdrop-blur-sm">
        {/* Header - Similar to ChatBot.tsx */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarFallback className="bg-white text-blue-600">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-white">{bot.name}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {bot.primary_purpose}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {bot.conversation_tone}
                  </Badge>
                  {flowFinished && (
                    <Badge variant="secondary" className="text-xs">
                      Q&A Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "bot" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
                {msg.content && (
                  <div
                    className={`rounded-lg p-3 ${msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                {/* Video Display Section */}
                {msg.sender === "bot" && (msg.videoUrl || msg.videoLoading) && (
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

                {msg.showConfirmationButtons && isAwaitingInput && msg.sender === "bot" && !flowFinished && (
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

                {msg.showBranchOptions && msg.sender === "bot" && msg.branchOptions && (
                  <div className="flex flex-col gap-2 mt-2">
                    {msg.branchOptions.map((opt, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => handleBranchOptionClick(opt, msg.id)}
                        disabled={!!msg.selectedBranch}
                        className={msg.selectedBranch === opt ? "bg-blue-500 text-white border-blue-600" : ""}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {msg.sender === "user" && (
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
        <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
          {/* Voice Waveform */}
          <VoiceWaveform
            isListening={isListening}
            audioLevels={audioLevels}
            showSilenceWarning={showSilenceWarning}
            silenceCountdown={silenceCountdown}
          />

          {/* Processing indicator */}
          {isProcessing && (
            <Alert className="mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Processing your speech...</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isListening 
                    ? "Listening... Speak now" 
                    : isProcessing 
                      ? "Processing speech..." 
                      : flowFinished 
                        ? "Ask me anything..." 
                        : (canSendText ? "Type your message..." : "Select an option above...")
                }
                disabled={isLoading || !canSendText || isProcessing}
                className="pr-12"
              />
              {bot.is_voice_enabled && canSendText && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleVoiceInput}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  disabled={isLoading || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isListening ? (
                    <MicOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading || !canSendText || isListening || isProcessing}
              size="icon"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            Supported languages: {bot.supported_languages}
          </div>
        </div>
      </div>
    </div>
  );
};
