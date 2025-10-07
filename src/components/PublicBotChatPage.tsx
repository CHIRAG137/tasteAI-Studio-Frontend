import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  showConfirmationButtons?: boolean;
  showBranchOptions?: boolean;
  branchOptions?: string[];
  selectedBranch?: string;
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

  const { isListening, toggleListening } = useSpeechToText({
    onResult: (text) => setInputMessage(prev => prev + (prev ? " " : "") + text),
    onError: (err) => toast({ title: "Speech Error", description: err, variant: "destructive" }),
    language: "en-US",
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
              content: "", // No text content for branch nodes
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

        // Check if flow finished immediately
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
        toast({
          title: "Error",
          description: "Failed to start conversation",
          variant: "destructive"
        });
      }
    };

    initFlow();
  }, [bot]);

  // Handle Q&A mode after flow ends
  const handleAskQuestion = async () => {
    const question = inputMessage.trim();

    if (!question || isLoading) return;

    // Create user message for display
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

      // Add bot response
      const botMessage: Message = {
        id: Date.now().toString() + Math.random(),
        content: data.result.answer || "I couldn't find an answer to that question.",
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
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
    // If flow is finished, use Q&A mode instead
    if (flowFinished) {
      handleAskQuestion();
      return;
    }

    const messageToSend = overrideInput || inputMessage.trim();

    if (!messageToSend || isLoading || !sessionId) return;

    // Clear current paused state immediately to hide buttons
    setCurrentPausedFor(null);

    // Create user message for display
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
            content: "", // No text content for branch nodes
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
          content: "Thank you! The conversation flow has ended. Feel free to ask me any questions!",
          sender: "bot",
          timestamp: new Date(),
        });
      }

      // Append new bot messages to existing messages
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

  const handleVoiceInput = () => bot?.is_voice_enabled && toggleListening();

  const isAwaitingInput = currentPausedFor !== null;
  const canSendText = flowFinished || (isAwaitingInput &&
    currentPausedFor?.type !== "branch" &&
    !currentPausedFor?.showConfirmationButtons);

  if (loading) return <p className="text-center mt-10">Loading bot...</p>;
  if (!bot) return <p className="text-center mt-10 text-red-500">Bot not found</p>;

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col shadow-lg">
        <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
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
                  {bot.primary_purpose}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white hover:bg-white/30">
                  {bot.conversation_tone}
                </Badge>
                {flowFinished && (
                  <Badge variant="secondary" className="text-xs bg-green-500/80 text-white">
                    Q&A Mode
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4 overflow-y-auto max-h-[calc(600px-180px)]">
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

          <div className="border-t p-4 bg-background">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={flowFinished ? "Ask me anything..." : (canSendText ? "Type your message..." : "Select an option above...")}
                  disabled={isLoading || !canSendText}
                  className="pr-12"
                />
                {bot.is_voice_enabled && canSendText && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceInput}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${isListening ? "text-red-500 animate-pulse" : "text-gray-500 hover:text-blue-600"}`}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading || !canSendText}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>Supported languages:</span>
              <span>{bot.supported_languages}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
