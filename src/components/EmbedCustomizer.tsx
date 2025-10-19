import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Palette, Save, Eye, RotateCcw, Code, MessageSquare, MousePointer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";

export interface EmbedCustomization {
  botId: string;
  // Chat customization
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
  chatCustomCSS?: string;
  useChatCustomCSS?: boolean;
  
  // Button customization
  buttonBackground: string;
  buttonColor: string;
  buttonSize: string;
  buttonBorderRadius: string;
  buttonPosition: string;
  buttonBottom: string;
  buttonRight: string;
  buttonLeft: string;
  buttonCustomCSS?: string;
  useButtonCustomCSS?: boolean;
}

interface EmbedCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
  onSave: (customization: EmbedCustomization) => void;
}

const defaultCustomization: Omit<EmbedCustomization, 'botId'> = {
  // Chat defaults
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
  chatCustomCSS: "",
  useChatCustomCSS: false,
  
  // Button defaults
  buttonBackground: "linear-gradient(135deg, #9b5de5, #f15bb5)",
  buttonColor: "#ffffff",
  buttonSize: "56",
  buttonBorderRadius: "50",
  buttonPosition: "bottom-right",
  buttonBottom: "20",
  buttonRight: "20",
  buttonLeft: "20",
  buttonCustomCSS: "",
  useButtonCustomCSS: false
};

const defaultChatCSS = `/* Chat container */
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

const defaultButtonCSS = `/* Chatbot button */
#chatbot-widget-button {
  /* background: linear-gradient(135deg, #9b5de5, #f15bb5); */
  /* width: 56px; */
  /* height: 56px; */
  /* border-radius: 50%; */
  /* box-shadow: 0 4px 10px rgba(0,0,0,0.3); */
}

/* Button hover effect */
#chatbot-widget-button:hover {
  /* transform: scale(1.05); */
  /* box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3); */
}

/* Button icon */
#chatbot-widget-button svg {
  /* fill: white; */
}`;

export const EmbedCustomizer = ({
  isOpen,
  onClose,
  botId,
  botName,
  onSave,
}: EmbedCustomizerProps) => {
  const { toast } = useToast();
  const chatIframeRef = useRef<HTMLIFrameElement>(null);
  const buttonPreviewRef = useRef<HTMLDivElement>(null);
  const [customization, setCustomization] = useState<EmbedCustomization>({
    ...defaultCustomization,
    botId,
    headerTitle: botName || defaultCustomization.headerTitle,
  });
  const [mainTab, setMainTab] = useState<string>("chat");
  const [chatSubTab, setChatSubTab] = useState<string>("visual");
  const [buttonSubTab, setButtonSubTab] = useState<string>("visual");

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
            chatCustomCSS: apiCustomization.chatCustomCSS || defaultCustomization.chatCustomCSS,
            useChatCustomCSS: apiCustomization.useChatCustomCSS ?? defaultCustomization.useChatCustomCSS,
            
            buttonBackground: apiCustomization.buttonBackground || defaultCustomization.buttonBackground,
            buttonColor: apiCustomization.buttonColor || defaultCustomization.buttonColor,
            buttonSize: apiCustomization.buttonSize || defaultCustomization.buttonSize,
            buttonBorderRadius: apiCustomization.buttonBorderRadius || defaultCustomization.buttonBorderRadius,
            buttonPosition: apiCustomization.buttonPosition || defaultCustomization.buttonPosition,
            buttonBottom: apiCustomization.buttonBottom || defaultCustomization.buttonBottom,
            buttonRight: apiCustomization.buttonRight || defaultCustomization.buttonRight,
            buttonLeft: apiCustomization.buttonLeft || defaultCustomization.buttonLeft,
            buttonCustomCSS: apiCustomization.buttonCustomCSS || defaultCustomization.buttonCustomCSS,
            useButtonCustomCSS: apiCustomization.useButtonCustomCSS ?? defaultCustomization.useButtonCustomCSS
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
    if (chatIframeRef.current && chatIframeRef.current.contentWindow) {
      chatIframeRef.current.contentWindow.postMessage({
        type: 'CUSTOMIZATION_UPDATE',
        customization: customization
      }, '*');
    }
  }, [customization]);

  // Update button preview
  useEffect(() => {
    if (mainTab === 'button') {
      // Small delay to ensure the ref is mounted
      const timer = setTimeout(() => {
        if (buttonPreviewRef.current) {
          updateButtonPreview();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [customization, mainTab]);

  const updateButtonPreview = () => {
    if (!buttonPreviewRef.current) {
      console.log('Button preview ref not available');
      return;
    }

    const container = buttonPreviewRef.current;
    container.innerHTML = '';

    // Create style element for custom CSS and hover effects
    const styleEl = document.createElement('style');
    if (customization.useButtonCustomCSS && customization.buttonCustomCSS) {
      // Replace #chatbot-widget-button with #preview-button for preview
      const previewCSS = customization.buttonCustomCSS.replace(/#chatbot-widget-button/g, '#preview-button');
      styleEl.textContent = previewCSS;
    } else {
      styleEl.textContent = `
        #preview-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }
      `;
    }
    container.appendChild(styleEl);

    // Create button
    const button = document.createElement('button');
    button.id = 'preview-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="${customization.buttonColor}" viewBox="0 0 24 24">
        <path d="M2 2v20l4-4h14V2H2zm16 10H6v-2h12v2z"/>
      </svg>
    `;

    if (customization.useButtonCustomCSS) {
      // When using custom CSS, only apply minimal positioning
      button.style.cssText = `
        position: absolute;
        bottom: ${customization.buttonPosition.includes('bottom') ? customization.buttonBottom : 'auto'}px;
        top: ${customization.buttonPosition.includes('top') ? customization.buttonBottom : 'auto'}px;
        right: ${customization.buttonPosition.includes('right') ? customization.buttonRight : 'auto'}px;
        left: ${customization.buttonPosition.includes('left') ? customization.buttonLeft : 'auto'}px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        transition: transform 0.2s, box-shadow 0.2s;
      `;
    } else {
      // Apply full visual editor styles
      button.style.cssText = `
        position: absolute;
        bottom: ${customization.buttonPosition.includes('bottom') ? customization.buttonBottom : 'auto'}px;
        top: ${customization.buttonPosition.includes('top') ? customization.buttonBottom : 'auto'}px;
        right: ${customization.buttonPosition.includes('right') ? customization.buttonRight : 'auto'}px;
        left: ${customization.buttonPosition.includes('left') ? customization.buttonLeft : 'auto'}px;
        background: ${customization.buttonBackground};
        color: ${customization.buttonColor};
        border: none;
        border-radius: ${customization.buttonBorderRadius}%;
        width: ${customization.buttonSize}px;
        height: ${customization.buttonSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;
    }

    container.appendChild(button);
    console.log('Button preview updated');
  };

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
        description: "Your embed customization has been updated successfully!"
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

  const handleInsertChatTemplate = () => {
    setCustomization(prev => ({
      ...prev,
      chatCustomCSS: defaultChatCSS
    }));
  };

  const handleInsertButtonTemplate = () => {
    setCustomization(prev => ({
      ...prev,
      buttonCustomCSS: defaultButtonCSS
    }));
  };

  const previewUrl = `${window.location.origin}/embed?botId=${botId}&preview=true`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Customize Embed Widget - {botName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Window
            </TabsTrigger>
            <TabsTrigger value="button" className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Chat Button
            </TabsTrigger>
          </TabsList>

          {/* CHAT TAB */}
          <TabsContent value="chat" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chat Customization Form */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <Tabs value={chatSubTab} onValueChange={setChatSubTab}>
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
                            checked={customization.useChatCustomCSS}
                            onCheckedChange={(checked) => handleInputChange('useChatCustomCSS', checked)}
                          />
                        </div>
                      </CardContent>
                    </Card>

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
                              className="w-12 h-12 p-1 rounded-full cursor-pointer"
                              disabled={customization.useChatCustomCSS}
                            />
                            <Input
                              value={customization.headerBackground}
                              onChange={(e) => handleInputChange('headerBackground', e.target.value)}
                              placeholder="#ffffff"
                              disabled={customization.useChatCustomCSS}
                            />
                          </div>
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
                              className="w-12 h-12 p-1 rounded-full cursor-pointer"
                              disabled={customization.useChatCustomCSS}
                            />
                            <Input
                              value={customization.primaryColor}
                              onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                              placeholder="#3b82f6"
                              disabled={customization.useChatCustomCSS}
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
                              disabled={customization.useChatCustomCSS}
                            />
                            <Input
                              value={customization.userMessageColor}
                              onChange={(e) => handleInputChange('userMessageColor', e.target.value)}
                              placeholder="#3b82f6"
                              disabled={customization.useChatCustomCSS}
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
                              disabled={customization.useChatCustomCSS}
                            />
                            <Input
                              value={customization.botMessageColor}
                              onChange={(e) => handleInputChange('botMessageColor', e.target.value)}
                              placeholder="#f1f5f9"
                              disabled={customization.useChatCustomCSS}
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
                          <Label htmlFor="borderRadius">Border Radius</Label>
                          <Input
                            id="borderRadius"
                            type="number"
                            value={customization.borderRadius}
                            onChange={(e) => handleInputChange('borderRadius', e.target.value)}
                            placeholder="8"
                            disabled={customization.useChatCustomCSS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fontFamily">Font Family</Label>
                          <Input
                            id="fontFamily"
                            value={customization.fontFamily}
                            onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                            placeholder="Inter, sans-serif"
                            disabled={customization.useChatCustomCSS}
                          />
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
                            onClick={handleInsertChatTemplate}
                          >
                            Insert Template
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="chatCustomCSS">CSS Code</Label>
                          <Textarea
                            id="chatCustomCSS"
                            value={customization.chatCustomCSS || ""}
                            onChange={(e) => handleInputChange('chatCustomCSS', e.target.value)}
                            placeholder="/* Write your custom CSS here */"
                            className="font-mono text-sm min-h-[300px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Toggle "Use Custom CSS" to apply your styles.
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
                          <p>.embed-chat-container</p>
                          <p>.embed-chat-header</p>
                          <p>.embed-bot-icon</p>
                          <p>.embed-user-message</p>
                          <p>.embed-bot-message</p>
                          <p>.embed-input</p>
                          <p>.embed-send-button</p>
                          <p>.embed-loading-dot</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Chat Preview */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Chat Window Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden h-[300px]">
                      <iframe
                        ref={chatIframeRef}
                        src={previewUrl}
                        className="w-full h-full"
                        style={{ filter: 'none' }}
                        onLoad={() => {
                          if (chatIframeRef.current && chatIframeRef.current.contentWindow) {
                            chatIframeRef.current.contentWindow.postMessage({
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
          </TabsContent>

          {/* BUTTON TAB */}
          <TabsContent value="button" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Button Customization Form */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <Tabs value={buttonSubTab} onValueChange={setButtonSubTab}>
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
                            checked={customization.useButtonCustomCSS}
                            onCheckedChange={(checked) => handleInputChange('useButtonCustomCSS', checked)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Button Appearance */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Button Appearance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="buttonBackground">Background</Label>
                          <Input
                            id="buttonBackground"
                            value={customization.buttonBackground}
                            onChange={(e) => handleInputChange('buttonBackground', e.target.value)}
                            placeholder="linear-gradient(135deg, #9b5de5, #f15bb5)"
                            disabled={customization.useButtonCustomCSS}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Use color code or gradient (e.g., linear-gradient(...))
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="buttonColor">Icon Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={customization.buttonColor}
                              onChange={(e) => handleInputChange('buttonColor', e.target.value)}
                              className="w-12 h-12 p-1 rounded-full cursor-pointer"
                              disabled={customization.useButtonCustomCSS}
                            />
                            <Input
                              value={customization.buttonColor}
                              onChange={(e) => handleInputChange('buttonColor', e.target.value)}
                              placeholder="#ffffff"
                              disabled={customization.useButtonCustomCSS}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="buttonSize">Button Size (px)</Label>
                          <Input
                            id="buttonSize"
                            type="number"
                            value={customization.buttonSize}
                            onChange={(e) => handleInputChange('buttonSize', e.target.value)}
                            placeholder="56"
                            disabled={customization.useButtonCustomCSS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="buttonBorderRadius">Border Radius (%)</Label>
                          <Input
                            id="buttonBorderRadius"
                            type="number"
                            value={customization.buttonBorderRadius}
                            onChange={(e) => handleInputChange('buttonBorderRadius', e.target.value)}
                            placeholder="50"
                            disabled={customization.useButtonCustomCSS}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            50% = circle, 0-20% = rounded square
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Button Position */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Button Position</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="buttonPosition">Position</Label>
                          <select
                            id="buttonPosition"
                            value={customization.buttonPosition}
                            onChange={(e) => handleInputChange('buttonPosition', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            disabled={customization.useButtonCustomCSS}
                          >
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-left">Bottom Left</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="buttonBottom">Bottom Distance (px)</Label>
                          <Input
                            id="buttonBottom"
                            type="number"
                            value={customization.buttonBottom}
                            onChange={(e) => handleInputChange('buttonBottom', e.target.value)}
                            placeholder="20"
                            disabled={customization.useButtonCustomCSS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="buttonRight">
                            {customization.buttonPosition === 'bottom-right' ? 'Right' : 'Left'} Distance (px)
                          </Label>
                          <Input
                            id="buttonRight"
                            type="number"
                            value={customization.buttonPosition === 'bottom-right' ? customization.buttonRight : customization.buttonLeft}
                            onChange={(e) => handleInputChange(
                              customization.buttonPosition === 'bottom-right' ? 'buttonRight' : 'buttonLeft',
                              e.target.value
                            )}
                            placeholder="20"
                            disabled={customization.useButtonCustomCSS}
                          />
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
                            onClick={handleInsertButtonTemplate}
                          >
                            Insert Template
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="buttonCustomCSS">CSS Code</Label>
                          <Textarea
                            id="buttonCustomCSS"
                            value={customization.buttonCustomCSS || ""}
                            onChange={(e) => handleInputChange('buttonCustomCSS', e.target.value)}
                            placeholder="/* Write your custom CSS here */"
                            className="font-mono text-sm min-h-[300px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Toggle "Use Custom CSS" to apply your styles. Use #chatbot-widget-button to target the button.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Available Selectors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs space-y-1 font-mono text-muted-foreground">
                          <p>#chatbot-widget-button - The button element</p>
                          <p>#chatbot-widget-button:hover - Button hover state</p>
                          <p>#chatbot-widget-button svg - Button icon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Button Preview */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Button Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      ref={buttonPreviewRef}
                      className="border rounded-lg h-[300px] bg-gradient-to-br from-gray-50 to-gray-100 relative"
                    >
                      {/* Button will be rendered here via updateButtonPreview */}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This preview shows how your button will appear on the website
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6">
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
