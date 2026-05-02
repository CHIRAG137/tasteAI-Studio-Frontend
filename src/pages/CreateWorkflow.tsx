import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/utils/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  FileText,
  Zap,
  Slack,
  MessageSquare,
  Hash,
  UserPlus,
  Settings,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

type WorkflowType = "approval" | "triage" | "form" | "custom";
type Step = 1 | 2 | 3 | 4;

interface ApprovalStep {
  id: string;
  approver: string;
  channel: string;
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "textarea";
  required: boolean;
  options?: string;
}

interface TriageRule {
  id: string;
  condition: string;
  action: string;
  channel: string;
}

const workflowTypes = [
  {
    type: "approval" as WorkflowType,
    icon: CheckCircle2,
    title: "Approval Workflow",
    description: "Route requests through one or more approvers with approve/deny actions",
    examples: ["PTO requests", "Expense approvals", "Access requests", "Budget approvals"],
  },
  {
    type: "triage" as WorkflowType,
    icon: GitBranch,
    title: "Triage & Routing",
    description: "Automatically categorize and route messages to the right team or person",
    examples: ["Bug triage", "Support tickets", "Sales leads", "Incident routing"],
  },
  {
    type: "form" as WorkflowType,
    icon: FileText,
    title: "Form Collection",
    description: "Collect structured data from users via interactive Slack forms",
    examples: ["Onboarding forms", "Feedback surveys", "IT requests", "Event registration"],
  },
  {
    type: "custom" as WorkflowType,
    icon: Zap,
    title: "Custom Workflow",
    description: "Build a fully custom workflow with the visual flow builder",
    examples: ["Multi-step processes", "Conditional logic", "Integrations", "Automations"],
  },
];

export default function CreateWorkflow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<WorkflowType | null>(null);

  // Basic info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("slash_command");
  const [triggerValue, setTriggerValue] = useState("");
  const [channel, setChannel] = useState("");

  // Approval config
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([
    { id: "1", approver: "", channel: "" },
  ]);

  // Form config
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: "1", label: "", type: "text", required: true },
  ]);

  // Triage config
  const [triageRules, setTriageRules] = useState<TriageRule[]>([
    { id: "1", condition: "", action: "route", channel: "" },
  ]);

  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [dmRequester, setDmRequester] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed = () => {
    if (step === 1) return !!selectedType;
    if (step === 2) return name.trim() !== "" && triggerValue.trim() !== "";
    if (step === 3) return true;
    return true;
  };

  const handleCreate = async () => {
    if (!selectedType) {
      return;
    }

    setIsSubmitting(true);

    const workflowPayload = {
      name,
      description,
      type: selectedType,
      triggerType,
      triggerValue,
      channel,
      status: selectedType === "custom" ? "draft" : "active",
      settings: {
        approvalSteps,
        formFields,
        triageRules,
        notifyOnComplete,
        dmRequester,
      },
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/workflows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(workflowPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to create workflow");
      }

      const data = await response.json();
      const workflow = data.result;

      if (selectedType === "custom") {
        navigate(`/workflows/${workflow._id}/builder`);
      } else {
        navigate("/workflows");
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
      navigate("/workflows");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors"
              >
                healthAI
              </button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="sm" onClick={() => navigate("/workflows")} className="gap-2 text-muted-foreground hover:!text-foreground hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Create Workflow</h1>
                  <p className="text-sm text-muted-foreground">Step {step} of 4</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
                  Previous
                </Button>
              )}
              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={!canProceed()}
                  className="bg-gradient-primary gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="bg-gradient-primary gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting
                    ? "Saving..."
                    : selectedType === "custom"
                    ? "Open Flow Builder"
                    : "Create Workflow"}
                </Button>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Choose Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Choose Workflow Type</h2>
              <p className="text-muted-foreground mt-1">
                Select the type of workflow you want to create
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowTypes.map((wt) => (
                <Card
                  key={wt.type}
                  className={`cursor-pointer transition-all hover:shadow-[var(--shadow-soft)] ${
                    selectedType === wt.type
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedType(wt.type)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          selectedType === wt.type ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <wt.icon
                          className={`w-6 h-6 ${
                            selectedType === wt.type ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{wt.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{wt.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {wt.examples.map((ex) => (
                            <Badge key={ex} variant="secondary" className="text-xs">
                              {ex}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Basic Information</h2>
              <p className="text-muted-foreground mt-1">
                Set up the name, trigger, and channel for your workflow
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Workflow Name</Label>
                  <Input
                    placeholder="e.g., PTO Request Approval"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe what this workflow does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Trigger
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trigger Type</Label>
                      <Select value={triggerType} onValueChange={setTriggerType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slash_command">
                            <span className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" /> Slash Command
                            </span>
                          </SelectItem>
                          <SelectItem value="message">
                            <span className="flex items-center gap-2">
                              <Hash className="w-4 h-4" /> Message in Channel
                            </span>
                          </SelectItem>
                          <SelectItem value="emoji">
                            <span className="flex items-center gap-2">
                              <span>🎯</span> Emoji Reaction
                            </span>
                          </SelectItem>
                          <SelectItem value="new_member">
                            <span className="flex items-center gap-2">
                              <UserPlus className="w-4 h-4" /> New Channel Member
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {triggerType === "slash_command"
                          ? "Command"
                          : triggerType === "emoji"
                          ? "Emoji"
                          : "Keyword"}
                      </Label>
                      <Input
                        placeholder={
                          triggerType === "slash_command"
                            ? "/pto-request"
                            : triggerType === "emoji"
                            ? "🎫"
                            : "bug report"
                        }
                        value={triggerValue}
                        onChange={(e) => setTriggerValue(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Slack className="w-4 h-4 text-primary" />
                    Channel
                  </h3>
                  <div className="space-y-2">
                    <Label>Source Channel</Label>
                    <Input
                      placeholder="#general"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The channel where users will trigger this workflow
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Configure Workflow</h2>
              <p className="text-muted-foreground mt-1">
                Set up the steps and actions for your{" "}
                {workflowTypes.find((w) => w.type === selectedType)?.title.toLowerCase()}
              </p>
            </div>

            {/* Approval Config */}
            {selectedType === "approval" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Approval Steps
                  </CardTitle>
                  <CardDescription>Define who needs to approve and in what order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {approvalSteps.map((as, i) => (
                    <div key={as.id} className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <Badge variant="outline" className="shrink-0">Step {i + 1}</Badge>
                      <Input
                        placeholder="@approver or #channel"
                        value={as.approver}
                        onChange={(e) => {
                          const updated = [...approvalSteps];
                          updated[i].approver = e.target.value;
                          setApprovalSteps(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Notify channel"
                        value={as.channel}
                        onChange={(e) => {
                          const updated = [...approvalSteps];
                          updated[i].channel = e.target.value;
                          setApprovalSteps(updated);
                        }}
                        className="flex-1"
                      />
                      {approvalSteps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setApprovalSteps(approvalSteps.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setApprovalSteps([
                        ...approvalSteps,
                        { id: Date.now().toString(), approver: "", channel: "" },
                      ])
                    }
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Step
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Triage Config */}
            {selectedType === "triage" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-primary" />
                    Routing Rules
                  </CardTitle>
                  <CardDescription>Define conditions to route messages automatically</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {triageRules.map((rule, i) => (
                    <div key={rule.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Rule {i + 1}</Badge>
                        {triageRules.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setTriageRules(triageRules.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          placeholder="If message contains..."
                          value={rule.condition}
                          onChange={(e) => {
                            const updated = [...triageRules];
                            updated[i].condition = e.target.value;
                            setTriageRules(updated);
                          }}
                        />
                        <Select
                          value={rule.action}
                          onValueChange={(v) => {
                            const updated = [...triageRules];
                            updated[i].action = v;
                            setTriageRules(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="route">Route to channel</SelectItem>
                            <SelectItem value="assign">Assign to person</SelectItem>
                            <SelectItem value="label">Add label</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="#channel or @person"
                          value={rule.channel}
                          onChange={(e) => {
                            const updated = [...triageRules];
                            updated[i].channel = e.target.value;
                            setTriageRules(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTriageRules([
                        ...triageRules,
                        { id: Date.now().toString(), condition: "", action: "route", channel: "" },
                      ])
                    }
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Rule
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Form Config */}
            {selectedType === "form" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Form Fields
                  </CardTitle>
                  <CardDescription>Design the fields users will fill out</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formFields.map((field, i) => (
                    <div key={field.id} className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <Input
                        placeholder="Field label"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...formFields];
                          updated[i].label = e.target.value;
                          setFormFields(updated);
                        }}
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v) => {
                          const updated = [...formFields];
                          updated[i].type = v as FormField["type"];
                          setFormFields(updated);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(v) => {
                            const updated = [...formFields];
                            updated[i].required = v;
                            setFormFields(updated);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Required</span>
                      </div>
                      {formFields.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setFormFields(formFields.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormFields([
                        ...formFields,
                        { id: Date.now().toString(), label: "", type: "text", required: false },
                      ])
                    }
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Field
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Custom → redirect to builder */}
            {selectedType === "custom" && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <div className="p-4 rounded-2xl bg-primary/10 w-fit mx-auto mb-4">
                    <GitBranch className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Visual Flow Builder</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Custom workflows are built using the visual flow editor. Click "Open Flow Builder" to design your workflow with drag-and-drop nodes.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Notifications & Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Notifications & Review</h2>
              <p className="text-muted-foreground mt-1">
                Configure notifications and review your workflow before creating
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Notify on completion</p>
                    <p className="text-sm text-muted-foreground">
                      Send a message when the workflow completes
                    </p>
                  </div>
                  <Switch checked={notifyOnComplete} onCheckedChange={setNotifyOnComplete} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">DM requester</p>
                    <p className="text-sm text-muted-foreground">
                      Send a direct message to the person who triggered the workflow
                    </p>
                  </div>
                  <Switch checked={dmRequester} onCheckedChange={setDmRequester} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{name || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline">
                      {workflowTypes.find((w) => w.type === selectedType)?.title || "—"}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Trigger</span>
                    <span className="font-medium text-foreground">{triggerValue || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Channel</span>
                    <span className="font-medium text-foreground">{channel || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Notifications</span>
                    <span className="font-medium text-foreground">
                      {[notifyOnComplete && "Completion", dmRequester && "DM Requester"]
                        .filter(Boolean)
                        .join(", ") || "None"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
