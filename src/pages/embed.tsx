import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Bot, User, Mic, MicOff, Video, Loader2, X, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmbedCustomization } from "@/components/EmbedCustomizer";
// TODO: import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";
// TODO: import { VoiceWaveform } from "@/components/VoiceWaveform";

interface Message {
  id: string;
  from: "user" | "bot";
  text: string;
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
  audioUrl?: string;
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
  const [isMuted, setIsMuted] = useState(true);
  const [showVideoAvatar, setShowVideoAvatar] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      if (botData?.is_video_bot && flowFinished) {
        // Auto-submit for video bot in Q&A mode
        handleVoiceQuestion(transcript);
      } else {
        // Just populate input field
        setInput(prev => {
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
  }, [botData?.is_video_bot, flowFinished]);

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

  // Add text to TTS queue and start processing
  const queueTextToSpeech = (text: string) => {
    if (!botData?.is_video_bot || !text.trim()) return;

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTTSQueue();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // COMMENTED OUT - Old API-based TTS function
  // Function to convert text to speech and play it
  // const playTextToSpeech = async (text: string) => {
  //   if (!botData?.is_video_bot || !botData?.is_voice_enabled) return;
    
  //   try {
  //     setIsSpeaking(true);
  //     const response = await fetch(
  //       `${import.meta.env.VITE_BACKEND_URL}/api/elevenlabs/text-to-speech`,
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ text, voiceId: botData.voice_id }),
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error("Failed to generate speech");
  //     }

  //     const audioBlob = await response.blob();
  //     const audioUrl = URL.createObjectURL(audioBlob);

  //     if (audioRef.current) {
  //       audioRef.current.src = audioUrl;
  //       audioRef.current.onended = () => {
  //         setIsSpeaking(false);
  //         URL.revokeObjectURL(audioUrl);
  //       };
  //       audioRef.current.onerror = () => {
  //         setIsSpeaking(false);
  //         URL.revokeObjectURL(audioUrl);
  //       };
  //       await audioRef.current.play();
  //     }
  //   } catch (error) {
  //     console.error("TTS error:", error);
  //     setIsSpeaking(false);
  //   }
  // };

  // Handle voice question for video bot in Q&A mode (auto-submit)
  const handleVoiceQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      from: "user",
      text: question,
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
            botId: botData._id,
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

      // COMMENTED OUT - Old API-based TTS
      // Convert answer to speech and play it
      // if (botData.is_video_bot) {
      //   await playTextToSpeech(answerText);
      // }
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
  //     if (botData?.is_video_bot && flowFinished) {
  //       handleVoiceQuestion(text);
  //     } else {
  //       // Otherwise, just populate the input field
  //       setInput(prev => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Helper to add bot message
  const addBotMessage = (content: string, audioUrl?: string) => {
    const botMessage: Message = {
      id: Date.now().toString() + Math.random(),
      from: "bot",
      text: content,
      timestamp: new Date(),
      audioUrl,
    };
    setMessages((prev) => [...prev, botMessage]);

    // COMMENTED OUT - Old audio playback
    // Play audio if available
    // if (audioUrl && audioRef.current) {
    //   audioRef.current.src = audioUrl;
    //   audioRef.current.play().catch(err => {
    //     console.error('Error playing audio:', err);
    //   });
    // }

    return botMessage;
  };

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
              from: "bot",
              text: "",
              timestamp: new Date(),
              showBranchOptions: true,
              branchOptions: msg.options || [],
            });
            return;
          }

          const messageContent = msg.content || msg.message || "";
          botMessages.push({
            id: Date.now().toString() + Math.random(),
            from: "bot",
            text: messageContent,
            timestamp: new Date(),
            showConfirmationButtons: msg.type === "confirmation" && msg.awaitingInput,
            showBranchOptions: false,
            branchOptions: msg.options || [],
          });

          // Collect texts to speak (using browser TTS)
          if (botData.is_video_bot && messageContent) {
            textsToSpeak.push(messageContent);
          }

          // COMMENTED OUT - Old API-based TTS
          // For video bots, speak the initial flow messages
          // if (botData.is_video_bot && messageContent) {
          //   playTextToSpeech(messageContent);
          // }
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

  // Handle Q&A mode
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
      addBotMessage(answerText);

      // Queue answer for speech (using browser TTS)
      queueTextToSpeech(answerText);

      // COMMENTED OUT - Old API-based TTS
      // For video bots, speak the answer
      // if (botData.is_video_bot) {
      //   await playTextToSpeech(answerText);
      // }
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
            from: "bot",
            text: "",
            timestamp: new Date(),
            showBranchOptions: true,
            branchOptions: msg.options || [],
          });
          return;
        }

        const messageContent = msg.content || msg.message || "";
        botMessages.push({
          id: Date.now().toString() + Math.random(),
          from: "bot",
          text: messageContent,
          timestamp: new Date(),
          showConfirmationButtons: msg.type === "confirmation" && msg.awaitingInput,
          showBranchOptions: false,
          branchOptions: msg.options || [],
        });

        // Collect texts to speak (using browser TTS)
        if (botData.is_video_bot && messageContent) {
          textsToSpeak.push(messageContent);
        }

        // COMMENTED OUT - Old API-based TTS
        // For video bots, speak the flow messages
        // if (botData.is_video_bot && messageContent) {
        //   playTextToSpeech(messageContent);
        // }
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
  const canSendText = isPreview || flowFinished || (isAwaitingInput &&
    currentPausedFor?.type !== "branch" &&
    !currentPausedFor?.showConfirmationButtons);

  const videoBotAvatarUrl = botData?.video_bot_image_url || null;

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
      {/* Fixed Header Section */}
      <div className="flex-shrink-0">
        {/* Video Bot Avatar Section - Top */}
        {botData?.is_video_bot && showVideoAvatar && (
          <div className="relative w-full flex items-center justify-center border-b">
            {videoBotAvatarUrl ? (
              <div className="relative w-full h-48 flex items-center justify-center overflow-hidden">
                <img
                  src={videoBotAvatarUrl}
                  alt="Video Bot Avatar"
                  className="w-full h-full object-cover"
                />

                {/* Speaking/Loading indicator */}
                {(isLoading || isSpeaking) && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{isSpeaking ? "Speaking..." : "Thinking..."}</span>
                  </div>
                )}

                {/* Call Control Buttons (only in Q&A mode) */}
                {flowFinished && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <div className="flex gap-2">
                      {/* TTS Toggle Button */}
                      <Button
                        onClick={ttsEnabled ? disableTTS : enableTTS}
                        size="sm"
                        className={`h-10 w-10 rounded-full shadow-lg transition-all ${
                          ttsEnabled
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-gray-400 hover:bg-gray-500"
                        }`}
                        title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
                      >
                        {ttsEnabled ? (
                          <Volume2 className="h-5 w-5 text-white" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-white" />
                        )}
                      </Button>

                      <Button
                        onClick={handleMicToggle}
                        size="sm"
                        className={`h-10 w-10 rounded-full shadow-lg transition-all ${!isMuted
                          ? isListening
                            ? "bg-red-500 hover:bg-red-600 animate-pulse"
                            : "bg-green-500 hover:bg-green-600"
                          : "bg-gray-400 hover:bg-gray-500"
                          }`}
                        disabled={isLoading || isProcessing || isSpeaking}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        ) : isMuted ? (
                          <MicOff className="h-5 w-5 text-white" />
                        ) : (
                          <Mic className="h-5 w-5 text-white" />
                        )}
                      </Button>

                      <Button
                        onClick={handleEndCall}
                        size="sm"
                        className="h-10 w-10 rounded-full shadow-lg bg-red-600 hover:bg-red-700"
                      >
                        <PhoneOff className="h-5 w-5 text-white" />
                      </Button>
                    </div>
                    <p className="text-xs text-white bg-black/50 backdrop-blur px-2 py-0.5 rounded-full">
                      {ttsEnabled ? "Voice on" : "Voice off"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
                <Video className="h-12 w-12 mb-2 text-purple-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Video Bot</p>
                
                {/* Call Control Buttons for no avatar (only in Q&A mode) */}
                {flowFinished && (
                  <div className="flex flex-col items-center gap-1 mt-3">
                    <div className="flex gap-2">
                      {/* TTS Toggle Button */}
                      <Button
                        onClick={ttsEnabled ? disableTTS : enableTTS}
                        size="sm"
                        className={`h-10 w-10 rounded-full shadow-lg transition-all ${
                          ttsEnabled
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-gray-400 hover:bg-gray-500"
                        }`}
                        title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
                      >
                        {ttsEnabled ? (
                          <Volume2 className="h-5 w-5 text-white" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-white" />
                        )}
                      </Button>

                      <Button
                        onClick={handleMicToggle}
                        size="sm"
                        className={`h-10 w-10 rounded-full shadow-lg ${!isMuted
                          ? isListening
                            ? "bg-red-500 hover:bg-red-600 animate-pulse"
                            : "bg-green-500 hover:bg-green-600"
                          : "bg-gray-400 hover:bg-gray-500"
                          }`}
                        disabled={isLoading || isProcessing || isSpeaking}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        ) : isMuted ? (
                          <MicOff className="h-5 w-5 text-white" />
                        ) : (
                          <Mic className="h-5 w-5 text-white" />
                        )}
                      </Button>

                      <Button
                        onClick={handleEndCall}
                        size="sm"
                        className="h-10 w-10 rounded-full shadow-lg bg-red-600 hover:bg-red-700"
                      >
                        <PhoneOff className="h-5 w-5 text-white" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ttsEnabled ? "Voice on" : "Voice off"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Show Avatar Button for video bots when hidden */}
        {botData?.is_video_bot && !showVideoAvatar && (
          <div className="p-2 border-b">
            <Button
              onClick={handleBringBackAvatar}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Video className="h-4 w-4 mr-2" />
              Show Video Avatar
            </Button>
          </div>
        )}

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
              {customization?.headerTitle || botData?.name || "Chat Assistant"}
            </h3>
            <p className="text-xs opacity-70 transition-all duration-200">
              {customization?.headerSubtitle || "Online"}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {botData?.is_voice_enabled && (
              <Badge variant="secondary" className="text-xs">
                <Volume2 className="h-3 w-3 mr-1" />
                Voice
              </Badge>
            )}
            {botData?.is_video_bot && (
              <Badge variant="secondary" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                Video
              </Badge>
            )}
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
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-4 min-h-full">
          {messages.length === 0 && !isPreview && (
            <div className="text-center text-gray-400 py-8">
              <p className="text-sm">Start a conversation!</p>
            </div>
          )}
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div
        className={`flex-shrink-0 p-4 border-t transition-all duration-200 ${
          customization?.useChatCustomCSS ? 'embed-chat-header' : ''
        }`}
        style={getHeaderStyle()}
      >
        {/* TTS Permission Prompt */}
        {showTtsPrompt && botData?.is_video_bot && (
          <Alert className="mb-2 bg-amber-50 border-amber-200">
            <Volume2 className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-amber-800 text-sm">Enable voice responses?</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={enableTTS} className="bg-amber-600 hover:bg-amber-700 h-7 text-xs">
                  Enable
                </Button>
                <Button size="sm" variant="outline" onClick={disableTTS} className="h-7 text-xs">
                  No thanks
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* REMOVED: Voice Waveform - replaced with simple status message */}
        {/* Voice Waveform (only in Q&A mode for non-video bots, always for video bots) */}
        {/* {(flowFinished && isListening && !botData?.is_video_bot) && (
          <VoiceWaveform
            audioLevels={audioLevels}
            isListening={isListening}
            showSilenceWarning={showSilenceWarning}
            silenceCountdown={silenceCountdown}
            className="mb-3"
          />
        )} */}

        {flowFinished && isListening && !botData?.is_video_bot && (
          <Alert className="mb-2 bg-blue-50 border-blue-200">
            <Mic className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">Listening... Speak now</AlertDescription>
          </Alert>
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
                      : (customization?.placeholder || "Type your message...")
              }
              disabled={isLoading || !canSendText || isProcessing}
              className={`flex-1 transition-all duration-200 ${
                botData?.is_voice_enabled && canSendText && flowFinished && !botData?.is_video_bot ? 'pr-10' : ''
              } ${customization?.useChatCustomCSS ? 'embed-input' : ''}`}
              style={getInputStyle()}
            />
            {botData?.is_voice_enabled && canSendText && flowFinished && !botData?.is_video_bot && (
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
                      : "text-muted-foreground hover:text-primary"
                }`}
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
            className={`shrink-0 transition-all duration-200 ${
              customization?.useChatCustomCSS ? 'embed-send-button' : ''
            }`}
            style={getSendButtonStyle()}
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

      {/* Hidden audio element for playing TTS */}
      {/* COMMENTED OUT - No longer needed with browser TTS */}
      {/* <audio ref={audioRef} className="hidden" /> */}
    </div>
  );
}
