import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getAuthHeaders } from "@/utils/auth";
import { API_BASE_URL } from "@/api/auth";
import { BrandLoader } from "@/components/BrandLoader";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, KeyRound } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, { hasKey: boolean; masked?: string | null }>>({});
  const [openAiKeyDraft, setOpenAiKeyDraft] = useState("");
  const [geminiKeyDraft, setGeminiKeyDraft] = useState("");
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState<null | "openai" | "gemini">(null);
  const [isTestingProvider, setIsTestingProvider] = useState<null | "openai" | "gemini">(null);
  const [userDetails, setUserDetails] = useState<{
    name?: string;
    email?: string;
    auth0Id?: string;
  } | null>(null);
  const [slackIntegration, setSlackIntegration] = useState<{ teamName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserDetails = async () => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const user = data.result.user;
        setUserDetails(user);
        setNameDraft(user?.name || "");
        setSlackIntegration(data.result.hasSlackIntegration ? data.result.slackIntegration : null);
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      toast({
        title: "Error",
        description: "Failed to load profile details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    if (!isAuthenticated()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/api-keys`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      const keys = Array.isArray(data?.result?.keys) ? data.result.keys : [];
      const mapped: Record<string, { hasKey: boolean; masked?: string | null }> = {};
      for (const k of keys) {
        if (k?.provider) {
          mapped[k.provider] = { hasKey: !!k.hasKey, masked: k.masked ?? null };
        }
      }
      setApiKeys(mapped);
    } catch (e) {
      // Non-fatal
    }
  };

  const saveProviderKey = async (provider: "openai" | "gemini") => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    const draft = provider === "openai" ? openAiKeyDraft : geminiKeyDraft;
    if (!draft.trim()) {
      toast({
        title: "Missing API key",
        description: `Paste your ${provider === "openai" ? "OpenAI" : "Gemini"} key first.`,
        variant: "destructive",
      });
      return;
    }

    setIsSavingProvider(provider);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/api-keys/${provider}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: draft }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save API key");
      }

      toast({
        title: "Saved",
        description: `${provider === "openai" ? "OpenAI" : "Gemini"} key saved securely.`,
      });

      if (provider === "openai") setOpenAiKeyDraft("");
      else setGeminiKeyDraft("");

      await fetchApiKeys();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProvider(null);
    }
  };

  const testSavedProviderKey = async (provider: "openai" | "gemini") => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    setIsTestingProvider(provider);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/api-keys/${provider}/test`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to validate API key");
      }

      toast({
        title: "API key valid",
        description: `${provider === "openai" ? "OpenAI" : "Gemini"} key validated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Validation failed",
        description: error instanceof Error ? error.message : "Unable to validate API key.",
        variant: "destructive",
      });
    } finally {
      setIsTestingProvider(null);
    }
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setNameDraft(userDetails?.name || "");
  };

  const saveName = async () => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: nameDraft }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update name");
      }

      const updatedUser = data?.result?.user;
      setUserDetails((prev) => ({
        ...prev,
        ...(updatedUser || {}),
        name: updatedUser?.name ?? nameDraft,
      }));
      setNameDraft(updatedUser?.name ?? nameDraft);
      setIsEditingName(false);
      toast({
        title: "Updated",
        description: "Your name has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update name.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSlackAuth = () => {
    setIsConnecting(true);
    navigate("/slack/manage?from=profile");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar pageTitle="Profile Settings" />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading ? (
          <BrandLoader fullScreen={false} label="Loading your profile" />
        ) : (
          <>
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {userDetails?.name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            className="h-9 w-[260px]"
                            placeholder="Your name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveName();
                              if (e.key === "Escape") cancelEditName();
                            }}
                          />
                          <Button onClick={saveName} disabled={isSavingName}>
                            {isSavingName ? "Saving..." : "Save"}
                          </Button>
                          <Button variant="outline" onClick={cancelEditName} disabled={isSavingName}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-semibold">{userDetails?.name || "User"}</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingName(true)}
                          >
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                    <p className="text-muted-foreground">{userDetails?.email || "No email available"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LLM API Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  LLM API Keys
                </CardTitle>
                <CardDescription>
                  Save your OpenAI/Gemini keys once, test them here, and reuse them in Custom LLM settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertDescription>
                    Keys are **encrypted at rest** on the server and **never returned** in plain text. We only show a masked hint (last 4).
                  </AlertDescription>
                </Alert>

                {/* OpenAI */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Label>OpenAI</Label>
                    <span className="text-xs text-muted-foreground">
                      Saved: {apiKeys.openai?.hasKey ? (apiKeys.openai?.masked || "Yes") : "No"}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type={showOpenAiKey ? "text" : "password"}
                      placeholder="Paste OpenAI API key (stored encrypted)"
                      value={openAiKeyDraft}
                      onChange={(e) => setOpenAiKeyDraft(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAiKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOpenAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      onClick={() => saveProviderKey("openai")}
                      disabled={isSavingProvider === "openai"}
                    >
                      {isSavingProvider === "openai" ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => testSavedProviderKey("openai")}
                      disabled={!apiKeys.openai?.hasKey || isTestingProvider === "openai"}
                    >
                      {isTestingProvider === "openai" ? "Testing..." : "Test saved key"}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Gemini */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Label>Google Gemini</Label>
                    <span className="text-xs text-muted-foreground">
                      Saved: {apiKeys.gemini?.hasKey ? (apiKeys.gemini?.masked || "Yes") : "No"}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="Paste Gemini API key (stored encrypted)"
                      value={geminiKeyDraft}
                      onChange={(e) => setGeminiKeyDraft(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      onClick={() => saveProviderKey("gemini")}
                      disabled={isSavingProvider === "gemini"}
                    >
                      {isSavingProvider === "gemini" ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => testSavedProviderKey("gemini")}
                      disabled={!apiKeys.gemini?.hasKey || isTestingProvider === "gemini"}
                    >
                      {isTestingProvider === "gemini" ? "Testing..." : "Test saved key"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integrations Card */}
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connect external services to enhance your bots</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Slack Integration */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4A154B] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                      S
                    </div>
                    <div>
                      <h4 className="font-medium">Slack</h4>
                      <p className="text-sm text-muted-foreground">
                        {slackIntegration 
                          ? `Connected to ${slackIntegration.teamName}` 
                          : "Connect your Slack workspace to receive notifications"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSlackAuth}
                    disabled={isConnecting}
                    className="bg-[#4A154B] hover:bg-[#3a1039] text-white"
                  >
                    {isConnecting ? (
                      "Connecting..."
                    ) : (
                      <>
                        {"Authenticate Slack"}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Placeholder for future integrations */}
                <div className="flex items-center justify-between p-4 border rounded-lg border-dashed opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground text-xl">+</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground">More Integrations</h4>
                      <p className="text-sm text-muted-foreground">
                        Additional integrations coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
