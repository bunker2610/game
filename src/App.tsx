import SupGame from "./components/SupGame";

export default function App() {
  return (
    <div className="min-h-screen bg-[#07050d] text-[#e5e3eb] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Immersive ambient water/river neon light effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,_rgba(145,94,255,0.08)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.04)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none animate-pulse duration-7000" />
      
      {/* Animated slow floating background elements to mimic river bubbles */}
      <div className="absolute top-[30%] left-[15%] w-2 h-2 rounded-full bg-[#bf94ff]/10 animate-bounce pointer-events-none" />
      <div className="absolute top-[70%] right-[12%] w-3 h-3 rounded-full bg-[#10b981]/10 animate-bounce pointer-events-none delay-1000" />
      <div className="absolute top-[15%] right-[25%] w-1.5 h-1.5 rounded-full bg-[#3b82f6]/10 animate-ping pointer-events-none delay-500" />

      {/* Main Game Card Container */}
      <div className="relative z-10 w-full max-w-[780px]" id="app_game_wrapper">
        <SupGame />
      </div>
    </div>
  );
}
