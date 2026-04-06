import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Maximize2,
  GripHorizontal,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "axios";

interface DevicePreset {
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  category: "mobile" | "tablet" | "desktop";
}

const presets: DevicePreset[] = [
  { label: "iPhone SE", width: 375, height: 667, icon: <Smartphone className="w-3.5 h-3.5" />, category: "mobile" },
  { label: "iPhone 14", width: 390, height: 844, icon: <Smartphone className="w-3.5 h-3.5" />, category: "mobile" },
  { label: "iPhone 14 Pro Max", width: 430, height: 932, icon: <Smartphone className="w-3.5 h-3.5" />, category: "mobile" },
  { label: "iPad Mini", width: 768, height: 1024, icon: <Tablet className="w-3.5 h-3.5" />, category: "tablet" },
  { label: "iPad Pro", width: 1024, height: 1366, icon: <Tablet className="w-3.5 h-3.5" />, category: "tablet" },
  { label: "Laptop", width: 1366, height: 768, icon: <Monitor className="w-3.5 h-3.5" />, category: "desktop" },
  { label: "Desktop", width: 1920, height: 1080, icon: <Monitor className="w-3.5 h-3.5" />, category: "desktop" },
];

export default function TestEmbed() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [botName, setBotName] = useState("");
  const [width, setWidth] = useState(390);
  const [height, setHeight] = useState(844);
  const [activePreset, setActivePreset] = useState("iPhone 14");
  const [isResizing, setIsResizing] = useState<"right" | "bottom" | "corner" | null>(null);
  const [isRotated, setIsRotated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (botId) {
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`)
        .then(res => setBotName(res.data.result.name))
        .catch(() => {});
    }
  }, [botId]);

  const embedUrl = `${window.location.origin}/embed?botId=${botId}`;

  const applyPreset = (preset: DevicePreset) => {
    const w = isRotated ? preset.height : preset.width;
    const h = isRotated ? preset.width : preset.height;
    setWidth(w);
    setHeight(h);
    setActivePreset(preset.label);
  };

  const toggleRotate = () => {
    setIsRotated(!isRotated);
    setWidth(height);
    setHeight(width);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: "right" | "bottom" | "corner") => {
    e.preventDefault();
    setIsResizing(direction);
    startPos.current = { x: e.clientX, y: e.clientY, w: width, h: height };
  }, [width, height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;

      if (isResizing === "right" || isResizing === "corner") {
        // Multiply by 2 because resize handle is on one side but we want symmetric feel
        setWidth(Math.max(280, Math.min(1920, startPos.current.w + dx * 2)));
      }
      if (isResizing === "bottom" || isResizing === "corner") {
        setHeight(Math.max(400, Math.min(1400, startPos.current.h + dy)));
      }
      setActivePreset("");
    };

    const handleMouseUp = () => setIsResizing(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const categoryColors: Record<string, string> = {
    mobile: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
    tablet: "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20",
    desktop: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
  };

  // Calculate scale to fit the preview area
  const maxPreviewWidth = typeof window !== "undefined" ? window.innerWidth - 80 : 1200;
  const maxPreviewHeight = typeof window !== "undefined" ? window.innerHeight - 220 : 700;
  const scaleX = Math.min(1, (maxPreviewWidth) / width);
  const scaleY = Math.min(1, (maxPreviewHeight) / height);
  const scale = Math.min(scaleX, scaleY, 1);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1a1a2e]">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#16162a]/90 backdrop-blur-xl z-20">
        <div className="px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/docs/${botId}`)}
              className="gap-1.5 text-white/60 hover:text-white hover:bg-white/10 h-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-white/90">{botName || "Bot Preview"}</span>
            </div>
          </div>

          {/* Device Presets */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                  activePreset === preset.label
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : categoryColors[preset.category]
                )}
                title={`${preset.width} × ${preset.height}`}
              >
                {preset.icon}
                <span className="hidden xl:inline">{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Size Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
              <Input
                type="number"
                value={width}
                onChange={(e) => { setWidth(Number(e.target.value)); setActivePreset(""); }}
                className="w-16 h-6 text-xs text-center bg-transparent border-none text-white/90 p-0"
              />
              <span className="text-white/30 text-xs">×</span>
              <Input
                type="number"
                value={height}
                onChange={(e) => { setHeight(Number(e.target.value)); setActivePreset(""); }}
                className="w-16 h-6 text-xs text-center bg-transparent border-none text-white/90 p-0"
              />
            </div>
            <Badge variant="outline" className="text-[10px] border-white/10 text-white/50 font-mono">
              {Math.round(scale * 100)}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
              onClick={toggleRotate}
              title="Rotate"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        style={{ cursor: isResizing ? (isResizing === "right" ? "ew-resize" : isResizing === "bottom" ? "ns-resize" : "nwse-resize") : "default" }}
      >
        {/* Dotted grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <div className="relative" style={{ 
          width: width * scale, 
          height: height * scale,
        }}>
          {/* Device frame */}
          <div
            className="absolute rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/50 overflow-hidden"
            style={{
              width: width,
              height: height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {/* URL bar mockup */}
            <div className="h-8 bg-gray-100 border-b flex items-center px-3 gap-2 flex-shrink-0">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-2">
                <div className="bg-white rounded px-2 py-0.5 text-[10px] text-gray-500 truncate border">
                  {embedUrl}
                </div>
              </div>
            </div>
            
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full border-0"
              style={{ height: height - 32 }}
              title="Bot Preview"
            />
          </div>

          {/* Right resize handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center cursor-ew-resize z-10 group"
            style={{ right: -20, width: 16, height: 48 }}
            onMouseDown={(e) => handleMouseDown(e, "right")}
          >
            <div className="w-1.5 h-10 rounded-full bg-white/20 group-hover:bg-primary/60 transition-colors" />
          </div>

          {/* Bottom resize handle */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-ns-resize z-10 group"
            style={{ bottom: -20, width: 48, height: 16 }}
            onMouseDown={(e) => handleMouseDown(e, "bottom")}
          >
            <div className="h-1.5 w-10 rounded-full bg-white/20 group-hover:bg-primary/60 transition-colors" />
          </div>

          {/* Corner resize handle */}
          <div
            className="absolute flex items-center justify-center cursor-nwse-resize z-10 group"
            style={{ right: -16, bottom: -16, width: 20, height: 20 }}
            onMouseDown={(e) => handleMouseDown(e, "corner")}
          >
            <div className="w-3 h-3 rounded-sm bg-white/20 group-hover:bg-primary/60 transition-colors border border-white/10" />
          </div>

          {/* Dimension label */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10"
            style={{ bottom: -40 }}
          >
            <span className="text-[11px] font-mono text-white/70">{width} × {height}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
