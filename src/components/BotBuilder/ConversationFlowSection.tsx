import { MessageSquareText } from 'lucide-react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { FlowBuilder } from '@/components/FlowBuilder/FlowBuilder';
import { Node, Edge } from '@xyflow/react';

interface ConversationFlowSectionProps {
  botId?: string;
  onFlowSave?: (nodes: Node[], edges: Edge[]) => void;
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void; // New prop for real-time updates
}

export function ConversationFlowSection({ 
  botId,
  onFlowSave,
  onFlowChange 
}: ConversationFlowSectionProps) {
  return (
    <CollapsibleSection
      title="Conversation Flow"
      icon={<MessageSquareText className="w-5 h-5" />}
      defaultOpen={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Design a step-by-step conversation flow for your bot. Add messages, questions, confirmations, branching logic, and redirects.
          Changes are automatically saved to your bot configuration.
        </p>
        <FlowBuilder 
          botId={botId} 
          onSave={onFlowSave}
          onFlowChange={onFlowChange} // Pass the real-time update handler
        />
      </div>
    </CollapsibleSection>
  );
}