import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Gauge,
  Zap,
  Search,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface TraceStep {
  icon: React.ReactNode;
  label: string;
  description: string;
  duration?: number;
  details?: Record<string, unknown>;
  status?: 'success' | 'pending' | 'fallback';
}

interface TraceTimelineViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trace?: {
    embeddingGeneration?: {
      durationMs?: number;
      provider?: string;
      model?: string;
    };
    retrieval?: {
      durationMs?: number;
      totalQAsSearched?: number;
      matchedQuestion?: string;
      matchedAnswer?: string;
      retrievalScore?: number;
      retrievalThreshold?: number;
    };
    fallback?: {
      used?: boolean;
      source?: string;
      sourceDescription?: string;
    };
    promptGeneration?: {
      durationMs?: number;
      finalPromptLength?: number;
      finalPrompt?: string;
    };
    answerGeneration?: {
      durationMs?: number;
      llmProvider?: string;
      llmModel?: string;
    };
    totalDurationMs?: number;
  };
  phoenix?: {
    enabled?: boolean;
    projectName?: string | null;
    baseUrl?: string | null;
    traceId?: string | null;
    spanId?: string | null;
    spanName?: string | null;
    traceUrl?: string | null;
    traceUrlSource?: string | null;
    mcpServer?: string | null;
  };
  question?: string;
  answer?: string;
  confidence?: number;
  source?: string;
}

const TraceTimelineViewer: React.FC<TraceTimelineViewerProps> = ({
  isOpen,
  onOpenChange,
  trace,
  phoenix,
  question = '',
  answer = '',
  confidence,
  source = 'unknown',
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const formatDuration = (duration?: number | null) => {
    if (duration === null || duration === undefined) return 'N/A';
    if (duration >= 1000) return `${(duration / 1000).toFixed(2)}s`;
    return `${duration}ms`;
  };

  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(0)}%`;
  };

  const retrievalScore = trace?.retrieval?.retrievalScore ?? null;
  const retrievalThreshold = trace?.retrieval?.retrievalThreshold ?? 0.85;
  const matchedInKnowledgeBase =
    retrievalScore !== null &&
    retrievalScore > retrievalThreshold &&
    Boolean(trace?.retrieval?.matchedQuestion);
  const phoenixTraceAvailable = Boolean(phoenix?.enabled && phoenix?.traceId);

  // Build trace steps
  const buildTraceSteps = (): (TraceStep & { id: string })[] => {
    const steps: (TraceStep & { id: string })[] = [];

    // 1. User Question
    steps.push({
      id: 'question',
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'User Question',
      description: question || 'No question provided',
      status: 'success',
    });

    // 2. Embedding Generation
    steps.push({
      id: 'embedding',
      icon: <Zap className="w-5 h-5" />,
      label: 'Embedding Generation',
      description: `Converting question to vector using ${trace?.embeddingGeneration?.provider || 'default'} model`,
      duration: trace?.embeddingGeneration?.durationMs,
      details: {
        Provider: trace?.embeddingGeneration?.provider || 'default',
        Model: trace?.embeddingGeneration?.model || 'embedding-001',
      },
      status: 'success',
    });

    // 3. Retrieval/Search
    const retrievalThreshold = trace?.retrieval?.retrievalThreshold || 0.85;
    const retrievalScore = trace?.retrieval?.retrievalScore || 0;
    const retrievalStatus =
      retrievalScore > retrievalThreshold && trace?.retrieval?.matchedQuestion
        ? 'success'
        : 'fallback';

    steps.push({
      id: 'retrieval',
      icon: <Search className="w-5 h-5" />,
      label: 'Vector Search & Retrieval',
      description:
        retrievalStatus === 'success'
          ? `Found match with ${(retrievalScore * 100).toFixed(1)}% confidence`
          : `No match above ${(retrievalThreshold * 100).toFixed(0)}% threshold (${(retrievalScore * 100).toFixed(1)}% best match)`,
      duration: trace?.retrieval?.durationMs,
      details: {
        'Retrieval Score': `${(retrievalScore * 100).toFixed(1)}%`,
        'Threshold': `${(retrievalThreshold * 100).toFixed(0)}%`,
        'Matched Q&A': trace?.retrieval?.matchedQuestion
          ? `"${trace.retrieval.matchedQuestion.substring(0, 60)}..."`
          : 'None found',
      },
      status: retrievalStatus,
    });

    // 4. Data Source
    const sourceIcon = <Database className="w-5 h-5" />;
    const sourceLabel = 'Data Source';
    let sourceDescription = 'Unknown source';

    if (trace?.fallback?.source) {
      if (trace.fallback.source === 'spreadsheet') {
        sourceDescription = 'Dataset/Spreadsheet Analysis';
      } else if (trace.fallback.source === 'dataset') {
        sourceDescription = 'Configured Dataset';
      } else if (trace.fallback.source === 'llm') {
        sourceDescription = 'LLM Generated Response';
      } else if (trace.fallback.source === 'qa') {
        sourceDescription = 'Knowledge Base (Q&A Match)';
      } else {
        sourceDescription = trace.fallback.sourceDescription || 'Fallback source';
      }
    } else if (trace?.retrieval?.matchedQuestion) {
      sourceDescription = 'Knowledge Base (Q&A Match)';
    }

    steps.push({
      id: 'source',
      icon: sourceIcon,
      label: sourceLabel,
      description: sourceDescription,
      details: {
        Source: source,
        'Source Type': trace?.fallback?.source || 'qa',
      },
      status: 'success',
    });

    // 5. Prompt Generation
    steps.push({
      id: 'prompt',
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'Final Prompt Preparation',
      description: 'Building context-aware prompt with bot persona and history',
      duration: trace?.promptGeneration?.durationMs,
      details: {
        'Prompt Length': trace?.promptGeneration?.finalPromptLength
          ? `${trace.promptGeneration.finalPromptLength} chars`
          : 'Not measured',
      },
      status: 'success',
    });

    // 6. Answer Generation
    steps.push({
      id: 'answer',
      icon: <CheckCircle2 className="w-5 h-5" />,
      label: 'Answer Generation (LLM)',
      description: `Generated using ${trace?.answerGeneration?.llmProvider || 'default'} model`,
      duration: trace?.answerGeneration?.durationMs,
      details: {
        Provider: trace?.answerGeneration?.llmProvider || 'default',
        Model: trace?.answerGeneration?.llmModel || 'gemini-3.1-pro-preview',
        'Answer Length': answer ? `${answer.length} chars` : '0 chars',
      },
      status: 'success',
    });

    return steps;
  };

  const steps = buildTraceSteps();
  const totalDuration = trace?.totalDurationMs || 0;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'fallback':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600">Success</Badge>;
      case 'fallback':
        return <Badge className="bg-yellow-600">Fallback</Badge>;
      case 'pending':
        return <Badge className="bg-blue-600">Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Phoenix Trace Timeline
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="w-full">
          <div className="space-y-6 pr-4">
            {/* Overall Stats */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Request Overview</CardTitle>
                    <CardDescription>
                      Local execution steps linked with Phoenix observability metadata.
                    </CardDescription>
                  </div>
                  {phoenix?.traceUrl && (
                    <a
                      href={phoenix.traceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Phoenix
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Total Latency</p>
                    <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold">
                      {formatPercent(confidence)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-lg font-semibold capitalize">{source}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Phoenix Export</p>
                      </div>
                      <Badge className={phoenixTraceAvailable ? 'bg-green-600' : 'bg-gray-600'}>
                        {phoenixTraceAvailable ? 'Linked' : 'Not linked'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <div className="flex justify-between gap-3">
                        <span>Project</span>
                        <span className="truncate font-medium text-foreground">
                          {phoenix?.projectName || 'Not configured'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Trace ID</span>
                        <span className="max-w-[220px] truncate font-mono text-foreground">
                          {phoenix?.traceId || 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>MCP Server</span>
                        <span className="font-medium text-foreground">
                          {phoenix?.mcpServer || 'phoenix'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Retrieval Quality</p>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <div className="flex justify-between gap-3">
                        <span>Best Match</span>
                        <span className="font-medium text-foreground">
                          {formatPercent(retrievalScore)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Threshold</span>
                        <span className="font-medium text-foreground">
                          {formatPercent(retrievalThreshold)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Decision</span>
                        <span className="font-medium text-foreground">
                          {matchedInKnowledgeBase ? 'Knowledge match' : 'Fallback path'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Execution Timeline</CardTitle>
                <CardDescription>Step-by-step trace of the request</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id}>
                      {/* Step Card */}
                      <button
                        onClick={() =>
                          setExpandedStep(
                            expandedStep === step.id ? null : step.id
                          )
                        }
                        className={`w-full text-left rounded-lg border p-4 transition-all ${getStatusColor(step.status)} hover:shadow-sm`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1 text-muted-foreground">
                              {step.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{step.label}</h4>
                              <p className="text-sm text-muted-foreground">
                                {step.description}
                              </p>
                              {step.duration !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Duration: {formatDuration(step.duration)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(step.status)}
                          </div>
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {expandedStep === step.id && step.details && (
                        <div className="mt-2 ml-8 p-4 bg-muted rounded-lg text-sm space-y-2 border-l-2 border-primary">
                          {Object.entries(step.details).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between gap-4"
                            >
                              <span className="text-muted-foreground font-medium">
                                {key}:
                              </span>
                              <span className="text-foreground">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Connector */}
                      {index < steps.length - 1 && (
                        <div className="flex justify-center my-2">
                          <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Final Answer */}
            {answer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Final Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{answer}</p>
                </CardContent>
              </Card>
            )}

            {trace?.promptGeneration?.finalPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Final Prompt</CardTitle>
                  <CardDescription>
                    Prompt sent to the answer generation step
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-relaxed">
                    {trace.promptGeneration.finalPrompt}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Performance Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>
                    • <strong>Embedding Generation:</strong> Takes{' '}
                    {trace?.embeddingGeneration?.durationMs}ms using{' '}
                    {trace?.embeddingGeneration?.provider || 'default'} provider
                  </li>
                  <li>
                    • <strong>Vector Search:</strong> Completed in{' '}
                    {trace?.retrieval?.durationMs}ms with
                    <strong className="ml-1">
                      {trace?.retrieval?.retrievalScore &&
                      trace.retrieval.retrievalScore >
                        (trace.retrieval.retrievalThreshold || 0.85)
                        ? '✓ successful match'
                        : '✗ fallback required'}
                    </strong>
                  </li>
                  <li>
                    • <strong>LLM Response:</strong> Generated in{' '}
                    {trace?.answerGeneration?.durationMs}ms using{' '}
                    {trace?.answerGeneration?.llmProvider || 'default'}
                  </li>
                  <li>
                    • <strong>Total Request Time:</strong> {totalDuration}ms end-to-end
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TraceTimelineViewer;
