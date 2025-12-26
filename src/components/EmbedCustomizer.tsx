import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Palette, Save, Eye, RotateCcw, Code, MessageSquare, MousePointer, Sparkles } from "lucide-react";
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
  
  // Enhanced button customization
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
  
  // New button features
  buttonText?: string;
  buttonShowText?: boolean;
  buttonTextPosition?: 'left' | 'right' | 'top' | 'bottom';
  buttonIcon?: string;
  buttonIconType?: 'default' | 'custom' | 'emoji' | 'none';
  buttonCustomIcon?: string;
  buttonIconSize?: string;
  buttonAnimation?: string;
  buttonHoverAnimation?: string;
  buttonPulse?: boolean;
  buttonShadow?: string;
  buttonTextColor?: string;
  buttonTextSize?: string;
  buttonPadding?: string;
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
  useButtonCustomCSS: false,
  
  // New button features
  buttonText: "Chat with us",
  buttonShowText: false,
  buttonTextPosition: "left",
  buttonIcon: "chat",
  buttonIconType: "default",
  buttonCustomIcon: "",
  buttonIconSize: "24",
  buttonAnimation: "none",
  buttonHoverAnimation: "scale",
  buttonPulse: false,
  buttonShadow: "0 4px 10px rgba(0,0,0,0.3)",
  buttonTextColor: "#1e293b",
  buttonTextSize: "14",
  buttonPadding: "12"
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

const defaultButtonCSS = `/* ============================================
   CHATBOT BUTTON CUSTOMIZATION
   Complete control over button appearance
   ============================================ */

/* Main Button Container */
#chatbot-widget-button {
  /* Position */
  position: fixed;
  bottom: 20px;
  right: 20px;
  
  /* Size */
  width: 56px;
  height: 56px;
  
  /* Appearance */
  background: linear-gradient(135deg, #9b5de5, #f15bb5);
  border: none;
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  
  /* Layout */
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Interaction */
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 9999;
}

/* Hover Effect */
#chatbot-widget-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
}

/* Active/Click Effect */
#chatbot-widget-button:active {
  transform: scale(0.95);
}

/* Button Icon */
#chatbot-widget-button svg {
  width: 24px;
  height: 24px;
  fill: white;
  transition: transform 0.3s ease;
}

#chatbot-widget-button:hover svg {
  transform: rotate(10deg);
}

/* ============================================
   OPTIONAL: Text Label Next to Button
   ============================================ */

/* Text label container (if enabled) */
#chatbot-widget-button-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chatbot-button-text {
  background: white;
  color: #1e293b;
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

/* ============================================
   ANIMATIONS
   ============================================ */

/* Bounce Animation */
@keyframes bounce-button {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Apply bounce */
.animate-bounce {
  animation: bounce-button 2s infinite;
}

/* Pulse Animation */
@keyframes pulse-button {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.animate-pulse {
  animation: pulse-button 2s infinite;
}

/* Shake Animation */
@keyframes shake-button {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake-button 0.5s infinite;
}

/* Rotate Animation */
@keyframes rotate-button {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-rotate {
  animation: rotate-button 3s linear infinite;
}

/* Swing Animation */
@keyframes swing-button {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
}

.animate-swing {
  animation: swing-button 2s ease-in-out infinite;
  transform-origin: top center;
}

/* Tada Animation */
@keyframes tada-button {
  0%, 100% { transform: scale(1) rotate(0deg); }
  10%, 20% { transform: scale(0.9) rotate(-3deg); }
  30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
  40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
}

.animate-tada {
  animation: tada-button 2s infinite;
}

/* Wobble Animation */
@keyframes wobble-button {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  15% { transform: translateX(-25px) rotate(-5deg); }
  30% { transform: translateX(20px) rotate(3deg); }
  45% { transform: translateX(-15px) rotate(-3deg); }
  60% { transform: translateX(10px) rotate(2deg); }
  75% { transform: translateX(-5px) rotate(-1deg); }
}

.animate-wobble {
  animation: wobble-button 2s infinite;
}

/* Pulse Ring Effect */
@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

#chatbot-widget-button.pulse-effect::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: pulse-ring 2s infinite;
  z-index: -1;
}

/* ============================================
   HOVER ANIMATIONS
   ============================================ */

/* Scale on Hover */
#chatbot-widget-button.hover-scale:hover {
  transform: scale(1.15);
}

/* Lift on Hover */
#chatbot-widget-button.hover-lift:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

/* Glow on Hover */
#chatbot-widget-button.hover-glow:hover {
  box-shadow: 0 0 25px rgba(155, 93, 229, 0.8);
}

/* Rotate on Hover */
#chatbot-widget-button.hover-rotate:hover {
  transform: rotate(360deg);
}

/* ============================================
   EXAMPLES & VARIATIONS
   ============================================ */

/* Example: Square Button with Rounded Corners */
/*
#chatbot-widget-button {
  border-radius: 12px;
}
*/

/* Example: Different Color Scheme */
/*
#chatbot-widget-button {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
*/

/* Example: Simple Solid Color */
/*
#chatbot-widget-button {
  background: #3b82f6;
}
*/

/* Example: Bottom Left Position */
/*
#chatbot-widget-button {
  bottom: 20px;
  right: auto;
  left: 20px;
}
*/

/* Example: Larger Button */
/*
#chatbot-widget-button {
  width: 70px;
  height: 70px;
}

#chatbot-widget-button svg {
  width: 32px;
  height: 32px;
}
*/`;

const iconOptions = [
  { value: 'chat', label: 'Chat Bubble', path: 'M2 2v20l4-4h14V2H2zm16 10H6v-2h12v2z' },
  { value: 'message', label: 'Message', path: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
  { value: 'support', label: 'Support', path: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z' },
  { value: 'help', label: 'Help Circle', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z' },
  { value: 'bot', label: 'Robot', path: 'M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z' }
];

const animationOptions = [
  { value: 'none', label: 'None' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'shake', label: 'Shake' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'swing', label: 'Swing' },
  { value: 'tada', label: 'Tada' },
  { value: 'wobble', label: 'Wobble' }
];

const hoverAnimationOptions = [
  { value: 'none', label: 'None' },
  { value: 'scale', label: 'Scale Up' },
  { value: 'lift', label: 'Lift' },
  { value: 'glow', label: 'Glow' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'bounce', label: 'Bounce' }
];

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
            ...apiCustomization,
            headerTitle: apiCustomization.headerTitle || botName || defaultCustomization.headerTitle
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

  useEffect(() => {
    if (chatIframeRef.current && chatIframeRef.current.contentWindow) {
      chatIframeRef.current.contentWindow.postMessage({
        type: 'CUSTOMIZATION_UPDATE',
        customization: customization
      }, '*');
    }
  }, [customization]);

  useEffect(() => {
    if (mainTab === 'button') {
      const timer = setTimeout(() => {
        if (buttonPreviewRef.current) {
          updateButtonPreview();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [customization, mainTab]);

  const getAnimationCSS = (animation: string) => {
    const animations: Record<string, string> = {
      bounce: `
        @keyframes bounce-anim {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        #preview-button { animation: bounce-anim 2s infinite; }
      `,
      pulse: `
        @keyframes pulse-anim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        #preview-button { animation: pulse-anim 2s infinite; }
      `,
      shake: `
        @keyframes shake-anim {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        #preview-button { animation: shake-anim 0.5s infinite; }
      `,
      rotate: `
        @keyframes rotate-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        #preview-button { animation: rotate-anim 3s linear infinite; }
      `,
      swing: `
        @keyframes swing-anim {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        #preview-button { 
          animation: swing-anim 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `,
      tada: `
        @keyframes tada-anim {
          0%, 100% { transform: scale(1) rotate(0deg); }
          10%, 20% { transform: scale(0.9) rotate(-3deg); }
          30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
          40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
        }
        #preview-button { animation: tada-anim 2s infinite; }
      `,
      wobble: `
        @keyframes wobble-anim {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-25px) rotate(-5deg); }
          30% { transform: translateX(20px) rotate(3deg); }
          45% { transform: translateX(-15px) rotate(-3deg); }
          60% { transform: translateX(10px) rotate(2deg); }
          75% { transform: translateX(-5px) rotate(-1deg); }
        }
        #preview-button { animation: wobble-anim 2s infinite; }
      `
    };
    return animations[animation] || '';
  };

  const getHoverAnimationCSS = (animation: string) => {
    const hoverAnimations: Record<string, string> = {
      scale: 'transform: scale(1.15) !important;',
      lift: 'transform: translateY(-8px) !important; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3) !important;',
      glow: 'box-shadow: 0 0 25px rgba(155, 93, 229, 0.8) !important;',
      rotate: 'transform: rotate(360deg) !important;',
      bounce: 'animation: bounce-hover 0.5s !important;'
    };
    return hoverAnimations[animation] || '';
  };

  const updateButtonPreview = () => {
    if (!buttonPreviewRef.current) return;

    const container = buttonPreviewRef.current;
    container.innerHTML = '';

    const styleEl = document.createElement('style');
    
    if (customization.useButtonCustomCSS && customization.buttonCustomCSS) {
      // Use custom CSS - completely independent from visual editor
      const previewCSS = customization.buttonCustomCSS.replace(/#chatbot-widget-button/g, '#preview-button');
      styleEl.textContent = previewCSS;
    } else {
      // Use visual editor settings
      let styles = '';
      
      // Add animation keyframes if needed
      if (customization.buttonAnimation && customization.buttonAnimation !== 'none') {
        styles += getAnimationCSS(customization.buttonAnimation);
      }
      
      // Add pulse ring animation if enabled
      if (customization.buttonPulse) {
        styles += `
          @keyframes pulse-ring-preview {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          #preview-button::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: inherit;
            animation: pulse-ring-preview 2s infinite;
            z-index: -1;
          }
        `;
      }
      
      // Add hover animation
      if (customization.buttonHoverAnimation && customization.buttonHoverAnimation !== 'none') {
        styles += `
          #preview-button:hover {
            ${getHoverAnimationCSS(customization.buttonHoverAnimation)}
          }
        `;
      } else {
        styles += `
          #preview-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
          }
        `;
      }
      
      // Base button transition
      styles += `
        #preview-button {
          transition: all 0.3s ease;
        }
      `;
      
      styleEl.textContent = styles;
    }
    
    container.appendChild(styleEl);

    // Create button wrapper for positioning
    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.cssText = `
      position: absolute;
      bottom: ${customization.buttonPosition.includes('bottom') ? customization.buttonBottom : 'auto'}px;
      top: ${customization.buttonPosition.includes('top') ? customization.buttonBottom : 'auto'}px;
      right: ${customization.buttonPosition.includes('right') ? customization.buttonRight : 'auto'}px;
      left: ${customization.buttonPosition.includes('left') ? customization.buttonLeft : 'auto'}px;
      display: flex;
      align-items: center;
      gap: 8px;
      ${customization.buttonTextPosition === 'right' ? 'flex-direction: row;' : ''}
      ${customization.buttonTextPosition === 'left' ? 'flex-direction: row-reverse;' : ''}
      ${customization.buttonTextPosition === 'bottom' ? 'flex-direction: column;' : ''}
      ${customization.buttonTextPosition === 'top' ? 'flex-direction: column-reverse;' : ''}
    `;

    // Add text label if enabled
    if (customization.buttonShowText && customization.buttonText && !customization.useButtonCustomCSS) {
      const textEl = document.createElement('div');
      textEl.textContent = customization.buttonText;
      textEl.style.cssText = `
        background: white;
        padding: ${customization.buttonPadding}px;
        border-radius: 20px;
        box-shadow: ${customization.buttonShadow};
        color: ${customization.buttonTextColor};
        font-size: ${customization.buttonTextSize}px;
        white-space: nowrap;
        font-weight: 500;
      `;
      buttonWrapper.appendChild(textEl);
    }

    // Create the button
    const button = document.createElement('button');
    button.id = 'preview-button';

    // Generate icon HTML
    let iconHTML = '';
    if (!customization.useButtonCustomCSS) {
      if (customization.buttonIconType === 'emoji' && customization.buttonCustomIcon) {
        iconHTML = `<span style="font-size: ${customization.buttonIconSize}px;">${customization.buttonCustomIcon}</span>`;
      } else if (customization.buttonIconType === 'custom' && customization.buttonCustomIcon) {
        iconHTML = customization.buttonCustomIcon;
      } else if (customization.buttonIconType !== 'none') {
        const selectedIcon = iconOptions.find(i => i.value === customization.buttonIcon) || iconOptions[0];
        iconHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" height="${customization.buttonIconSize}" width="${customization.buttonIconSize}" fill="${customization.buttonColor}" viewBox="0 0 24 24">
            <path d="${selectedIcon.path}"/>
          </svg>
        `;
      }
    }

    button.innerHTML = iconHTML;

    // Apply button styles
    if (customization.useButtonCustomCSS) {
      // Minimal styling when using custom CSS
      button.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
      `;
    } else {
      // Full styling from visual editor
      button.style.cssText = `
        position: relative;
        background: ${customization.buttonBackground};
        color: ${customization.buttonColor};
        border: none;
        border-radius: ${customization.buttonBorderRadius}%;
        width: ${customization.buttonSize}px;
        height: ${customization.buttonSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${customization.buttonShadow};
        cursor: pointer;
      `;
    }

    buttonWrapper.appendChild(button);
    container.appendChild(buttonWrapper);
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
      chatCustomCSS: defaultChatCSS,
      useChatCustomCSS: true
    }));
    toast({
      title: "Template Inserted",
      description: "Default CSS template has been inserted. Customize it as needed!"
    });
  };

  const handleInsertButtonTemplate = () => {
    setCustomization(prev => ({
      ...prev,
      buttonCustomCSS: defaultButtonCSS,
      useButtonCustomCSS: true
    }));
    toast({
      title: "Template Inserted",
      description: "Default CSS template has been inserted. Customize it as needed!"
    });
  };

  const previewUrl = `${window.location.origin}/embed?botId=${botId}&preview=true`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Used for bot icon, send button, and accents
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="backgroundColor">Chat Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={customization.backgroundColor}
                              onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                              className="w-12 h-12 p-1 rounded-full cursor-pointer"
                              disabled={customization.useChatCustomCSS}
                            />
                            <Input
                              value={customization.backgroundColor}
                              onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                              placeholder="#ffffff"
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
                        <div>
                          <Label htmlFor="textColor">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={customization.textColor}
                              onChange={(e) => handleInputChange('textColor', e.target.value)}
                              className="w-12 h-12 p-1 rounded-full cursor-pointer"
                              disabled={customization.useChatCustomCSS}
                            />
                            <Input
                              value={customization.textColor}
                              onChange={(e) => handleInputChange('textColor', e.target.value)}
                              placeholder="#1e293b"
                              disabled={customization.useChatCustomCSS}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Main text color for messages and UI elements
                          </p>
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
                            disabled={customization.useChatCustomCSS}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied to messages, buttons, and input fields
                          </p>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            e.g., "Roboto, sans-serif" or "Georgia, serif"
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="placeholder">Input Placeholder Text</Label>
                          <Input
                            id="placeholder"
                            value={customization.placeholder}
                            onChange={(e) => handleInputChange('placeholder', e.target.value)}
                            placeholder="Type your message..."
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="css" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          Custom CSS Editor
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleInsertChatTemplate}
                          >
                            Insert Full Template
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Note:</strong> Custom CSS is completely independent from the Visual Editor. 
                            When enabled, all visual settings are ignored and only your CSS code is used.
                            Click "Insert Full Template" to get started with a comprehensive default template.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chatCustomCSS">CSS Code</Label>
                          <Textarea
                            id="chatCustomCSS"
                            value={customization.chatCustomCSS || ""}
                            onChange={(e) => handleInputChange('chatCustomCSS', e.target.value)}
                            placeholder="/* Click 'Insert Full Template' to get started with a complete CSS template */"
                            className="font-mono text-sm min-h-[400px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Toggle "Use Custom CSS" above to apply your styles. Use the classes listed below to target specific elements.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Available CSS Classes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs space-y-2 font-mono text-muted-foreground">
                          <div>
                            <p className="font-semibold text-foreground mb-1">Main Components:</p>
                            <p>.embed-chat-container - Main chat container</p>
                            <p>.embed-chat-header - Header section</p>
                            <p>.embed-bot-icon - Bot avatar icon</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground mb-1">Messages:</p>
                            <p>.embed-user-message - User message bubble</p>
                            <p>.embed-bot-message - Bot message bubble</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground mb-1">Input Area:</p>
                            <p>.embed-input - Input text field</p>
                            <p>.embed-send-button - Send button</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground mb-1">Loading:</p>
                            <p>.embed-loading-dot - Loading animation dots</p>
                          </div>
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
                    <div className="border rounded-lg overflow-hidden" style={{ height: '320px' }}>
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
                    <p className="text-xs text-muted-foreground mt-2">
                      Live preview of your chat window with current customization
                    </p>
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

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Button Content
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="buttonIconType">Icon Type</Label>
                          <select
                            id="buttonIconType"
                            value={customization.buttonIconType}
                            onChange={(e) => handleInputChange('buttonIconType', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            disabled={customization.useButtonCustomCSS}
                          >
                            <option value="default">Default Icons</option>
                            <option value="emoji">Emoji</option>
                            <option value="custom">Custom SVG/HTML</option>
                            <option value="none">No Icon</option>
                          </select>
                        </div>

                        {customization.buttonIconType === 'default' && (
                          <div>
                            <Label htmlFor="buttonIcon">Select Icon</Label>
                            <select
                              id="buttonIcon"
                              value={customization.buttonIcon}
                              onChange={(e) => handleInputChange('buttonIcon', e.target.value)}
                              className="w-full p-2 border rounded-md"
                              disabled={customization.useButtonCustomCSS}
                            >
                              {iconOptions.map(icon => (
                                <option key={icon.value} value={icon.value}>{icon.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {(customization.buttonIconType === 'emoji' || customization.buttonIconType === 'custom') && (
                          <div>
                            <Label htmlFor="buttonCustomIcon">
                              {customization.buttonIconType === 'emoji' ? 'Emoji' : 'Custom SVG/HTML'}
                            </Label>
                            <Input
                              id="buttonCustomIcon"
                              value={customization.buttonCustomIcon}
                              onChange={(e) => handleInputChange('buttonCustomIcon', e.target.value)}
                              placeholder={customization.buttonIconType === 'emoji' ? '💬' : '<svg>...</svg>'}
                              disabled={customization.useButtonCustomCSS}
                            />
                          </div>
                        )}

                        {customization.buttonIconType !== 'none' && (
                          <div>
                            <Label htmlFor="buttonIconSize">Icon Size (px)</Label>
                            <Input
                              id="buttonIconSize"
                              type="number"
                              value={customization.buttonIconSize}
                              onChange={(e) => handleInputChange('buttonIconSize', e.target.value)}
                              placeholder="24"
                              disabled={customization.useButtonCustomCSS}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Size of the icon inside the button
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Show Text Label</Label>
                            <Switch
                              checked={customization.buttonShowText}
                              onCheckedChange={(checked) => handleInputChange('buttonShowText', checked)}
                              disabled={customization.useButtonCustomCSS}
                            />
                          </div>
                        </div>

                        {customization.buttonShowText && (
                          <>
                            <div>
                              <Label htmlFor="buttonText">Button Text</Label>
                              <Input
                                id="buttonText"
                                value={customization.buttonText}
                                onChange={(e) => handleInputChange('buttonText', e.target.value)}
                                placeholder="Chat with us"
                                disabled={customization.useButtonCustomCSS}
                              />
                            </div>

                            <div>
                              <Label htmlFor="buttonTextPosition">Text Position</Label>
                              <select
                                id="buttonTextPosition"
                                value={customization.buttonTextPosition}
                                onChange={(e) => handleInputChange('buttonTextPosition', e.target.value)}
                                className="w-full p-2 border rounded-md"
                                disabled={customization.useButtonCustomCSS}
                              >
                                <option value="left">Left of Button</option>
                                <option value="right">Right of Button</option>
                                <option value="top">Above Button</option>
                                <option value="bottom">Below Button</option>
                              </select>
                            </div>

                            <div>
                              <Label htmlFor="buttonTextColor">Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={customization.buttonTextColor}
                                  onChange={(e) => handleInputChange('buttonTextColor', e.target.value)}
                                  className="w-12 h-12 p-1 rounded cursor-pointer"
                                  disabled={customization.useButtonCustomCSS}
                                />
                                <Input
                                  value={customization.buttonTextColor}
                                  onChange={(e) => handleInputChange('buttonTextColor', e.target.value)}
                                  placeholder="#1e293b"
                                  disabled={customization.useButtonCustomCSS}
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="buttonTextSize">Text Size (px)</Label>
                              <Input
                                id="buttonTextSize"
                                type="number"
                                value={customization.buttonTextSize}
                                onChange={(e) => handleInputChange('buttonTextSize', e.target.value)}
                                placeholder="14"
                                disabled={customization.useButtonCustomCSS}
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

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
                            Use color code or gradient
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="buttonColor">Icon Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={customization.buttonColor}
                              onChange={(e) => handleInputChange('buttonColor', e.target.value)}
                              className="w-12 h-12 p-1 rounded cursor-pointer"
                              disabled={customization.useButtonCustomCSS}
                            />
                            <Input
                              value={customization.buttonColor}
                              onChange={(e) => handleInputChange('buttonColor', e.target.value)}
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
                            disabled={customization.useButtonCustomCSS}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            50% = circle, 0-20% = rounded square
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="buttonShadow">Box Shadow</Label>
                          <Input
                            id="buttonShadow"
                            value={customization.buttonShadow}
                            onChange={(e) => handleInputChange('buttonShadow', e.target.value)}
                            placeholder="0 4px 10px rgba(0,0,0,0.3)"
                            disabled={customization.useButtonCustomCSS}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Animations & Effects</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="buttonAnimation">Entry Animation</Label>
                          <select
                            id="buttonAnimation"
                            value={customization.buttonAnimation}
                            onChange={(e) => handleInputChange('buttonAnimation', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            disabled={customization.useButtonCustomCSS}
                          >
                            {animationOptions.map(anim => (
                              <option key={anim.value} value={anim.value}>{anim.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="buttonHoverAnimation">Hover Effect</Label>
                          <select
                            id="buttonHoverAnimation"
                            value={customization.buttonHoverAnimation}
                            onChange={(e) => handleInputChange('buttonHoverAnimation', e.target.value)}
                            className="w-full p-2 border rounded-md"
                            disabled={customization.useButtonCustomCSS}
                          >
                            {hoverAnimationOptions.map(anim => (
                              <option key={anim.value} value={anim.value}>{anim.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Pulse Effect</Label>
                              <p className="text-xs text-muted-foreground">Add attention-grabbing pulse ring</p>
                            </div>
                            <Switch
                              checked={customization.buttonPulse}
                              onCheckedChange={(checked) => handleInputChange('buttonPulse', checked)}
                              disabled={customization.useButtonCustomCSS}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

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
                            disabled={customization.useButtonCustomCSS}
                          />
                        </div>
                        <div>
                          <Label>
                            {customization.buttonPosition === 'bottom-right' ? 'Right' : 'Left'} Distance (px)
                          </Label>
                          <Input
                            type="number"
                            value={customization.buttonPosition === 'bottom-right' ? customization.buttonRight : customization.buttonLeft}
                            onChange={(e) => handleInputChange(
                              customization.buttonPosition === 'bottom-right' ? 'buttonRight' : 'buttonLeft',
                              e.target.value
                            )}
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
                          Custom CSS Editor
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleInsertButtonTemplate}
                          >
                            Insert Full Template
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Note:</strong> Custom CSS is completely independent from the Visual Editor. 
                            When enabled, all visual settings are ignored and only your CSS code is used.
                            Click "Insert Full Template" to get started with a comprehensive default template.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="buttonCustomCSS">CSS Code</Label>
                          <Textarea
                            id="buttonCustomCSS"
                            value={customization.buttonCustomCSS || ""}
                            onChange={(e) => handleInputChange('buttonCustomCSS', e.target.value)}
                            placeholder="/* Click 'Insert Full Template' to get started with a complete CSS template */"
                            className="font-mono text-sm min-h-[400px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use #chatbot-widget-button to target the button. Apply classes like .animate-bounce, .hover-scale, etc.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Available CSS Classes & Animations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs space-y-2 font-mono text-muted-foreground">
                          <div>
                            <p className="font-semibold text-foreground mb-1">Selectors:</p>
                            <p>#chatbot-widget-button - Main button</p>
                            <p>#chatbot-widget-button:hover - Hover state</p>
                            <p>#chatbot-widget-button svg - Icon</p>
                            <p>#chatbot-widget-button-wrapper - Container (with text)</p>
                            <p>.chatbot-button-text - Text label</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground mb-1">Animation Classes:</p>
                            <p>.animate-bounce - Bouncing effect</p>
                            <p>.animate-pulse - Pulsing effect</p>
                            <p>.animate-shake - Shaking effect</p>
                            <p>.animate-rotate - Rotating effect</p>
                            <p>.animate-swing - Swinging effect</p>
                            <p>.animate-tada - Tada effect</p>
                            <p>.animate-wobble - Wobbling effect</p>
                            <p>.pulse-effect - Pulse ring effect</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground mb-1">Hover Classes:</p>
                            <p>.hover-scale - Scale on hover</p>
                            <p>.hover-lift - Lift on hover</p>
                            <p>.hover-glow - Glow on hover</p>
                            <p>.hover-rotate - Rotate on hover</p>
                          </div>
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
                      className="border rounded-lg h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 relative"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Hover over the button to see hover effects
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-2 pt-2 border-t">
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
