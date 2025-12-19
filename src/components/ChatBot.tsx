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
import { Send, Bot, User, X, Mic, MicOff, Loader2, Image as ImageIcon, Upload, RefreshCw } from "lucide-react";
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
  imageUrl?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image generation state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

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

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Helper to add bot message
  const addBotMessage = (content: string, audioUrl?: string, imageUrl?: string) => {
    const botMessage: Message = {
      id: Date.now().toString() + Math.random(),
      content,
      sender: "bot",
      timestamp: new Date(),
      audioUrl,
      imageUrl,
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

  // Handle image file selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate image using Gemini API
  const handleGenerateImage = async () => {
    if (!selectedImage || !imagePrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an image and provide a prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);

    try {
      // Add user message showing the prompt
      const userMessage: Message = {
        id: Date.now().toString(),
        content: `Generate image: ${imagePrompt}`,
        sender: "user",
        timestamp: new Date(),
        imageUrl: imagePreview!,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Create form data
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('prompt', imagePrompt);

      // Call the API
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/human/generate-image`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate image');
      }

      // Extract the base64 image data from the response
      const imageData = data.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = data.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/png';

      if (!imageData) {
        throw new Error('No image data in response');
      }

      // Convert base64 to data URL for display
      const generatedImage = `data:${mimeType};base64,${imageData}`;
      
      // Set the generated image for display
      setGeneratedImageUrl(generatedImage);

      // Add bot response with the generated image
      addBotMessage(
        "I've generated your image based on the prompt!",
        undefined,
        generatedImage
      );

      toast({
        title: "Success",
        description: "Image generated successfully!",
      });

    } catch (error: any) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image",
        variant: "destructive"
      });
      addBotMessage("Sorry, I couldn't generate the image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Clear selected image
  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImagePrompt("");
    setGeneratedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start flow (for non-video bots)
  useEffect(() => {
    if (bot.isVideoBot) return;

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
  const canSendText =
    flowFinished ||
    bot.isVideoBot ||
    (isAwaitingInput &&
      currentPausedFor?.type !== "branch" &&
      !currentPausedFor?.showConfirmationButtons);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarFallback className="bg-white text-blue-600">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg text-white">{bot.name}</DialogTitle>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {bot.primaryPurpose}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {bot.conversationalTone}
                  </Badge>
                  {bot.isVideoBot && (
                    <Badge variant="secondary" className="text-xs">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Image Generation
                    </Badge>
                  )}
                  {flowFinished && (
                    <Badge variant="secondary" className="text-xs">
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
        </DialogHeader>

      {/* Image Generation Bot View */}
      {bot.isVideoBot ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Generated Image Display Area */}
          <div className="flex-1 relative bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
            {generatedImageUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={generatedImageUrl}
                  alt="Generated"
                  className="w-full h-full object-contain"
                />
                {/* Floating Controls on Image */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    onClick={handleVoiceInput}
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all hover:scale-110"
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : isListening ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all hover:scale-110"
                    title="Upload new image"
                  >
                    <Upload className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={handleClearImage}
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all hover:scale-110"
                    title="Clear and start new"
                  >
                    <RefreshCw className="h-6 w-6" />
                  </Button>
                </div>

                {/* Generation Badge */}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-green-500 text-white">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Image Generated
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <ImageIcon className="h-20 w-20 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI Image Generation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Upload an image and provide a prompt to generate amazing visuals
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image to Start
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Image Upload Preview & Generation Panel */}
          {imagePreview && !generatedImageUrl && (
            <div className="p-4 bg-white dark:bg-gray-800 border-t">
              <div className="flex gap-4">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg border-2 border-purple-300"
                  />
                  <Button
                    onClick={handleClearImage}
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="relative">
                    <Input
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe what you want to generate... (e.g., 'Make it look like a watercolor painting')"
                      className="pr-10 border-2 border-purple-300 focus:border-purple-500 bg-white dark:bg-gray-800"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && imagePrompt.trim()) {
                          handleGenerateImage();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateImage}
                    disabled={!imagePrompt.trim() || isGeneratingImage}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating with Gemini AI...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages Overlay */}
          <ScrollArea className="h-40 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Messages will appear here
              </div>
            )}
            {messages.slice(-4).map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 mb-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-2 text-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {msg.imageUrl && msg.sender === "user" && (
                    <img
                      src={msg.imageUrl}
                      alt="User uploaded"
                      className="max-w-full h-auto rounded mb-1 max-h-32 object-cover"
                    />
                  )}
                  {msg.imageUrl && msg.sender === "bot" && (
                    <img
                      src={msg.imageUrl}
                      alt="Generated"
                      className="max-w-full h-auto rounded mb-1 max-h-48 object-cover"
                    />
                  )}
                  <div>
                    {typeof msg.content === "string"
                      ? msg.content
                      : JSON.stringify(msg.content)}
                  </div>
                </div>
                {msg.sender === "user" && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-gray-300 text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      ) : (
        /* Regular Chat View */
        <ScrollArea className="flex-1 p-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 mb-4 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
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
                    className={`rounded-lg p-3 ${
                      msg.sender === "user"
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
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
        {/* Voice Waveform */}
        {!bot.isVideoBot && (
          <VoiceWaveform
            isListening={isListening}
            audioLevels={audioLevels}
            showSilenceWarning={showSilenceWarning}
            silenceCountdown={silenceCountdown}
          />
        )}

        {/* Processing indicator */}
        {isProcessing && !bot.isVideoBot && (
          <Alert className="mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Processing your speech...</AlertDescription>
          </Alert>
        )}

        {!bot.isVideoBot && (
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
                    : flowFinished || bot.isVideoBot
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
        )}

        {!bot.isVideoBot && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Supported languages:{" "}
            {bot.languages.map((lang, i) => (
              <span key={lang}>
                {lang}{i < bot.languages.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hidden audio element for playing TTS */}
      <audio ref={audioRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};