import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoBotSectionProps {
  botConfig: {
    isVideoBot: boolean;
    videoBotImageUrl?: string;
    videoBotImagePublicId?: string;
  };
  updateConfig: (field: string, value: any) => void;
}

export const VideoBotSection = ({
  botConfig,
  updateConfig,
}: VideoBotSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const generatedImageUrl = botConfig.videoBotImageUrl || null;

  // ---------------------------
  // Image Selection
  // ---------------------------
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ---------------------------
  // Generate Avatar (Cloudinary)
  // ---------------------------
  const handleGenerateImage = async () => {
    if (!selectedImage || !imagePrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an image and provide a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);

    try {
      const formData = new FormData();
      formData.append("video_bot_image", selectedImage);
      formData.append("prompt", imagePrompt);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/human/generate-image`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate image");
      }

      // ✅ Cloudinary response
      updateConfig("videoBotImageUrl", data.video_bot_image_url);
      updateConfig("videoBotImagePublicId", data.video_bot_image_public_id);

      toast({
        title: "Success",
        description: "Video bot avatar generated successfully!",
      });

      setSelectedImage(null);
      setImagePreview(null);
      setImagePrompt("");
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ---------------------------
  // Clear Avatar
  // ---------------------------
  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImagePrompt("");

    updateConfig("videoBotImageUrl", undefined);
    updateConfig("videoBotImagePublicId", undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5 text-primary" />
          <div>
            <Label className="text-base font-medium cursor-pointer">
              Enable Video Bot
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Enable a real-time AI video avatar for conversations.
            </p>
          </div>
        </div>
        <Switch
          checked={botConfig.isVideoBot}
          onCheckedChange={(checked) => {
            updateConfig("isVideoBot", checked);
            if (!checked) handleClearImage();
          }}
        />
      </div>

      {botConfig.isVideoBot && (
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <Label className="text-base font-medium">
              Video Bot Avatar
            </Label>
          </div>

          {/* Generated Avatar */}
          {generatedImageUrl ? (
            <div className="relative max-w-md mx-auto">
              <img
                src={generatedImageUrl}
                alt="Video Bot Avatar"
                className="rounded-lg border w-full object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleClearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-sm text-green-600 mt-2">
                ✓ Avatar ready
              </p>
            </div>
          ) : (
            <>
              {imagePreview ? (
                <div className="flex gap-4">
                  <img
                    src={imagePreview}
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe the avatar..."
                    />
                    <Button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Generate Avatar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                </div>
              )}
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
