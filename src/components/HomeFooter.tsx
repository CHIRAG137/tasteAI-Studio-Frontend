import { useState } from "react";
import { API_BASE_URL } from "@/api/auth";
import { getAuthHeaders } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Bot, Github, Linkedin, Loader2, Send } from "lucide-react";

const ISSUE_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "ui", label: "UI/UX" },
  { value: "integration", label: "Integration" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

export const HomeFooter = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    issueType: "other",
    message: "",
  });

  const onChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) {
      toast({
        title: "Issue details required",
        description: "Please describe the issue before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/issue-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...form,
          sourcePage: window.location.pathname,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit issue");
      }

      setForm({ name: "", email: "", issueType: "other", message: "" });
      toast({
        title: "Issue reported",
        description: "Thanks for reporting this. We will review it shortly.",
      });
    } catch (error) {
      toast({
        title: "Could not submit issue",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="relative border-t border-purple-100/70 bg-gradient-to-b from-purple-50/90 via-blue-50/40 to-cyan-50/60 dark:border-border dark:from-background dark:via-background dark:to-muted/30">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(147,51,234,0.08),transparent_38%),radial-gradient(circle_at_80%_100%,rgba(6,182,212,0.1),transparent_32%)]" />
      <div className="relative max-w-7xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary mb-4">
              <Bot className="w-3.5 h-3.5" />
              TasteAI Studio
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Build bots for any workflow.
            </h3>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Create and deploy AI bots, agents, and automations across chat, voice, and Slack.
              If anything feels off, report it here and we will improve it quickly.
            </p>
            <div className="flex items-center gap-3 mt-6 text-sm text-muted-foreground">
              <a className="hover:text-foreground transition-colors" href="#" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a className="hover:text-foreground transition-colors" href="#" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <span>Made for teams shipping fast with AI.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-5 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="font-semibold text-foreground">Report an issue</h4>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="issue-name">Name</Label>
                  <Input
                    id="issue-name"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issue-email">Email</Label>
                  <Input
                    id="issue-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue-type">Issue type</Label>
                <select
                  id="issue-type"
                  value={form.issueType}
                  onChange={(e) => onChange("issueType", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ISSUE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue-message">What went wrong?</Label>
                <Textarea
                  id="issue-message"
                  value={form.message}
                  onChange={(e) => onChange("message", e.target.value)}
                  placeholder="Share steps, expected behavior, and what you observed."
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </footer>
  );
};
