import CTA from "@/components/landing/CTA";
import Hero from "@/components/landing/Hero";
import ModesShowcase from "@/components/landing/ModesShowcase";
import SimulationShowcase from "@/components/landing/SimulationShowcase";

const Landing = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030816] text-white">
      {/* Fixed background — deep midnight with faint glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#020810_0%,#04101e_50%,#030a14_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_65%_20%,rgba(8,145,178,0.08),transparent)]" />
      </div>

      <div className="relative">
        <Hero />
        <ModesShowcase />
        <SimulationShowcase />
        <CTA />

        <footer className="border-t border-white/[0.05] bg-[#020810]/80 px-4 py-10 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[13px] text-white/30 md:flex-row md:items-center md:justify-between">
            <p>
              LearningPacer · ELEC3120 Final Year Project · The Hong Kong
              University of Science and Technology
            </p>
            <p>Course-specific AI learning platform</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
