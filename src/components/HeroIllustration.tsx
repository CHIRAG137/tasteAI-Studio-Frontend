import { motion } from "framer-motion";
import { Bot, Globe, Share2, BarChart3, MessageSquare, Code2, CheckCircle2, Users } from "lucide-react";

const floatAnimation = (delay: number) => ({
  y: [0, -8, 0],
  transition: { duration: 3, repeat: Infinity, ease: "easeInOut", delay },
});

const capabilities = [
  { icon: Bot, label: "Create Bot", color: "from-primary to-accent" },
  { icon: Globe, label: "Embed on Website", color: "from-emerald-500 to-teal-500" },
  { icon: Share2, label: "Share Bot", color: "from-orange-500 to-amber-500" },
  { icon: BarChart3, label: "Analyse Performance", color: "from-blue-500 to-cyan-500" },
  { icon: CheckCircle2, label: "Evaluate Bot", color: "from-pink-500 to-rose-500" },
  { icon: Users, label: "Agent Handoff", color: "from-violet-500 to-purple-500" },
];

export const HeroIllustration = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="relative max-w-4xl mx-auto"
    >
      {/* Central platform hub */}
      <div className="relative flex items-center justify-center py-8">
        {/* Connection lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet">
          {/* Lines from center to each node */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const cols = 3;
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = 160 + col * 240;
            const y = 80 + row * 160;
            return (
              <motion.line
                key={i}
                x1="400"
                y1="160"
                x2={x}
                y2={y}
                stroke="hsl(var(--primary) / 0.15)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
              />
            );
          })}
          {/* Animated pulse dots traveling along lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const cols = 3;
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = 160 + col * 240;
            const y = 80 + row * 160;
            return (
              <motion.circle
                key={`pulse-${i}`}
                r="3"
                fill="hsl(var(--primary))"
                initial={{ cx: 400, cy: 160, opacity: 0 }}
                animate={{
                  cx: [400, x],
                  cy: [160, y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 1 + i * 0.5,
                  repeatDelay: 1,
                }}
              />
            );
          })}
        </svg>

        {/* Central logo */}
        <motion.div
          animate={floatAnimation(0)}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary shadow-strong flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="absolute -inset-3 rounded-2xl bg-primary/10 animate-ping" style={{ animationDuration: "3s" }} />
        </motion.div>

        {/* Capability nodes */}
        <div className="grid grid-cols-3 gap-x-16 gap-y-10 w-full max-w-2xl relative z-20">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.label}
              custom={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.12, duration: 0.5, type: "spring" }}
              className="flex flex-col items-center gap-2"
            >
              <motion.div
                animate={floatAnimation(i * 0.4)}
                whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
                className="group cursor-default"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cap.color} shadow-medium flex items-center justify-center transition-shadow group-hover:shadow-strong`}>
                  <cap.icon className="w-6 h-6 text-white" />
                </div>
              </motion.div>
              <span className="text-xs font-medium text-muted-foreground text-center whitespace-nowrap">
                {cap.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Embed code snippet decoration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="mx-auto max-w-md mt-4 px-4 py-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm font-mono text-xs text-muted-foreground flex items-center gap-2"
      >
        <Code2 className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate">
          {'<script src="your-bot.js"></script>'}
        </span>
        <span className="text-primary font-semibold ml-auto shrink-0">1 line</span>
      </motion.div>
    </motion.div>
  );
};
