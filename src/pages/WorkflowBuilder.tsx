import { useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import {
  ArrowLeft,
  Save,
  Play,
  Zap,
  MessageSquare,
  CheckCircle2,
  GitBranch,
  Clock,
  Send,
  Filter,
  UserPlus,
  FileText,
  Bell,
  Plus,
  GripVertical,
} from "lucide-react";

const nodeTypes = [
  { type: "trigger", icon: Zap, label: "Trigger", color: "#6366f1", description: "Start the workflow" },
  { type: "message", icon: MessageSquare, label: "Send Message", color: "#3b82f6", description: "Post a Slack message" },
  { type: "approval", icon: CheckCircle2, label: "Approval", color: "#10b981", description: "Wait for approval" },
  { type: "condition", icon: GitBranch, label: "Condition", color: "#f59e0b", description: "Branch based on rules" },
  { type: "delay", icon: Clock, label: "Delay", color: "#8b5cf6", description: "Wait before continuing" },
  { type: "notify", icon: Bell, label: "Notify", color: "#ef4444", description: "Send notification" },
  { type: "form", icon: FileText, label: "Collect Data", color: "#06b6d4", description: "Show a form" },
  { type: "assign", icon: UserPlus, label: "Assign", color: "#ec4899", description: "Assign to person" },
];

const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "default",
    position: { x: 400, y: 50 },
    data: {
      label: (
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#6366f120" }}>
            <Zap className="w-4 h-4" style={{ color: "#6366f1" }} />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Slash Command</div>
            <div className="text-xs text-gray-500">/request</div>
          </div>
        </div>
      ),
    },
    style: {
      border: "2px solid #6366f140",
      borderRadius: "12px",
      padding: "8px",
      background: "white",
      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.08)",
    },
  },
  {
    id: "form-1",
    type: "default",
    position: { x: 400, y: 180 },
    data: {
      label: (
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#06b6d420" }}>
            <FileText className="w-4 h-4" style={{ color: "#06b6d4" }} />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Collect Details</div>
            <div className="text-xs text-gray-500">Open form modal</div>
          </div>
        </div>
      ),
    },
    style: {
      border: "2px solid #06b6d440",
      borderRadius: "12px",
      padding: "8px",
      background: "white",
      boxShadow: "0 4px 12px rgba(6, 182, 212, 0.08)",
    },
  },
  {
    id: "approval-1",
    type: "default",
    position: { x: 400, y: 310 },
    data: {
      label: (
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#10b98120" }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#10b981" }} />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Manager Approval</div>
            <div className="text-xs text-gray-500">Approve / Deny</div>
          </div>
        </div>
      ),
    },
    style: {
      border: "2px solid #10b98140",
      borderRadius: "12px",
      padding: "8px",
      background: "white",
      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
    },
  },
  {
    id: "condition-1",
    type: "default",
    position: { x: 400, y: 440 },
    data: {
      label: (
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#f59e0b20" }}>
            <GitBranch className="w-4 h-4" style={{ color: "#f59e0b" }} />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Check Result</div>
            <div className="text-xs text-gray-500">Approved?</div>
          </div>
        </div>
      ),
    },
    style: {
      border: "2px solid #f59e0b40",
      borderRadius: "12px",
      padding: "8px",
      background: "white",
      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.08)",
    },
  },
  {
    id: "notify-approved",
    type: "default",
    position: { x: 200, y: 580 },
    data: {
      label: (
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#10b98120" }}>
            <Send className="w-4 h-4" style={{ color: "#10b981" }} />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Approved ✅</div>
            <div className="text-xs text-gray-500">Notify requester</div>
          </div>
        </div>
      ),
    },
    style: {
      border: "2px solid #10b98140",
      borderRadius: "12px",
      padding: "8px",
      background: "white",
      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
    },
  },
  {
    id: "notify-denied",
    type: "default",
    position: { x: 600, y: 580 },
    data: {
      label: (
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#ef444420" }}>
            <Send className="w-4 h-4" style={{ color: "#ef4444" }} />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Denied ❌</div>
            <div className="text-xs text-gray-500">Notify requester</div>
          </div>
        </div>
      ),
    },
    style: {
      border: "2px solid #ef444440",
      borderRadius: "12px",
      padding: "8px",
      background: "white",
      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-trigger-form",
    source: "trigger-1",
    target: "form-1",
    animated: true,
    style: { stroke: "#6366f1", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
  },
  {
    id: "e-form-approval",
    source: "form-1",
    target: "approval-1",
    animated: true,
    style: { stroke: "#06b6d4", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#06b6d4" },
  },
  {
    id: "e-approval-condition",
    source: "approval-1",
    target: "condition-1",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
  {
    id: "e-condition-approved",
    source: "condition-1",
    target: "notify-approved",
    label: "Yes",
    style: { stroke: "#10b981", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
  {
    id: "e-condition-denied",
    source: "condition-1",
    target: "notify-denied",
    label: "No",
    style: { stroke: "#ef4444", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
  },
];

export default function WorkflowBuilder() {
  const navigate = useNavigate();
  const { workflowId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: (typeof nodeTypes)[0]) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      const nodeType = JSON.parse(data);
      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const IconComponent = nodeTypes.find((n) => n.type === nodeType.type)?.icon || Zap;

      const newNode: Node = {
        id: `${nodeType.type}-${Date.now()}`,
        type: "default",
        position,
        data: {
          label: (
            <div className="flex items-center gap-2 px-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${nodeType.color}20` }}>
                <IconComponent className="w-4 h-4" style={{ color: nodeType.color }} />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{nodeType.label}</div>
                <div className="text-xs text-gray-500">{nodeType.description}</div>
              </div>
            </div>
          ),
        },
        style: {
          border: `2px solid ${nodeType.color}40`,
          borderRadius: "12px",
          padding: "8px",
          background: "white",
          boxShadow: `0 4px 12px ${nodeType.color}14`,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <PageHeader
        backTo="/workflows"
        backLabel="Back"
        icon={GitBranch}
        title="Visual Flow Builder"
        subtitle="Drag nodes from the sidebar to build your workflow"
        container="full"
        sticky={false}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Play className="w-4 h-4" />
              Test
            </Button>
            <Button size="sm" className="gap-2">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </>
        }
      />

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Node Palette */}
        <div className="w-64 border-r border-border bg-background p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-foreground mb-1">Nodes</h3>
          <p className="text-xs text-muted-foreground mb-4">Drag to canvas to add</p>
          <div className="space-y-2">
            {nodeTypes.map((nt) => (
              <div
                key={nt.type}
                draggable
                onDragStart={(e) => onDragStart(e, nt)}
                className="flex items-center gap-3 p-3 border rounded-xl cursor-grab active:cursor-grabbing hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${nt.color}15` }}>
                  <nt.icon className="w-4 h-4" style={{ color: nt.color }} />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{nt.label}</div>
                  <div className="text-xs text-muted-foreground">{nt.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-muted/20"
          >
            <Background gap={20} size={1} color="#e5e7eb" />
            <Controls className="bg-background border border-border rounded-xl shadow-md" />
            <MiniMap
              className="bg-background border border-border rounded-xl shadow-md"
              maskColor="rgba(99, 102, 241, 0.08)"
              nodeColor="#6366f1"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
