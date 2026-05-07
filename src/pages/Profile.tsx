import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, ExternalLink, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getAuthHeaders } from "@/utils/auth";
import { API_BASE_URL } from "@/api/auth";
import { TokenVaultProfileSection } from "@/components/profile/TokenVaultProfileSection";
import { BrandLoader } from "@/components/BrandLoader";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const auth0Configured = !!(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

const Profile = () => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
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
  }, []);

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
      <PageHeader
        backTo="/"
        backLabel="Back to Home"
        icon={Settings}
        title="Profile Settings"
        subtitle="Manage your account and integrations"
        container="max-w-4xl"
      />

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

            {auth0Configured && (
              <TokenVaultProfileSection
                hasAuth0Linked={!!userDetails?.auth0Id}
              />
            )}

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
