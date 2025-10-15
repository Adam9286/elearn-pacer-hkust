import Hero from "@/components/landing/Hero";
import PlatformIntro from "@/components/landing/PlatformIntro";
import ModesShowcase from "@/components/landing/ModesShowcase";
import TechStack from "@/components/landing/TechStack";
import CTA from "@/components/landing/CTA";
import SectionDivider from "@/components/landing/SectionDivider";
import BusFleet from "@/components/landing/BusFleet";
import TCPHandshake from "@/components/landing/TCPHandshake";

const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-void overflow-x-hidden">
      {/* Background bus fleet */}
      <BusFleet />
      
      <Hero />
      <TCPHandshake />
      <SectionDivider variant="neural" />
      <PlatformIntro />
      <SectionDivider variant="robot" />
      <ModesShowcase />
      <SectionDivider variant="binary" />
      <TechStack />
      <SectionDivider variant="wave" />
      <CTA />
      
      {/* Footer */}
      <footer className="py-8 border-t border-white/10 bg-dark-void">
        <div className="container mx-auto px-4 text-center text-white/60">
          <p className="text-sm">
            LearningPacer • ELEC3120 Final Year Project • The Hong Kong University of Science and Technology
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
