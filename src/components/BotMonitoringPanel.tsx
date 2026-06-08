import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Slack,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  acknowledgeMonitoringAlert,
  evaluateBotMonitoring,
  getBotMonitoring,
  resolveMonitoringAlert,
  saveBotMonitoring,
  type MonitoringAlert,
  type MonitoringMetricType,
  type MonitoringOperator,
  type MonitoringRule,
} from "@/api/analytics";

const severityVariant: Record<
  MonitoringAlert["severity"],
  "destructive" | "secondary" | "outline"
> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "N/A";

export const BotMonitoringPanel = ({ botId }: { botId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(15);
  const [cooldownMinutes, setCooldownMinutes] = useState(60);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackChannelId, setSlackChannelId] = useState("");
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<MonitoringAlert[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<MonitoringAlert[]>([]);
  const [rulePreviews, setRulePreviews] = useState<
    Array<{
      ruleKey: string;
      name: string;
      wouldTrigger: boolean;
      formattedCurrent: string;
      formattedThreshold: string;
    }>
  >([]);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [metricCatalog, setMetricCatalog] = useState<
    Array<{ metricType: string; label: string }>
  >([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customRule, setCustomRule] = useState({
    name: "",
    description: "",
    metricType: "fallback_rate" as MonitoringMetricType,
    operator: "above" as MonitoringOperator,
    threshold: "0.2",
    windowHours: "24",
  });

  const fetchMonitoring = async () => {
    try {
      setLoading(true);
      const response = await getBotMonitoring(botId);
      const data = response.result;
      const config = data.config;

      setEnabled(Boolean(config.enabled));
      setCheckIntervalMinutes(config.checkIntervalMinutes || 15);
      setCooldownMinutes(config.cooldownMinutes || 60);
      setEmailEnabled(Boolean(config.delivery?.email?.enabled));
      setEmailRecipients((config.delivery?.email?.recipients || []).join(", "));
      setSlackEnabled(Boolean(config.delivery?.slack?.enabled));
      setSlackChannelId(config.delivery?.slack?.channelId || "");
      setRules(config.rules || []);
      setActiveAlerts(data.activeAlerts || []);
      setRecentAlerts(data.recentAlerts || []);
      setRulePreviews(data.rulePreviews || []);
      setSnapshot(data.snapshot || {});
      setMetricCatalog(data.metricCatalog || []);
    } catch (error) {
      toast({
        title: "Unable to load monitoring",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
  }, [botId]);

  const buildPayload = () => ({
    enabled,
    checkIntervalMinutes,
    cooldownMinutes,
    rules,
    delivery: {
      email: {
        enabled: emailEnabled,
        recipients: emailRecipients
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
      slack: { enabled: slackEnabled, channelId: slackChannelId.trim() },
    },
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveBotMonitoring(botId, buildPayload());
      toast({ title: "Monitoring saved", description: "Alert rules and notifications updated." });
      await fetchMonitoring();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluate = async (notify: boolean) => {
    try {
      setEvaluating(true);
      const response = await evaluateBotMonitoring(botId, notify);
      const result = response.result;
      toast({
        title: notify ? "Check complete — notifications sent" : "Check complete",
        description: `${result?.triggeredCount || 0} new alert(s), ${result?.activeAlertCount || 0} active.`,
      });
      await fetchMonitoring();
    } catch (error) {
      toast({
        title: "Evaluation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const updateRule = (ruleKey: string, patch: Partial<MonitoringRule>) => {
    setRules((prev) =>
      prev.map((rule) => (rule.ruleKey === ruleKey ? { ...rule, ...patch } : rule))
    );
  };

  const addCustomRule = () => {
    const name = customRule.name.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const threshold = Number(customRule.threshold);
    const windowHours = Number(customRule.windowHours);
    setRules((prev) => [
      ...prev,
      {
        ruleKey: `custom:${Date.now()}`,
        name,
        description: customRule.description.trim(),
        metricType: customRule.metricType,
        operator: customRule.operator,
        threshold: Number.isFinite(threshold) ? threshold : 0,
        windowHours: Number.isFinite(windowHours) ? windowHours : 24,
        enabled: true,
        isBuiltin: false,
      },
    ]);
    setCustomDialogOpen(false);
    setCustomRule({
      name: "",
      description: "",
      metricType: "fallback_rate",
      operator: "above",
      threshold: "0.2",
      windowHours: "24",
    });
  };

  const removeRule = (ruleKey: string) => {
    setRules((prev) => prev.filter((rule) => rule.ruleKey !== ruleKey));
  };

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeMonitoringAlert(botId, alertId);
    await fetchMonitoring();
  };

  const handleResolve = async (alertId: string) => {
    await resolveMonitoringAlert(botId, alertId);
    await fetchMonitoring();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-md">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Production Monitoring Alerts</h2>
            <p className="text-sm text-muted-foreground">
              Threshold-based alerts from Phoenix traces, Q&A history, latency, handoffs, and intent clusters.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchMonitoring}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={evaluating}
            onClick={() => handleEvaluate(false)}
          >
            <Zap className="w-4 h-4 mr-2" />
            {evaluating ? "Checking..." : "Run check"}
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
            disabled={evaluating}
            onClick={() => handleEvaluate(true)}
          >
            <Bell className="w-4 h-4 mr-2" />
            Check & notify
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Active alerts</p>
            <p className="text-2xl font-bold">{activeAlerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Rules enabled</p>
            <p className="text-2xl font-bold">{rules.filter((r) => r.enabled).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Sampled (24h)</p>
            <p className="text-2xl font-bold">{String(snapshot.sampledInteractions || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Phoenix traces</p>
            <p className="text-2xl font-bold">{String(snapshot.phoenixLinkedTraces || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {activeAlerts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Active alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.map((alert) => (
              <AlertCard
                key={alert._id}
                alert={alert}
                onAcknowledge={() => handleAcknowledge(alert._id)}
                onResolve={() => handleResolve(alert._id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Alert rules & thresholds</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCustomDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add custom rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Monitoring enabled</p>
              <p className="text-xs text-muted-foreground">
                Runs every {checkIntervalMinutes} minutes when server scheduler is active
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const preview = rulePreviews.find((item) => item.ruleKey === rule.ruleKey);
              return (
                <div
                  key={rule.ruleKey}
                  className={`rounded-xl border p-4 space-y-3 ${
                    preview?.wouldTrigger ? "border-destructive/50 bg-destructive/5" : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{rule.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {rule.isBuiltin && (
                        <Badge variant="outline" className="text-[10px]">
                          Built-in
                        </Badge>
                      )}
                      {!rule.isBuiltin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeRule(rule.ruleKey)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) =>
                          updateRule(rule.ruleKey, { enabled: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={rule.operator}
                        onValueChange={(value: MonitoringOperator) =>
                          updateRule(rule.ruleKey, { operator: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="above">Above</SelectItem>
                          <SelectItem value="below">Below</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Threshold</Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        step="0.01"
                        value={rule.threshold}
                        onChange={(e) =>
                          updateRule(rule.ruleKey, {
                            threshold: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Window (h)</Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        value={rule.windowHours || 24}
                        onChange={(e) =>
                          updateRule(rule.ruleKey, {
                            windowHours: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  {preview && (
                    <div className="flex items-center justify-between text-xs rounded-lg bg-background/70 border px-3 py-2">
                      <span className="text-muted-foreground">Current</span>
                      <span className={preview.wouldTrigger ? "text-destructive font-semibold" : "font-medium"}>
                        {preview.formattedCurrent} / {preview.formattedThreshold}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schedule & cooldown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Check interval (minutes)</Label>
              <Input
                type="number"
                min={5}
                value={checkIntervalMinutes}
                onChange={(e) => setCheckIntervalMinutes(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Alert cooldown (minutes)</Label>
              <Input
                type="number"
                min={15}
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              <Input
                placeholder="recipients@company.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                disabled={!emailEnabled}
              />
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Slack className="h-4 w-4" /> Slack
                </span>
                <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
              </div>
              <Input
                placeholder="Channel ID"
                value={slackChannelId}
                onChange={(e) => setSlackChannelId(e.target.value)}
                disabled={!slackEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save monitoring setup"}
        </Button>
      </div>

      {recentAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Alert history</h3>
          <div className="space-y-2">
            {recentAlerts.slice(0, 10).map((alert) => (
              <div key={alert._id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{alert.title}</span>
                  <Badge variant={severityVariant[alert.severity]}>{alert.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateTime(alert.triggeredAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom alert rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={customRule.name}
                onChange={(e) => setCustomRule((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. High fallback rate"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={customRule.description}
                onChange={(e) =>
                  setCustomRule((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select
                  value={customRule.metricType}
                  onValueChange={(value: MonitoringMetricType) =>
                    setCustomRule((p) => ({ ...p, metricType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricCatalog.map((metric) => (
                      <SelectItem key={metric.metricType} value={metric.metricType}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select
                  value={customRule.operator}
                  onValueChange={(value: MonitoringOperator) =>
                    setCustomRule((p) => ({ ...p, operator: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above</SelectItem>
                    <SelectItem value="below">Below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Threshold</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customRule.threshold}
                  onChange={(e) =>
                    setCustomRule((p) => ({ ...p, threshold: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Window (hours)</Label>
                <Input
                  type="number"
                  value={customRule.windowHours}
                  onChange={(e) =>
                    setCustomRule((p) => ({ ...p, windowHours: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addCustomRule}>Add rule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AlertCard = ({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: MonitoringAlert;
  onAcknowledge: () => void;
  onResolve: () => void;
}) => (
  <div className="rounded-lg border bg-background p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant={severityVariant[alert.severity]} className="uppercase text-[10px]">
            {alert.severity}
          </Badge>
          <p className="font-medium text-sm">{alert.title}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDateTime(alert.triggeredAt)} · window {alert.windowHours}h
        </p>
      </div>
      <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
    </div>
    <div className="flex gap-2 pt-1">
      <Button size="sm" variant="outline" onClick={onAcknowledge}>
        Acknowledge
      </Button>
      <Button size="sm" variant="secondary" onClick={onResolve}>
        Resolve
      </Button>
    </div>
  </div>
);
