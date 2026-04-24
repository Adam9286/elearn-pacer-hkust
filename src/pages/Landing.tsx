import { MotionConfig } from "framer-motion";

import CredStrip from "@/components/landing/CredStrip";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import ModesShowcase from "@/components/landing/ModesShowcase";
import Navbar from "@/components/landing/Navbar";
import ProofSection from "@/components/landing/ProofSection";
import SimulationShowcase from "@/components/landing/SimulationShowcase";
import Testimonial from "@/components/landing/Testimonial";

const Landing = () => {
  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{
          minHeight: "100vh",
          background: "#030816",
          color: "#f0f4ff",
          fontFamily: "'Inter Tight', sans-serif",
          WebkitFontSmoothing: "antialiased",
          overflowX: "hidden",
        }}
      >
        <Navbar />
        <main>
          <Hero />
          <CredStrip />
          <ModesShowcase />
          <ProofSection />
          <SimulationShowcase />
          <Testimonial />
          <CTA />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
};

export default Landing;
