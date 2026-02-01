import Hero from "@/components/landing/Hero";
import PlatformIntro from "@/components/landing/PlatformIntro";
import ModesShowcase from "@/components/landing/ModesShowcase";
import CTA from "@/components/landing/CTA";
import SectionDivider from "@/components/landing/SectionDivider";
import BusFleet from "@/components/landing/BusFleet";
import CursorSpotlight from "@/components/landing/CursorSpotlight";

const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-void overflow-x-hidden">
      {/* Global cursor spotlight effect */}
      <CursorSpotlight />
      
      {/* Background bus fleet */}
      <BusFleet />
      
      <Hero />
      <SectionDivider variant="neural" />
      <PlatformIntro />
      <SectionDivider variant="robot" />
      <ModesShowcase />
      <SectionDivider variant="wave" />
      <CTA />
      
      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-dark-void relative">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            LearningPacer • ELEC3120 Final Year Project • The Hong Kong University of Science and Technology
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
