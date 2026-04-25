"use client";

import { useState, useRef, useEffect } from "react";
export interface HiveRecord {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_username: string;
  map_label: string;
  map_x: number;
  map_y: number;
  level: number;
  xp: number;
  next_reward_xp: number;
  status: string;
  members: any[];
  activity_log: { id: string; actor_id?: string; actor_username: string; action: string; xp: number; created_at: string }[];
  created_at: string;
  updated_at: string;
}

export function InteractiveMap({ hives, draft, onPick, compact, className }: { hives: HiveRecord[]; draft?: { x: number; y: number }; onPick?: (x: number, y: number) => void; compact?: boolean; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  
  const [filter, setFilter] = useState<"all" | "high-level" | "active">("all");
  const [selectedHive, setSelectedHive] = useState<HiveRecord | null>(null);

  // Handle Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale + delta;
    
    // Clamp scale between 1 and 5
    newScale = Math.min(Math.max(1, newScale), 5);
    
    // Calculate new position to zoom towards mouse
    if (containerRef.current && mapRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust position so the point under the mouse stays under the mouse
      const scaleChange = newScale - scale;
      const newX = position.x - (mouseX - position.x) * (scaleChange / scale);
      const newY = position.y - (mouseY - position.y) * (scaleChange / scale);

      // Simple clamping to prevent dragging too far off-screen
      const maxX = 0;
      const minX = rect.width * (1 - newScale);
      const maxY = 0;
      const minY = rect.height * (1 - newScale);

      setPosition({
        x: Math.min(maxX, Math.max(minX, newX)),
        y: Math.min(maxY, Math.max(minY, newY))
      });
    }
    
    setScale(newScale);
  };

  // Handle Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragDistance(0);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setDragDistance(prev => prev + Math.abs(e.movementX) + Math.abs(e.movementY));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      
      const maxX = 0;
      const minX = rect.width * (1 - scale);
      const maxY = 0;
      const minY = rect.height * (1 - scale);

      setPosition({
        x: Math.min(maxX, Math.max(minX, newX)),
        y: Math.min(maxY, Math.max(minY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (dragDistance > 5) return; // Ignore clicks if dragging

    if (onPick && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onPick(x, y);
      setSelectedHive(null);
    }
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const filteredHives = hives.filter(h => {
    if (filter === "high-level") return h.level >= 5;
    if (filter === "active") return h.activity_log && h.activity_log.length > 0;
    return true;
  });

  return (
    <div className={`flex flex-col lg:flex-row gap-6 w-full bg-slate-950 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative ${compact ? 'h-[300px]' : 'h-[800px]'} ${className || ''}`}>
      
      {/* Sidebar Controls */}
      {!compact && (
      <div className="w-full lg:w-80 shrink-0 bg-slate-950/80 backdrop-blur-xl border-r border-cyan-500/20 p-6 flex flex-col z-10 shadow-[4px_0_24px_rgba(34,211,238,0.05)] relative overflow-hidden">
        {/* Cyberpunk accent lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/30 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.15)] [clip-path:polygon(0_0,100%_0,95%_100%,5%_100%)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 bg-cyan-500 shadow-[0_0_8px_#22d3ee]"></span>
            </span>
            Neural Grid Active
          </div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight leading-none mb-2 uppercase" style={{ textShadow: "0 0 20px rgba(255,255,255,0.1)" }}>Sector Map</h2>
          <p className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest">Pan & Zoom to navigate</p>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/50 border-b border-cyan-500/10 pb-2">Display Filters</h3>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setFilter("all")}
              className={`text-left px-4 py-3 border text-[11px] uppercase tracking-wider font-bold transition-all ${filter === "all" ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)] [clip-path:polygon(0_0,100%_0,98%_100%,0_100%)]" : "bg-transparent border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300 [clip-path:polygon(0_0,100%_0,98%_100%,0_100%)]"}`}
            >
              <span className="mr-2 opacity-50">01</span> All Territories
            </button>
            <button 
              onClick={() => setFilter("high-level")}
              className={`text-left px-4 py-3 border text-[11px] uppercase tracking-wider font-bold transition-all ${filter === "high-level" ? "bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)] [clip-path:polygon(0_0,100%_0,98%_100%,0_100%)]" : "bg-transparent border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300 [clip-path:polygon(0_0,100%_0,98%_100%,0_100%)]"}`}
            >
              <span className="mr-2 opacity-50">02</span> High-Level (Lvl 5+)
            </button>
            <button 
              onClick={() => setFilter("active")}
              className={`text-left px-4 py-3 border text-[11px] uppercase tracking-wider font-bold transition-all ${filter === "active" ? "bg-rose-500/10 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)] [clip-path:polygon(0_0,100%_0,98%_100%,0_100%)]" : "bg-transparent border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300 [clip-path:polygon(0_0,100%_0,98%_100%,0_100%)]"}`}
            >
              <span className="mr-2 opacity-50">03</span> Conflict Zones
            </button>
          </div>
        </div>

        {selectedHive ? (
          <div className="mt-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-cyan-950/30 border border-cyan-500/30 p-5 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)] relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedHive.name}</h3>
                <span className="bg-cyan-500/20 border border-cyan-500/50 px-2 py-0.5 text-[10px] font-black text-cyan-300 tracking-widest">LVL {selectedHive.level}</span>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-cyan-500/60 font-black uppercase tracking-widest">Coordinates</span>
                  <span className="text-cyan-400 font-mono text-xs">{Math.round(selectedHive.map_x)}<span className="text-cyan-500/50">x</span> {Math.round(selectedHive.map_y)}<span className="text-cyan-500/50">y</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-cyan-500/60 font-black uppercase tracking-widest">Sector</span>
                  <span className="text-white font-bold text-xs uppercase">{selectedHive.map_label}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-[10px] text-cyan-500/60 font-black uppercase tracking-widest">Operations</span>
                  <span className="text-amber-400 font-black text-xs">{selectedHive.activity_log ? selectedHive.activity_log.length : 0} Logged</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHive(null)}
                className="w-full h-10 bg-white/5 hover:bg-cyan-500/20 border border-transparent hover:border-cyan-500/30 text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-cyan-300 transition-all"
              >
                Terminate Connection
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto bg-slate-900/50 border border-white/5 p-6 text-center border-dashed">
            <div className="text-cyan-500/30 text-4xl mb-3 animate-pulse">✜</div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">Awaiting Target Designation</p>
          </div>
        )}
      </div>
      )}

      {/* Map Viewport */}
      <div 
        className="flex-1 relative overflow-hidden bg-[#111] cursor-grab active:cursor-grabbing"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Tactical HUD Overlays */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Scanline Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
          
          {/* Pulsating Tactical Border */}
          <div className="absolute inset-0 border-2 border-cyan-500/10 shadow-[inset_0_0_40px_rgba(34,211,238,0.05)] animate-pulse" />
          
          {/* Corner Brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />
        </div>

        {/* The scalable, draggable map container */}
        <div 
          ref={mapRef}
          className="absolute origin-top-left w-full h-full transition-transform ease-out duration-75"
          onClick={handleMapClick}
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            backgroundImage: "url('/once-human-raidzone-full-map.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:50px_50px]" />
          
          {/* Markers */}
          {filteredHives.map((hive) => {
            const isSelected = selectedHive?.id === hive.id;
            const isHighLevel = hive.level >= 5;
            
            return (
              <div 
                key={hive.id} 
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer" 
                style={{ 
                  left: `${hive.map_x}%`, 
                  top: `${hive.map_y}%`,
                  // Inverse scale to keep pins crisp and same size
                  transform: `translate(-50%, -50%) scale(${1 / scale})`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHive(hive);
                }}
              >
                {/* Ping animation for selected or high-level */}
                {(isSelected || isHighLevel) && (
                  <div className={`absolute -inset-4 rounded-full animate-ping opacity-60 ${isSelected ? 'bg-cyan-400' : 'bg-amber-500'}`} style={{ animationDuration: '2s' }} />
                )}
                
                {/* Cyberpunk Map Pin */}
                <div className={`relative flex items-center justify-center transition-all duration-300 ${
                  isSelected 
                    ? 'scale-125 z-20' 
                    : isHighLevel 
                      ? 'hover:scale-110 z-10' 
                      : 'opacity-80 hover:opacity-100'
                }`}>
                  <div className={`absolute inset-0 rotate-45 border ${isSelected ? 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_15px_#22d3ee]' : isHighLevel ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_10px_#f59e0b]' : 'border-slate-400 bg-slate-900/50'} w-6 h-6 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2`} />
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-300 shadow-[0_0_10px_#67e8f9]' : isHighLevel ? 'bg-amber-300 shadow-[0_0_10px_#fcd34d]' : 'bg-slate-300'}`} />
                </div>

                {/* Tooltip on hover */}
                {!isSelected && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-50">
                    <div className="bg-slate-950/90 border border-cyan-500/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300 whitespace-nowrap shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md">
                      {hive.name}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Draft Selection Marker */}
          {draft && (
            <div className="absolute pointer-events-none z-30" style={{ 
              left: `${draft.x}%`, 
              top: `${draft.y}%`,
              transform: `translate(-50%, -50%) scale(${1 / scale})`
            }}>
              <div className="absolute -inset-6 rounded-full animate-ping border border-red-500/50 opacity-100" style={{ animationDuration: '1.5s' }} />
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-red-500 [clip-path:polygon(0_20%,20%_0,80%_0,100%_20%,100%_80%,80%_100%,20%_100%,0_80%)] shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-3">
          {onPick && (
            <div className="absolute bottom-full right-0 mb-4 bg-slate-950/90 border border-red-500/30 px-5 py-3 w-56 text-right shadow-[0_0_30px_rgba(239,68,68,0.15)] pointer-events-none [clip-path:polygon(0_0,100%_0,100%_100%,10%_100%,0_85%)]">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center justify-end gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Targeting Sys Online
              </span>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click sector to lock coords</div>
            </div>
          )}
          <button 
            onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
            className="h-10 w-10 bg-cyan-950/80 backdrop-blur border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition shadow-[0_0_15px_rgba(34,211,238,0.1)] [clip-path:polygon(0_0,100%_0,100%_80%,80%_100%,0_100%)]"
            title="Recalibrate"
          >
            ⛶
          </button>
          <div className="flex flex-col bg-cyan-950/80 backdrop-blur border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)] [clip-path:polygon(0_0,100%_0,100%_100%,20%_100%,0_80%)]">
            <button 
              onClick={() => setScale(s => Math.min(5, s + 0.5))}
              className="h-10 w-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition border-b border-cyan-500/20 text-lg font-light"
            >
              +
            </button>
            <button 
              onClick={() => setScale(s => Math.max(1, s - 0.5))}
              className="h-10 w-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition text-lg font-light"
            >
              −
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
