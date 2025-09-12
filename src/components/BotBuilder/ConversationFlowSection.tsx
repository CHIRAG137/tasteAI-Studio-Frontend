import { MessageSquareText, ExternalLink } from 'lucide-react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { useEffect } from 'react';

interface ConversationFlowSectionProps {
  botId?: string;
  conversationFlow?: { nodes: Node[]; edges: Edge[] };
  onFlowUpdate?: (flow: { nodes: Node[]; edges: Edge[] }) => void;
}

export function ConversationFlowSection({ 
  botId,
  conversationFlow,
  onFlowUpdate
}: ConversationFlowSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're returning from the flow builder
  useEffect(() => {
    if (location.state?.fromFlowBuilder && location.state?.conversationFlow) {
      onFlowUpdate?.(location.state.conversationFlow);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, onFlowUpdate]);

  const handleOpenFlowBuilder = () => {
    // Save form data before navigating
    const event = new CustomEvent('saveFormData');
    window.dispatchEvent(event);
    
    navigate('/flow-builder', {
      state: {
        initialFlow: conversationFlow,
        returnPath: location.pathname,
        botId
      }
    });
  };

  return (
    <CollapsibleSection
      title="Conversation Flow"
      icon={<MessageSquareText className="w-5 h-5" />}
      defaultOpen={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Design a step-by-step conversation flow for your bot. Add messages, questions, confirmations, branching logic, and redirects.
        </p>
        
        {conversationFlow?.nodes?.length ? (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              Flow configured with {conversationFlow.nodes.length} nodes and {conversationFlow.edges.length} connections
            </p>
          </div>
        ) : null}

        <Button 
          onClick={handleOpenFlowBuilder}
          className="w-full gap-2"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4" />
          Open Flow Builder
        </Button>
      </div>
    </CollapsibleSection>
  );
}