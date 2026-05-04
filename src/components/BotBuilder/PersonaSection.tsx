import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, MessageCircle, Palette, Users, Hash, Settings } from "lucide-react";
import { useEffect, useState } from "react";

interface PersonaSectionProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
}

export const PersonaSection = ({ botConfig, updateConfig }: PersonaSectionProps) => {
  const [customPurpose, setCustomPurpose] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [customAudience, setCustomAudience] = useState("");

  useEffect(() => {
    if (!botConfig.primaryPurpose) updateConfig("primaryPurpose", "customer-support");
    if (!botConfig.conversationalTone) updateConfig("conversationalTone", "professional");
    if (!botConfig.responseStyle) updateConfig("responseStyle", "concise");
    if (!botConfig.targetAudience) updateConfig("targetAudience", "customers");
  }, []);

  // Initialize custom values if they exist
  useEffect(() => {
    if (botConfig.primaryPurpose && !["customer-support", "sales-assistant", "educational-tutor", "personal-assistant", "technical-advisor", "creative-helper", "data-analyst", "content-creator"].includes(botConfig.primaryPurpose)) {
      setCustomPurpose(botConfig.primaryPurpose);
    }
    if (botConfig.conversationalTone && !["professional", "friendly", "casual", "formal", "enthusiastic", "empathetic", "authoritative", "humorous"].includes(botConfig.conversationalTone)) {
      setCustomTone(botConfig.conversationalTone);
    }
    if (botConfig.responseStyle && !["concise", "detailed", "conversational", "bullet-points", "storytelling", "technical"].includes(botConfig.responseStyle)) {
      setCustomStyle(botConfig.responseStyle);
    }
    if (botConfig.targetAudience && !["general-public", "business-professionals", "students", "developers", "researchers", "customers", "children", "seniors"].includes(botConfig.targetAudience)) {
      setCustomAudience(botConfig.targetAudience);
    }
  }, [botConfig]);

  const handlePurposeChange = (value: string) => {
    if (value === "others") {
      updateConfig("primaryPurpose", customPurpose || "");
    } else {
      updateConfig("primaryPurpose", value);
      setCustomPurpose("");
    }
  };

  const handleToneChange = (value: string) => {
    if (value === "others") {
      updateConfig("conversationalTone", customTone || "");
    } else {
      updateConfig("conversationalTone", value);
      setCustomTone("");
    }
  };

  const handleStyleChange = (value: string) => {
    if (value === "others") {
      updateConfig("responseStyle", customStyle || "");
    } else {
      updateConfig("responseStyle", value);
      setCustomStyle("");
    }
  };

  const handleAudienceChange = (value: string) => {
    if (value === "others") {
      updateConfig("targetAudience", customAudience || "");
    } else {
      updateConfig("targetAudience", value);
      setCustomAudience("");
    }
  };

  const handleCustomPurposeChange = (value: string) => {
    setCustomPurpose(value);
    updateConfig("primaryPurpose", value);
  };

  const handleCustomToneChange = (value: string) => {
    setCustomTone(value);
    updateConfig("conversationalTone", value);
  };

  const handleCustomStyleChange = (value: string) => {
    setCustomStyle(value);
    updateConfig("responseStyle", value);
  };

  const handleCustomAudienceChange = (value: string) => {
    setCustomAudience(value);
    updateConfig("targetAudience", value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Purpose */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Primary Purpose
          </Label>
          <Select
            value={
              ["customer-support", "sales-assistant", "educational-tutor", "personal-assistant", "technical-advisor", "creative-helper", "data-analyst", "content-creator"].includes(botConfig.primaryPurpose || "customer-support")
                ? (botConfig.primaryPurpose || "customer-support")
                : "others"
            }
            onValueChange={handlePurposeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer-support">Customer Support</SelectItem>
              <SelectItem value="sales-assistant">Sales Assistant</SelectItem>
              <SelectItem value="educational-tutor">Educational Tutor</SelectItem>
              <SelectItem value="personal-assistant">Personal Assistant</SelectItem>
              <SelectItem value="technical-advisor">Technical Advisor</SelectItem>
              <SelectItem value="creative-helper">Creative Helper</SelectItem>
              <SelectItem value="data-analyst">Data Analyst</SelectItem>
              <SelectItem value="content-creator">Content Creator</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
          {(!["customer-support", "sales-assistant", "educational-tutor", "personal-assistant", "technical-advisor", "creative-helper", "data-analyst", "content-creator"].includes(botConfig.primaryPurpose || "customer-support")) && (
            <Input
              placeholder="Enter custom purpose..."
              value={customPurpose}
              onChange={(e) => handleCustomPurposeChange(e.target.value)}
              className="h-9 mt-2"
            />
          )}
        </div>

        {/* Conversational Tone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Conversational Tone
          </Label>
          <Select
            value={
              ["professional", "friendly", "casual", "formal", "enthusiastic", "empathetic", "authoritative", "humorous"].includes(botConfig.conversationalTone || "professional")
                ? (botConfig.conversationalTone || "professional")
                : "others"
            }
            onValueChange={handleToneChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              <SelectItem value="empathetic">Empathetic</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
              <SelectItem value="humorous">Humorous</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
          {(!["professional", "friendly", "casual", "formal", "enthusiastic", "empathetic", "authoritative", "humorous"].includes(botConfig.conversationalTone || "professional")) && (
            <Input
              placeholder="Enter custom tone..."
              value={customTone}
              onChange={(e) => handleCustomToneChange(e.target.value)}
              className="h-9 mt-2"
            />
          )}
        </div>

        {/* Response Style */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Response Style
          </Label>
          <Select
            value={
              ["concise", "detailed", "conversational", "bullet-points", "storytelling", "technical"].includes(botConfig.responseStyle || "concise")
                ? (botConfig.responseStyle || "concise")
                : "others"
            }
            onValueChange={handleStyleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select response style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise & Direct</SelectItem>
              <SelectItem value="detailed">Detailed & Comprehensive</SelectItem>
              <SelectItem value="conversational">Conversational & Engaging</SelectItem>
              <SelectItem value="bullet-points">Structured & Bullet Points</SelectItem>
              <SelectItem value="storytelling">Storytelling & Examples</SelectItem>
              <SelectItem value="technical">Technical & Precise</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
          {(!["concise", "detailed", "conversational", "bullet-points", "storytelling", "technical"].includes(botConfig.responseStyle || "concise")) && (
            <Input
              placeholder="Enter custom style..."
              value={customStyle}
              onChange={(e) => handleCustomStyleChange(e.target.value)}
              className="h-9 mt-2"
            />
          )}
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Target Audience
          </Label>
          <Select
            value={
              ["general-public", "business-professionals", "students", "developers", "researchers", "customers", "children", "seniors"].includes(botConfig.targetAudience || "customers")
                ? (botConfig.targetAudience || "customers")
                : "others"
            }
            onValueChange={handleAudienceChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general-public">General Public</SelectItem>
              <SelectItem value="business-professionals">Business Professionals</SelectItem>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="developers">Developers</SelectItem>
              <SelectItem value="researchers">Researchers</SelectItem>
              <SelectItem value="customers">Customers</SelectItem>
              <SelectItem value="children">Children</SelectItem>
              <SelectItem value="seniors">Seniors</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
          {(!["general-public", "business-professionals", "students", "developers", "researchers", "customers", "children", "seniors"].includes(botConfig.targetAudience || "customers")) && (
            <Input
              placeholder="Enter custom audience..."
              value={customAudience}
              onChange={(e) => handleCustomAudienceChange(e.target.value)}
              className="h-9 mt-2"
            />
          )}
        </div>
      </div>

      {/* Specialization Area */}
      <div className="space-y-2">
        <Label htmlFor="specializationArea" className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Specialization Area
        </Label>
        <Input
          id="specializationArea"
          placeholder="e.g., Healthcare, Finance, Technology, Education..."
          value={botConfig.specializationArea}
          onChange={(e) => updateConfig("specializationArea", e.target.value)}
          className="h-11"
        />
      </div>

      {/* Key Topics */}
      <div className="space-y-2">
        <Label htmlFor="keyTopics" className="text-sm font-medium flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Key Topics
        </Label>
        <Textarea
          id="keyTopics"
          placeholder="List the main topics your bot should be knowledgeable about..."
          value={botConfig.keyTopics}
          onChange={(e) => updateConfig("keyTopics", e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label htmlFor="keywords" className="text-sm font-medium flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Keywords
        </Label>
        <Input
          id="keywords"
          placeholder="Enter relevant keywords separated by commas..."
          value={botConfig.keywords}
          onChange={(e) => updateConfig("keywords", e.target.value)}
          className="h-11"
        />
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <Label htmlFor="customInstructions" className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Custom Instructions
        </Label>
        <Textarea
          id="customInstructions"
          placeholder="Provide any specific instructions or behaviors you want your bot to follow..."
          value={botConfig.customInstructions}
          onChange={(e) => updateConfig("customInstructions", e.target.value)}
          className="min-h-[120px] resize-none"
        />
      </div>
    </div>
  );
};
