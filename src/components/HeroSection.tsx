import { motion } from "framer-motion";
import {
  Bot,
  Zap,
  ArrowRight,
  Code2,
  Rocket,
  FlaskConical,
  Link2,
  MousePointerClick,
  BarChart3,
  MessagesSquare,
} from "lucide-react";
import { HeroIllustration } from "./HeroIllustration";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stats = [
  { value: "< 5 min", label: "Setup Time" },
  { value: "No Code", label: "Builder" },
  { value: "50+", label: "Languages" },
  { value: "24/7", label: "Automation" },
];

const bandInset = "max-w-7xl mx-auto px-4";

interface HeroSectionProps {
  onCreateBot: () => void;
  onCreateSlackWorkflow: () => void;
  onViewBots: () => void;
  onViewWorkflows: () => void;
}

export const HeroSection = ({ onCreateBot, onCreateSlackWorkflow, onViewBots, onViewWorkflows }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden">
      {/* 1 · White */}
      <div className="relative w-full bg-white dark:bg-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-16 left-[8%] h-72 w-72 rounded-full bg-purple-500/[0.07] blur-3xl" />
          <div className="absolute bottom-0 right-[5%] h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-3xl" />
        </div>

        <div className={`relative ${bandInset} pt-10 pb-16 md:pb-20`}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-600 text-sm font-medium">
              <Zap className="w-4 h-4" />
              AI-Powered Bot, Agent & Workflow Platform
              <ArrowRight className="w-3 h-3" />
            </div>
          </motion.div>

          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-foreground">Build Smart </span>
              <span className="bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">Bots & Agents</span>
              <br />
              <span className="text-foreground">That </span>
              <motion.span
                className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 200%" }}
              >
                Act & Answer
              </motion.span>
            </motion.h1>

            <motion.p
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Create intelligent bots and AI agents that not only answer questions but take actions.
              Deploy voice, video, text, and workflow automation. Build Slack workflows, custom integrations,
              and embed conversational AI across all your platforms in minutes.
            </motion.p>

            <motion.div
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center gap-3"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={onCreateBot}
                  size="lg"
                  className="min-w-[260px] px-8 py-2 h-auto text-lg rounded-xl shadow-strong transition-all group"
                >
                  <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  Create AI Bot
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>

                <Button
                  onClick={onCreateSlackWorkflow}
                  size="lg"
                  className="min-w-[260px] px-8 py-2 h-auto text-lg rounded-xl shadow-strong transition-all group"
                >
                  <Zap className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  Create Slack Workflows
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={onViewBots}
                  variant="outline"
                  size="lg"
                  className="min-w-[260px] px-8 py-2 h-auto text-base rounded-xl"
                >
                  <Bot className="w-5 h-5 mr-2" />
                  View Your Bots
                </Button>

                <Button
                  onClick={onViewWorkflows}
                  variant="outline"
                  size="lg"
                  className="min-w-[260px] px-8 py-2 h-auto text-base rounded-xl"
                >
                  <Code2 className="w-5 h-5 mr-2" />
                  View Your Workflows
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 2 · Tinted */}
      <div className="w-full bg-gradient-to-br from-purple-50/95 via-blue-50/65 to-cyan-50/90 dark:from-muted/90 dark:via-background dark:to-muted/70">
        <div className={`${bandInset} py-14 md:py-16`}>
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="max-w-3xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  custom={i}
                  variants={scaleIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="text-center p-4 rounded-xl border border-white/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/90"
                >
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 3 · White · From builder to embedded insight */}
      <div className="w-full bg-white dark:bg-background">
        <div className={`${bandInset} py-14 md:py-20`}>
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="max-w-6xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
              From builder to embedded insight
            </h2>
            <p className="text-muted-foreground text-center mb-10 md:mb-12 max-w-2xl mx-auto text-base leading-relaxed">
              TasteAI Studio is the control plane for assistants that blend rich training data, conversational polish, hosted
              previews, onsite embeds, analytics, and full session visibility—without stitching five tools together.
            </p>
            <HeroIllustration />
          </motion.div>
        </div>
      </div>

      {/* 4 · Tinted · Playbook */}
      <div className="w-full bg-gradient-to-br from-purple-50/95 via-blue-50/65 to-cyan-50/90 dark:from-muted/90 dark:via-background dark:to-muted/70">
        <div className={`${bandInset} py-14 md:py-20`}>
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-center mb-3"
          >
            Your playbook in six moves
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Follow the same path our builders use: assemble knowledge, audition quality, socialize a link, bolt the widget onto
            your web property, quantify results, then mine session history when you refine the roadmap.
          </motion.p>

          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Bot,
                title: "Compose the bot experience",
                description: "Layer documents, scraped site pages, avatars, voice, languages, flows, and automations.",
              },
              {
                step: "02",
                icon: FlaskConical,
                title: "Test and evaluate aggressively",
                description: "Run realistic conversations internally until answers, tone, and safety meet your bar.",
              },
              {
                step: "03",
                icon: Link2,
                title: "Stand up a public URL",
                description: "Let stakeholders chat on a branded page while you tighten prompts behind the scenes.",
              },
              {
                step: "04",
                icon: MousePointerClick,
                title: "Embed in seconds",
                description: "Add a floating chat launcher with colours and layout that mirror your UI system.",
              },
              {
                step: "05",
                icon: BarChart3,
                title: "Understand performance",
                description: "Use analytics to see throughput, intents, escalation patterns, and product gaps.",
              },
              {
                step: "06",
                icon: MessagesSquare,
                title: "Review conversations",
                description: "Read transcripts, skim AI summaries of sessions, and track what visitors really ask.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                custom={parseInt(item.step, 10)}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/90 text-center sm:text-left"
              >
                <div className="inline-flex mx-auto sm:mx-0 items-center justify-center w-16 h-16 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-cyan-50 mb-4 relative dark:border-purple-500/30 dark:from-purple-950/40 dark:to-cyan-950/20">
                  <item.icon className="w-7 h-7 text-purple-700 dark:text-purple-300" strokeWidth={1.75} />
                  <span className="absolute -top-2 -right-2 min-w-[1.75rem] h-7 px-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold flex items-center justify-center shadow-medium">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
