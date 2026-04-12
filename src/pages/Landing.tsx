import CTA from "@/components/landing/CTA";
import ComparisonSection from "@/components/landing/ComparisonSection";
import Hero from "@/components/landing/Hero";
import ModesShowcase from "@/components/landing/ModesShowcase";
import PlatformIntro from "@/components/landing/PlatformIntro";
import SimulationShowcase from "@/components/landing/SimulationShowcase";

const Landing = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030816] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(8,47,73,0.32),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(8,145,178,0.22),transparent_26%),linear-gradient(180deg,#030816_0%,#050b16_40%,#030711_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      </div>

      <div className="relative">
        <Hero />
        <PlatformIntro />
        <ModesShowcase />
        <SimulationShowcase />
        <ComparisonSection />
        <CTA />

        <footer className="border-t border-white/10 bg-[#02050d]/80 px-4 py-10 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
            <p>LearningPacer | ELEC3120 Final Year Project | The Hong Kong University of Science and Technology</p>
            <p>Course-specific AI-assisted learning platform for Computer Networks</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
