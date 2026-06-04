import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileStack,
  Gavel,
  LifeBuoy,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
  TestTubes,
  Play,
  AlertCircle,
  Activity,
  Inbox,
  Send,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  applyBotImprovementAction,
  askBotSelfIntrospection,
  buildBotEvalDataset,
  getBotEvalDatasets,
  getBotSelfImprovementDashboard,
  runBotLLMJudge,
  createRegressionTests,
  getRegressionTests,
  runRegressionTests,
  type BotSelfImprovementDashboard,
  type BotEvalDatasetsResponse,
  type EvalDatasetSourceType,
  type ImprovementAction,
  type ImprovementItem,
  type BotRegressionTest,
  type BotSelfIntrospectionResponse,
  type TestRunResults,
} from "@/api/analytics";

const actionLabels: Record<ImprovementAction, string> = {
  add_to_eval_dataset: "Add to eval dataset",
  create_training_qa: "Create training Q&A",
  mark_expected: "Mark expected",
  send_to_human_review: "Send to human review",
};

const actionIcons: Record<ImprovementAction, typeof Database> = {
  add_to_eval_dataset: Database,
  create_training_qa: MessageSquarePlus,
  mark_expected: ShieldCheck,
  send_to_human_review: LifeBuoy,
};

const typeLabels: Record<ImprovementItem["type"], string> = {
  weak_answer: "Weak answer",
  unanswered_question: "Unanswered",
  low_confidence_session: "Low-confidence session",
  hallucination_risk: "Grounding risk",
  repeated_unknown_intent: "Repeated intent",
};

const datasetSources: Array<{
  sourceType: EvalDatasetSourceType;
  title: string;
  description: string;
}> = [
  {
    sourceType: "low_confidence_traces",
    title: "Low-confidence traces",
    description: "Questions where retrieval confidence was weak or missing.",
  },
  {
    sourceType: "handoff_sessions",
    title: "Handoff sessions",
    description: "Conversations that needed human support or escalation.",
  },
  {
    sourceType: "negative_feedback",
    title: "Negative feedback",
    description: "Rated or commented sessions that need regression coverage.",
  },
  {
    sourceType: "unanswered_questions",
    title: "Unanswered questions",
    description: "Fallbacks and source=none production answers.",
  },
];

const defaultIntrospectionQuestions = [
  "Why did my bot fail yesterday?",
  "What questions are users asking that I cannot answer?",
  "Which prompt version performed best?",
  "What should I add to training data?",
];

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
};

const BotSelfImprovement = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [datasetLoading, setDatasetLoading] = useState<string | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [dashboard, setDashboard] = useState<BotSelfImprovementDashboard | null>(null);
  const [evalData, setEvalData] = useState<BotEvalDatasetsResponse | null>(null);
  const [filter, setFilter] = useState<ImprovementItem["type"] | "all">("all");
  const [introspectionQuestion, setIntrospectionQuestion] = useState(defaultIntrospectionQuestions[0]);
  const [introspectionLoading, setIntrospectionLoading] = useState(false);
  const [introspectionResult, setIntrospectionResult] = useState<BotSelfIntrospectionResponse | null>(null);

  // Regression Test State
  const [regressionTests, setRegressionTests] = useState<BotRegressionTest[]>([]);
  const [regressionLoading, setRegressionLoading] = useState(false);
  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestRunResults | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<BotRegressionTest | null>(null);

  const fetchDashboard = async () => {
    if (!botId) return;

    try {
      setLoading(true);
      const response = await getBotSelfImprovementDashboard(botId);
      setDashboard(response.result || null);
    } catch (error) {
      toast({
        title: "Unable to load self-improvement dashboard",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvalData = async () => {
    if (!botId) return;
    const response = await getBotEvalDatasets(botId);
    setEvalData(response.result || null);
  };

  const fetchRegressionTests = async () => {
    if (!botId) return;

    try {
      setRegressionLoading(true);
      const response = await getRegressionTests(botId);
      setRegressionTests(response.result || []);
    } catch (error) {
      toast({
        title: "Unable to load regression tests",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegressionLoading(false);
    }
  };

  const createRegressionTestSuite = async () => {
    if (!botId) return;

    try {
      setRegressionLoading(true);
      await createRegressionTests(botId);
      toast({
        title: "Regression test suite created",
        description: "Tests created from production conversations.",
      });
      await fetchRegressionTests();
    } catch (error) {
      toast({
        title: "Failed to create regression tests",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegressionLoading(false);
    }
  };

  const runTest = async (testSuiteId: string) => {
    if (!botId) return;

    try {
      setTestRunning(testSuiteId);
      const response = await runRegressionTests(botId, testSuiteId);
      setTestResults(response.result);
      setResultsModalOpen(true);

      // Show summary toast
      if (response.result?.summary?.improved > 0 && response.result?.summary?.regressed > 0) {
        toast({
          title: "Tests completed with mixed results",
          description: response.result.summary.message,
          variant: "destructive",
        });
      } else if (response.result?.summary?.improved > 0) {
        toast({
          title: "Great improvements!",
          description: response.result.summary.message,
        });
      } else if (response.result?.summary?.regressed > 0) {
        toast({
          title: "Regressions detected",
          description: response.result.summary.message,
          variant: "destructive",
        });
      }

      await fetchRegressionTests();
    } catch (error) {
      toast({
        title: "Failed to run tests",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTestRunning(null);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchEvalData().catch(() => null);
    fetchRegressionTests().catch(() => null);
  }, [botId]);

  const filteredItems = useMemo(() => {
    const items = dashboard?.items || [];
    return filter === "all" ? items : items.filter((item) => item.type === filter);
  }, [dashboard?.items, filter]);

  const applyAction = async (item: ImprovementItem, action: ImprovementAction) => {
    if (!botId) return;

    try {
      setActionLoading(`${item.key}:${action}`);
      const response = await applyBotImprovementAction(botId, {
        itemKey: item.key,
        action,
        item,
      });

      toast({
        title: actionLabels[action],
        description:
          response?.result?.payload?.suggestedInstruction ||
          "Action saved for this improvement item.",
      });

      await fetchDashboard();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const buildDataset = async (sourceType: EvalDatasetSourceType) => {
    if (!botId) return;

    try {
      setDatasetLoading(sourceType);
      const response = await buildBotEvalDataset(botId, sourceType);
      toast({
        title: "Eval dataset created",
        description: `${response.result?.createdCount || 0} examples added to ${response.result?.datasetName}.`,
      });
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Dataset build failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDatasetLoading(null);
    }
  };

  const runJudge = async (datasetName: string) => {
    if (!botId) return;

    try {
      setJudgeLoading(true);
      const response = await runBotLLMJudge(botId, datasetName);
      toast({
        title: "LLM-as-a-Judge completed",
        description: `Overall score: ${formatPercent(response.result?.overallScore)}`,
      });
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Judge run failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJudgeLoading(false);
    }
  };

  const askIntrospectionTool = async (questionOverride?: string) => {
    if (!botId) return;
    const question = (questionOverride || introspectionQuestion).trim();
    if (!question) {
      toast({
        title: "Ask a question first",
        description: "Enter what you want the bot to inspect in its Phoenix traces.",
      });
      return;
    }

    try {
      setIntrospectionLoading(true);
      setIntrospectionQuestion(question);
      const response = await askBotSelfIntrospection(botId, question);
      setIntrospectionResult(response.result || null);
    } catch (error) {
      toast({
        title: "Self-introspection failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIntrospectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar pageTitle="Self Improvement" />
        <div className="container mx-auto px-6 py-6 space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar pageTitle="Self Improvement" />
        <div className="container mx-auto px-6 py-6">
          <Card>
            <CardContent className="py-10 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">No self-improvement data available</p>
              <Button className="mt-4" onClick={() => navigate("/bots")}>
                Back to bots
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar pageTitle={`Improve - ${dashboard.bot.name}`} />

      <Tabs
        defaultValue="improvements"
        orientation="vertical"
        className="flex-1 min-h-0 flex flex-col md:flex-row"
      >
        <TabsList className="h-auto w-full md:w-72 md:h-full md:flex-col md:items-stretch md:justify-start rounded-none p-3 gap-1 border-b md:border-b-0 md:border-r border-border/60 bg-muted/30 shrink-0">
          <TabsTrigger value="improvements" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <BrainCircuit className="w-4 h-4" />
            Improvements
          </TabsTrigger>
          <TabsTrigger value="introspection" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <Activity className="w-4 h-4" />
            Ask Phoenix
          </TabsTrigger>
          <TabsTrigger value="eval-datasets" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <FileStack className="w-4 h-4" />
            Eval Datasets
          </TabsTrigger>
          <TabsTrigger value="regression-tests" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <TestTubes className="w-4 h-4" />
            Regression Tests
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 md:px-8 lg:px-10 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-[240px_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Bot Health Score</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-5xl font-bold">{dashboard.healthScore.score}</span>
                    <span className="text-lg text-muted-foreground mb-1">/100</span>
                  </div>
                  <Badge className="mt-3 capitalize">
                    {dashboard.healthScore.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Metric label="Open Items" value={dashboard.summary.totalItems} />
                  <Metric label="High Priority" value={dashboard.summary.highPriority} />
                  <Metric label="Weak Answers" value={dashboard.summary.weakAnswers} />
                  <Metric label="Unanswered" value={dashboard.summary.unanswered} />
                  <Metric label="Grounding Risk" value={dashboard.summary.hallucinationRisk} />
                  <Metric label="Repeated Intents" value={dashboard.summary.repeatedIntents} />
                </div>

                <Button variant="outline" onClick={fetchDashboard}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Phoenix Self-Introspection Tab */}
          <TabsContent value="introspection" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    MCP Self-Introspection Bot Tool
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Private admin tool: inspect recent Phoenix traces and identify what the bot is failing at.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {defaultIntrospectionQuestions.map((question) => (
                      <Button
                        key={question}
                        variant="outline"
                        className="h-auto justify-start whitespace-normal text-left"
                        disabled={introspectionLoading}
                        onClick={() => askIntrospectionTool(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      value={introspectionQuestion}
                      onChange={(event) => setIntrospectionQuestion(event.target.value)}
                      placeholder="Ask anything about failures, missing training data, prompt versions, evals, handoffs, or recent Phoenix traces."
                      className="min-h-28"
                    />
                    <Button
                      onClick={() => askIntrospectionTool()}
                      disabled={introspectionLoading}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {introspectionLoading ? "Inspecting traces..." : "Ask introspection tool"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phoenix Evidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Metric
                    label="Linked Traces"
                    value={introspectionResult?.evidence?.phoenix?.linkedTraceCount || 0}
                  />
                  <Metric
                    label="Sampled Interactions"
                    value={introspectionResult?.evidence?.metrics?.sampledInteractions || 0}
                  />
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Fallback Rate</p>
                    <p className="text-2xl font-bold">
                      {formatPercent(introspectionResult?.evidence?.metrics?.fallbackRate)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Phoenix Project</p>
                    <p className="text-sm font-semibold">
                      {introspectionResult?.evidence?.phoenix?.projectName || "Not inspected yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {introspectionResult ? (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Answer</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {introspectionResult.question}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                      {introspectionResult.answer}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Failure Clusters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {introspectionResult.evidence.failureClusters.slice(0, 5).map((cluster) => (
                      <div key={cluster.intentKey} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {cluster.examples?.[0]?.question || cluster.intentKey}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {cluster.count} traces · {cluster.fallbackCount} fallback
                            </p>
                          </div>
                          <Badge variant="outline">
                            {formatPercent(cluster.avgConfidence)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {introspectionResult.evidence.failureClusters.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No repeated failure clusters were found in the sampled traces.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-lg font-semibold">Ask the bot what it is failing at</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The private tool uses recent Phoenix-linked traces, local trace metrics, eval runs, and experiments.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Eval Datasets Tab */}
          <TabsContent value="eval-datasets" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileStack className="w-5 h-5 text-primary" />
                    One-Click Eval Dataset Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {datasetSources.map((source) => (
                    <div
                      key={source.sourceType}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{source.title}</p>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={datasetLoading === source.sourceType}
                        onClick={() => buildDataset(source.sourceType)}
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {datasetLoading === source.sourceType ? "Creating..." : "Create dataset"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-primary" />
                    LLM-as-a-Judge Bot Grader
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(evalData?.datasets || []).map((dataset) => (
                      <div key={dataset.datasetName} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">{dataset.datasetName}</p>
                            <p className="text-xs text-muted-foreground">
                              {dataset.itemCount} examples
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={judgeLoading}
                            onClick={() => runJudge(dataset.datasetName)}
                          >
                            Grade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(evalData?.datasets?.length || 0) > 0 && (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={judgeLoading}
                      onClick={() => runJudge("all")}
                    >
                      <Gavel className="w-4 h-4 mr-2" />
                      {judgeLoading ? "Running judge..." : "Grade all datasets"}
                    </Button>
                  )}

                  {(evalData?.runs || []).slice(0, 1).map((run) => (
                    <div key={run._id} className="rounded-lg bg-muted/50 p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">Latest judge run</p>
                          <p className="text-sm text-muted-foreground">{run.datasetName}</p>
                        </div>
                        <Badge>{formatPercent(run.overallScore)}</Badge>
                      </div>
                      {run.criteria && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(run.criteria).map(([key, value]) => (
                            <Score
                              key={key}
                              label={key.replace(/([A-Z])/g, " $1")}
                              value={value}
                            />
                          ))}
                        </div>
                      )}
                      {run.explanations?.[0] && (
                        <p className="text-sm text-muted-foreground">
                          {run.explanations[0].explanation}
                        </p>
                      )}
                    </div>
                  ))}

                  {(evalData?.datasets?.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Create an eval dataset first, then run the judge to score relevance,
                      helpfulness, groundedness, tone, instruction following, handoff
                      correctness, refusal correctness, and response length fit.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Regression Tests Tab */}
          <TabsContent value="regression-tests" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTubes className="w-5 h-5 text-primary" />
                  Regression Testing
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Turn bad production conversations into permanent test cases. Re-run tests when
                  your bot is updated to catch regressions and improvements.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {regressionTests.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed p-8 text-center">
                    <TestTubes className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-semibold">No regression tests yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create test cases from your production conversations to catch regressions.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={createRegressionTestSuite}
                      disabled={regressionLoading}
                    >
                      {regressionLoading ? "Creating..." : "Create regression tests"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={createRegressionTestSuite}
                      disabled={regressionLoading}
                      className="w-full"
                    >
                      + Create additional test suite
                    </Button>

                    <div className="space-y-4">
                      {regressionTests.map((testSuite) => (
                        <RegressionTestCard
                          key={testSuite._id}
                          testSuite={testSuite}
                          onRun={() => runTest(testSuite._id)}
                          isRunning={testRunning === testSuite._id}
                        />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {testResults && (
              <Dialog open={resultsModalOpen} onOpenChange={setResultsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Regression Test Results</DialogTitle>
                  </DialogHeader>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Total Tests</p>
                      <p className="text-2xl font-bold">{testResults.statistics.totalTests}</p>
                    </div>
                    <div className="rounded-lg border p-3 border-green-500/50 bg-green-50/50">
                      <p className="text-xs text-muted-foreground">Passed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {testResults.statistics.passedTests}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 border-red-500/50 bg-red-50/50">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {testResults.statistics.failedTests}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Pass Rate</p>
                      <p className="text-2xl font-bold">
                        {formatPercent(
                          testResults.statistics.totalTests > 0
                            ? testResults.statistics.passedTests /
                                testResults.statistics.totalTests
                            : 0
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Improvements vs Regressions */}
                  {(testResults.summary.improved > 0 || testResults.summary.regressed > 0) && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="font-semibold flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {testResults.summary.message}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {testResults.summary.improved > 0 && (
                          <div className="flex items-center gap-2 text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>{testResults.summary.improved} improved</span>
                          </div>
                        )}
                        {testResults.summary.regressed > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <TrendingDown className="w-4 h-4" />
                            <span>{testResults.summary.regressed} broken</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test Results Details */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <p className="font-medium text-sm">Test Details</p>
                    {testResults.testRuns.slice(0, 10).map((run, idx) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">Test {idx + 1}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {run.verdict}
                            </p>
                          </div>
                          <Badge
                            variant={
                              run.verdict === "passed"
                                ? "default"
                                : run.verdict === "improved"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {run.verdict}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Relevance</p>
                            <p className="font-semibold">{formatPercent(run.relevanceScore)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Groundedness</p>
                            <p className="font-semibold">
                              {formatPercent(run.groundednessScore)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Improvements Tab */}
          <TabsContent value="improvements" className="mt-0 space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", ...Object.keys(typeLabels)] as Array<typeof filter>).map((itemType) => (
                <Button
                  key={itemType}
                  variant={filter === itemType ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(itemType)}
                >
                  {itemType === "all" ? "All" : typeLabels[itemType]}
                </Button>
              ))}
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <ImprovementCard
                    key={item.key}
                    item={item}
                    onAction={applyAction}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-3" />
                  <p className="text-lg font-semibold">No items in this view</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    New weak answers and unknown intents will appear here as users chat.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

const RegressionTestCard = ({
  testSuite,
  onRun,
  isRunning,
}: {
  testSuite: BotRegressionTest;
  onRun: () => void;
  isRunning: boolean;
}) => {
  const passRate =
    testSuite.statistics.totalTests > 0
      ? testSuite.statistics.passedTests / testSuite.statistics.totalTests
      : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base">{testSuite.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{testSuite.description}</p>
          </div>
          <Badge variant={testSuite.status === "active" ? "default" : "secondary"}>
            {testSuite.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{testSuite.statistics.totalTests}</p>
          </div>
          <div className="rounded-lg border p-2 border-green-500/50">
            <p className="text-xs text-muted-foreground">Passed</p>
            <p className="text-xl font-bold text-green-600">
              {testSuite.statistics.passedTests}
            </p>
          </div>
          <div className="rounded-lg border p-2 border-red-500/50">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-xl font-bold text-red-600">{testSuite.statistics.failedTests}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Pass Rate</p>
            <p className="text-xl font-bold">{formatPercent(passRate)}</p>
          </div>
        </div>

        {/* Improvements/Regressions */}
        {(testSuite.statistics.improvements > 0 || testSuite.statistics.regressions > 0) && (
          <div className="rounded-lg bg-blue-50/50 border border-blue-200 p-3 space-y-2">
            <p className="text-sm font-medium">Changes detected:</p>
            <div className="flex items-center gap-4 text-sm">
              {testSuite.statistics.improvements > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{testSuite.statistics.improvements} improved</span>
                </div>
              )}
              {testSuite.statistics.regressions > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span>{testSuite.statistics.regressions} broken</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Run Info */}
        {testSuite.lastRunAt && (
          <p className="text-xs text-muted-foreground">
            Last run: {new Date(testSuite.lastRunAt).toLocaleDateString()}
          </p>
        )}

        {/* Run Button */}
        <Button className="w-full" onClick={onRun} disabled={isRunning}>
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? "Running tests..." : "Run tests"}
        </Button>
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-background/80 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const ImprovementCard = ({
  item,
  onAction,
  actionLoading,
}: {
  item: ImprovementItem;
  onAction: (item: ImprovementItem, action: ImprovementAction) => void;
  actionLoading: string | null;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-primary" />
            {item.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
            {item.priority}
          </Badge>
          <Badge variant="outline">{typeLabels[item.type]}</Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground mb-1">Question</p>
        <p className="text-sm font-medium">{item.question}</p>
      </div>

      {item.answer && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Answer</p>
          <p className="text-sm line-clamp-3">{item.answer}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Score label="Confidence" value={item.confidence} />
        <Score label="Grounding" value={item.hallucinationRisk === null ? null : 1 - item.hallucinationRisk} />
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Source</p>
          <p className="text-sm font-semibold capitalize">{item.source}</p>
        </div>
      </div>

      {item.actionState?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.actionState.map((state) => (
            <Badge key={`${state.action}-${state.createdAt}`} variant="outline">
              {actionLabels[state.action]} · {state.status}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {item.suggestedActions.map((action) => {
          const Icon = actionIcons[action];
          const key = `${item.key}:${action}`;
          return (
            <Button
              key={action}
              variant={action === "mark_expected" ? "outline" : "secondary"}
              size="sm"
              disabled={actionLoading === key}
              onClick={() => onAction(item, action)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {actionLoading === key ? "Working..." : actionLabels[action]}
            </Button>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

const Score = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-lg border p-3">
    <div className="flex items-center justify-between text-sm mb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{formatPercent(value)}</span>
    </div>
    <Progress value={typeof value === "number" ? value * 100 : 0} className="h-2" />
  </div>
);

export default BotSelfImprovement;
