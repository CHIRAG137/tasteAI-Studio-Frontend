import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  User,
  Globe,
  Video,
  Mic,
  Languages,
  Brain,
  MessageSquare,
  Users,
  GitBranch,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  SkipForward,
  Check,
  Bot,
  Shield,
  Zap,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BasicInfoSection } from "./BasicInfoSection";
import { TrainingFilesSection } from "./TrainingFilesSection";
import { WebsiteSection } from "./WebsiteSection";
import { VideoBotSection } from "./VideoBotSection";
import { VoiceSection } from "./VoiceSection";
import { LanguageSection } from "./LanguageSection";
import { PersonaSection } from "./PersonaSection";
import { SlackSection } from "./SlackSection";
import { HumanHandoffSection } from "./HumanHandoffSection";
import { ConversationFlowSection } from "./ConversationFlowSection";
import { VisitorIdentitySection } from "./VisitorIdentitySection";
import { CustomLLMSection } from "./CustomLLMSection";
import { useToast } from "@/hooks/use-toast";

interface Step {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  required?: boolean;
}

interface BotCreationWizardProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isCreatingBot: boolean;
  notifyOnComplete?: boolean;
  setNotifyOnComplete?: (val: boolean) => void;
  isEditMode?: boolean;
  botId?: string;
}

const ALL_STEPS: Step[] = [
  {
    id: "basic",
    title: "Basic Information",
    subtitle: "Let's start with the essentials",
    description:
      "Give your bot a name and description to get started.",
    icon: <User className="w-5 h-5" />,
    required: true,
  },
  {
    id: "training",
    title: "Training Files",
    subtitle: "Upload your training data",
    description:
      "Upload reference files (PDF, TXT, DOC, DOCX, XLS, XLSX, CSV) to train your bot with your knowledge base.",
    icon: <Bot className="w-5 h-5" />,
  },
  {
    id: "website",
    title: "Website & Content",
    subtitle: "Train from your website",
    description:
      "Provide your website URL and scrape pages to automatically train your bot with your existing content.",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: "video",
    title: "Video Bot",
    subtitle: "Create an avatar experience",
    description:
      "Enable a video avatar for your bot. Upload or generate an image, select a voice, and create a lifelike conversational agent.",
    icon: <Video className="w-5 h-5" />,
  },
  {
    id: "voice",
    title: "Voice Configuration",
    subtitle: "Enable voice interaction",
    description:
      "Allow your bot to speak and listen. Enable voice capabilities for a natural conversation experience.",
    icon: <Mic className="w-5 h-5" />,
  },
  {
    id: "language",
    title: "Language Support",
    subtitle: "Configure supported languages",
    description:
      "Choose which languages your bot can understand and respond in for a multilingual experience.",
    icon: <Languages className="w-5 h-5" />,
  },
  {
    id: "persona",
    title: "Persona & Behavior",
    subtitle: "Define personality & tone",
    description:
      "Configure your bot's personality, conversational tone, response style, and behavioral characteristics.",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    id: "visitor-identity",
    title: "Visitor identity",
    subtitle: "Auth0 for end users",
    description:
      "Optionally require visitors to verify who they are with Auth0 before they can use your bot.",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: "custom-llm",
    title: "Custom LLM",
    subtitle: "Use your own AI model",
    description:
      "Optionally add your own OpenAI or Google Gemini API key to use your preferred LLM provider.",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "slack",
    title: "Slack Integration",
    subtitle: "Deploy bot in Slack channels",
    description:
      "Connect your bot to Slack and deploy it in specific channels for team communication.",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    id: "handoff",
    title: "Human Handoff",
    subtitle: "Escalate to live agents",
    description:
      "Enable users to request a conversation with a human agent when the bot can't fully help.",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: "flow",
    title: "Conversation Flow",
    subtitle: "Design the conversation",
    description:
      "Build a visual conversation flow with messages, questions, branching logic, and more using the drag-and-drop builder.",
    icon: <GitBranch className="w-5 h-5" />,
  },
];

export const BotCreationWizard = ({
  botConfig,
  updateConfig,
  onSubmit,
  isCreatingBot,
  isEditMode = false,
  botId,
}: BotCreationWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  // Filter out voice step if video bot is enabled
  const steps = ALL_STEPS.filter((step) => {
    if (step.id === "voice" && botConfig.isVideoBot) return false;
    return true;
  });

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    // Validate required steps
    if (step.id === "basic") {
      if (!botConfig.name.trim()) {
        toast({
          title: "Required Field",
          description: "Please enter a bot name before continuing.",
          variant: "destructive",
        });
        return;
      }
      if (!botConfig.description.trim()) {
        toast({
          title: "Required Field",
          description: "Please enter a bot description before continuing.",
          variant: "destructive",
        });
        return;
      }
    }
    if (!isLastStep) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (!isFirstStep) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    if (!isLastStep) setCurrentStep((s) => s + 1);
  };

  const goToStep = (index: number) => {
    // Allow going back to any previous step, or to any step if basic info is filled
    if (index < currentStep || (botConfig.name.trim() && botConfig.description.trim())) {
      setCurrentStep(index);
    }
  };

  const renderStepContent = () => {
    switch (step.id) {
      case "basic":
        return <BasicInfoSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "training":
        return <TrainingFilesSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "website":
        return <WebsiteSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "video":
        return <VideoBotSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "voice":
        return <VoiceSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "language":
        return <LanguageSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "persona":
        return <PersonaSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "visitor-identity":
        return <VisitorIdentitySection />;
      case "custom-llm":
        return (
          <CustomLLMSection
            customLLMProvider={botConfig.customLLMProvider}
            customModel={botConfig.customModel}
            onProviderChange={(provider) => updateConfig("customLLMProvider", provider)}
            onApiKeyChange={(key) => updateConfig("customApiKey", key)}
            onModelChange={(model) => updateConfig("customModel", model)}
          />
        );
      case "slack":
        return <SlackSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "handoff":
        return <HumanHandoffSection botConfig={botConfig} updateConfig={updateConfig} />;
      case "flow":
        return (
          <ConversationFlowSection
            botId={botId}
            onFlowSave={(nodes, edges) => {
              updateConfig("conversationFlow", { nodes, edges });
              toast({
                title: "Flow Saved",
                description: "Conversation flow has been saved to your bot configuration.",
              });
            }}
            onFlowChange={(nodes, edges) => {
              updateConfig("conversationFlow", { nodes, edges });
            }}
            initialNodes={botConfig.conversationFlow?.nodes}
            initialEdges={botConfig.conversationFlow?.edges}
          />
        );
      default:
        return null;
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 20);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [currentStep, checkScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll]);

  return (
    <form onSubmit={onSubmit} className="h-full">
      <div className="flex gap-0 h-full overflow-hidden bg-card">
        {/* Left Sidebar - Step Navigation & Info */}
        <div className="w-[320px] flex-shrink-0 bg-gradient-to-b from-muted/80 to-muted/30 border-r border-border flex flex-col">
          {/* Step List */}
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            {steps.map((s, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-medium"
                      : isCompleted
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground group-hover:bg-muted-foreground/20"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isActive && "text-primary-foreground"
                      )}
                    >
                      {s.title}
                    </p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {s.subtitle}
                    </p>
                  </div>
                  {s.required && (
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-bold uppercase tracking-wider flex-shrink-0",
                        isActive
                          ? "text-primary-foreground/60"
                          : "text-destructive/60"
                      )}
                    >
                      Required
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Step Description Panel */}
          <div className="p-5 border-t border-border bg-card/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-8 py-5 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{step.title}</h2>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`About ${step.title}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
                        {step.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{currentStep + 1}</span>
                <span>/</span>
                <span>{steps.length}</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="h-full overflow-y-auto p-8"
            >
              {renderStepContent()}
            </div>
            {/* Scroll down indicator */}
            {canScrollDown && (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <div className="h-16 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => scrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors animate-bounce bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm"
                  >
                    <ChevronDown className="w-3 h-3" />
                    Scroll for more
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-8 py-4 border-t border-border bg-card flex items-center justify-between">
            <div>
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isLastStep && !step.required && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  className="gap-1 text-muted-foreground"
                >
                  Skip
                  <SkipForward className="w-4 h-4" />
                </Button>
              )}

              {isLastStep ? (
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    className="bg-gradient-primary hover:opacity-90 shadow-medium px-6 gap-2"
                    disabled={isCreatingBot}
                  >
                    <Bot className="w-4 h-4" />
                    {isCreatingBot 
                      ? (isEditMode ? "Updating..." : "Creating...") 
                      : (isEditMode ? "Update Bot" : "Create Bot")
                    }
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-primary hover:opacity-90 shadow-medium px-6 gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
