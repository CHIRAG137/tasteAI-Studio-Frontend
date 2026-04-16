import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Zap,
  CheckCircle2,
  GitBranch,
  FileText,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  Copy,
  ArrowRight,
  Slack,
  Clock,
  Users,
  Filter,
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string;
  type: "approval" | "triage" | "form" | "custom";
  status: "active" | "paused" | "draft";
  trigger: string;
  channel: string;
  runs: number;
  lastRun?: string;
  createdAt: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    name: "PTO Request Approval",
    description: "Route PTO requests to managers for approval with automatic notifications",
    type: "approval",
    status: "active",
    trigger: "/pto-request",
    channel: "#hr-requests",
    runs: 247,
    lastRun: "2 hours ago",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Bug Report Triage",
    description: "Automatically categorize and route bug reports to the right engineering team",
    type: "triage",
    status: "active",
    trigger: "Message in #bugs",
    channel: "#engineering",
    runs: 1024,
    lastRun: "15 min ago",
    createdAt: "2024-02-01",
  },
  {
    id: "3",
    name: "New Hire Onboarding",
    description: "Collect new hire information and create onboarding tasks automatically",
    type: "form",
    status: "paused",
    trigger: "/onboard",
    channel: "#people-ops",
    runs: 56,
    lastRun: "3 days ago",
    createdAt: "2024-03-10",
  },
  {
    id: "4",
    name: "Expense Approval",
    description: "Multi-level expense approval workflow with budget checks",
    type: "approval",
    status: "draft",
    trigger: "/expense",
    channel: "#finance",
    runs: 0,
    createdAt: "2024-04-01",
  },
];

const typeConfig = {
  approval: { icon: CheckCircle2, label: "Approval", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  triage: { icon: GitBranch, label: "Triage", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  form: { icon: FileText, label: "Form", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  custom: { icon: Zap, label: "Custom", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
};

const statusConfig = {
  active: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  paused: { label: "Paused", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-border" },
};

export default function Workflows() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = mockWorkflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || w.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Slack Workflows
            </h1>
            <p className="text-muted-foreground mt-1">
              Automate processes in your Slack workspace with powerful workflows
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/workflows/install")}
              className="gap-2"
            >
              <Slack className="w-4 h-4" />
              Manage Workspace
            </Button>
            <Button
              onClick={() => navigate("/workflows/create")}
              className="bg-gradient-primary hover:opacity-90 transition-all gap-2"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mockWorkflows.length}</p>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Play className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mockWorkflows.filter((w) => w.status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mockWorkflows.reduce((a, w) => a + w.runs, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["all", "approval", "triage", "form", "custom"].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className={filterType === type ? "bg-primary" : ""}
              >
                {type === "all" ? "All" : typeConfig[type as keyof typeof typeConfig].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Workflow List */}
        <div className="space-y-3">
          {filtered.map((workflow) => {
            const TypeIcon = typeConfig[workflow.type].icon;
            return (
              <Card
                key={workflow.id}
                className="border-border/50 hover:border-primary/30 hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer group"
                onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {workflow.name}
                        </h3>
                        <Badge variant="outline" className={typeConfig[workflow.type].color}>
                          {typeConfig[workflow.type].label}
                        </Badge>
                        <Badge variant="outline" className={statusConfig[workflow.status].color}>
                          {statusConfig[workflow.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {workflow.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Trigger: {workflow.trigger}
                        </span>
                        <span className="flex items-center gap-1">
                          <Slack className="w-3 h-3" />
                          {workflow.channel}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {workflow.runs} runs
                        </span>
                        {workflow.lastRun && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {workflow.lastRun}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workflows/${workflow.id}/builder`);
                        }}
                      >
                        <GitBranch className="w-4 h-4" />
                        Flow Editor
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {workflow.status === "active" ? (
                              <><Pause className="w-4 h-4 mr-2" /> Pause</>
                            ) : (
                              <><Play className="w-4 h-4 mr-2" /> Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No workflows found</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first Slack workflow to automate processes
                </p>
                <Button onClick={() => navigate("/workflows/create")} className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
