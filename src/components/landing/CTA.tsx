import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowRight, Sparkles, Rocket, Zap, Shield, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MagneticButton from "./MagneticButton";

const CTA = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });
  
  const navigate = useNavigate();

  const features = [
    { icon: Zap, label: "Instant Responses" },
    { icon: Shield, label: "Accurate Content" },
    { icon: Globe, label: "Always Available" },
  ];

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/30 to-dark-void"></div>
      
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-electric-cyan/20"
            style={{
              width: 200 + i * 150,
              height: 200 + i * 150,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 4,
              delay: i * 0.5,
              repeat: Infinity,
            }}
          />
        ))}
      </div>

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-electric-cyan/60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            repeat: Infinity,
          }}
        />
      ))}
      
      <div className="container mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          {/* Floating icon */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-block mb-8"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center shadow-lg shadow-neon-blue/30">
              <Rocket className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          >
            <span className="text-white">Ready to </span>
            <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan bg-clip-text text-transparent">
              Accelerate
            </span>
            <br />
            <span className="text-white">Your Learning?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-white/60 mb-10 max-w-xl mx-auto"
          >
            Start mastering ELEC3120 with AI-powered guidance
          </motion.p>

          {/* Main CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-12"
          >
            <MagneticButton
              onClick={() => navigate("/platform")}
              className="group relative inline-flex items-center gap-3 px-12 py-6 text-xl font-bold text-white rounded-full overflow-hidden"
              strength={0.5}
            >
              {/* Animated gradient background */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan bg-[length:200%_100%]"
                animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="absolute inset-[3px] bg-dark-void rounded-full group-hover:bg-dark-void/80 transition-all duration-300"></div>
              
              <span className="relative flex items-center gap-3">
                <Rocket className="w-6 h-6 group-hover:rotate-45 transition-transform" />
                Launch LearningPacer
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </MagneticButton>
          </motion.div>

          {/* Features row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap justify-center gap-6 md:gap-10"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.label}
                className="flex items-center gap-2 text-white/60"
                whileHover={{ scale: 1.05, color: "rgba(255,255,255,0.9)" }}
              >
                <feature.icon className="w-5 h-5 text-electric-cyan" />
                <span className="text-sm">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats below */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {[
              { value: "Every Answer", label: "Cites Its Source" },
              { value: "50+ Topics", label: "From ELEC3120" },
              { value: "PDF Export", label: "For Offline Study" }
            ].map((stat, index) => (
              <motion.div 
                key={index} 
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.2)" }}
              >
                <div className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-electric-cyan bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-white/50 text-xs">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
