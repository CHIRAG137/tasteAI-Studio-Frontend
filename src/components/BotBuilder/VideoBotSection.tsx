import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload, X, Loader2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoBotSectionProps {
  botConfig: {
    isVideoBot: boolean;
    videoBotImageData?: string;
    videoBotImageType?: string;
  };
  updateConfig: (field: string, value: any) => void;
}

export const VideoBotSection = ({ botConfig, updateConfig }: VideoBotSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for image upload and generation
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    botConfig.videoBotImageData ? `data:${botConfig.videoBotImageType || 'image/png'};base64,${botConfig.videoBotImageData}` : null
  );

  // Handle image file selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate image using Gemini API
  const handleGenerateImage = async () => {
    if (!selectedImage || !imagePrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an image and provide a prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('prompt', imagePrompt);

      // Call the API
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/human/generate-image`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate image');
      }

      // Extract the base64 image data from the response
      const imageData = data.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = data.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/png';

      if (!imageData) {
        throw new Error('No image data in response');
      }

      // Convert base64 to data URL for display
      const generatedImage = `data:${mimeType};base64,${imageData}`;
      
      // Set the generated image for display
      setGeneratedImageUrl(generatedImage);

      // Update the bot config with the image data and type
      updateConfig("videoBotImageData", imageData);
      updateConfig("videoBotImageType", mimeType);

      toast({
        title: "Success",
        description: "Video bot avatar generated successfully!",
      });

    } catch (error: any) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Clear selected image
  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImagePrompt("");
    setGeneratedImageUrl(null);
    updateConfig("videoBotImageData", undefined);
    updateConfig("videoBotImageType", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="video-bot-toggle" className="text-base font-medium cursor-pointer">
              Enable Video Bot
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Enable real-time video chatbot to speak with a virtual human bot. 
              You can ask questions by speaking and receive video responses.
            </p>
          </div>
        </div>
        <Switch
          id="video-bot-toggle"
          checked={botConfig.isVideoBot}
          onCheckedChange={(checked) => {
            updateConfig("isVideoBot", checked);
            if (!checked) {
              handleClearImage();
            }
          }}
        />
      </div>
      
      {botConfig.isVideoBot && (
        <>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary font-medium">
              Video Bot is enabled! Your bot will respond with realistic video avatars powered by AI.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Voice configuration is disabled when Video Bot is enabled as video responses include audio.
            </p>
          </div>

          {/* Image Generation Section */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">Generate Video Bot Avatar</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a reference image and describe how you want your video bot avatar to look.
            </p>

            {/* Generated Image Display */}
            {generatedImageUrl && (
              <div className="relative">
                <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden border-2 border-primary/30">
                  <img
                    src={generatedImageUrl}
                    alt="Generated Avatar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full"
                      title="Upload new image"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleClearImage}
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 rounded-full"
                      title="Remove avatar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-center text-sm text-green-600 mt-2 font-medium">
                  ✓ Avatar generated and ready to use
                </p>
              </div>
            )}

            {/* Image Upload and Generation Controls */}
            {!generatedImageUrl && (
              <>
                {imagePreview ? (
                  <div className="flex gap-4">
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border-2 border-primary/30"
                      />
                      <Button
                        onClick={handleClearImage}
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <Input
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Describe your avatar... (e.g., 'Professional looking person in business attire')"
                        className="border-2 border-primary/30 focus:border-primary"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && imagePrompt.trim()) {
                            handleGenerateImage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleGenerateImage}
                        disabled={!imagePrompt.trim() || isGeneratingImage}
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Avatar...
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
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 text-center">
                      Upload a reference image to generate your video bot avatar
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
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
        </>
      )}
    </div>
  );
};
