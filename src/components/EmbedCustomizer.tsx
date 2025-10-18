import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Palette, Save, Eye, RotateCcw, Code } from "lucide-react";
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
  customCSS?: string;
  useCustomCSS?: boolean;
}

interface EmbedCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
  onSave: (customization: EmbedCustomization) => void;
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
  headerBackground: "#ffffff",
  customCSS: "",
  useCustomCSS: false
};

const defaultCustomCSS = `/* Chat container */
.embed-chat-container {
  /* background-color: #ffffff; */
}

/* Chat header */
.embed-chat-header {
  /* background-color: #ffffff; */
  /* border-bottom: 1px solid #e2e8f0; */
}

/* Bot icon */
.embed-bot-icon {
  /* background-color: rgba(59, 130, 246, 0.2); */
  /* color: #3b82f6; */
}

/* User message bubble */
.embed-user-message {
  /* background-color: #3b82f6; */
  /* color: #ffffff; */
  /* border-radius: 8px; */
}

/* Bot message bubble */
.embed-bot-message {
  /* background-color: #f1f5f9; */
  /* color: #1e293b; */
  /* border-radius: 8px; */
}

/* Input field */
.embed-input {
  /* background-color: #ffffff; */
  /* border-color: #e2e8f0; */
  /* border-radius: 8px; */
}

/* Send button */
.embed-send-button {
  /* background-color: #3b82f6; */
  /* border-radius: 8px; */
}

/* Loading dots */
.embed-loading-dot {
  /* background-color: #94a3b8; */
}`;

export const EmbedCustomizer = ({
  isOpen,
  onClose,
  botId,
  botName,
  onSave,
}: EmbedCustomizerProps) => {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [customization, setCustomization] = useState<EmbedCustomization>({
    ...defaultCustomization,
    botId,
    headerTitle: botName || defaultCustomization.headerTitle,
  });
  const [activeTab, setActiveTab] = useState<string>("visual");

  useEffect(() => {
    if (isOpen && botId) {
      const fetchCustomization = async () => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`
          );
          const data = await response.json();

          const apiCustomization = data.result || {};

          setCustomization({
            ...defaultCustomization,
            botId,
            headerTitle: apiCustomization.headerTitle || botName || defaultCustomization.headerTitle,
            headerSubtitle: apiCustomization.headerSubtitle || defaultCustomization.headerSubtitle,
            placeholder: apiCustomization.placeholder || defaultCustomization.placeholder,
            primaryColor: apiCustomization.primaryColor || defaultCustomization.primaryColor,
            backgroundColor: apiCustomization.backgroundColor || defaultCustomization.backgroundColor,
            messageBackgroundColor: apiCustomization.messageBackgroundColor || defaultCustomization.messageBackgroundColor,
            userMessageColor: apiCustomization.userMessageColor || defaultCustomization.userMessageColor,
            botMessageColor: apiCustomization.botMessageColor || defaultCustomization.botMessageColor,
            textColor: apiCustomization.textColor || defaultCustomization.textColor,
            borderRadius: apiCustomization.borderRadius || defaultCustomization.borderRadius,
            fontFamily: apiCustomization.fontFamily || defaultCustomization.fontFamily,
            headerBackground: apiCustomization.headerBackground || defaultCustomization.headerBackground,
            customCSS: apiCustomization.customCSS || defaultCustomization.customCSS,
            useCustomCSS: apiCustomization.useCustomCSS ?? defaultCustomization.useCustomCSS
          });
        } catch (error) {
          console.error("Error loading customization:", error);
          setCustomization({
            ...defaultCustomization,
            botId,
            headerTitle: botName || defaultCustomization.headerTitle
          });
        }
      };

      fetchCustomization();
    }
  }, [isOpen, botId, botName]);

  // Send customization updates to iframe in real-time
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'CUSTOMIZATION_UPDATE',
        customization: customization
      }, '*');
    }
  }, [customization]);

  const handleInputChange = (field: keyof EmbedCustomization, value: string | boolean) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/customisation/${botId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(customization)
        }
      );

      if (!response.ok) throw new Error('Failed to save');

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

  const handleInsertTemplate = () => {
    setCustomization(prev => ({
      ...prev,
      customCSS: defaultCustomCSS
    }));
  };

  const previewUrl = `${window.location.origin}/embed?botId=${botId}&preview=true`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Customize Embed Chat - {botName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customization Form */}
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Visual Editor
                </TabsTrigger>
                <TabsTrigger value="css" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  CSS Editor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="space-y-4 mt-4">
                {/* Use Custom CSS Toggle */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Use Custom CSS</Label>
                        <p className="text-xs text-muted-foreground">
                          Override visual settings with custom CSS
                        </p>
                      </div>
                      <Switch
                        checked={customization.useCustomCSS}
                        onCheckedChange={(checked) => handleInputChange('useCustomCSS', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Visual Editor Forms */}
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
                      // Always enabled, even if useCustomCSS is true
                      />
                    </div>
                    <div>
                      <Label htmlFor="headerSubtitle">Header Subtitle</Label>
                      <Input
                        id="headerSubtitle"
                        value={customization.headerSubtitle}
                        onChange={(e) => handleInputChange('headerSubtitle', e.target.value)}
                        placeholder="Online"
                      // Always enabled, even if useCustomCSS is true
                      />
                    </div>
                    <div>
                      <Label htmlFor="headerBackground">Header Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={customization.headerBackground}
                          onChange={(e) => handleInputChange('headerBackground', e.target.value)}
                          className="w-12 h-12 p-1 rounded-full cursor-pointer"
                          disabled={customization.useCustomCSS}
                        />
                        <Input
                          value={customization.headerBackground}
                          onChange={(e) => handleInputChange('headerBackground', e.target.value)}
                          placeholder="#ffffff"
                          disabled={customization.useCustomCSS}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                          className="w-12 h-12 p-1 rounded-full cursor-pointer"
                          disabled={customization.useCustomCSS}
                        />
                        <Input
                          value={customization.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="#3b82f6"
                          disabled={customization.useCustomCSS}
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
                          className="w-12 h-12 p-1 rounded-full cursor-pointer"
                          disabled={customization.useCustomCSS}
                        />
                        <Input
                          value={customization.userMessageColor}
                          onChange={(e) => handleInputChange('userMessageColor', e.target.value)}
                          placeholder="#3b82f6"
                          disabled={customization.useCustomCSS}
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
                          className="w-12 h-12 p-1 rounded-full cursor-pointer"
                          disabled={customization.useCustomCSS}
                        />
                        <Input
                          value={customization.botMessageColor}
                          onChange={(e) => handleInputChange('botMessageColor', e.target.value)}
                          placeholder="#f1f5f9"
                          disabled={customization.useCustomCSS}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Style Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Border Radius */}
                    <div>
                      <Label htmlFor="borderRadius">Border Radius</Label>
                      <Input
                        id="borderRadius"
                        type="number"
                        value={customization.borderRadius}
                        onChange={(e) => handleInputChange('borderRadius', e.target.value)}
                        placeholder="8"
                        disabled={customization.useCustomCSS}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set the border radius for chat bubbles and input fields.
                      </p>
                    </div>

                    {/* Font Family */}
                    <div>
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Input
                        id="fontFamily"
                        value={customization.fontFamily}
                        onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                        placeholder="Inter, sans-serif"
                        disabled={customization.useCustomCSS}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set the font family used in the chat widget.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="css" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Custom CSS
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleInsertTemplate}
                      >
                        Insert Template
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customCSS">CSS Code</Label>
                      <Textarea
                        id="customCSS"
                        value={customization.customCSS || ""}
                        onChange={(e) => handleInputChange('customCSS', e.target.value)}
                        placeholder="/* Write your custom CSS here */"
                        className="font-mono text-sm min-h-[400px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use the provided class names to style different parts of the chat widget.
                        Toggle "Use Custom CSS" in the Visual Editor tab to apply your styles.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Available CSS Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1 font-mono text-muted-foreground">
                      <p>.embed-chat-container - Main container</p>
                      <p>.embed-chat-header - Header section</p>
                      <p>.embed-bot-icon - Bot icon</p>
                      <p>.embed-user-message - User message bubbles</p>
                      <p>.embed-bot-message - Bot message bubbles</p>
                      <p>.embed-input - Input field</p>
                      <p>.embed-send-button - Send button</p>
                      <p>.embed-loading-dot - Loading animation dots</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
                <div className="border rounded-lg overflow-hidden h-[420px]">
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="w-full h-full"
                    style={{ filter: 'none' }}
                    onLoad={() => {
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
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Customization
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
