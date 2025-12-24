import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Bot, User, X, Mic, MicOff, Loader2, Video, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VoiceWaveform } from "@/components/VoiceWaveform";

interface Message {
  id: string;
  content: string | object;
  sender: "user" | "bot";
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
  audioUrl?: string;
}

interface ChatBotProps {
  bot: {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    voiceEnabled: boolean;
    isVideoBot?: boolean;
    videoBotImageUrl?: string;
    languages: string[];
    primaryPurpose: string;
    conversationalTone: string;
    voiceId: string;
  };
  onClose: () => void;
}

export const ChatBot = ({ bot, onClose }: ChatBotProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPausedFor, setCurrentPausedFor] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flowFinished, setFlowFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showVideoAvatar, setShowVideoAvatar] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // TTS Queue management
  const ttsQueueRef = useRef<string[]>([]);
  const isProcessingTTSRef = useRef(false);

  // Process TTS queue - ensures messages are spoken in order without overlap
  const processTTSQueue = async () => {
    // If already processing or queue is empty, return
    if (isProcessingTTSRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    isProcessingTTSRef.current = true;
    setIsSpeaking(true);

    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift();
      if (!text) continue;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/elevenlabs/text-to-speech`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voiceId: bot.voiceId }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate speech");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Wait for audio to finish playing before processing next item
        await new Promise<void>((resolve, reject) => {
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            
            audioRef.current.onended = () => {
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            
            audioRef.current.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              reject(new Error("Audio playback failed"));
            };
            
            audioRef.current.play().catch(reject);
          } else {
            resolve();
          }
        });

      } catch (error) {
        console.error("TTS error:", error);
        // Continue with next item even if one fails
      }
    }

    isProcessingTTSRef.current = false;
    setIsSpeaking(false);
  };

  // Add text to TTS queue and start processing
  const queueTextToSpeech = (text: string) => {
    if (!bot.isVideoBot || !text.trim()) return;
    
    ttsQueueRef.current.push(text);
    processTTSQueue();
  };

  // Clear TTS queue (useful when user interrupts)
  const clearTTSQueue = () => {
    ttsQueueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    isProcessingTTSRef.current = false;
    setIsSpeaking(false);
  };

  // Handle voice question for video bot in Q&A mode (auto-submit)
  const handleVoiceQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            botId: bot.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      const answerText = data.result.answer || "I couldn't find an answer to that question.";
      addBotMessage(answerText);

      // Queue answer for speech
      queueTextToSpeech(answerText);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive"
      });
      addBotMessage("I'm having trouble answering that. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const {
    isListening,
    isProcessing,
    showSilenceWarning,
    silenceCountdown,
    audioLevels,
    toggleListening
  } = useSpeechToText({
    onResult: (text) => {
      // Only auto-submit voice input when in Q&A mode (flowFinished) for video bots
      if (bot.isVideoBot && flowFinished) {
        handleVoiceQuestion(text);
      } else {
        // Otherwise, just populate the input field
        setInputMessage(prev => {
          const newText = prev ? prev + " " + text : text;
          return newText.trim();
        });
      }
    },
    onError: (err) => {
      if (!err.includes('speak into the microphone')) {
        toast({
          title: "Speech Error",
          description: err,
          variant: "destructive"
        });
      }
    },
    language: "en-US",
    silenceTimeout: 10,
    stopTimeout: 5,
  });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup TTS queue on unmount
  useEffect(() => {
    return () => {
      clearTTSQueue();
    };
  }, []);

  // Helper to add bot message
  const addBotMessage = (content: string, audioUrl?: string) => {
    const botMessage: Message = {
      id: Date.now().toString() + Math.random(),
      content,
      sender: "bot",
      timestamp: new Date(),
      audioUrl,
    };
    setMessages((prev) => [...prev, botMessage]);

    // Play audio if available
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }

    return botMessage;
  };

  // Start flow (for both video and non-video bots)
  useEffect(() => {
    const initFlow = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/start/${bot.id}`,
          { method: "POST" }
        );
        const data = await res.json();

        if (data.sessionId) setSessionId(data.sessionId);

        const botMessages: Message[] = [];
        const textsToSpeak: string[] = [];

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

          const messageContent = msg.content || msg.message || "";
          botMessages.push({
            id: Date.now().toString() + Math.random(),
            content: messageContent,
            sender: "bot",
            timestamp: new Date(),
            showConfirmationButtons: msg.type === "confirmation" && msg.awaitingInput,
            showBranchOptions: false,
            branchOptions: msg.options || [],
          });

          // Collect texts to speak
          if (bot.isVideoBot && messageContent) {
            textsToSpeak.push(messageContent);
          }
        });

        if (data.finished) {
          setFlowFinished(true);
          setCurrentPausedFor(null);
        } else {
          if (data.awaitingInput) {
            setCurrentPausedFor(data.awaitingInput);
          } else {
            setCurrentPausedFor(null);
          }
        }

        setMessages(botMessages);

        // Queue all texts for speech in order
        textsToSpeak.forEach(text => queueTextToSpeech(text));

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
  }, [bot.id]);

  // Handle Q&A mode
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
            botId: bot.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      const answerText = data.result.answer || "I couldn't find an answer to that question.";
      addBotMessage(answerText);

      // Queue answer for speech
      queueTextToSpeech(answerText);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive"
      });
      const errorMessage = {
        id: Date.now().toString() + Math.random(),
        content: "I'm having trouble answering that. Please try again.",
        sender: "bot" as const,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
      const textsToSpeak: string[] = [];

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

        const messageContent = msg.content || msg.message || "";
        botMessages.push({
          id: Date.now().toString() + Math.random(),
          content: messageContent,
          sender: "bot",
          timestamp: new Date(),
          showConfirmationButtons: msg.type === "confirmation" && msg.awaitingInput,
          showBranchOptions: false,
          branchOptions: msg.options || [],
        });

        // Collect texts to speak
        if (bot.isVideoBot && messageContent) {
          textsToSpeak.push(messageContent);
        }
      });

      if (data.awaitingInput) {
        setCurrentPausedFor(data.awaitingInput);
      } else {
        setCurrentPausedFor(null);
      }

      if (data.finished) {
        setFlowFinished(true);
        setCurrentPausedFor(null);
      }

      setMessages((prev) => [...prev, ...botMessages]);

      // Queue all texts for speech in order
      textsToSpeak.forEach(text => queueTextToSpeech(text));

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

  const handleVoiceInput = () => {
    toggleListening();
  };

  const handleMicToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      toggleListening();
    } else {
      setIsMuted(true);
      if (isListening) {
        toggleListening();
      }
    }
  };

  const handleEndCall = () => {
    setShowVideoAvatar(false);
    setIsMuted(true);
    if (isListening) {
      toggleListening();
    }
    // Clear any pending TTS when ending call
    clearTTSQueue();
  };

  const handleBringBackAvatar = () => {
    setShowVideoAvatar(true);
  };

  const isAwaitingInput = currentPausedFor !== null;
  const canSendText =
    flowFinished ||
    (isAwaitingInput &&
      currentPausedFor?.type !== "branch" &&
      !currentPausedFor?.showConfirmationButtons);

  // Show mic button for video bots in flow mode, or when voice is enabled
  const shouldShowMicButton = bot.isVideoBot ? !flowFinished : (bot.voiceEnabled && canSendText);

  const videoBotAvatarUrl = bot.videoBotImageUrl || null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${bot.isVideoBot ? (showVideoAvatar ? 'max-w-6xl' : 'max-w-2xl') : 'max-w-2xl'} h-[600px] p-0 gap-0 flex flex-col bg-background/95 backdrop-blur-sm border shadow-2xl rounded-xl overflow-hidden transition-all duration-300`}>
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0 space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 border-2 border-white flex-shrink-0 mt-1">
                <AvatarFallback className="bg-white text-blue-600">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl text-white">{bot.name}</DialogTitle>
                  <div className="flex gap-1.5 flex-wrap">
                    {/* Voice Status Badge */}
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${bot.voiceEnabled ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      {bot.voiceEnabled ? (
                        <>
                          <Volume2 className="h-3 w-3 mr-1" />
                          Voice Enabled
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-3 w-3 mr-1" />
                          Voice Disabled
                        </>
                      )}
                    </Badge>

                    {/* Bot Type Badge */}
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${bot.isVideoBot ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}
                    >
                      {bot.isVideoBot ? (
                        <>
                          <Video className="h-3 w-3 mr-1" />
                          Video Bot
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 mr-1" />
                          Chat Bot
                        </>
                      )}
                    </Badge>

                    {/* Primary Purpose Badge */}
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                      {bot.primaryPurpose}
                    </Badge>

                    {/* Tone Badge */}
                    <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 border-pink-200">
                      {bot.conversationalTone}
                    </Badge>

                    {/* Languages Badge */}
                    <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                      {bot.languages.join(", ")}
                    </Badge>

                    {/* Mode Badge - Q&A or Flow */}
                    {flowFinished ? (
                      <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 border-teal-200">
                        Q&A Mode
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-200">
                        Flow Mode
                      </Badge>
                    )}
                  </div>
                </div>
                {bot.description && (
                  <p className="text-sm text-white/90 mt-1.5 line-clamp-2">
                    {bot.description}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Video Bot View - Split Screen */}
        {bot.isVideoBot ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - Video Bot Avatar (Conditional) */}
            {showVideoAvatar && (
              <div className="w-1/2 relative overflow-hidden flex items-center justify-center">
                {videoBotAvatarUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={videoBotAvatarUrl}
                      alt="Video Bot Avatar"
                      className="relative z-0 w-full h-full object-cover"
                    />

                    {/* Speaking/Loading indicator */}
                    {(isLoading || isSpeaking) && (
                      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{isSpeaking ? "Speaking..." : "Thinking..."}</span>
                      </div>
                    )}

                    {/* Call Control Buttons Overlay (only show in Q&A mode) */}
                    {flowFinished && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
                        <div className="flex gap-3 pointer-events-auto">
                          {/* Mute/Unmute Button */}
                          <Button
                            onClick={handleMicToggle}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${!isMuted
                              ? isListening
                                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                : "bg-green-500 hover:bg-green-600"
                              : "bg-gray-400 hover:bg-gray-500"
                              }`}
                            disabled={isLoading || isProcessing || isSpeaking}
                            title={isMuted ? "Click to unmute and start speaking" : isListening ? "Listening..." : "Click to speak"}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-6 w-6 animate-spin text-white" />
                            ) : isMuted ? (
                              <MicOff className="h-6 w-6 text-white" />
                            ) : (
                              <Mic className="h-6 w-6 text-white" />
                            )}
                          </Button>

                          {/* End Call Button */}
                          <Button
                            onClick={handleEndCall}
                            size="lg"
                            className="h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 bg-red-600 hover:bg-red-700"
                            title="End call and hide avatar"
                          >
                            <PhoneOff className="h-6 w-6 text-white" />
                          </Button>
                        </div>

                        <p className="text-center text-xs text-white bg-black/50 backdrop-blur px-3 py-1 rounded-full">
                          {isSpeaking
                            ? "Bot speaking..."
                            : isProcessing
                              ? "Processing..."
                              : isMuted
                                ? "Microphone muted"
                                : isListening
                                  ? "Listening..."
                                  : "Microphone active"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 w-full h-full flex flex-col items-center justify-center">
                    <Video className="h-20 w-20 mx-auto mb-4 text-purple-400" />
                    <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Video Bot
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      No avatar configured for this video bot
                    </p>

                    {/* Call Control Buttons for no avatar (only in Q&A mode) */}
                    {flowFinished && (
                      <>
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={handleMicToggle}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${!isMuted
                              ? isListening
                                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                : "bg-green-500 hover:bg-green-600"
                              : "bg-gray-400 hover:bg-gray-500"
                              }`}
                            disabled={isLoading || isProcessing || isSpeaking}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-6 w-6 animate-spin text-white" />
                            ) : isMuted ? (
                              <MicOff className="h-6 w-6 text-white" />
                            ) : (
                              <Mic className="h-6 w-6 text-white" />
                            )}
                          </Button>

                          <Button
                            onClick={handleEndCall}
                            size="lg"
                            className="h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 bg-red-600 hover:bg-red-700"
                            title="End call and hide avatar"
                          >
                            <PhoneOff className="h-6 w-6 text-white" />
                          </Button>
                        </div>

                        <p className="text-center text-xs text-muted-foreground mt-4">
                          {isSpeaking
                            ? "Bot speaking..."
                            : isProcessing
                              ? "Processing..."
                              : isMuted
                                ? "Click to unmute and speak"
                                : isListening
                                  ? "Listening..."
                                  : "Click to speak"
                          }
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Right Side - Chat Interface */}
            <div className={`${showVideoAvatar ? 'w-1/2' : 'w-full'} flex flex-col bg-white dark:bg-gray-900 transition-all duration-300`}>
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <p className="mb-2">Start a conversation!</p>
                    <p className="text-sm">{flowFinished ? "Type a message or use voice input" : "Follow the flow to continue"}</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
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
                          {typeof msg.content === "string"
                            ? msg.content
                            : JSON.stringify(msg.content)}
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>

                      {msg.showConfirmationButtons &&
                        isAwaitingInput &&
                        msg.sender === "bot" &&
                        !flowFinished && (
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

                      {msg.showBranchOptions &&
                        msg.sender === "bot" &&
                        msg.branchOptions && (
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

              {/* Input Area for Video Bot */}
              <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
                {/* Voice Waveform (only in Q&A mode) */}
                {flowFinished && isListening && (
                  <VoiceWaveform
                    isListening={isListening}
                    audioLevels={audioLevels}
                    showSilenceWarning={showSilenceWarning}
                    silenceCountdown={silenceCountdown}
                  />
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <Alert className="mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>Processing your speech...</AlertDescription>
                  </Alert>
                )}

                {/* Show Avatar Button (when avatar is hidden) */}
                {!showVideoAvatar && (
                  <div className="mb-3">
                    <Button
                      onClick={handleBringBackAvatar}
                      variant="outline"
                      className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Show Video Avatar
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isListening
                          ? "Listening... Speak now"
                          : isProcessing
                            ? "Processing speech..."
                            : flowFinished
                              ? "Ask me anything..."
                              : (canSendText
                                ? "Type your message..."
                                : "Select an option above...")
                      }
                      disabled={isLoading || !canSendText || isProcessing}
                      className="pr-12"
                    />
                    {shouldShowMicButton && (
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

                {/* Footer Branding */}
                <div className="text-center py-2 border-t mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Powered by{" "}
                    <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      TasteAI Studio
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Regular Chat View */
          <>
            <ScrollArea className="flex-1 p-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
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
                        {typeof msg.content === "string"
                          ? msg.content
                          : JSON.stringify(msg.content)}
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>

                    {msg.showConfirmationButtons &&
                      isAwaitingInput &&
                      msg.sender === "bot" &&
                      !flowFinished && (
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

                    {msg.showBranchOptions &&
                      msg.sender === "bot" &&
                      msg.branchOptions && (
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

            {/* Input Area - For non-video bots */}
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
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      isListening
                        ? "Listening... Speak now"
                        : isProcessing
                          ? "Processing speech..."
                          : flowFinished
                            ? "Ask me anything..."
                            : (canSendText
                              ? "Type your message..."
                              : "Select an option above...")
                    }
                    disabled={isLoading || !canSendText || isProcessing}
                    className="pr-12"
                  />
                  {bot.voiceEnabled && canSendText && (
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
              {/* Footer Branding */}
              <div className="text-center py-2 border-t mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Powered by{" "}
                  <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TasteAI Studio
                  </span>
                </p>
              </div>
            </div>
          </>
        )}

        {/* Hidden audio element for playing TTS */}
        <audio ref={audioRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};
