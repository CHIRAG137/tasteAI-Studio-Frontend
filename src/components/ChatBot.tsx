import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Bot, User, X, Mic, MicOff, Video, Loader2, 
  AlertCircle, VideoOff, RotateCcw, CheckCircle, XCircle 
} from "lucide-react";
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

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  isFlipped: boolean;
  fromQuiz?: boolean;
}

interface QuizAnswer {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  answers: QuizAnswer[];
}

interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

interface ChatBotProps {
  bot: {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    voiceEnabled: boolean;
    isVideoBot?: boolean;
    languages: string[];
    primaryPurpose: string;
    conversationalTone: string;
    tavusPersonaId?: string; // Tavus persona/replica ID
    tavusApiKey?: string; // Optional if stored on backend
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Tavus Conversation state
  const [isTavusConnected, setIsTavusConnected] = useState(false);
  const [isTavusInitializing, setIsTavusInitializing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const dailyRoomRef = useRef<any>(null);

  // Flash cards and quiz state
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);

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

  useEffect(scrollToBottom, [messages, flashCards, currentQuiz]);
  useEffect(() => { inputRef.current?.focus(); }, []);

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

  // Initialize Tavus Conversational Video
  const initializeTavusConnection = async () => {
    if (!bot.isVideoBot || isTavusConnected || isTavusInitializing) return;
    
    setIsTavusInitializing(true);
    
    try {
      // Step 1: Create Tavus conversation via backend
      const createRes = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/tavus/create-conversation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            botId: bot.id,
            personaId: bot.tavusPersonaId,
            conversationName: `${bot.name} - ${Date.now()}`,
          }),
        }
      );
      
      const createData = await createRes.json();
      
      console.log('Tavus conversation created:', createData);
      
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Failed to create Tavus conversation");
      }

      const { conversationId, conversationUrl, dailyRoomUrl } = createData;
      
      setConversationId(conversationId);

      // Step 2: Initialize Daily.co video call (Tavus uses Daily.co for WebRTC)
      // Dynamically import Daily
      const DailyIframe = (await import('@daily-co/daily-js')).default;
      
      // Create Daily call frame
      const callFrame = DailyIframe.createFrame(videoContainerRef.current!, {
        showLeaveButton: false,
        showFullscreenButton: false,
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
      });

      dailyRoomRef.current = callFrame;

      // Set up Daily event listeners
      callFrame.on('joined-meeting', async () => {
        console.log('Joined Daily meeting');
        setIsTavusConnected(true);
        setIsTavusInitializing(false);
        
        // Send initial greeting
        setTimeout(() => {
          addBotMessage("Hello! I'm your AI study assistant. I can help you learn through interactive conversations, flash cards, and quizzes. What would you like to learn about today?");
        }, 1000);
      });

      callFrame.on('participant-joined', (event: any) => {
        console.log('Participant joined:', event.participant);
      });

      callFrame.on('participant-left', (event: any) => {
        console.log('Participant left:', event.participant);
      });

      callFrame.on('error', (error: any) => {
        console.error('Daily error:', error);
        toast({
          title: "Connection Error",
          description: "Lost connection to video assistant",
          variant: "destructive"
        });
      });

      callFrame.on('left-meeting', () => {
        console.log('Left Daily meeting');
        setIsTavusConnected(false);
      });

      // Join the Daily room
      await callFrame.join({ 
        url: dailyRoomUrl,
        userName: 'Student',
      });

    } catch (err: any) {
      console.error('Tavus initialization error:', err);
      setIsTavusInitializing(false);
      toast({
        title: "Video Connection Failed",
        description: err.message || "Could not connect to video bot",
        variant: "destructive"
      });
    }
  };

  // Clean up Tavus connection
  const disconnectTavus = async () => {
    if (conversationId) {
      try {
        await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/tavus/end-conversation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId }),
          }
        );
      } catch (err) {
        console.error('Error ending Tavus conversation:', err);
      }
    }
    
    if (dailyRoomRef.current) {
      await dailyRoomRef.current.leave();
      await dailyRoomRef.current.destroy();
      dailyRoomRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setIsTavusConnected(false);
    setConversationId(null);
  };

  // Initialize video bot on mount if needed
  useEffect(() => {
    if (bot.isVideoBot) {
      initializeTavusConnection();
    }
    
    return () => {
      if (bot.isVideoBot) {
        disconnectTavus();
      }
    };
  }, [bot.isVideoBot]);

  // Send message to Tavus conversation
  const sendToTavusBot = async (text: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/tavus/send-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message: text,
            botId: bot.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message to video bot");
      }

      return data;
    } catch (err: any) {
      console.error("Tavus message error:", err);
      throw err;
    }
  };

  // Handle flash card flip
  const handleFlipFlashCard = async (cardId: string) => {
    try {
      if (!conversationId) return;

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/tavus/flashcard/flip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, cardId }),
        }
      );

      const data = await res.json();

      if (data.success && data.flashCard) {
        setFlashCards(prev => 
          prev.map(card => 
            card.id === cardId ? { ...card, isFlipped: data.flashCard.isFlipped } : card
          )
        );
      }
    } catch (err) {
      console.error('Error flipping flash card:', err);
    }
  };

  // Handle quiz answer selection
  const handleQuizAnswerSelect = (questionId: string, answerId: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!currentQuiz || !conversationId) return;

    setIsLoading(true);
    
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/tavus/quiz/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            quizId: currentQuiz.id,
            answers: quizAnswers,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setQuizResults(data);
        setQuizSubmitted(true);

        // Add bot feedback message
        addBotMessage(data.feedback);

        // Add new flash cards if any
        if (data.newFlashCards && data.newFlashCards.length > 0) {
          setFlashCards(prev => [...prev, ...data.newFlashCards]);
        }

        // Clear quiz after a delay
        setTimeout(() => {
          setCurrentQuiz(null);
          setQuizAnswers({});
          setQuizSubmitted(false);
          setQuizResults(null);
        }, 5000);
      }
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      toast({
        title: "Quiz Submission Failed",
        description: err.message || "Could not submit quiz",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start flow (for non-video bots)
  useEffect(() => {
    if (bot.isVideoBot) return; // Skip flow for video bots

    const initFlow = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/start/${bot.id}`,
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
  }, [bot.id, bot.isVideoBot]);

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
      // For Tavus video bot, send through conversation API
      if (bot.isVideoBot && isTavusConnected && conversationId) {
        const response = await sendToTavusBot(question);
        
        addBotMessage(response.response || "Processing your request...", response.audioUrl);

        // Handle flash card updates from backend
        if (response.flashCards && response.flashCards.length > 0) {
          setFlashCards(prev => [...prev, ...response.flashCards]);
        }

        // Handle quiz updates from backend
        if (response.quiz) {
          setCurrentQuiz(response.quiz);
        }
      } else {
        // Regular bot flow
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
      }

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
    if (flowFinished || bot.isVideoBot) {
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

  const handleVoiceInput = () => {
    if (bot.voiceEnabled) {
      toggleListening();
    }
  };

  const isAwaitingInput = currentPausedFor !== null;
  const canSendText = flowFinished || bot.isVideoBot || (isAwaitingInput &&
    currentPausedFor?.type !== "branch" &&
    !currentPausedFor?.showConfirmationButtons);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[700px] flex flex-col shadow-lg">
        <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-white/20">
                <AvatarFallback className="bg-white/20 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{bot.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white hover:bg-white/30">
                    {bot.primaryPurpose}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white hover:bg-white/30">
                    {bot.conversationalTone}
                  </Badge>
                  {bot.isVideoBot && (
                    <Badge variant="secondary" className="text-xs bg-green-500/80 text-white">
                      <Video className="h-3 w-3 mr-1" />
                      Tavus AI Avatar
                    </Badge>
                  )}
                  {flowFinished && (
                    <Badge variant="secondary" className="text-xs bg-green-500/80 text-white">
                      Q&A Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Tavus Video Bot View */}
            {bot.isVideoBot ? (
              <div className="flex-1 flex">
                {/* Main Video and Chat Area */}
                <div className="flex-1 flex flex-col">
                  {/* Tavus Video Container */}
                  <div className="relative bg-black flex-1">
                    <div 
                      ref={videoContainerRef}
                      className="w-full h-full"
                    >
                      {!isTavusConnected && !isTavusInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center text-center text-white">
                          <div>
                            <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Video connection unavailable</p>
                            <Button 
                              variant="outline" 
                              className="mt-4 text-white border-white hover:bg-white/20"
                              onClick={initializeTavusConnection}
                            >
                              Retry Connection
                            </Button>
                          </div>
                        </div>
                      )}
                      {isTavusInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center text-center text-white">
                          <div>
                            <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                            <p className="text-lg">Connecting to Tavus AI assistant...</p>
                            <p className="text-sm opacity-70 mt-2">Setting up real-time conversation</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Connection Status Badge */}
                    {isTavusConnected && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant="secondary" className="bg-green-500 text-white">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                          Live Conversation
                        </Badge>
                      </div>
                    )}

                    {/* Tavus Branding */}
                    {isTavusConnected && (
                      <div className="absolute bottom-4 left-4 z-10">
                        <Badge variant="secondary" className="bg-black/50 text-white text-xs">
                          Powered by Tavus
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Chat Messages Overlay */}
                  <div className="bg-background/95 backdrop-blur border-t max-h-48 overflow-y-auto">
                    <ScrollArea className="p-3">
                      <div className="space-y-2">
                        {messages.slice(-3).map(msg => (
                          <div 
                            key={msg.id} 
                            className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div 
                              className={`rounded-lg px-3 py-1.5 max-w-[80%] ${
                                msg.sender === "user" 
                                  ? "bg-blue-600 text-white" 
                                  : "bg-gray-100 dark:bg-gray-800"
                              }`}
                            >
                              <p className="text-sm">{typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Right Sidebar - Flash Cards and Quiz */}
                <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    {/* Flash Cards Section */}
                    {flashCards.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Badge variant="outline">Flash Cards</Badge>
                          <span className="text-xs text-gray-500">{flashCards.length}</span>
                        </h3>
                        <div className="space-y-2">
                          {flashCards.map(card => (
                            <Card 
                              key={card.id} 
                              className={`cursor-pointer transition-all hover:shadow-md ${card.fromQuiz ? 'border-orange-300' : ''}`}
                              onClick={() => handleFlipFlashCard(card.id)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {card.isFlipped ? 'Answer' : 'Question'}
                                  </Badge>
                                  <RotateCcw className="h-3 w-3 text-gray-400" />
                                </div>
                                <p className="text-sm">
                                  {card.isFlipped ? card.answer : card.question}
                                </p>
                                {card.fromQuiz && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    From Quiz
                                  </Badge>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz Section */}
                    {currentQuiz && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Badge variant="outline">Quiz</Badge>
                          <span className="text-xs text-gray-500">
                            {currentQuiz.questions.length} questions
                          </span>
                        </h3>
                        <div className="space-y-4">
                          {currentQuiz.questions.map((question, qIdx) => (
                            <Card key={question.id}>
                              <CardContent className="p-3">
                                <p className="font-medium text-sm mb-3">
                                  {qIdx + 1}. {question.text}
                                </p>
                                <div className="space-y-2">
                                  {question.answers.map(answer => (
                                    <Button
                                      key={answer.id}
                                      variant={quizAnswers[question.id] === answer.id ? "default" : "outline"}
                                      size="sm"
                                      className="w-full justify-start text-left"
                                      onClick={() => handleQuizAnswerSelect(question.id, answer.id)}
                                      disabled={quizSubmitted}
                                    >
                                      {answer.text}
                                      {quizSubmitted && quizResults && (
                                        <>
                                          {quizResults.results.find((r: any) => r.questionId === question.id)?.isCorrect && 
                                           quizAnswers[question.id] === answer.id && (
                                            <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                                          )}
                                          {!quizResults.results.find((r: any) => r.questionId === question.id)?.isCorrect && 
                                           quizAnswers[question.id] === answer.id && (
                                            <XCircle className="ml-auto h-4 w-4 text-red-500" />
                                          )}
                                        </>
                                      )}
                                    </Button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        {!quizSubmitted && (
                          <Button 
                            className="w-full mt-4"
                            onClick={handleSubmitQuiz}
                            disabled={Object.keys(quizAnswers).length !== currentQuiz.questions.length || isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              'Submit Quiz'
                            )}
                          </Button>
                        )}
                        {quizSubmitted && quizResults && (
                          <Alert className="mt-4">
                            <AlertDescription>
                              Score: {quizResults.correctCount}/{quizResults.totalCount}
                              {quizResults.correctCount === quizResults.totalCount ? ' 🎉' : ''}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {flashCards.length === 0 && !currentQuiz && (
                      <div className="text-center text-gray-500 text-sm mt-8">
                        <p>Flash cards and quizzes will appear here as you learn.</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              /* Regular Chat View */
              <ScrollArea className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.sender === "bot" && (
                        <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col gap-2 max-w-[80%]">
                        {msg.content && (
                          <div className={`rounded-lg px-3 py-2 ${msg.sender === "user" ? "bg-blue-600 text-white ml-auto" : "bg-gray-100 dark:bg-gray-800"}`}>
                            <p className="text-sm whitespace-pre-wrap">
                              {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}
                            </p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}

                        {msg.showConfirmationButtons && isAwaitingInput && msg.sender === "bot" && !flowFinished && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleConfirmationClick("yes")}>
                              Yes
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleConfirmationClick("no")}>
                              No
                            </Button>
                          </div>
                        )}

                        {msg.showBranchOptions && msg.sender === "bot" && msg.branchOptions && (
                          <div className="flex flex-wrap gap-2">
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
                        <Avatar className="h-8 w-8 bg-gray-300 dark:bg-gray-700 flex-shrink-0">
                          <AvatarFallback className="bg-gray-300 dark:bg-gray-700">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4 bg-background">
            {/* Voice Waveform */}
            {!bot.isVideoBot && (
              <VoiceWaveform
                audioLevels={audioLevels}
                isListening={isListening}
                showSilenceWarning={showSilenceWarning}
                silenceCountdown={silenceCountdown}
                className="mb-3"
              />
            )}

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
              <div className="flex-1 relative">
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
                        : flowFinished || bot.isVideoBot
                          ? "Ask me anything..." 
                          : (canSendText ? "Type your message..." : "Select an option above...")
                  }
                  disabled={isLoading || !canSendText || isProcessing}
                  className="pr-12"
                />
                {bot.voiceEnabled && canSendText && !bot.isVideoBot && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceInput}
                    disabled={isProcessing}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                      isListening 
                        ? "text-red-500 animate-pulse" 
                        : isProcessing 
                          ? "text-gray-400" 
                          : "text-gray-500 hover:text-blue-600"
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
                disabled={!inputMessage.trim() || isLoading || !canSendText || isListening || isProcessing}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>Supported languages:</span>
              {bot.languages.map((lang, i) => (
                <span key={lang}>
                  {lang}{i < bot.languages.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for playing TTS */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};
