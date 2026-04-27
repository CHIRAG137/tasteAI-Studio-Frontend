import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CustomLLMSectionProps {
  customLLMProvider?: string | null;
  customModel?: string | null;
  onProviderChange: (provider: string | null) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
}

export function CustomLLMSection({
  customLLMProvider,
  customModel,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
}: CustomLLMSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(customLLMProvider || "none");

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    if (value === "none") {
      onProviderChange(null);
      setApiKeyInput("");
    } else {
      onProviderChange(value);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeyInput(value);
    onApiKeyChange(value);
  };

  const defaultModels: Record<string, string[]> = {
    openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    gemini: ["gemini-3-pro-preview", "gemini-pro"],
  };

  const availableModels = selectedProvider && selectedProvider !== "none" 
    ? defaultModels[selectedProvider as keyof typeof defaultModels] || [] 
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-purple-600" />
          Custom LLM Integration
        </CardTitle>
        <CardDescription>
          Optional: Add your own API key to use your preferred LLM provider (OpenAI or Gemini)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your API key is encrypted and stored securely. It can be updated anytime but never shown back in plain text.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="llm-provider">LLM Provider</Label>
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
            <SelectTrigger id="llm-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Use Default (Backend LLM)</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="gemini">Google Gemini</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select which LLM provider to use for this bot's Q&A generation and embeddings.
          </p>
        </div>

        {selectedProvider !== "none" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder={`Enter your ${selectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`}
                  value={apiKeyInput}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedProvider === 'openai' 
                  ? 'Get your API key from https://platform.openai.com/api-keys'
                  : 'Get your API key from Google AI Studio or Google Cloud Console'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={customModel || availableModels[0] || ""} onValueChange={onModelChange}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which model to use for LLM operations.
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                When you use a custom LLM provider, your API key will be used for all Q&A generation, embeddings, and other LLM operations for this bot.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
