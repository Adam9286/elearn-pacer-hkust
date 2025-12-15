import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import TCPHandshake from "./TCPHandshake";

const NetworkShowcase = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const steps = [
    {
      step: "1",
      title: "SYN",
      description: "Client initiates connection by sending synchronization request",
      color: "electric-cyan",
    },
    {
      step: "2", 
      title: "SYN-ACK",
      description: "Server acknowledges and sends its own synchronization",
      color: "neon-purple",
    },
    {
      step: "3",
      title: "ACK",
      description: "Client confirms, establishing reliable connection",
      color: "hkust-gold",
    },
  ];

  return (
    <section 
      ref={ref}
      className="relative py-24 px-6 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/20 to-dark-void" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--electric-cyan)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--electric-cyan)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4
                       bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            Network Protocols in Action
          </motion.span>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Visualize the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan to-neon-purple">
              TCP Handshake
            </span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch how computers establish reliable connections through the three-way handshake protocol
          </p>
        </motion.div>
        
        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* TCP Handshake visualization */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative rounded-2xl overflow-hidden bg-card/30 backdrop-blur-sm border border-border/50 p-6">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-electric-cyan/5 via-transparent to-neon-purple/5" />
              
              {/* TCP Handshake component */}
              <div className="relative h-[400px]">
                <TCPHandshake />
              </div>
            </div>
            
            {/* Decorative elements */}
            <motion.div
              className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-electric-cyan/20 blur-lg"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full bg-neon-purple/20 blur-lg"
              animate={{ scale: [1.5, 1, 1.5], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
          </motion.div>
          
          {/* Step explanations */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                className="relative flex gap-4 p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/50
                           hover:border-electric-cyan/30 transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 + index * 0.15 }}
                whileHover={{ x: 8 }}
              >
                {/* Step number */}
                <div 
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                             bg-${step.color}/10 border border-${step.color}/30`}
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--${step.color}) / 0.1), hsl(var(--${step.color}) / 0.05))`,
                    borderColor: `hsl(var(--${step.color}) / 0.3)`,
                  }}
                >
                  <span 
                    className="text-lg font-bold"
                    style={{ color: `hsl(var(--${step.color}))` }}
                  >
                    {step.step}
                  </span>
                </div>
                
                {/* Content */}
                <div>
                  <h3 
                    className="text-xl font-semibold mb-1"
                    style={{ color: `hsl(var(--${step.color}))` }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
                
                {/* Arrow indicator on hover */}
                <motion.div
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                  initial={{ x: -10 }}
                  whileHover={{ x: 0 }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none"
                    style={{ color: `hsl(var(--${step.color}))` }}
                  >
                    <path 
                      d="M4 10H16M16 10L11 5M16 10L11 15" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </motion.div>
            ))}
            
            {/* Additional info card */}
            <motion.div
              className="mt-8 p-4 rounded-xl bg-gradient-to-r from-electric-cyan/5 to-neon-purple/5 
                         border border-border/50"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 1 }}
            >
              <p className="text-sm text-muted-foreground">
                <span className="text-electric-cyan font-medium">Fun fact:</span>{" "}
                This three-way handshake happens in milliseconds, ensuring both client and server 
                are ready before any data is transmitted.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default NetworkShowcase;
