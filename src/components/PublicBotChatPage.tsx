import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, User, Send, Mic, MicOff, Video, Loader2, PhoneOff, Volume2, VolumeX } from "lucide-react";
// TODO: import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";
// TODO: import { VoiceWaveform } from "@/components/VoiceWaveform";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
  audioUrl?: string;
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
  const [isMuted, setIsMuted] = useState(true);
  const [showVideoAvatar, setShowVideoAvatar] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // const audioRef = useRef<HTMLAudioElement>(null);
  
  // BROWSER SPEECH RECOGNITION (Speech-to-Text)
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize browser's Speech Recognition API
  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one result
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Set language

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);

      // Handle the recognized speech
      if (bot?.is_video_bot && flowFinished) {
        // Auto-submit for video bot in Q&A mode
        handleVoiceQuestion(transcript);
      } else {
        // Just populate input field
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
  }, [bot?.is_video_bot, flowFinished]);

  // Toggle speech recognition
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

  // BROWSER SPEECH SYNTHESIS (Text-to-Speech)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const isProcessingTTSRef = useRef(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showTtsPrompt, setShowTtsPrompt] = useState(false);

  // Process TTS queue using browser's Speech Synthesis API
  const processTTSQueue = async () => {
    if (isProcessingTTSRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    if (!window.speechSynthesis) {
      console.warn("Speech Synthesis not supported in this browser");
      return;
    }

    // Check if TTS is enabled by user
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
        // Use browser's Speech Synthesis API
        await new Promise<void>((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 1.0; // Speed
          utterance.pitch = 1.0; // Pitch
          utterance.volume = 1.0; // Volume

          utterance.onend = () => {
            resolve();
          };

          utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            // If error is "not-allowed", it means user interaction is needed
            if (event.error === 'not-allowed') {
              setShowTtsPrompt(true);
              setTtsEnabled(false);
            }
            resolve(); // Continue with next item instead of rejecting
          };

          speechSynthesisRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        });

      } catch (error) {
        console.error("TTS error:", error);
        // Continue with next item even if one fails
      }
    }

    isProcessingTTSRef.current = false;
    setIsSpeaking(false);
  };

  // Enable TTS with user interaction
  const enableTTS = () => {
    setTtsEnabled(true);
    setShowTtsPrompt(false);
    // Process any queued messages
    if (ttsQueueRef.current.length > 0) {
      processTTSQueue();
    }
  };

  // Disable TTS
  const disableTTS = () => {
    setTtsEnabled(false);
    setShowTtsPrompt(false);
    clearTTSQueue();
  };

  // TTS Queue management (COMMENTED OUT - Old API-based implementation)
  // const processTTSQueue = async () => {
  //   // If already processing or queue is empty, return
  //   if (isProcessingTTSRef.current || ttsQueueRef.current.length === 0) {
  //     return;
  //   }

  //   isProcessingTTSRef.current = true;

  //   while (ttsQueueRef.current.length > 0) {
  //     const text = ttsQueueRef.current.shift();
  //     if (!text || !text.trim()) continue;

  //     try {
  //       setIsSpeaking(true);
        
  //       const response = await fetch(
  //         `${import.meta.env.VITE_BACKEND_URL}/api/elevenlabs/text-to-speech`,
  //         {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({ text, voiceId: bot.voice_id }),
  //         }
  //       );

  //       if (!response.ok) {
  //         throw new Error("Failed to generate speech");
  //       }

  //       const audioBlob = await response.blob();
  //       const audioUrl = URL.createObjectURL(audioBlob);

  //       // Wait for audio to finish playing before processing next item
  //       await new Promise<void>((resolve, reject) => {
  //         if (audioRef.current) {
  //           audioRef.current.src = audioUrl;
            
  //           const handleEnded = () => {
  //             URL.revokeObjectURL(audioUrl);
  //             audioRef.current?.removeEventListener('ended', handleEnded);
  //             audioRef.current?.removeEventListener('error', handleError);
  //             resolve();
  //           };
            
  //           const handleError = () => {
  //             URL.revokeObjectURL(audioUrl);
  //             audioRef.current?.removeEventListener('ended', handleEnded);
  //             audioRef.current?.removeEventListener('error', handleError);
  //             reject(new Error("Audio playback failed"));
  //           };
            
  //           audioRef.current.addEventListener('ended', handleEnded);
  //           audioRef.current.addEventListener('error', handleError);
            
  //           audioRef.current.play().catch(reject);
  //         } else {
  //           resolve();
  //         }
  //       });

  //     } catch (error) {
  //       console.error("TTS error:", error);
  //       // Continue with next item even if one fails
  //     }
  //   }

  //   setIsSpeaking(false);
  //   isProcessingTTSRef.current = false;
  // };

  // Add text to TTS queue and start processing
  const queueTextToSpeech = (text: string) => {
    if (!bot?.is_video_bot || !text.trim()) return;
    
    ttsQueueRef.current.push(text);
    processTTSQueue();
  };

  // Clear TTS queue
  const clearTTSQueue = () => {
    ttsQueueRef.current = [];
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isProcessingTTSRef.current = false;
    setIsSpeaking(false);
  };

  // Clear TTS queue (COMMENTED OUT - Old API-based implementation)
  // const clearTTSQueue = () => {
  //   ttsQueueRef.current = [];
  //   if (audioRef.current) {
  //     audioRef.current.pause();
  //     audioRef.current.currentTime = 0;
  //   }
  //   isProcessingTTSRef.current = false;
  //   setIsSpeaking(false);
  // };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTTSQueue();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Human handoff state
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [handoffSessionId, setHandoffSessionId] = useState<string | null>(null);
  const [isConnectedToAgent, setIsConnectedToAgent] = useState(false);
  const [assignedAgentEmail, setAssignedAgentEmail] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const handoffStatusRef = useRef<string | null>(null);

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
            botId: bot._id,
            flowSessionId: sessionId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      const answerText = data.result.answer || "I couldn't find an answer to that question.";
      addBotMessage(answerText);

      // Queue answer for speech (using browser TTS)
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

  // Send message to agent when in handoff mode
  const sendMessageToAgent = async (message: string) => {
    if (!handoffSessionId) return;
    if (handoffStatusRef.current === 'resolved') {
      const msg = 'This conversation has been resolved. You cannot send more messages.';
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: msg, sender: 'bot', timestamp: new Date() }]);
      return;
    }

    try {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/client-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, flowSessionId: sessionId }),
        }
      );
    } catch (error) {
      console.error('Error sending message to agent:', error);
      toast({ title: 'Error', description: 'Failed to send message to agent', variant: 'destructive' });
    }
  };

  // Request human handoff
  const requestHumanHandoff = async (userQuestion: string) => {
    if (!bot?.human_handoff_enabled && !bot?.humanHandoffEnabled) {
      const message = "Human support is not available for this bot.";
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: message, sender: 'bot', timestamp: new Date() }]);
      return;
    }

    if (handoffRequested) {
      const message = "Your request for human support has already been submitted.";
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: message, sender: 'bot', timestamp: new Date() }]);
      return;
    }

    setHandoffRequested(true);
    const connectingMessage = "Connecting you with a human agent...";
    setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: connectingMessage, sender: 'bot', timestamp: new Date() }]);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/handoff/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: bot._id, flowSessionId: sessionId, userQuestion, userIpAddress: '', userAgent: navigator.userAgent }),
      });
      const data = await response.json();
      if (data.status === 'success' && data.result) {
        setHandoffSessionId(data.result.handoffSession._id);
        setAssignedAgentEmail(data.result.agent?.email || null);
        setIsConnectedToAgent(!!data.result.agent?.isOnline);
        const agentStatusMessage = data.result.message;
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: agentStatusMessage, sender: 'bot', timestamp: new Date() }]);
      } else {
        throw new Error(data.message || 'Failed to request human support');
      }
    } catch (err) {
      console.error('Handoff request error:', err);
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: 'Failed to connect with a human agent. Please try again later.', sender: 'bot', timestamp: new Date() }]);
      setHandoffRequested(false);
    }
  };

  // COMMENTED OUT - Old useSpeechToText hook implementation
  // const {
  //   isListening,
  //   isProcessing,
  //   showSilenceWarning,
  //   silenceCountdown,
  //   audioLevels,
  //   toggleListening
  // } = useSpeechToText({
  //   onResult: (text) => {
  //     // Only auto-submit voice input when in Q&A mode (flowFinished) for video bots
  //     if (bot?.is_video_bot && flowFinished) {
  //       handleVoiceQuestion(text);
  //     } else {
  //       // Otherwise, just populate the input field
  //       setInputMessage(prev => {
  //         const newText = prev ? prev + " " + text : text;
  //         return newText.trim();
  //       });
  //     }
  //   },
  //   onError: (err) => {
  //     if (!err.includes('speak into the microphone')) {
  //       toast({
  //         title: "Speech Error",
  //         description: err,
  //         variant: "destructive"
  //       });
  //     }
  //   },
  //   language: "en-US",
  //   silenceTimeout: 10,
  //   stopTimeout: 5,
  // });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(scrollToBottom, [messages]);
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

    // COMMENTED OUT - Old audio playback implementation
    // Play audio if available
    // if (audioUrl && audioRef.current) {
    //   audioRef.current.src = audioUrl;
    //   audioRef.current.play().catch(err => {
    //     console.error('Error playing audio:', err);
    //   });
    // }

    return botMessage;
  };

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

          // Collect texts to speak (using browser TTS)
          if (bot.is_video_bot && messageContent) {
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

        // Queue all texts for speech in order (using browser TTS)
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
  }, [bot]);

  // Poll for agent messages when handoff is active
  useEffect(() => {
    if (!handoffSessionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/handoff/${handoffSessionId}/client-messages?flowSessionId=${sessionId}`
        );
        const data = await response.json();

        if (data.status === 'success' && data.result?.messages) {
          const agentMessages = data.result.messages
            .filter((m: any) => m.sender === 'agent')
            .map((m: any) => ({
              id: `agent-${m.timestamp || Date.now()}`,
              content: m.message,
              sender: 'bot' as const,
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
            setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: agentMsg, sender: 'bot', timestamp: new Date() }]);
          }

          if (status === 'resolved' && handoffStatusRef.current !== 'resolved') {
            setHandoffStatus('resolved');
            handoffStatusRef.current = 'resolved';
            setHandoffRequested(false);
            const resolvedMsg = 'This conversation has been marked resolved by the agent. You can no longer send messages.';
            setMessages(prev => [...prev, { id: `sys-${Date.now()}`, content: resolvedMsg, sender: 'bot', timestamp: new Date() }]);
          }
        }
      } catch (error) {
        console.error('Error polling agent messages:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [handoffSessionId, sessionId]);

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
            botId: bot._id,
            flowSessionId: sessionId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      const answerText = data.result.answer || "I couldn't find an answer to that question.";
      addBotMessage(answerText);

      // Queue answer for speech (using browser TTS)
      queueTextToSpeech(answerText);
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

        // Collect texts to speak (using browser TTS)
        if (bot.is_video_bot && messageContent) {
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

      // Queue all texts for speech in order (using browser TTS)
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
  const canSendText = flowFinished || (isAwaitingInput &&
    currentPausedFor?.type !== "branch" &&
    !currentPausedFor?.showConfirmationButtons);

  // Show mic button: for video bots only in flow mode, for non-video bots when voice is enabled
  const shouldShowMicButton = bot?.is_video_bot ? !flowFinished : (bot?.is_voice_enabled && canSendText);

  const videoBotAvatarUrl = bot?.video_bot_image_url || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Bot not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <Card className={`w-full ${bot.is_video_bot ? (showVideoAvatar ? 'max-w-6xl' : 'max-w-2xl') : 'max-w-2xl'} h-[600px] flex flex-col shadow-2xl rounded-xl overflow-hidden transition-all duration-300`}>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0 space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 border-2 border-white flex-shrink-0 mt-1">
                <AvatarFallback className="bg-white text-blue-600">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl text-white">{bot.name}</CardTitle>
                  <div className="flex gap-1.5 flex-wrap">
                    {/* Voice Status Badge */}
                    <Badge
                      variant="secondary"
                      className={`text-xs ${bot.is_voice_enabled ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      {bot.is_voice_enabled ? (
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
                      className={`text-xs ${bot.is_video_bot ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}
                    >
                      {bot.is_video_bot ? (
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
                      {bot.primary_purpose}
                    </Badge>

                    {/* Tone Badge */}
                    <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 border-pink-200">
                      {bot.conversation_tone}
                    </Badge>

                    {/* Languages Badge */}
                    <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                      {bot.supported_languages}
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
          </div>
        </CardHeader>

        {/* Video Bot View - Split Screen */}
        {bot.is_video_bot ? (
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
                          {/* TTS Toggle Button */}
                          <Button
                            onClick={ttsEnabled ? disableTTS : enableTTS}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${
                              ttsEnabled
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-gray-400 hover:bg-gray-500"
                            }`}
                            title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
                          >
                            {ttsEnabled ? (
                              <Volume2 className="h-6 w-6 text-white" />
                            ) : (
                              <VolumeX className="h-6 w-6 text-white" />
                            )}
                          </Button>

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
                          {" • "}
                          {ttsEnabled ? "Voice on" : "Voice off"}
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
                          {/* TTS Toggle Button */}
                          <Button
                            onClick={ttsEnabled ? disableTTS : enableTTS}
                            size="lg"
                            className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-110 ${
                              ttsEnabled
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-gray-400 hover:bg-gray-500"
                            }`}
                            title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
                          >
                            {ttsEnabled ? (
                              <Volume2 className="h-6 w-6 text-white" />
                            ) : (
                              <VolumeX className="h-6 w-6 text-white" />
                            )}
                          </Button>

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
                          {" • "}
                          {ttsEnabled ? "Voice on" : "Voice off"}
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
                {/* TTS Permission Prompt */}
                {showTtsPrompt && bot.is_video_bot && (
                  <Alert className="mb-2 bg-amber-50 border-amber-200">
                    <Volume2 className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="flex items-center justify-between">
                      <span className="text-amber-800">Enable voice responses from the bot?</span>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={enableTTS} className="bg-amber-600 hover:bg-amber-700">
                          Enable
                        </Button>
                        <Button size="sm" variant="outline" onClick={disableTTS}>
                          No thanks
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* REMOVED: Voice Waveform - replaced with simple status message */}
                {/* Voice Waveform (only show when listening and not in Q&A mode with video bot, or always for non-video) */}
                {/* {isListening && (!bot.is_video_bot || !flowFinished) && (
                  <VoiceWaveform
                    isListening={isListening}
                    audioLevels={audioLevels}
                    showSilenceWarning={showSilenceWarning}
                    silenceCountdown={silenceCountdown}
                  />
                )} */}

                {flowFinished && isListening && (
                  <Alert className="mb-2 bg-blue-50 border-blue-200">
                    <Mic className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">Listening... Speak now</AlertDescription>
                  </Alert>
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
                      disabled={isLoading || !canSendText || handoffStatus === 'resolved' || isProcessing}
                      className="pr-12"
                    />
                    {shouldShowMicButton && canSendText && (
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
              </div>
            </div>
          </div>
        ) : (
          /* Regular Chat View */
          <CardContent className="flex-1 flex flex-col p-0">
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

            {/* Input Area - For non-video bots */}
            <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
              {/* TTS Permission Prompt */}
              {showTtsPrompt && bot.is_video_bot && (
                <Alert className="mb-2 bg-amber-50 border-amber-200">
                  <Volume2 className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-amber-800">Enable voice responses from the bot?</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={enableTTS} className="bg-amber-600 hover:bg-amber-700">
                        Enable
                      </Button>
                      <Button size="sm" variant="outline" onClick={disableTTS}>
                        No thanks
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* REMOVED: Voice Waveform - replaced with simple status message */}
              {/* Voice Waveform */}
              {/* <VoiceWaveform
                isListening={isListening}
                audioLevels={audioLevels}
                showSilenceWarning={showSilenceWarning}
                silenceCountdown={silenceCountdown}
              /> */}

              {isListening && (
                <Alert className="mb-2 bg-blue-50 border-blue-200">
                  <Mic className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">Listening... Speak now</AlertDescription>
                </Alert>
              )}

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
                    disabled={isLoading || !canSendText || handoffStatus === 'resolved' || isProcessing}
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
            </div>
          </CardContent>
        )}

        {/* Hidden audio element for playing TTS */}
        {/* COMMENTED OUT - No longer needed with browser TTS */}
        {/* <audio ref={audioRef} className="hidden" /> */}
      </Card>

      {/* Footer Branding */}
      <div className="text-center mt-4 pb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Powered by{" "}
          <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TasteAI Studio
          </span>
        </p>
      </div>
    </div>
  );
};
