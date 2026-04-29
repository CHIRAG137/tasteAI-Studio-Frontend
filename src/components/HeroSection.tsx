import { motion } from "framer-motion";
import { Bot, Globe, Zap, ArrowRight, Sparkles, Code2, Heart, FileText } from "lucide-react";
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

const features = [
  {
    icon: Sparkles,
    title: "Smart AI Agents",
    description: "Intelligent agents that not only answer queries but take actions—automate tasks, make decisions, and drive business outcomes",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Bot,
    title: "Interactive Bots",
    description: "Create bots that understand context, answer questions, and perform actions seamlessly across voice, video, and text channels",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Code2,
    title: "Powerful Workflows",
    description: "Build automated workflows for Slack, email, webhooks, and custom integrations—no coding required",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const stats = [
  { value: "< 5 min", label: "Setup Time" },
  { value: "HIPAA", label: "Compliant" },
  { value: "50+", label: "Languages" },
  { value: "24/7", label: "Patient Care" },
];

interface HeroSectionProps {
  onCreateBot: () => void;
  onCreateSlackWorkflow: () => void;
  onViewBots: () => void;
  onViewWorkflows: () => void;
}

export const HeroSection = ({ onCreateBot, onCreateSlackWorkflow, onViewBots, onViewWorkflows }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-20">
        {/* Badge */}
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

        {/* Hero Text */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.h1
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">Build Smart </span>
            <span className="bg-gradient-to-r from-purple-500 to-blue-600 bg-clip-text text-transparent">Bots & Agents</span>
            <br />
            <span className="text-foreground">That </span>
            <motion.span
              className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent"
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

          {/* CTA Buttons */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-3"
          >
            {/* Primary actions: Create */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={onCreateBot}
                size="lg"
                className="min-w-[260px] bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white px-8 py-6 text-lg rounded-xl shadow-strong transition-all group"
              >
                <Heart className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Create Healthcare Bot
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                onClick={onCreateSlackWorkflow}
                size="lg"
                className="min-w-[260px] bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 text-white px-8 py-6 text-lg rounded-xl shadow-strong transition-all group"
              >
                <Zap className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Create Slack Workflows
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Secondary actions: View */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={onViewBots}
                variant="outline"
                size="lg"
                className="min-w-[260px] px-8 py-5 text-base rounded-xl border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 text-foreground"
              >
                <Bot className="w-5 h-5 mr-2" />
                View Your Bots
              </Button>

              <Button
                onClick={onViewWorkflows}
                variant="outline"
                size="lg"
                className="min-w-[260px] px-8 py-5 text-base rounded-xl border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 text-foreground"
              >
                <Code2 className="w-5 h-5 mr-2" />
                View Your Workflows
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="max-w-3xl mx-auto mb-20"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                className="text-center p-4 rounded-xl border border-red-200/50 bg-red-50/50 backdrop-blur-sm"
              >
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 to-blue-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform Illustration */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto mb-20"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            healthAI Studio
          </h2>
          <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
            Build, deploy, and manage AI agents for patient care, clinical workflows, and hospital operations
          </p>
          <HeroIllustration />
        </motion.div>

        {/* Platform Capabilities */}
        <div className="max-w-5xl mx-auto mb-20">
          <motion.h2
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-2xl md:text-3xl font-bold text-center mb-3"
          >
            All-in-One Platform
          </motion.h2>
          <motion.p
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-muted-foreground text-center mb-10 max-w-lg mx-auto"
          >
            Build bots that answer questions, AI agents that take actions, and workflows that automate your business processes
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{
                  y: -12,
                  scale: 1.02,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                className="group relative p-6 rounded-2xl border border-red-200/50 bg-gradient-to-br from-white to-red-50/30 hover:border-red-300/70 transition-all duration-500 cursor-default overflow-hidden shadow-lg hover:shadow-2xl"
              >
                {/* Healthcare-themed animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-blue-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Pulse animation for medical feel */}
                <div className="absolute inset-0 rounded-2xl border-2 border-red-200/20 group-hover:border-red-300/40 transition-all duration-500">
                  <div className="absolute inset-0 rounded-2xl border border-blue-200/30 animate-pulse" style={{ animationDuration: '3s' }} />
                </div>

                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-4 shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110`}>
                    <feature.icon className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-red-700 transition-colors duration-300">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">{feature.description}</p>

                  {/* Healthcare workflow indicator */}
                  <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                    <span className="text-xs text-red-600 font-medium">Active Healthcare Workflow</span>
                  </div>
                </div>

                {/* Medical cross decoration */}
                <div className="absolute top-4 right-4 w-6 h-6 opacity-10 group-hover:opacity-30 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-red-500 rounded-sm rotate-45"></div>
                  <div className="absolute inset-0 bg-red-500 rounded-sm"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="max-w-4xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-center mb-3"
          >
            Go Live in 3 Steps
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-muted-foreground text-center mb-12 max-w-lg mx-auto"
          >
            From your knowledge base to live AI bots and agents — launch in minutes, not months
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload Medical Data",
                description: "Import your hospital's knowledge base, patient FAQs, clinical guidelines, and treatment protocols.",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "Train Healthcare AI",
                description: "Our AI learns from your medical content and specializes in healthcare-specific conversations and workflows.",
              },
              {
                step: "03",
                icon: Globe,
                title: "Deploy & Integrate",
                description: "Embed voice, video, and text bots on your website, patient portal, and internal systems instantly.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i + 2}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative text-center"
              >
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-red-200 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-red-200 bg-red-50 mb-4 relative">
                  <item.icon className="w-8 h-8 text-red-600" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-red-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-medium">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};