import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Bot, User, X, Mic, MicOff, Loader2, Video, VideoOff, PhoneOff, Volume2, VolumeX, Headphones, Clock, ArrowDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VisitorEmailOtpGate } from "@/components/visitor/VisitorEmailOtpGate";
import { visitorEmailOtpHeaders, getVisitorEmailVerificationToken } from "@/utils/visitorEmailOtp";
import { useRateLimit } from "@/hooks/useRateLimit";
import { handleApiResponse, RATE_LIMIT_CONFIGS, extractRetryAfterSeconds } from "@/utils/rateLimit";
import { RateLimitedButton } from "@/components/RateLimitedButton";
import { cn } from "@/lib/utils";


interface Message {
  id: string;
  content: string | object;
  sender: "user" | "bot" | "agent";
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
  audioUrl?: string;
  isSystemMessage?: boolean;
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
    humanHandoffEnabled?: boolean;
    responseStyle?: string;
    targetAudience?: string;
    conversationalStyle?: string;
    specializationArea?: string;
    isSlackEnabled?: boolean;
    customLLMProvider?: string;
    training_files?: Array<{ originalname: string; size: number; mimeType: string }>;
  };
  onClose: () => void;
  /** Full-page "meeting" layout: stage left, chat right (used from /test-chat/:botId). */
  layout?: "modal" | "meet";
}

export const ChatBot = ({ bot, onClose, layout = "modal" }: ChatBotProps) => {
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

  // Human handoff state
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [handoffSessionId, setHandoffSessionId] = useState<string | null>(null);
  const [isConnectedToAgent, setIsConnectedToAgent] = useState(false);
  const [assignedAgentEmail, setAssignedAgentEmail] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [isHandoffLoading, setIsHandoffLoading] = useState(false);
  const [isReopenLoading, setIsReopenLoading] = useState(false);
  const handoffStatusRef = useRef<string | null>(null);

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingFeedback, setRatingFeedback] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [previousRatingValue, setPreviousRatingValue] = useState<number | null>(null);
  const [previousRatingFeedback, setPreviousRatingFeedback] = useState<string>('');
  const [isLoadingRating, setIsLoadingRating] = useState(false);

  // Rate limiting for chatbot interactions
  const chatbotRateLimit = useRateLimit(RATE_LIMIT_CONFIGS.CHATBOT_ASK);

  // IMPROVED: Jump to latest state with better tracking
  const [showJumpButton, setShowJumpButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userScrolledAwayRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const flowStartedRef = useRef(false);
  const [needsVisitorVerification, setNeedsVisitorVerification] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const isProcessingTTSRef = useRef(false);
  const [showTagsPopover, setShowTagsPopover] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showTtsPrompt, setShowTtsPrompt] = useState(false);

  // Human handoff keywords detection
  const detectHandoffIntent = (message: string): boolean => {
    const handoffKeywords = [
      'speak to human',
      'talk to agent',
      'live agent',
      'customer service',
      'representative',
      'real person',
      'human support',
      'talk to someone',
      'speak to someone',
      'human help',
      'agent',
      'representative',
    ];

    const lowerMessage = message.toLowerCase();
    return handoffKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Add system message helper
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      content,
      sender: "bot",
      timestamp: new Date(),
      isSystemMessage: true,
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Request human handoff
  const requestHumanHandoff = async (userQuestion: string) => {
    if (!bot.humanHandoffEnabled) {
      const message = "Human support is not available for this bot.";
      addSystemMessage(message);
      try {
        await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              messageType: "handoff_unavailable",
            }),
          }
        );
      } catch (error) {
        console.error("Error saving message to flow session:", error);
      }
      return;
    }

    if (handoffRequested) {
      const message = "Your request for human support has already been submitted.";
      addSystemMessage(message);
      try {
        await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              messageType: "handoff_duplicate_request",
            }),
          }
        );
      } catch (error) {
        console.error("Error saving message to flow session:", error);
      }
      return;
    }

    setHandoffRequested(true);
    setIsHandoffLoading(true);
    const connectingMessage = "Connecting you with a human agent...";
    addSystemMessage(connectingMessage);

    try {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: connectingMessage,
            messageType: "handoff_connecting",
          }),
        }
      );
    } catch (error) {
      console.error("Error saving message to flow session:", error);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: bot.id,
            flowSessionId: sessionId,
            userQuestion,
            userIpAddress: "",
            userAgent: navigator.userAgent,
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success" && data.result) {
        setHandoffSessionId(data.result.handoffSession._id);
        setAssignedAgentEmail(data.result.agent.email);
        setIsConnectedToAgent(data.result.agent.isOnline);
        setIsHandoffLoading(false);

        const agentStatusMessage = data.result.message;
        addSystemMessage(agentStatusMessage);

        try {
          await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: agentStatusMessage,
                messageType: "handoff_agent_assigned",
                handoffSessionId: data.result.handoffSession._id,
              }),
            }
          );
        } catch (error) {
          console.error("Error saving agent status message to flow session:", error);
        }

        if (!data.result.agent.isOnline) {
          const offlineMessage = "The agent is currently offline but will respond as soon as possible. You can continue asking questions or close this chat.";
          addSystemMessage(offlineMessage);

          try {
            await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: offlineMessage,
                  messageType: "handoff_agent_offline",
                  handoffSessionId: data.result.handoffSession._id,
                }),
              }
            );
          } catch (error) {
            console.error("Error saving offline message to flow session:", error);
          }
        }
      } else {
        throw new Error(data.message || "Failed to request human support");
      }
    } catch (error: any) {
      console.error("Handoff request error:", error);
      const errorMessage = "Failed to connect with a human agent. Please try again later.";
      addSystemMessage(errorMessage);
      setIsHandoffLoading(false);

      try {
        await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: errorMessage,
              messageType: "handoff_error",
            }),
          }
        );
      } catch (saveError) {
        console.error("Error saving error message to flow session:", saveError);
      }

      setHandoffRequested(false);
    }
  };

  // Send message to agent when in handoff mode
  const sendMessageToAgent = async (message: string) => {
    if (!handoffSessionId) return;
    if (handoffStatusRef.current === 'resolved') {
      const msg = 'This conversation has been resolved. You cannot send more messages.';
      addSystemMessage(msg);
      return;
    }

    try {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/client-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            flowSessionId: sessionId
          }),
        }
      );
    } catch (error) {
      console.error("Error sending message to agent:", error);
      toast({
        title: "Error",
        description: "Failed to send message to agent",
        variant: "destructive",
      });
    }
  };

  // Client resolves the handoff (user ends the chat)
  const clientResolveHandoff = async () => {
    if (!handoffSessionId || !sessionId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/client-resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flowSessionId: sessionId }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setHandoffStatus('resolved');
        handoffStatusRef.current = 'resolved';
        setHandoffRequested(false);
        showRatingModalWithData();
        addSystemMessage('You have ended this conversation.');
      } else {
        throw new Error(data.message || 'Failed to resolve session');
      }
    } catch (error) {
      console.error('Error resolving handoff (client):', error);
      toast({ title: 'Error', description: 'Failed to end chat', variant: 'destructive' });
    }
  };

  // Client reopens a resolved handoff session
  const clientReopenHandoff = async () => {
    if (!handoffSessionId || !sessionId || isReopenLoading) return;
    setIsReopenLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/client-reopen`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flowSessionId: sessionId }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setHandoffRequested(true);
        setHandoffStatus('pending');
        handoffStatusRef.current = 'pending';
        addSystemMessage('You have reopened the conversation. Waiting for an agent to respond.');
      } else {
        throw new Error(data.message || 'Failed to reopen session');
      }
    } catch (error) {
      console.error('Error reopening handoff (client):', error);
      toast({ title: 'Error', description: 'Failed to reopen chat', variant: 'destructive' });
    } finally {
      setIsReopenLoading(false);
    }
  };

  // Fetch existing rating for the session
  const fetchExistingRating = async () => {
    if (!handoffSessionId || !sessionId) return;
    setIsLoadingRating(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/rating?flowSessionId=${sessionId}`,
      );
      const data = await res.json();
      if (res.ok && data.result) {
        if (data.result.userRating) {
          setPreviousRatingValue(data.result.userRating);
          setRatingValue(data.result.userRating);
        }
        if (data.result.userFeedback) {
          setPreviousRatingFeedback(data.result.userFeedback);
          setRatingFeedback(data.result.userFeedback);
        }
      }
    } catch (error) {
      console.error('Error fetching existing rating:', error);
    } finally {
      setIsLoadingRating(false);
    }
  };

  // Show rating modal with previous rating data
  const showRatingModalWithData = async () => {
    setRatingSubmitted(false);
    setShowRatingModal(true);
    await fetchExistingRating();
  };

  // Submit rating to backend
  const submitRating = async () => {
    if (!handoffSessionId || !sessionId) {
      toast({ title: 'Error', description: 'Session information missing', variant: 'destructive' });
      return;
    }

    if (!ratingValue || ratingValue < 1) {
      toast({ title: 'Please rate', description: 'Select a rating between 1 and 5', variant: 'destructive' });
      return;
    }

    setSubmittingRating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowSessionId: sessionId, rating: ratingValue, feedback: ratingFeedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit rating');

      setRatingSubmitted(true);
      setShowRatingModal(false);
      toast({ title: 'Thanks', description: 'Your rating has been submitted' });
    } catch (err: any) {
      console.error('Rating submit error', err);
      toast({ title: 'Error', description: err.message || 'Failed to submit rating', variant: 'destructive' });
    } finally {
      setSubmittingRating(false);
    }
  };

  // Poll for agent messages when handoff is active
  useEffect(() => {
    if (!handoffSessionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/client-messages?flowSessionId=${sessionId}`,
        );
        const data = await response.json();

        if (data.status === "success" && data.result?.messages) {
          const agentMessages = data.result.messages
            .filter((m: any) => m.sender === "agent")
            .map((m: any) => ({
              id: `agent-${m.timestamp || Date.now()}`,
              content: m.message,
              sender: "agent" as const,
              timestamp: new Date(m.timestamp),
            }));

          setMessages((prev) => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = agentMessages.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMessages];
          });

          const status = data.result.status;
          const assignedAgent = data.result.assignedAgent;

          if (status === 'active' && handoffStatusRef.current !== 'active') {
            setHandoffStatus('active');
            handoffStatusRef.current = 'active';
            setIsConnectedToAgent(true);
            if (assignedAgent?.email) setAssignedAgentEmail(assignedAgent.email);
            const agentMsg = `A human agent (${assignedAgent?.email || 'agent'}) has accepted your request.`;
            addSystemMessage(agentMsg);
            try {
              await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: agentMsg,
                    messageType: 'handoff_accepted',
                    handoffSessionId,
                  }),
                }
              );
            } catch (e) {
              // ignore
            }
          }

          if (status === 'resolved' && handoffStatusRef.current !== 'resolved') {
            setHandoffStatus('resolved');
            handoffStatusRef.current = 'resolved';
            setHandoffRequested(false);
            setShowRatingModal(true);
            const resolvedMsg = 'This conversation has been marked resolved by the agent.';
            addSystemMessage(resolvedMsg);
            try {
              await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/flow/session/${sessionId}/system-message`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: resolvedMsg,
                    messageType: 'handoff_resolved',
                    handoffSessionId,
                  }),
                }
              );
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error("Error polling agent messages:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [handoffSessionId, sessionId]);

  // Initialize browser's Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);

      if (bot.isVideoBot && flowFinished) {
        handleVoiceQuestion(transcript);
      } else {
        setInputMessage(prev => {
          const newText = prev ? prev + " " + transcript : transcript;
          return newText.trim();
        });
      }

      setIsProcessing(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setIsProcessing(false);

      if (event.error !== 'no-speech') {
        toast({
          title: "Speech Error",
          description: `Error: ${event.error}`,
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [bot.isVideoBot, flowFinished]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const processTTSQueue = async () => {
    if (isProcessingTTSRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    if (!window.speechSynthesis) {
      console.warn("Speech Synthesis not supported in this browser");
      return;
    }

    if (!ttsEnabled) {
      setShowTtsPrompt(true);
      return;
    }

    isProcessingTTSRef.current = true;
    setIsSpeaking(true);

    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift();
      if (!text) continue;

      try {
        await new Promise<void>((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onend = () => {
            resolve();
          };

          utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            if (event.error === 'not-allowed') {
              setShowTtsPrompt(true);
              setTtsEnabled(false);
            }
            resolve();
          };

          speechSynthesisRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        });

      } catch (error) {
        console.error("TTS error:", error);
      }
    }

    isProcessingTTSRef.current = false;
    setIsSpeaking(false);
  };

  const enableTTS = () => {
    setTtsEnabled(true);
    setShowTtsPrompt(false);
    if (ttsQueueRef.current.length > 0) {
      processTTSQueue();
    }
  };

  const disableTTS = () => {
    setTtsEnabled(false);
    setShowTtsPrompt(false);
    clearTTSQueue();
  };

  const queueTextToSpeech = (text: string) => {
    if (!bot.isVideoBot || !text.trim()) return;

    ttsQueueRef.current.push(text);
    processTTSQueue();
  };

  const clearTTSQueue = () => {
    ttsQueueRef.current = [];
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isProcessingTTSRef.current = false;
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => {
      clearTTSQueue();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleVoiceQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    if (!chatbotRateLimit.canMakeRequest) {
      toast({
        title: "Rate Limit Exceeded",
        description: `You've reached the limit for chatbot questions. Try again in ${chatbotRateLimit.formatTimeRemaining(chatbotRateLimit.remainingTime)}.`,
        variant: "destructive"
      });
      return;
    }

    if (flowFinished && detectHandoffIntent(question) && bot.humanHandoffEnabled) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: question,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      await requestHumanHandoff(question);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (handoffRequested && handoffSessionId) {
      await sendMessageToAgent(question);
      setIsLoading(false);
      return;
    }

    try {
      chatbotRateLimit.recordRequest();

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            botId: bot.id,
            flowSessionId: sessionId,
            chatHistory: messages.map(msg => ({ from: msg.sender, text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) })),
            matchedAnswer: null,
            userEmotion: question.length > 100 ? 'detailed' : 'concise',
          }),
        }
      );

      await handleApiResponse(res, chatbotRateLimit);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      const answerText = data.result.answer || "I couldn't find an answer to that question.";
      addBotMessage(answerText);

      queueTextToSpeech(answerText);
    } catch (err: any) {
      console.error(err);

      const errorMessage = err.message || "Something went wrong";
      const isRateLimitError = errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('too many') ||
        errorMessage.toLowerCase().includes('try again later');
      if (isRateLimitError) {
        chatbotRateLimit.handleRateLimitError(extractRetryAfterSeconds(errorMessage, 900));
      }

      toast({
        title: isRateLimitError ? "Rate Limit Exceeded" : "Error",
        description: errorMessage,
        variant: "destructive"
      });

      if (!isRateLimitError) {
        addBotMessage("I'm having trouble answering that. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // IMPROVED: Check if user is near bottom with threshold
  const checkIfNearBottom = () => {
    if (!scrollAreaRef.current) return true;
    const element = scrollAreaRef.current;
    const threshold = 150;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    const isNear = distanceFromBottom < threshold;
    return isNear;
  };

  // IMPROVED: Smooth scroll to bottom with better state management
  const scrollToBottom = (force = false) => {
    if (isAutoScrollingRef.current && !force) return;

    isAutoScrollingRef.current = true;
    userScrolledAwayRef.current = false;
    setShowJumpButton(false);

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 500);
  };

  // IMPROVED: Handle scroll events with better logic
  const handleScrollAreaScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isAutoScrollingRef.current) return;

    const element = e.currentTarget;
    const isNearBottom = checkIfNearBottom();

    if (!isNearBottom && element.scrollHeight > element.clientHeight) {
      userScrolledAwayRef.current = true;
      setShowJumpButton(true);
    } else {
      userScrolledAwayRef.current = false;
      setShowJumpButton(false);
    }
  };

  // IMPROVED: Auto-scroll when new messages arrive
  useEffect(() => {
    if (userScrolledAwayRef.current || isLoading || isHandoffLoading) {
      return;
    }

    scrollToBottom();
  }, [messages.length]);

  // IMPROVED: Scroll to bottom after loading completes
  useEffect(() => {
    if (!isLoading && !isHandoffLoading && !userScrolledAwayRef.current) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [isLoading, isHandoffLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addBotMessage = (content: string, audioUrl?: string) => {
    const botMessage: Message = {
      id: Date.now().toString() + Math.random(),
      content,
      sender: "bot",
      timestamp: new Date(),
      audioUrl,
    };
    setMessages((prev) => [...prev, botMessage]);

    return botMessage;
  };

  useEffect(() => {
    flowStartedRef.current = false;
    const initFlow = async () => {
      if (flowStartedRef.current) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/flow/start/${bot.id}`,
          { method: "POST", headers: { ...visitorEmailOtpHeaders(bot.id) } }
        );
        const data = await res.json();

        // Handle visitor email verification requirement
        if (!res.ok && data?.result?.code === "visitor_email_verification_required") {
          console.log("[ChatBot] Visitor verification required for bot:", bot.id);
          setNeedsVisitorVerification(true);
          return;
        }

        if (!res.ok) {
          console.error("[ChatBot] Flow start failed:", res.status, data);
          toast({
            title: "Error",
            description: data?.message || "Failed to start conversation",
            variant: "destructive"
          });
          return;
        }

        if (data.sessionId) {
          flowStartedRef.current = true;
          setSessionId(data.sessionId);
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
    const onVisitorReady = (e: Event) => {
      const d = (e as CustomEvent<{ botId?: string }>).detail;
      if (d?.botId === bot.id) {
        flowStartedRef.current = false; // reset guard so initFlow re-runs after verification
        initFlow();
      }
    };
    window.addEventListener("visitor-auth-ready", onVisitorReady);
    return () => window.removeEventListener("visitor-auth-ready", onVisitorReady);
  }, [bot.id]);

  const handleAskQuestion = async () => {
    const question = inputMessage.trim();
    if (!question || isLoading) return;
    if (!chatbotRateLimit.canMakeRequest) {
      return;
    }

    if (flowFinished && detectHandoffIntent(question) && bot.humanHandoffEnabled) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: question,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");
      await requestHumanHandoff(question);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    if (handoffRequested && handoffSessionId) {
      await sendMessageToAgent(question);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...visitorEmailOtpHeaders(bot.id) },
          body: JSON.stringify({
            question,
            botId: bot.id,
            flowSessionId: sessionId,
            chatHistory: messages.map(msg => ({ from: msg.sender, text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) })),
            matchedAnswer: null,
            userEmotion: question.length > 100 ? 'detailed' : 'concise',
          }),
        }
      );
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        chatbotRateLimit.handleRateLimitError(retryAfterHeader ? parseInt(retryAfterHeader, 10) : 900);
        throw new Error("Too many attempts. Please try again later.");
      }

      const data = await res.json();

      if (!res.ok && data?.result?.code === "visitor_email_verification_required") {
        console.log("[ChatBot] Visitor verification required during ask for bot:", bot.id);
        setNeedsVisitorVerification(true);
        setMessages((prev) => prev.slice(0, -1)); // Remove pending message
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      const answerText = data.result.answer || "I couldn't find an answer to that question.";
      addBotMessage(answerText);

      queueTextToSpeech(answerText);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Something went wrong";
      const isRateLimitError = errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('too many') ||
        errorMessage.toLowerCase().includes('try again later');
      if (isRateLimitError) {
        chatbotRateLimit.handleRateLimitError(extractRetryAfterSeconds(errorMessage, 900));
      }
      toast({
        title: isRateLimitError ? "Rate Limit Exceeded" : "Error",
        description: errorMessage,
        variant: "destructive"
      });
      if (!isRateLimitError) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            content: "I'm having trouble answering that. Please try again.",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      }
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
    if (!chatbotRateLimit.canMakeRequest) {
      return;
    }

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
          headers: { "Content-Type": "application/json", ...visitorEmailOtpHeaders(bot.id) },
          body: JSON.stringify(requestBody),
        }
      );
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        chatbotRateLimit.handleRateLimitError(retryAfterHeader ? parseInt(retryAfterHeader, 10) : 900);
        throw new Error("Too many attempts. Please try again later.");
      }

      const data = await res.json();
      if (!res.ok && data?.result?.code === "visitor_email_verification_required") {
        console.log("[ChatBot] Visitor verification required during respond for bot:", bot.id);
        setNeedsVisitorVerification(true);
        return;
      }

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

      textsToSpeak.forEach(text => queueTextToSpeech(text));

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Something went wrong";
      const isRateLimitError = errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('too many') ||
        errorMessage.toLowerCase().includes('try again later');
      if (isRateLimitError) {
        chatbotRateLimit.handleRateLimitError(extractRetryAfterSeconds(errorMessage, 900));
      }
      toast({
        title: isRateLimitError ? "Rate Limit Exceeded" : "Error",
        description: errorMessage,
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
  const isChatRateLimited = !chatbotRateLimit.canMakeRequest;

  const shouldShowMicButton = bot.isVideoBot ? !flowFinished : (bot.voiceEnabled && canSendText);

  const videoBotAvatarUrl = bot.videoBotImageUrl || null;

  const getPlaceholderText = () => {
    if (isListening) return "Listening... Speak now";
    if (isProcessing) return "Processing speech...";
    if (handoffRequested && isConnectedToAgent) return "Message the agent...";
    if (handoffRequested && !isConnectedToAgent) return "Waiting for agent...";
    if (flowFinished) return "Ask me anything...";
    if (canSendText) return "Type your message...";
    return "Select an option above...";
  };

  const isMeet = layout === "meet";

  // ─── Meet video-bot dock: now rendered BELOW the image, not overlaid ───────
  // This is a plain flex column (no absolute positioning) so it sits beneath
  // the video frame in the document flow.
  const meetVideoStageDock =
    flowFinished && isMeet ? (
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#303134]/95 px-3 py-2 shadow-2xl backdrop-blur-md">
          <Button
            onClick={ttsEnabled ? disableTTS : enableTTS}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full border-0 shadow-md transition-transform hover:scale-105",
              ttsEnabled
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-700 hover:to-cyan-600"
                : "bg-zinc-600 text-white hover:bg-zinc-500"
            )}
            title={ttsEnabled ? "Speaker on" : "Speaker off"}
          >
            {ttsEnabled ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}
          </Button>
          <Button
            onClick={handleMicToggle}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full border-0 shadow-md transition-transform hover:scale-105",
              !isMuted
                ? isListening
                  ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
                  : "bg-white text-gray-900 hover:bg-zinc-200"
                : "bg-zinc-600 text-white hover:bg-zinc-500"
            )}
            disabled={isLoading || isProcessing || isSpeaking}
            title={isMuted ? "Turn on microphone" : isListening ? "Listening…" : "Microphone on"}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          <Button
            onClick={handleEndCall}
            size="icon"
            className="h-11 w-11 rounded-full border-0 bg-red-600 shadow-md hover:bg-red-700"
            title="Hide video"
          >
            <VideoOff className="h-5 w-5 text-white" />
          </Button>
          <Button
            onClick={onClose}
            size="icon"
            className="h-11 w-11 rounded-full border-0 bg-red-700 shadow-md hover:bg-red-800"
            title="Leave"
          >
            <PhoneOff className="h-5 w-5 text-white" />
          </Button>
        </div>
        <p className="rounded-full bg-black/50 px-3 py-1 text-center text-xs text-white backdrop-blur">
          {isSpeaking ? "Speaking…" : isProcessing ? "Thinking…" : isListening ? "Listening…" : "Ready"}
          {" · "}
          {ttsEnabled ? "Sound on" : "Sound off"}
          {" · "}
          {!isMuted ? "Mic live" : "Mic muted"}
        </p>
      </div>
    ) : null;

  const meetNonVideoDock =
    isMeet && flowFinished ? (
      <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-[#303134]/95 px-3 py-2 shadow-2xl backdrop-blur-md">
          {bot.voiceEnabled && (
            <Button
              onClick={handleMicToggle}
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full border-0 shadow-md transition-transform hover:scale-105",
                !isMuted
                  ? isListening
                    ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
                    : "bg-white text-gray-900 hover:bg-zinc-200"
                  : "bg-zinc-600 text-white hover:bg-zinc-500"
              )}
              disabled={isLoading || isProcessing || isSpeaking}
              title={isMuted ? "Turn on microphone" : isListening ? "Listening…" : "Microphone on"}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            onClick={onClose}
            size="icon"
            className="h-11 w-11 rounded-full border-0 bg-red-700 shadow-md hover:bg-red-800"
            title="Leave meeting"
          >
            <PhoneOff className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>
    ) : null;

  // ─── Shared message list renderer ────────────────────────────────────────────
  const renderMessages = () => (
    <>
      {messages.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p className="mb-2">Start a conversation!</p>
          <p className="text-sm">{flowFinished ? "Type a message or use voice input" : "Follow the flow to continue"}</p>
        </div>
      )}

      {messages.map(msg => (
        <div
          key={msg.id}
          className={`flex gap-3 mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
        >
          {(msg.sender === "bot" || msg.sender === "agent") && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className={msg.sender === "agent"
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white"
                : "bg-gradient-primary text-white"
              }>
                {msg.sender === "agent" ? <Headphones className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
          )}
          <div className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
            {msg.content && (
              <div
                className={`rounded-lg p-3 ${msg.sender === "user"
                  ? "bg-gradient-primary text-white"
                  : msg.sender === "agent"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white"
                    : msg.isSystemMessage
                      ? "bg-orange-100 text-orange-900 border border-orange-200"
                      : "bg-muted text-foreground"
                  }`}
              >
                {typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content)}
              </div>
            )}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              {msg.sender === "agent" && <Headphones className="h-3 w-3" />}
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
                  <Button size="sm" onClick={() => handleConfirmationClick("yes")}>Yes</Button>
                  <Button size="sm" variant="outline" onClick={() => handleConfirmationClick("no")}>No</Button>
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
                      variant={msg.selectedBranch === opt ? "default" : "outline"}
                      onClick={() => handleBranchOptionClick(opt, msg.id)}
                      disabled={!!msg.selectedBranch}
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
            <AvatarFallback className={handoffRequested
              ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white"
              : "bg-gradient-primary text-white"
            }>
              {handoffRequested ? <Headphones className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </div>
      )}

      {isHandoffLoading && (
        <div className="flex gap-3 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
              <Headphones className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Connecting to an agent...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </>
  );

  // ─── Shared chat input footer ─────────────────────────────────────────────────
  const renderChatFooter = (isVideoVariant = false) => (
    <div className="p-4 border-t bg-background flex-shrink-0">
      {showJumpButton && (
        <div className="mb-3 flex justify-center">
          <Button
            onClick={() => scrollToBottom(true)}
            variant="outline"
            className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <ArrowDown className="h-4 w-4" />
            Jump to Latest Message
          </Button>
        </div>
      )}

      {handoffRequested && !isConnectedToAgent && (
        <Alert className={`mb-2 ${isHandoffLoading ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
          {isHandoffLoading ? (
            <>
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">
                Searching for an available agent...
              </AlertDescription>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Waiting for an agent to respond. You can continue sending messages.
              </AlertDescription>
            </>
          )}
          {!isHandoffLoading && (
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={clientResolveHandoff}>End chat</Button>
            </div>
          )}
        </Alert>
      )}

      {handoffRequested && isConnectedToAgent && (
        <Alert className="mb-2 bg-green-50 border-green-200">
          <Headphones className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Connected to agent: {assignedAgentEmail}
          </AlertDescription>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={clientResolveHandoff}>End chat</Button>
          </div>
        </Alert>
      )}

      {isVideoVariant && showTtsPrompt && bot.isVideoBot && (
        <Alert className="mb-2 bg-amber-50 border-amber-200">
          <Volume2 className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800">Enable voice responses from the bot?</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={enableTTS}>Enable</Button>
              <Button size="sm" variant="outline" onClick={disableTTS}>No thanks</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {handoffStatus === 'resolved' && (
        <Alert className="mb-2 bg-gray-50 border-gray-200">
          <AlertDescription className="text-gray-800">
            This conversation has been resolved. You cannot send messages.
          </AlertDescription>
          <div className="mt-2">
            <Button size="sm" onClick={clientReopenHandoff} disabled={isReopenLoading}>
              {isReopenLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reopening...</>
              ) : (
                'Reopen chat'
              )}
            </Button>
          </div>
        </Alert>
      )}

      {isVideoVariant && flowFinished && isListening && (
        <Alert className="mb-2 bg-blue-50 border-blue-200">
          <Mic className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">Listening... Speak now</AlertDescription>
        </Alert>
      )}

      {!isVideoVariant && isListening && (
        <Alert className="mb-2 bg-blue-50 border-blue-200">
          <Mic className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">Listening... Speak now</AlertDescription>
        </Alert>
      )}

      {isProcessing && !isHandoffLoading && (
        <Alert className="mb-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Processing your speech...</AlertDescription>
        </Alert>
      )}

      {isChatRateLimited && (
        <Alert className="mb-2 border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-sm text-amber-800">
            Too many attempts. Try again in{" "}
            <span className="rounded border border-amber-300 bg-white px-1.5 py-0.5">
              {chatbotRateLimit.formatTimeRemaining(chatbotRateLimit.remainingTime)}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {isVideoVariant && !showVideoAvatar && (
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
            placeholder={getPlaceholderText()}
            disabled={isLoading || isHandoffLoading || (!canSendText && !handoffRequested) || handoffStatus === 'resolved' || isProcessing || isChatRateLimited}
            className="pr-12"
          />
          {(isVideoVariant ? (shouldShowMicButton && !handoffRequested) : (bot.voiceEnabled && canSendText && !handoffRequested)) && (
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
        <RateLimitedButton
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading || isHandoffLoading || (!canSendText && !handoffRequested) || handoffStatus === 'resolved' || isListening || isProcessing || isChatRateLimited}
          size="icon"
          rateLimitKey={RATE_LIMIT_CONFIGS.CHATBOT_ASK.key}
          maxRequests={RATE_LIMIT_CONFIGS.CHATBOT_ASK.maxRequests}
          windowMs={RATE_LIMIT_CONFIGS.CHATBOT_ASK.windowMs}
          showCountdown={false}
          countdownMessage="Rate limit exceeded. Try again in"
        >
          <Send className="h-4 w-4" />
        </RateLimitedButton>
      </div>

      <div className="text-center py-2 border-t mt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Powered by{" "}
          <span className="font-semibold bg-gradient-primary bg-clip-text text-transparent">
            TasteAI Studio
          </span>
        </p>
      </div>
    </div>
  );

  const conversationBody = (
    <>
      {bot.isVideoBot ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {showVideoAvatar && (
            // ── Left/top: video stage ──────────────────────────────────────────
            <div
              className={cn(
                "flex min-h-0 flex-col overflow-hidden",
                isMeet
                  ? "min-w-0 flex-[3] bg-[#141414]"
                  : "w-1/2"
              )}
            >
              {videoBotAvatarUrl ? (
                // ── Has avatar image ───────────────────────────────────────────
                <div
                  className={cn(
                    "flex flex-col items-center",
                    isMeet
                      ? "h-full justify-between px-4 py-6"   // fill the dark panel, dock at bottom
                      : "relative h-full w-full"
                  )}
                >
                  {/* Image frame */}
                  <div
                    className={cn(
                      isMeet
                        ? "relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
                        : "relative h-full w-full"
                    )}
                  >
                    <img
                      src={videoBotAvatarUrl}
                      alt="Video Bot Avatar"
                      className={cn(
                        "relative z-0 object-cover",
                        isMeet ? "absolute inset-0 h-full w-full" : "h-full w-full"
                      )}
                    />

                    {/* Speaking/thinking overlay badge — always inside image */}
                    {(isLoading || isSpeaking) && (
                      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-white backdrop-blur-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{isSpeaking ? "Speaking..." : "Thinking..."}</span>
                      </div>
                    )}

                    {/* Non-meet controls stay overlaid on the image (original behaviour) */}
                    {flowFinished && !isMeet && (
                      <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
                        <div className="pointer-events-auto flex gap-3">
                          <Button
                            onClick={ttsEnabled ? disableTTS : enableTTS}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${ttsEnabled
                              ? "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                              : "bg-gray-400 hover:bg-gray-500"
                              }`}
                            title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
                          >
                            {ttsEnabled ? <Volume2 className="h-6 w-6 text-white" /> : <VolumeX className="h-6 w-6 text-white" />}
                          </Button>

                          <Button
                            onClick={handleMicToggle}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${!isMuted
                              ? isListening
                                ? "animate-pulse bg-red-500 hover:bg-red-600"
                                : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
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
                            className="h-14 w-14 rounded-full bg-red-600 shadow-xl transition-all hover:scale-110 hover:bg-red-700"
                            title="End call and hide avatar"
                          >
                            <PhoneOff className="h-6 w-6 text-white" />
                          </Button>
                        </div>

                        <p className="rounded-full bg-black/50 px-3 py-1 text-center text-xs text-white backdrop-blur">
                          {isSpeaking ? "Bot speaking..." : isProcessing ? "Processing..." : isMuted ? "Microphone muted" : isListening ? "Listening..." : "Microphone active"}
                          {" • "}
                          {ttsEnabled ? "Voice on" : "Voice off"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Meet dock rendered BELOW the image, not on top ── */}
                  {isMeet && meetVideoStageDock}
                </div>
              ) : (
                // ── No avatar image fallback ───────────────────────────────────
                <div
                  className={cn(
                    "flex flex-col items-center",
                    isMeet
                      ? "h-full justify-between px-4 py-6 bg-[#141414]"
                      : "relative h-full w-full items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-8 text-center dark:from-gray-900 dark:to-gray-800"
                  )}
                >
                  {/* Placeholder card */}
                  <div
                    className={cn(
                      isMeet
                        ? "relative flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950 text-white ring-1 ring-white/10"
                        : "flex flex-col items-center"
                    )}
                  >
                    <Video className={cn("mx-auto mb-4 h-20 w-20", isMeet ? "text-white/80" : "text-purple-400")} />
                    <h3 className={cn("mb-2 text-2xl font-bold", isMeet ? "text-white" : "bg-gradient-primary bg-clip-text text-transparent")}>
                      Video Bot
                    </h3>
                    <p className={cn("mb-6", isMeet ? "text-white/60" : "text-gray-600 dark:text-gray-400")}>
                      No avatar configured for this video bot
                    </p>

                    {/* Non-meet inline controls (original behaviour) */}
                    {flowFinished && !isMeet && (
                      <>
                        <div className="flex justify-center gap-3">
                          <Button
                            onClick={ttsEnabled ? disableTTS : enableTTS}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${ttsEnabled
                              ? "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                              : "bg-gray-400 hover:bg-gray-500"
                              }`}
                          >
                            {ttsEnabled ? <Volume2 className="h-6 w-6 text-white" /> : <VolumeX className="h-6 w-6 text-white" />}
                          </Button>

                          <Button
                            onClick={handleMicToggle}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${!isMuted
                              ? isListening
                                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                              : "bg-gray-400 hover:bg-gray-500"
                              }`}
                            disabled={isLoading || isProcessing || isSpeaking}
                          >
                            {isProcessing ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : isMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
                          </Button>

                          <Button
                            onClick={handleEndCall}
                            size="lg"
                            className="h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 bg-red-600 hover:bg-red-700"
                          >
                            <PhoneOff className="h-6 w-6 text-white" />
                          </Button>
                        </div>

                        <p className="mt-4 text-center text-xs text-muted-foreground">
                          {isSpeaking ? "Bot speaking..." : isProcessing ? "Processing..." : isMuted ? "Click to unmute and speak" : isListening ? "Listening..." : "Click to speak"}
                          {" • "}
                          {ttsEnabled ? "Voice on" : "Voice off"}
                        </p>
                      </>
                    )}
                  </div>

                  {/* ── Meet dock rendered BELOW the placeholder, not on top ── */}
                  {isMeet && meetVideoStageDock}
                </div>
              )}
            </div>
          )}

          {/* ── Right: chat panel ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "relative flex min-h-0 flex-col bg-background transition-all duration-300",
              showVideoAvatar
                ? isMeet
                  ? "min-w-0 max-w-xl flex-[2] shrink-0 border-l border-white/10"
                  : "w-1/2"
                : "w-full",
              isMeet && "overflow-hidden shadow-[inset_1px_0_0_rgba(255,255,255,.06)]"
            )}
          >
            <div
              ref={scrollAreaRef}
              onScroll={handleScrollAreaScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4"
            >
              <div className="space-y-4">
                {renderMessages()}
              </div>
            </div>

            {renderChatFooter(true)}
          </div>
        </div>
      ) : (
        // ── Non-video bot ──────────────────────────────────────────────────────
        <div
          className={cn(
            "flex min-h-0 flex-1 overflow-hidden",
            isMeet ? "flex-col md:flex-row" : "flex-col"
          )}
        >
          {isMeet && (
            <div className="relative flex min-h-[220px] shrink-0 flex-col items-center justify-center bg-[#141414] px-6 py-8 text-white md:min-h-0 md:flex-[3] md:py-12">
              <div className="flex aspect-video w-full max-w-lg flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950 p-8 text-center shadow-2xl ring-1 ring-white/10 md:max-w-xl">
                <Avatar className="h-14 w-14 ring-2 ring-white/25">
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-500">
                    <Bot className="h-7 w-7 text-white" />
                  </AvatarFallback>
                </Avatar>
                <p className="text-base font-semibold">{bot.name}</p>
                <p className="text-[11px] text-white/50">Meeting · Chat on the right</p>
              </div>
              {meetNonVideoDock}
            </div>
          )}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col bg-background",
              isMeet && "max-h-full shrink-0 border-white/10 md:max-w-lg md:flex-[2] md:border-l md:border-white/10"
            )}
          >
            <div
              ref={scrollAreaRef}
              onScroll={handleScrollAreaScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0"
            >
              <div className="space-y-4">
                {renderMessages()}
              </div>
            </div>

            {renderChatFooter(false)}
          </div>
        </div>
      )}

      {/* Rating modal */}
      {showRatingModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Rate your experience</h3>
            <p className="text-sm text-gray-500 mb-4">How would you rate the support you received?</p>
            {isLoadingRating && (
              <p className="text-sm text-gray-500 mb-4">Loading your previous rating...</p>
            )}
            {previousRatingValue && !isLoadingRating && (
              <p className="text-sm text-blue-600 mb-4">
                Your previous rating: <span className="font-semibold">{previousRatingValue} ★</span>
                {previousRatingFeedback && <span className="block text-xs mt-1">Feedback: {previousRatingFeedback}</span>}
              </p>
            )}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => setRatingValue(i)}
                  className={`text-3xl ${ratingValue >= i ? 'text-yellow-400' : 'text-gray-300'}`}
                  aria-label={`Rate ${i}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 text-sm"
              rows={4}
              placeholder="Optional feedback (what went well, what could improve)"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRatingModal(false)}>Cancel</Button>
              <Button onClick={submitRating} disabled={submittingRating || ratingValue < 1}>
                {submittingRating ? 'Updating...' : previousRatingValue ? 'Update Rating' : 'Submit Rating'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderTopBarTags = () => {
    const tags: JSX.Element[] = [];

    if (handoffRequested) {
      tags.push(
        <Badge key="handoff" className="text-[11px] bg-amber-400/95 text-amber-950 border-0 hover:bg-amber-400 animate-pulse">
          <Headphones className="h-3 w-3 mr-1" />
          {isConnectedToAgent ? "Agent Connected" : "Waiting for Agent"}
        </Badge>
      );
    }

    tags.push(
      <Badge key="bot-type" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">
        {bot.isVideoBot ? <><Video className="h-3 w-3 mr-1" />Video Bot</> : <><Bot className="h-3 w-3 mr-1" />Chat Bot</>}
      </Badge>
    );

    tags.push(
      <Badge key="voice" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">
        {(bot.isVideoBot || bot.voiceEnabled) ? <><Volume2 className="h-3 w-3 mr-1" />Voice Enabled</> : <><VolumeX className="h-3 w-3 mr-1" />Voice Disabled</>}
      </Badge>
    );

    tags.push(
      <Badge key="mode" className={`text-[11px] border-0 ${flowFinished ? 'bg-teal-400/90 text-teal-950 hover:bg-teal-400' : 'bg-cyan-400/90 text-cyan-950 hover:bg-cyan-400'}`}>
        {flowFinished ? "Q&A Mode" : "Flow Mode"}
      </Badge>
    );

    if (bot.primaryPurpose) tags.push(<Badge key="purpose" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">🎯 {bot.primaryPurpose}</Badge>);
    if (bot.conversationalTone) tags.push(<Badge key="tone" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">🎭 {bot.conversationalTone}</Badge>);
    if (bot.targetAudience) tags.push(<Badge key="audience" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">👥 {bot.targetAudience}</Badge>);
    if (bot.conversationalStyle || bot.responseStyle) tags.push(<Badge key="style" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">🧭 {bot.conversationalStyle || bot.responseStyle}</Badge>);

    if (bot.languages) {
      bot.languages.forEach((lang: string, i: number) => tags.push(<Badge key={`lang-${lang}-${i}`} className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">🌐 {lang}</Badge>));
    }

    if (bot.training_files && bot.training_files.length > 0) {
      tags.push(
        <Badge
          key="training"
          className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm"
          title={bot.training_files.map((f: any) => f.originalname).join("\n")}
        >
          📁 Training data ({bot.training_files.length})
        </Badge>
      );
    }

    if (bot.websiteUrl) tags.push(<Badge key="website" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">🌐 Website training</Badge>);

    tags.push(<Badge key="llm" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">🤖 {bot.customLLMProvider ? `Custom LLM (${bot.customLLMProvider})` : "Platform LLM"}</Badge>);

    if (bot.isSlackEnabled) tags.push(<Badge key="slack" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">💬 Slack</Badge>);
    if (bot.humanHandoffEnabled) tags.push(<Badge key="humanhandoff" className="text-[11px] bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm">👤 Human handoff</Badge>);

    const maxVisible = 10;
    const visible = tags.slice(0, maxVisible);
    const hidden = tags.slice(maxVisible);

    return (
      <>
        {visible.map((t, i) => (
          <span key={`visible-${i}`} className="inline-block mr-1 mb-1">{t}</span>
        ))}

        {hidden.length > 0 && (
          <div
            className="relative inline-block mr-1 mb-1"
            onMouseEnter={() => setShowTagsPopover(true)}
            onMouseLeave={() => setShowTagsPopover(false)}
          >
            <Badge className="text-[11px] bg-white/10 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm cursor-default">+{hidden.length} more</Badge>

            {showTagsPopover && (
              <div className="absolute right-0 mt-2 z-50 w-max max-w-xs bg-background/95 p-2 rounded shadow-lg border border-white/10 flex flex-wrap gap-1">
                {hidden.map((h, idx) => (
                  <div key={`hidden-${idx}`} className="inline-block">{h}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const modalHeader = (
    <DialogHeader className="relative flex-shrink-0 space-y-0 p-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary-glow)/0.45),transparent_55%)]" />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-white/30 blur-md" />
                <Avatar className="relative h-12 w-12 ring-2 ring-white/60 shadow-lg">
                  <AvatarFallback className="bg-white text-primary">
                    {handoffRequested ? <Headphones className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${handoffRequested ? (isConnectedToAgent ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse') : 'bg-emerald-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl text-white font-semibold tracking-tight truncate" title={bot.name}>
                    {bot.name}
                  </DialogTitle>
                </div>
                {bot.description && (
                  <p className="text-sm text-white/85 mt-1 line-clamp-2">{bot.description}</p>
                )}
                {handoffRequested && assignedAgentEmail && (
                  <p className="text-xs text-white/80 mt-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Agent: {assignedAgentEmail}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {renderTopBarTags()}
          </div>
        </div>
      </div>
    </DialogHeader>
  );

  const meetTopBar = (
    <div className="flex flex-col gap-3 border-b border-white/10 bg-neutral-950 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3 flex-1">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 shadow-md">
          {bot.isVideoBot ? <Video className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">{bot.name}</p>
          <p className="truncate text-xs text-white/60">
            {handoffRequested
              ? isConnectedToAgent
                ? assignedAgentEmail
                  ? `Agent · ${assignedAgentEmail}`
                  : "Agent connected"
                : "Waiting for agent…"
              : flowFinished
                ? "In call · Q&A"
                : "Interactive session"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {renderTopBarTags()}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="flex-shrink-0 rounded-full text-white hover:bg-white/10"
        title="Leave"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );

  const modalShellClass = `${bot.isVideoBot ? (showVideoAvatar ? "max-w-6xl" : "max-w-2xl") : "max-w-2xl"} h-[600px] p-0 gap-0 flex flex-col bg-background/95 backdrop-blur-sm border shadow-2xl rounded-xl overflow-hidden transition-all duration-300`;

  return (
    <>
      {!isMeet ? (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className={modalShellClass}>
            {modalHeader}
            {conversationBody}
          </DialogContent>
        </Dialog>
      ) : (
        <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950">
          {meetTopBar}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {conversationBody}
          </div>
        </div>
      )}
      {needsVisitorVerification && createPortal(
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 9998,
              animation: "fadeIn 150ms ease",
            }}
          />
          <VisitorEmailOtpGate
            botId={bot.id}
            open={true}
            onVerified={() => setNeedsVisitorVerification(false)}
          />
        </>,
        document.body
      )}
    </>
  );
};