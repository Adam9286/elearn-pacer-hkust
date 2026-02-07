import { useState } from "react";

const TCPHandshake = () => {
  const [videoError, setVideoError] = useState(false);

  if (videoError) {
    return (
      <div className="absolute inset-0 z-[1] flex items-center justify-center bg-red-900/20 border border-red-500/50">
        <p className="text-red-400 font-mono">Video failed to load. Check public/hero-handshake.mp4.mp4</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[1] flex items-center justify-center overflow-hidden">
      {/* Zoom out slightly to show full body */}
      <div className="w-full h-full flex items-center justify-center" style={{ transform: "scale(0.85)" }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          onError={(e) => {
            console.error("Video load error:", e);
            setVideoError(true);
          }}
          className="w-full h-full object-cover"
        >
          <source src="/hero-handshake.mp4.mp4" type="video/mp4" />
          <p className="text-white">Your browser does not support the video tag.</p>
        </video>
      </div>
    </div>
  );
};

export default TCPHandshake;