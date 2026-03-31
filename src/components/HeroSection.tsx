import { motion } from "framer-motion";
import { Bot, Video, Mic, Globe, Zap, Clock, ArrowRight, Sparkles, MessageSquare, Code2 } from "lucide-react";
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
    icon: Video,
    title: "Video Chatbots",
    description: "AI-powered video avatars that talk to your visitors face-to-face",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Mic,
    title: "Voice Enabled",
    description: "Natural voice conversations with speech-to-text and text-to-speech",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Globe,
    title: "Website Widget",
    description: "Add a floating chatbot to any website with a single line of code",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const stats = [
  { value: "< 5 min", label: "Setup Time" },
  { value: "24/7", label: "Always Online" },
  { value: "50+", label: "Languages" },
  { value: "1 Line", label: "To Embed" },
];

interface HeroSectionProps {
  onCreateBot: () => void;
  onViewBots: () => void;
}

export const HeroSection = ({ onCreateBot, onViewBots }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Chatbot Platform
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
            <span className="text-foreground">Build </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">Intelligent</span>
            <br />
            <span className="text-foreground">Chatbots in </span>
            <motion.span
              className="bg-gradient-hero bg-clip-text text-transparent"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            >
              Minutes
            </motion.span>
          </motion.h1>

          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Create video, voice, and text chatbots trained on your content. 
            Deploy as a floating widget on any website with just one line of code.
          </motion.p>

          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              onClick={onCreateBot}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg rounded-xl shadow-strong hover:shadow-strong transition-all group"
            >
              <Zap className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Create Your Bot
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              onClick={onViewBots}
              variant="outline"
              size="lg"
              className="px-8 py-6 text-lg rounded-xl"
            >
              <Bot className="w-5 h-5 mr-2" />
              View Your Bots
            </Button>
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
                className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <div className="text-2xl md:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="max-w-5xl mx-auto mb-20">
          <motion.h2
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-2xl md:text-3xl font-bold text-center mb-3"
          >
            Everything You Need
          </motion.h2>
          <motion.p
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-muted-foreground text-center mb-10 max-w-lg mx-auto"
          >
            From video avatars to voice conversations — deploy anywhere in minutes
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
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-colors cursor-default overflow-hidden"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 shadow-medium`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
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
            Deploy in 3 Simple Steps
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-muted-foreground text-center mb-12 max-w-lg mx-auto"
          >
            From zero to a live chatbot on your website — faster than making coffee
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: MessageSquare,
                title: "Configure Your Bot",
                description: "Name it, describe its purpose, upload your content, and set its personality.",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "Train with AI",
                description: "Our AI learns from your website, documents, and custom instructions automatically.",
              },
              {
                step: "03",
                icon: Code2,
                title: "Embed Anywhere",
                description: "Copy one line of code. Paste into your website. Your chatbot is live instantly.",
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
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-primary/20 bg-primary/5 mb-4 relative">
                  <item.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-primary text-white text-xs font-bold flex items-center justify-center shadow-medium">
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
