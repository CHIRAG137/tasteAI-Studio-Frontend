import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Beaker,
  Clock,
  DollarSign,
  FlaskConical,
  Play,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  createBotExperiment,
  getBotExperiments,
  runBotExperiment,
  type BotExperiment,
  type BotExperimentsResponse,
  type ExperimentVariantConfig,
} from "@/api/analytics";

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
};

const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${Math.round(value)}ms`;
};

const formatCost = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `$${value.toFixed(6)}`;
};

const BotExperimentLab = () => {
  const { botId } = useParams<{ botId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [data, setData] = useState<BotExperimentsResponse | null>(null);
  const [name, setName] = useState("Prompt and model experiment");
  const [hypothesis, setHypothesis] = useState(
    "Treatment improves helpfulness without increasing latency."
  );
  const [datasetName, setDatasetName] = useState("all");
  const [primaryMetric, setPrimaryMetric] = useState("judge_score");
  const [guardrailMetric, setGuardrailMetric] = useState("latency");
  const [targetingRules, setTargetingRules] = useState("{}");
  const [control, setControl] = useState<ExperimentVariantConfig | null>(null);
  const [treatment, setTreatment] = useState<ExperimentVariantConfig | null>(null);

  const fetchExperiments = async () => {
    if (!botId) return;
    try {
      setLoading(true);
      const response = await getBotExperiments(botId);
      const result = response.result as BotExperimentsResponse;
      setData(result);
      setControl((current) => current || result.defaults.control);
      setTreatment((current) => current || result.defaults.treatment);
    } catch (error) {
      toast({
        title: "Unable to load Experiment Lab",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [botId]);

  const updateVariant = (
    variant: "control" | "treatment",
    field: keyof ExperimentVariantConfig,
    value: string | number | Record<string, unknown>
  ) => {
    const setter = variant === "control" ? setControl : setTreatment;
    setter((current) => current ? { ...current, [field]: value } : current);
  };

  const parseJson = (label: string, value: string) => {
    try {
      return JSON.parse(value || "{}");
    } catch {
      throw new Error(`${label} must be valid JSON`);
    }
  };

  const createExperiment = async () => {
    if (!botId || !control || !treatment) return;

    try {
      const targeting = parseJson("Targeting rules", targetingRules);
      const response = await createBotExperiment(botId, {
        name,
        hypothesis,
        datasetName,
        primaryMetric,
        guardrailMetric,
        targetingRules: targeting,
        control,
        treatment,
      });
      toast({
        title: "Experiment created",
        description: "Run it when you are ready to compare variants.",
      });
      await fetchExperiments();
      return response.result as BotExperiment;
    } catch (error) {
      toast({
        title: "Experiment creation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const runExperiment = async (experimentId: string) => {
    if (!botId) return;

    try {
      setRunningId(experimentId);
      const response = await runBotExperiment(botId, experimentId);
      toast({
        title: "Experiment completed",
        description: `Treatment win rate: ${formatPercent(response.result?.metrics?.treatmentWinRate)}`,
      });
      await fetchExperiments();
    } catch (error) {
      toast({
        title: "Experiment failed",
        description: error instanceof Error ? error.message : "Please create an eval dataset first.",
        variant: "destructive",
      });
    } finally {
      setRunningId(null);
    }
  };

  const createAndRun = async () => {
    const experiment = await createExperiment();
    if (experiment?._id) {
      await runExperiment(experiment._id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar pageTitle="Experiment Lab" />
        <div className="container mx-auto px-6 py-6 space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar pageTitle="Experiment Lab" />

      <div className="container mx-auto px-6 py-6 space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Control vs Treatment Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Experiment name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Eval dataset</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={datasetName}
                  onChange={(event) => setDatasetName(event.target.value)}
                >
                  <option value="all">All datasets</option>
                  {(data?.datasets || []).map((dataset) => (
                    <option key={dataset.datasetName} value={dataset.datasetName}>
                      {dataset.datasetName} ({dataset.itemCount})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Card className="bg-background/80">
              <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">How this setup works</p>
                <p>
                  Define arbitrary JSON configs for control and treatment, like a feature flag or A/B
                  platform. These configs are stored with the experiment and interpreted by the runner
                  today. Later, the same config object can be wired directly into your production bot
                  runtime.
                </p>
                <p>
                  Example keys: <code>model</code>, <code>promptInstructions</code>,{" "}
                  <code>responseStyle</code>, <code>retrievalThreshold</code>,{" "}
                  <code>handoffPolicy</code>, <code>tone</code>, <code>maxAnswerLength</code>,{" "}
                  <code>knowledgeStrategy</code>.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primary metric</Label>
                <Input value={primaryMetric} onChange={(event) => setPrimaryMetric(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Guardrail metric</Label>
                <Input value={guardrailMetric} onChange={(event) => setGuardrailMetric(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Targeting rules JSON</Label>
                <Input value={targetingRules} onChange={(event) => setTargetingRules(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hypothesis</Label>
              <Textarea value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {control && (
                <VariantEditor
                  title="Control"
                  variant={control}
                  onChange={(field, value) => updateVariant("control", field, value)}
                />
              )}
              {treatment && (
                <VariantEditor
                  title="Treatment"
                  variant={treatment}
                  onChange={(field, value) => updateVariant("treatment", field, value)}
                />
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={createExperiment} variant="outline">
                <Beaker className="w-4 h-4 mr-2" />
                Save Experiment
              </Button>
              <Button onClick={createAndRun}>
                <Play className="w-4 h-4 mr-2" />
                Save & Run
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Experiment Results</h2>
          {(data?.experiments || []).length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {(data?.experiments || []).map((experiment) => (
                <ExperimentCard
                  key={experiment._id}
                  experiment={experiment}
                  running={runningId === experiment._id}
                  onRun={() => runExperiment(experiment._id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">No experiments yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create an eval dataset, configure treatment changes, then run a comparison.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const VariantEditor = ({
  title,
  variant,
  onChange,
}: {
  title: string;
  variant: ExperimentVariantConfig;
  onChange: (field: keyof ExperimentVariantConfig, value: string | number | Record<string, unknown>) => void;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="space-y-2">
        <Label>Label</Label>
        <Input value={variant.label} onChange={(event) => onChange("label", event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={variant.description}
          onChange={(event) => onChange("description", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Traffic allocation (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          value={variant.trafficAllocation}
          onChange={(event) => onChange("trafficAllocation", Number(event.target.value))}
        />
      </div>
      <VariantConfigEditor variant={variant} onChange={onChange} />
    </CardContent>
  </Card>
);

const VariantConfigEditor = ({
  variant,
  onChange,
}: {
  variant: ExperimentVariantConfig;
  onChange: (field: keyof ExperimentVariantConfig, value: string | number | Record<string, unknown>) => void;
}) => {
  const [text, setText] = useState(JSON.stringify(variant.config || {}, null, 2));

  const updateText = (value: string) => {
    setText(value);
    try {
      onChange("config", JSON.parse(value || "{}"));
    } catch {
      // Keep local invalid JSON visible; save will fail when parsed in backend if not corrected.
    }
  };

  return (
    <div className="space-y-2">
      <Label>Variant config JSON</Label>
      <Textarea
        className="min-h-48 font-mono text-xs"
        value={text}
        onChange={(event) => updateText(event.target.value)}
        placeholder={`{
  "model": "gemini-3.1-pro-preview",
  "promptInstructions": "Answer with citations when possible.",
  "responseStyle": "concise",
  "retrievalThreshold": 0.78,
  "handoffPolicy": "handoff when confidence is below 0.7"
}`}
      />
    </div>
  );
};

const ExperimentCard = ({
  experiment,
  running,
  onRun,
}: {
  experiment: BotExperiment;
  running: boolean;
  onRun: () => void;
}) => {
  const samples = experiment.samples || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {experiment.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{experiment.hypothesis}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={experiment.status === "completed" ? "default" : "secondary"}>
              {experiment.status}
            </Badge>
            <Button size="sm" disabled={running} onClick={onRun}>
              <Play className="w-4 h-4 mr-2" />
              {running ? "Running..." : "Run"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Metric label="Treatment win rate" value={formatPercent(experiment.metrics?.treatmentWinRate)} />
          <Metric label="Control judge" value={formatPercent(experiment.metrics?.controlAverageJudgeScore)} />
          <Metric label="Treatment judge" value={formatPercent(experiment.metrics?.treatmentAverageJudgeScore)} />
          <Metric label="Latency A/B" value={`${formatMs(experiment.metrics?.controlAverageLatencyMs)} / ${formatMs(experiment.metrics?.treatmentAverageLatencyMs)}`} />
          <Metric label="Cost A/B" value={`${formatCost(experiment.metrics?.controlEstimatedCost)} / ${formatCost(experiment.metrics?.treatmentEstimatedCost)}`} />
        </div>

        {experiment.metrics?.treatmentWinRate !== null && experiment.metrics?.treatmentWinRate !== undefined && (
          <Progress value={experiment.metrics.treatmentWinRate * 100} className="h-2" />
        )}

        {samples.slice(0, 3).map((sample) => (
          <div key={sample.question} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-sm">{sample.question}</p>
              <Badge>{sample.winner}</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <OutputBlock title="Control output" text={sample.controlOutput} score={sample.controlScore} latency={sample.controlLatencyMs} />
              <OutputBlock title="Treatment output" text={sample.treatmentOutput} score={sample.treatmentScore} latency={sample.treatmentLatencyMs} />
            </div>
            <p className="text-sm text-muted-foreground">{sample.explanation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-muted/50 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);

const OutputBlock = ({
  title,
  text,
  score,
  latency,
}: {
  title: string;
  text: string;
  score: number;
  latency: number;
}) => (
  <div className="rounded-lg bg-muted/50 p-3">
    <div className="flex items-center justify-between gap-3 mb-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex gap-2">
        <Badge variant="outline">{formatPercent(score)}</Badge>
        <Badge variant="outline">
          <Clock className="w-3 h-3 mr-1" />
          {formatMs(latency)}
        </Badge>
      </div>
    </div>
    <p className="text-sm text-muted-foreground line-clamp-5">{text}</p>
  </div>
);

export default BotExperimentLab;
