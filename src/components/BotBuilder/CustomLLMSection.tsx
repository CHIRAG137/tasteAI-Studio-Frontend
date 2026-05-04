import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAuthHeaders } from "@/utils/auth";
import { API_BASE_URL } from "@/api/auth";

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
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(customLLMProvider || "none");

  const extractErrorMessage = (data: any) => {
    if (!data) return 'Unable to validate API key.';
    const maybeMessage = typeof data.message === 'string'
      ? data.message
      : typeof data.result?.error === 'string'
      ? data.result.error
      : typeof data.result?.message === 'string'
      ? data.result.message
      : null;

    if (!maybeMessage) {
      return 'Unable to validate API key.';
    }

    return maybeMessage.replace(/\s*(\[\{.*|\{.*)$/s, '').trim();
  };

  const handleProviderChange = (value: string) => {
    setTestStatus('idle');
    setTestMessage('');
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
    setTestStatus('idle');
    setTestMessage('');
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
    <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Optional: Add your own API key to use your preferred LLM provider (OpenAI or Gemini).
        </p>
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!selectedProvider || selectedProvider === 'none') return;
                  if (!apiKeyInput.trim()) {
                    setTestStatus('error');
                    setTestMessage('Enter your API key before testing.');
                    return;
                  }
                  const modelToTest = customModel || availableModels[0] || '';
                  if (!modelToTest) {
                    setTestStatus('error');
                    setTestMessage('Select a model before testing.');
                    return;
                  }

                  setIsTesting(true);
                  setTestStatus('idle');
                  setTestMessage('');

                  try {
                    const response = await fetch(`${API_BASE_URL}/api/bots/test-custom-llm`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders(),
                      },
                      body: JSON.stringify({
                        custom_llm_provider: selectedProvider,
                        custom_api_key: apiKeyInput,
                        custom_model: modelToTest,
                      }),
                    });

                    const data = await response.json();
                    if (response.ok) {
                      setTestStatus('success');
                      setTestMessage(data.message || 'API key validated successfully.');
                    } else {
                      setTestStatus('error');
                      setTestMessage(extractErrorMessage(data));
                    }
                  } catch (error) {
                    setTestStatus('error');
                    setTestMessage(
                      error instanceof Error
                        ? error.message
                        : 'Unable to validate API key. Please try again.'
                    );
                  } finally {
                    setIsTesting(false);
                  }
                }}
                disabled={isTesting || !apiKeyInput.trim() || !customModel && !availableModels[0]}
              >
                {isTesting ? 'Testing...' : 'Test API Key'}
              </Button>

              {testStatus !== 'idle' && (
                <p
                  className={`text-sm ${
                    testStatus === 'success' ? 'text-emerald-600' : 'text-destructive'
                  }`}
                >
                  {testMessage}
                </p>
              )}
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                When you use a custom LLM provider, your API key will be used for all Q&A generation, embeddings, and other LLM operations for this bot.
              </AlertDescription>
            </Alert>
          </>
        )}
    </div>
  );
}
