import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, MessageSquare, Clock, User, Search, X, Filter } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Session {
  id: string;
  userId: string;
  timestamp: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  duration?: string;
}

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
}

// Mock data - replace with actual API call
const mockSessions: Session[] = [
  {
    id: "session-1",
    userId: "user-123",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: "5m 23s",
    messages: [
      {
        role: "user",
        content: "Hello, I need help with my order",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        role: "assistant",
        content: "Hi! I'd be happy to help you with your order. Could you please provide your order number?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1000).toISOString(),
      },
      {
        role: "user",
        content: "It's ORDER-12345",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
      },
      {
        role: "assistant",
        content: "Thank you! I found your order. It's currently being processed and should ship within 2 business days.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 32000).toISOString(),
      },
    ],
  },
  {
    id: "session-2",
    userId: "user-456",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: "3m 45s",
    messages: [
      {
        role: "user",
        content: "What are your business hours?",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        role: "assistant",
        content: "We're open Monday through Friday, 9 AM to 6 PM EST. How can I assist you today?",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1000).toISOString(),
      },
    ],
  },
];

export const SessionsModal = ({ isOpen, onClose, botId, botName }: SessionsModalProps) => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [minMessages, setMinMessages] = useState<number | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const filteredSessions = mockSessions.filter((session) => {
    // Search filter
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      const matchesUserId = session.userId.toLowerCase().includes(searchLower);
      const matchesMessages = session.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchLower)
      );
      if (!matchesUserId && !matchesMessages) return false;
    }

    // Date range filter
    const sessionDate = new Date(session.timestamp);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (sessionDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (sessionDate > end) return false;
    }

    // Message count filter
    if (minMessages && session.messages.length < minMessages) {
      return false;
    }

    return true;
  });

  const clearAllFilters = () => {
    setSearchFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
    setMinMessages(undefined);
  };

  const hasActiveFilters = searchFilter || startDate || endDate || minMessages;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Sessions for {botName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[600px]">
          {/* Sessions List */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 pb-2 space-y-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or message..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Filter className="w-4 h-4 mr-2" />
                      Advanced Filters
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {[searchFilter, startDate, endDate, minMessages].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={clearAllFilters}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {startDate ? format(startDate, "MMM dd") : "Start"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {endDate ? format(endDate, "MMM dd") : "End"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Min Messages</label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={minMessages ?? ""}
                      onChange={(e) => setMinMessages(e.target.value ? parseInt(e.target.value) : undefined)}
                      min="1"
                      className="h-8"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {filteredSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSession?.id === session.id ? 'border-primary shadow-md' : ''
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{session.userId}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {session.messages.length} msgs
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-1">
                      {session.duration && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {session.duration}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {session.messages[0]?.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {filteredSessions.length === 0 && mockSessions.length > 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions match your search</p>
                  </div>
                )}

                {mockSessions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Session Replay */}
          <div className="flex-1">
            {selectedSession ? (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="font-semibold text-lg">Session Replay</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedSession.timestamp)} at {formatTime(selectedSession.timestamp)}
                      </p>
                    </div>
                    {selectedSession.duration && (
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedSession.duration}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedSession.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`flex flex-col gap-1 ${
                            message.role === 'user' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`rounded-lg px-4 py-2 max-w-[80%] ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a session to view the replay</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
