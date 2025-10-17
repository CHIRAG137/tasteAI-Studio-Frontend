import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Palette, Save, Eye, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";

export interface EmbedCustomization {
  botId: string;
  headerTitle: string;
  headerSubtitle: string;
  placeholder: string;
  primaryColor: string;
  backgroundColor: string;
  messageBackgroundColor: string;
  userMessageColor: string;
  botMessageColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
  headerBackground: string;
}

interface EmbedCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
  onSave: (customization: EmbedCustomization) => void;
  initialCustomization?: EmbedCustomization;
}

const defaultCustomization: Omit<EmbedCustomization, 'botId'> = {
  headerTitle: "Chat Assistant",
  headerSubtitle: "Online",
  placeholder: "Type your message...",
  primaryColor: "#3b82f6",
  backgroundColor: "#ffffff",
  messageBackgroundColor: "#f1f5f9",
  userMessageColor: "#3b82f6",
  botMessageColor: "#f1f5f9",
  textColor: "#1e293b",
  borderRadius: "8",
  fontFamily: "Inter, sans-serif",
  headerBackground: "#ffffff"
};

export const EmbedCustomizer = ({
  isOpen,
  onClose,
  botId,
  botName,
  onSave,
  initialCustomization
}: EmbedCustomizerProps) => {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [customization, setCustomization] = useState<EmbedCustomization>({
    ...defaultCustomization,
    botId,
    headerTitle: botName || defaultCustomization.headerTitle,
    ...initialCustomization
  });

  useEffect(() => {
    if (botId) {
      const fetchCustomization = async () => {
        try {
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`);
          if (response.data.customization) {
            setCustomization({
              ...defaultCustomization,
              botId,
              ...response.data.customization
            });
          } else {
            setCustomization({
              ...defaultCustomization,
              botId,
              headerTitle: botName || defaultCustomization.headerTitle
            });
          }
        } catch (error) {
          console.error('Error loading customization:', error);
          setCustomization({
            ...defaultCustomization,
            botId,
            headerTitle: botName || defaultCustomization.headerTitle
          });
        }
      };

      fetchCustomization();
    }
  }, [botId, botName]);

  // Send customization updates to iframe in real-time
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'CUSTOMIZATION_UPDATE',
        customization: customization
      }, '*');
    }
  }, [customization]);

  const handleInputChange = (field: keyof EmbedCustomization, value: string) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`, customization, {headers: getAuthHeaders()});
      onSave(customization);
      toast({
        title: "Customization Saved",
        description: "Your embed chat design has been updated successfully!"
      });
      onClose();
    } catch (error) {
      console.error('Error saving customization:', error);
      toast({
        title: "Error",
        description: "Failed to save customization. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setCustomization({
      ...defaultCustomization,
      botId,
      headerTitle: botName || defaultCustomization.headerTitle
    });
    toast({
      title: "Reset to Default",
      description: "All customizations have been reset to default values."
    });
  };

  const previewUrl = `${window.location.origin}/embed?botId=${botId}&preview=true`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Customize Embed Chat - {botName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customization Form */}
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Header Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Header Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="headerTitle">Header Title</Label>
                  <Input
                    id="headerTitle"
                    value={customization.headerTitle}
                    onChange={(e) => handleInputChange('headerTitle', e.target.value)}
                    placeholder="Chat Assistant"
                  />
                </div>
                <div>
                  <Label htmlFor="headerSubtitle">Header Subtitle</Label>
                  <Input
                    id="headerSubtitle"
                    value={customization.headerSubtitle}
                    onChange={(e) => handleInputChange('headerSubtitle', e.target.value)}
                    placeholder="Online"
                  />
                </div>
                <div>
                  <Label htmlFor="headerBackground">Header Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.headerBackground}
                      onChange={(e) => handleInputChange('headerBackground', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={customization.headerBackground}
                      onChange={(e) => handleInputChange('headerBackground', e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="placeholder">Input Placeholder</Label>
                  <Input
                    id="placeholder"
                    value={customization.placeholder}
                    onChange={(e) => handleInputChange('placeholder', e.target.value)}
                    placeholder="Type your message..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Color Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Color Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={customization.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={customization.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="userMessageColor">User Message Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.userMessageColor}
                      onChange={(e) => handleInputChange('userMessageColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={customization.userMessageColor}
                      onChange={(e) => handleInputChange('userMessageColor', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="botMessageColor">Bot Message Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.botMessageColor}
                      onChange={(e) => handleInputChange('botMessageColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={customization.botMessageColor}
                      onChange={(e) => handleInputChange('botMessageColor', e.target.value)}
                      placeholder="#f1f5f9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Style Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Style Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="borderRadius">Border Radius (px)</Label>
                  <Input
                    id="borderRadius"
                    type="number"
                    value={customization.borderRadius}
                    onChange={(e) => handleInputChange('borderRadius', e.target.value)}
                    placeholder="8"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Input
                    id="fontFamily"
                    value={customization.fontFamily}
                    onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                    placeholder="Inter, sans-serif"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden h-96">
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="w-full h-full"
                    style={{
                      filter: 'none',
                      backgroundColor: customization.backgroundColor
                    }}
                    onLoad={() => {
                      // Send initial customization when iframe loads
                      if (iframeRef.current && iframeRef.current.contentWindow) {
                        iframeRef.current.contentWindow.postMessage({
                          type: 'CUSTOMIZATION_UPDATE',
                          customization: customization
                        }, '*');
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-between items-center">
          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Customization
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};
