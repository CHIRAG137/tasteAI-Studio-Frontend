import type { EmbedCustomization } from "@/components/EmbedCustomizer";

export const DEFAULT_EMBED_CUSTOMIZATION: Omit<EmbedCustomization, "botId"> = {
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

  // Button features
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
  buttonPadding: "12",
};

const asString = (v: unknown, fallback: string) => {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
};

/**
 * Normalizes API customization into a fully-populated EmbedCustomization object.
 * Handles older backend docs where some fields are missing or borderRadius is numeric.
 */
export const mergeEmbedCustomization = (
  botId: string,
  botName: string | undefined,
  apiCustomization: any
): EmbedCustomization => {
  const api = apiCustomization && typeof apiCustomization === "object" ? apiCustomization : {};

  return {
    ...DEFAULT_EMBED_CUSTOMIZATION,
    botId,
    ...api,
    headerTitle: api.headerTitle || botName || DEFAULT_EMBED_CUSTOMIZATION.headerTitle,
    borderRadius: asString(api.borderRadius, DEFAULT_EMBED_CUSTOMIZATION.borderRadius),
    buttonSize: asString(api.buttonSize, DEFAULT_EMBED_CUSTOMIZATION.buttonSize),
    buttonBorderRadius: asString(api.buttonBorderRadius, DEFAULT_EMBED_CUSTOMIZATION.buttonBorderRadius),
    buttonBottom: asString(api.buttonBottom, DEFAULT_EMBED_CUSTOMIZATION.buttonBottom),
    buttonRight: asString(api.buttonRight, DEFAULT_EMBED_CUSTOMIZATION.buttonRight),
    buttonLeft: asString(api.buttonLeft, DEFAULT_EMBED_CUSTOMIZATION.buttonLeft),
    buttonIconSize: asString(api.buttonIconSize, DEFAULT_EMBED_CUSTOMIZATION.buttonIconSize),
    buttonTextSize: asString(api.buttonTextSize, DEFAULT_EMBED_CUSTOMIZATION.buttonTextSize),
    buttonPadding: asString(api.buttonPadding, DEFAULT_EMBED_CUSTOMIZATION.buttonPadding),
  };
};

