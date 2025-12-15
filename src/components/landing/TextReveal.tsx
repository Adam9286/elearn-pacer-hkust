import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

const TextReveal = ({ 
  children, 
  className = "",
  delay = 0,
  staggerDelay = 0.03,
}: TextRevealProps) => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  
  const words = children.split(" ");

  return (
    <motion.span
      ref={ref}
      className={`inline-flex flex-wrap ${className}`}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ staggerChildren: staggerDelay, delayChildren: delay }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="mr-[0.25em] inline-block"
          variants={{
            hidden: {
              opacity: 0,
              y: 20,
              filter: "blur(10px)",
            },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
            },
          }}
          transition={{
            type: "spring" as const,
            damping: 12,
            stiffness: 100,
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default TextReveal;
