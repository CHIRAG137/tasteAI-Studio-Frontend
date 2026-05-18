import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BrandLoader } from "@/components/BrandLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/utils/auth";
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
  triggerType?: string;
  triggerValue: string;
  channel: string;
  runs: number;
  lastRun?: string;
  createdAt: string;
}

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
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/workflows`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Unable to load workflows');
        }

        const data = await response.json();
        setWorkflows(data.result || []);
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const filtered = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || w.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar pageTitle="Slack Workflows" />

      <div className="max-w-4xl mx-auto px-4 py-24">
        <div className="rounded-3xl border border-border/50 bg-card/90 p-10 text-center shadow-sm">
          <h1 className="text-4xl font-bold mb-4">Slack Workflows</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Coming soon — Slack workflow builder is temporarily paused while we improve the experience.
          </p>
          <p className="text-sm text-muted-foreground">
            The current workflow UI is commented out below and will be brought back later.
          </p>
        </div>
      </div>

      {/* Current workflow screen temporarily disabled. We'll bring this layout back later. */}
      {/*
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              onClick={() => navigate("/slack/manage?from=workflows")}
              className="gap-2"
            >
              <Slack className="w-4 h-4" />
              Authenticate Slack
            </Button>
            <Button
              onClick={() => navigate("/workflows/create")}
              className="transition-all gap-2"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
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
                  {workflows.filter((w) => w.status === "active").length}
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
                  {workflows.reduce((a, w) => a + w.runs, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </CardContent>
          </Card>
        </div>

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

        <div className="space-y-3">
          {isLoading ? (
            <BrandLoader fullScreen={false} label="Loading workflows" />
          ) : hasError ? (
            <Card className="border-border/50">
              <CardContent className="p-6 text-center text-sm text-destructive">
                Unable to load workflows. Please refresh or try again later.
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No workflows found yet.</p>
                <Button onClick={() => navigate('/workflows/create')} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            filtered.map((workflow) => {
              const TypeIcon = typeConfig[workflow.type].icon;
              return (
                <Card
                  key={workflow.id}
                  className="border-border/50 hover:border-primary/30 hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer group"
                  onClick={() => navigate(`/workflows/${workflow.id}/builder`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                        <TypeIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{workflow.name}</h3>
                          <Badge variant="outline" className={typeConfig[workflow.type].color}>{typeConfig[workflow.type].label}</Badge>
                          <Badge variant="outline" className={statusConfig[workflow.status].color}>{statusConfig[workflow.status].label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{workflow.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{workflow.triggerValue}</span>
                          <span className="flex items-center gap-1"><Slack className="w-3 h-3" />{workflow.channel}</span>
                          <span className="flex items-center gap-1"><Play className="w-3 h-3" />{workflow.runs} runs</span>
                          {workflow.lastRun && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{workflow.lastRun}</span>}
                        </div>
                      </div>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>
                              {workflow.status === "active" ? (<><Pause className="w-4 h-4 mr-2" /> Pause</>) : (<><Play className="w-4 h-4 mr-2" /> Activate</>)}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
      */}
    </div>
  );
}
