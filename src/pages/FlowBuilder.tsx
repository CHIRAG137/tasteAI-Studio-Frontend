import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlowBuilder as FlowBuilderComponent } from '@/components/FlowBuilder/FlowBuilder';
import { Node, Edge } from '@xyflow/react';
import { useToast } from '@/hooks/use-toast';

export default function FlowBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Get initial flow data and return path from location state
  const { initialFlow, returnPath, botId } = location.state || {};

  useEffect(() => {
    // Load initial flow if provided
    if (initialFlow) {
      setNodes(initialFlow.nodes || []);
      setEdges(initialFlow.edges || []);
    }
  }, [initialFlow]);

  const handleSave = () => {
    // Save the flow to session storage for the form to retrieve
    sessionStorage.setItem('conversationFlow', JSON.stringify({ nodes, edges }));
    
    toast({
      title: "Flow saved",
      description: "Conversation flow has been saved successfully.",
    });

    // Navigate back to the form
    navigate(returnPath || '/', { 
      state: { 
        conversationFlow: { nodes, edges },
        fromFlowBuilder: true 
      } 
    });
  };

  const handleFlowChange = (newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(returnPath || '/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">Conversation Flow Builder</h1>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Flow
          </Button>
        </div>
      </header>

      {/* Flow Builder */}
      <main className="container px-4 py-6">
        <div className="h-[calc(100vh-6rem)]">
          <FlowBuilderComponent
            botId={botId}
            onSave={handleSave}
            onFlowChange={handleFlowChange}
          />
        </div>
      </main>
    </div>
  );
}