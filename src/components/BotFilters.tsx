import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, Filter, X, ChevronDown, Mic, Video, Users, SlidersHorizontal } from "lucide-react";

interface BotFiltersProps {
  onFiltersChange: (filters: BotFilterState) => void;
  totalBots: number;
  filteredCount: number;
}

export interface BotFilterState {
  searchQuery: string;
  primaryPurpose: string;
  conversationalTone: string;
  voiceEnabled: string;
  isVideoBot: string;
  humanHandoffEnabled: string;
}

const initialFilters: BotFilterState = {
  searchQuery: "",
  primaryPurpose: "all",
  conversationalTone: "all",
  voiceEnabled: "all",
  isVideoBot: "all",
  humanHandoffEnabled: "all",
};

const purposeOptions = [
  { value: "all", label: "All Purposes" },
  { value: "customer-support", label: "Customer Support" },
  { value: "sales", label: "Sales" },
  { value: "lead-generation", label: "Lead Generation" },
  { value: "information", label: "Information" },
  { value: "booking", label: "Booking" },
  { value: "other", label: "Other" },
];

const toneOptions = [
  { value: "all", label: "All Tones" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
];

export const BotFilters = ({ onFiltersChange, totalBots, filteredCount }: BotFiltersProps) => {
  const [filters, setFilters] = useState<BotFilterState>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof BotFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    onFiltersChange(initialFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== "searchQuery" && value !== "all"
  ).length;

  const hasActiveFilters = activeFilterCount > 0 || filters.searchQuery !== "";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      {/* Search + Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search bots by name..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            className="pl-10 pr-10 h-11 rounded-xl bg-card border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => updateFilter("searchQuery", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              type="button"
              className="h-11 gap-2 rounded-xl border-border/60 bg-card hover:bg-muted shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary text-[10px] font-semibold">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              type="button"
              onClick={clearFilters}
              className="h-11 gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
          <div className="p-5 bg-card rounded-2xl border border-border/60 shadow-sm space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Primary Purpose */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Filter className="h-3 w-3" />
                  Purpose
                </label>
                <Select value={filters.primaryPurpose} onValueChange={(v) => updateFilter("primaryPurpose", v)}>
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conversational Tone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Filter className="h-3 w-3" />
                  Tone
                </label>
                <Select value={filters.conversationalTone} onValueChange={(v) => updateFilter("conversationalTone", v)}>
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Enabled */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Mic className="h-3 w-3" />
                  Voice
                </label>
                <Select value={filters.voiceEnabled} onValueChange={(v) => updateFilter("voiceEnabled", v)}>
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder="Voice enabled" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Video Bot */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Video className="h-3 w-3" />
                  Video Bot
                </label>
                <Select value={filters.isVideoBot} onValueChange={(v) => updateFilter("isVideoBot", v)}>
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder="Video bot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Video Bots</SelectItem>
                    <SelectItem value="false">Normal Bots</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Human Handoff */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Human Handoff
                </label>
                <Select value={filters.humanHandoffEnabled} onValueChange={(v) => updateFilter("humanHandoffEnabled", v)}>
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder="Human handoff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</span>
                {filters.searchQuery && (
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border-0">
                    Search: "{filters.searchQuery}"
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => updateFilter("searchQuery", "")}
                    />
                  </Badge>
                )}
                {filters.primaryPurpose !== "all" && (
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border-0">
                    {purposeOptions.find(o => o.value === filters.primaryPurpose)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => updateFilter("primaryPurpose", "all")}
                    />
                  </Badge>
                )}
                {filters.conversationalTone !== "all" && (
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border-0">
                    {toneOptions.find(o => o.value === filters.conversationalTone)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => updateFilter("conversationalTone", "all")}
                    />
                  </Badge>
                )}
                {filters.voiceEnabled !== "all" && (
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border-0">
                    Voice: {filters.voiceEnabled === "true" ? "On" : "Off"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => updateFilter("voiceEnabled", "all")}
                    />
                  </Badge>
                )}
                {filters.isVideoBot !== "all" && (
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border-0">
                    {filters.isVideoBot === "true" ? "Video Bot" : "Normal Bot"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => updateFilter("isVideoBot", "all")}
                    />
                  </Badge>
                )}
                {filters.humanHandoffEnabled !== "all" && (
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border-0">
                    Handoff: {filters.humanHandoffEnabled === "true" ? "On" : "Off"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => updateFilter("humanHandoffEnabled", "all")}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
      </CollapsibleContent>

      {/* Results Count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground px-1">
          Showing <span className="font-semibold text-foreground">{filteredCount}</span> of <span className="font-semibold text-foreground">{totalBots}</span> bots
        </p>
      )}
    </Collapsible>
  );
};
