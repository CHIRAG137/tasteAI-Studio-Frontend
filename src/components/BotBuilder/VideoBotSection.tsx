import { useState, useRef, useEffect } from "react";
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
    voiceId?: string;
  };
  updateConfig: (field: string, value: any) => void;
}

export const VideoBotSection = ({
  botConfig,
  updateConfig,
}: VideoBotSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const VOICES_PAGE_SIZE = 6;

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [visibleVoiceCount, setVisibleVoiceCount] = useState(VOICES_PAGE_SIZE);

  useEffect(() => {
    // Only fetch voices when the VideoBot section is opened
    if (!botConfig.isVideoBot) return;
    
    // Skip if voices are already loaded
    if (voices.length > 0) return;

    const fetchVoices = async () => {
      setVoicesLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/elevenlabs/voices`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const premadeVoices = (data.result || []).filter(
          (voice: any) => voice.category === "premade"
        );

        setVoices(premadeVoices);
      } catch (err) {
        console.error("Voice fetch failed:", err);
        toast({
          title: "Failed to load voices",
          description: "Could not fetch ElevenLabs voices",
          variant: "destructive",
        });
      } finally {
        setVoicesLoading(false);
      }
    };

    fetchVoices();
  }, [botConfig.isVideoBot]);

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

  const handlePreview = (voice: any) => {
    if (!voice.preview_url) return;

    if (playingVoiceId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    audio.play();

    setPlayingVoiceId(voice.voice_id);

    audio.onended = () => {
      setPlayingVoiceId(null);
    };
  };

  const visibleVoices = voices.slice(0, visibleVoiceCount);
  const canShowMore = visibleVoiceCount < voices.length;
  const canShowLess = visibleVoiceCount > VOICES_PAGE_SIZE;

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
                    type="button"
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

          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-medium">
              Bot Voice
            </Label>

            <div className="space-y-4">
              {/* Voices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voicesLoading && (
                  <div className="col-span-full flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading voices…
                    </span>
                  </div>
                )}

                {!voicesLoading &&
                  visibleVoices.map((voice) => {
                    const isSelected = botConfig.voiceId === voice.voice_id;
                    const isPlaying = playingVoiceId === voice.voice_id;

                    return (
                      <div
                        key={voice.voice_id}
                        role="button"
                        aria-pressed={isSelected}
                        onClick={() => updateConfig("voiceId", voice.voice_id)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer
              ${isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "hover:border-muted-foreground/50 hover:bg-muted/30"
                          }
            `}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium leading-tight">
                              {voice.name}
                            </p>

                            {voice.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {voice.description}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground">
                              {voice.labels?.accent || "Neutral"} •{" "}
                              {voice.labels?.gender || "Unknown"}
                            </p>
                          </div>

                          {voice.preview_url && (
                            <Button
                              size="icon"
                              variant={isPlaying ? "secondary" : "ghost"}
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(voice);
                              }}
                            >
                              {isPlaying ? "⏸" : "▶"}
                            </Button>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-2 text-xs text-green-600 font-medium">
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Pagination Controls */}
              {!voicesLoading && voices.length > VOICES_PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  {canShowMore && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleVoiceCount((prev) => prev + VOICES_PAGE_SIZE)
                      }
                    >
                      Show more
                    </Button>
                  )}

                  {canShowLess && !canShowMore && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleVoiceCount(VOICES_PAGE_SIZE)}
                    >
                      Show less
                    </Button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
