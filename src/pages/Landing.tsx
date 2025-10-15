import Hero from "@/components/landing/Hero";
import PlatformIntro from "@/components/landing/PlatformIntro";
import ModesShowcase from "@/components/landing/ModesShowcase";
import TechStack from "@/components/landing/TechStack";
import CTA from "@/components/landing/CTA";

const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-void overflow-x-hidden">
      <Hero />
      <PlatformIntro />
      <ModesShowcase />
      <TechStack />
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
