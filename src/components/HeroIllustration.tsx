import type { SVGProps } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Code2,
  Sparkles,
  Globe,
  Video,
  Mic,
  Languages,
  ScanSearch,
  Rocket,
  Palette,
  Link2,
  MousePointerClick,
  MessageSquare,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const bob = (delay: number) => ({
  y: [0, -6, 0],
  transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay },
});

function BookTiny(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

const customizePills = [
  { icon: BookTiny, label: "Train" },
  { icon: ScanSearch, label: "Scrape site" },
  { icon: Video, label: "Video" },
  { icon: Mic, label: "Voice" },
  { icon: Languages, label: "Languages" },
] as const;

/**
 * Single full-width animated story: create → customise → deploy → embed.
 * Connectors/particles stay at z-[1]; stage cards at z-[2] so nothing is covered incorrectly.
 */
export const HeroIllustration = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55 }}
      className="isolate relative mx-auto max-w-[1200px] overflow-hidden rounded-[2rem] border border-purple-200/65 bg-gradient-to-br from-purple-50/95 via-white to-cyan-50/90 p-5 shadow-xl md:p-8 dark:border-purple-500/25 dark:from-purple-950/35 dark:via-background dark:to-cyan-950/25"
      aria-labelledby="hero-illus-heading"
    >
      <span id="hero-illus-heading" className="sr-only">
        Animated overview: create a bot, customise it, deploy a public URL, then embed it on your site.
      </span>

      {/* Ambient motion */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
        <motion.div
          className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl"
          animate={{ x: [0, 30, 0], opacity: [0.45, 0.65, 0.45] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
          animate={{ x: [0, -24, 0], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── Horizontal connector track (desktop) — behind stages ───────────────── */}
      <div className="pointer-events-none absolute left-[6%] right-[6%] top-[min(340px,48%)] z-[1] hidden h-28 md:block">
        <svg className="h-full w-full" viewBox="0 0 1000 112" preserveAspectRatio="none" aria-hidden fill="none">
          <motion.path
            d="M 40 76 C 200 44, 300 104, 500 76 S 740 52, 960 76"
            stroke="url(#heroFlowGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="14 14"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.35, ease }}
          />
          <defs>
            <linearGradient id="heroFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(147,51,234)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="rgb(6,182,212)" stopOpacity="0.85" />
            </linearGradient>
          </defs>
        </svg>

        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 shadow-md shadow-purple-500/35 ring-2 ring-background/70"
            initial={{ left: "6%" }}
            animate={{ left: ["6%", "34%", "58%", "82%", "6%"] }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
              delay: i * (22 / 3),
              repeatDelay: 0,
            }}
          />
        ))}
      </div>

      {/* Mobile vertical dashed spine */}
      <div className="pointer-events-none absolute left-6 top-36 bottom-24 z-[1] w-0 border-l border-dashed border-purple-300/55 md:hidden" />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`m-dot-${i}`}
          className="absolute left-[22px] z-[1] h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400 shadow-sm md:hidden"
          animate={{ top: ["148px", "56%", "86%", "148px"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: i * (14 / 3) }}
        />
      ))}

      {/* Stage rails */}
      <div className="relative z-[2] grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-4 lg:gap-6">
        {/* 1 Create */}
        <article className="relative rounded-2xl border border-purple-100/90 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-border dark:bg-card/95">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="flex flex-col"
          >
          <motion.div animate={bob(0)} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-600 to-violet-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              1 · Create
            </span>
            <motion.span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-md"
              animate={{ rotate: [0, -6, 6, 0] }}
              transition={{ duration: 5.5, repeat: Infinity }}
            >
              <Bot className="h-[18px] w-[18px]" strokeWidth={1.85} />
            </motion.span>
          </div>
          <p className="text-xs font-semibold text-foreground">Start your assistant</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Name your bot and open the studio—guided setup in minutes.</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["Flows", "Actions", "Persona"].map((t, idx) => (
              <motion.span
                key={t}
                className="rounded-md border border-purple-100 bg-purple-50/80 px-2 py-0.5 text-[10px] font-medium text-purple-900 dark:border-purple-500/20 dark:bg-purple-950/50 dark:text-purple-100"
                initial={{ opacity: 0.4, scale: 0.9 }}
                animate={{ opacity: [0.55, 1, 0.75], scale: [1, 1.04, 1] }}
                transition={{ duration: 3.4, repeat: Infinity, delay: idx * 0.45 }}
              >
                + {t}
              </motion.span>
            ))}
          </div>
          </motion.div>
          </motion.div>
        </article>

        {/* 2 Customise */}
        <article className="relative rounded-2xl border border-purple-100/90 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-border dark:bg-card/95">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="flex flex-col"
          >
          <motion.div animate={bob(0.35)} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              2 · Customise
            </span>
            <motion.span
              animate={{ rotate: [0, 10, -8, 0] }}
              transition={{ duration: 6.2, repeat: Infinity }}
            >
              <Palette className="h-5 w-5 text-purple-600" strokeWidth={1.75} />
            </motion.span>
          </div>
          <p className="text-xs font-semibold text-foreground">Make it yours</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Colours, launcher, typography—plus knowledge and multimodal tuning.</p>
          <motion.div className="mt-4 flex flex-wrap gap-1.5">
            {customizePills.map(({ icon: Ico, label }, j) => (
              <motion.span
                key={label}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-1.5 py-1 text-[9px] font-medium dark:bg-muted/25"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: j * 0.22 }}
              >
                <Ico className="h-2.5 w-2.5 text-purple-600" />
                {label}
              </motion.span>
            ))}
          </motion.div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-purple-100/70 bg-purple-50/50 px-2 py-1.5 dark:border-purple-500/20 dark:bg-purple-950/30">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
            <motion.div
              className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted dark:bg-muted/60"
              title="Tune widget theme"
              aria-hidden
            >
              <motion.span
                className="rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                animate={{ width: ["38%", "68%", "45%", "72%"] }}
                transition={{ duration: 5.5, repeat: Infinity }}
              />
            </motion.div>
          </div>
          </motion.div>
          </motion.div>
        </article>

        {/* 3 Deploy */}
        <article className="relative rounded-2xl border border-purple-100/90 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-border dark:bg-card/95">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="flex flex-col"
          >
          <motion.div animate={bob(0.68)} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              3 · Deploy
            </span>
            <motion.span animate={bob(0.1)}>
              <Rocket className="h-5 w-5 text-cyan-600" strokeWidth={1.75} />
            </motion.span>
          </div>
          <p className="text-xs font-semibold text-foreground">Go live on a URL</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Share a hosted link tests can hit while you tweak responses.</p>
          <motion.div className="mt-4 rounded-lg border border-border bg-muted/30 px-2 py-1.5 font-mono text-[10px] text-muted-foreground dark:bg-muted/20">
            <div className="flex items-center gap-1 truncate">
              <Globe className="h-3 w-3 shrink-0 text-purple-600" />
              studio<span className="text-foreground">/bot/</span>
              <motion.span
                className="truncate text-cyan-600 font-medium"
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                acme-support
              </motion.span>
            </div>
          </motion.div>
          <motion.div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          >
            <motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-500" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <Link2 className="h-3 w-3" />
            Published · ready to share
          </motion.div>
          </motion.div>
          </motion.div>
        </article>

        {/* 4 Embed */}
        <article className="relative rounded-2xl border border-purple-100/90 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-border dark:bg-card/95">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="flex flex-col"
          >
          <motion.div animate={bob(1)} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              4 · Embed
            </span>
            <Code2 className="h-5 w-5 text-purple-600" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold text-foreground">Paste on your website</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Floating launcher, drawer UX, branded to match your product.</p>
          <motion.div className="relative mt-4 min-h-[120px] flex-1 rounded-xl border border-dashed border-purple-200/75 bg-muted/25 p-3 dark:border-purple-500/30 dark:bg-muted/15">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">customer-site.com</p>
            <motion.div
              className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-lg ring-4 ring-background"
              animate={{
                scale: [1, 1.06, 1],
                boxShadow: [
                  "0 10px 28px -10px rgb(147 51 234 / 0.45)",
                  "0 16px 40px -8px rgb(6 182 212 / 0.45)",
                  "0 10px 28px -10px rgb(147 51 234 / 0.45)",
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
            </motion.div>
            <motion.span
              className="pointer-events-none absolute bottom-14 right-6 text-purple-600"
              animate={{ x: [0, 8, -4, 0], y: [0, -6, 2, 0] }}
              transition={{ duration: 3.8, repeat: Infinity }}
            >
              <MousePointerClick className="h-5 w-5 opacity-[0.85]" strokeWidth={1.75} />
            </motion.span>
          </motion.div>
          </motion.div>
          </motion.div>
        </article>
      </div>

      {/* Moving script ticker — tied to embed step */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        animate={{ y: [0, -2.5, 0] }}
        transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="relative z-[2] mt-8 flex max-w-[720px] items-center gap-2 rounded-xl border border-purple-200/70 bg-white/92 px-3 py-2.5 font-mono text-[11px] text-muted-foreground shadow-md backdrop-blur-sm dark:border-purple-500/30 dark:bg-card/92 md:mx-auto"
      >
        <motion.span
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="inline-flex shrink-0"
          aria-hidden
        >
          <Code2 className="h-4 w-4 text-purple-600" />
        </motion.span>
        <span className="min-w-0 flex-1 truncate">&lt;script src=&quot;taste–embed/your-bot.js&quot;&gt;&lt;/script&gt;</span>
        <span className="shrink-0 rounded-md bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-900 dark:bg-purple-950/85 dark:text-purple-100">
          live in seconds
        </span>
      </motion.div>
    </motion.div>
  );
};
