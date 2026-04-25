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
      <div className="w-full lg:w-80 shrink-0 bg-slate-900/50 backdrop-blur border-r border-white/5 p-6 flex flex-col z-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            Live Tactical Map
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Sector Map</h2>
          <p className="text-xs font-medium text-slate-400">Scroll to zoom, click and drag to pan.</p>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Filters</h3>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setFilter("all")}
              className={`text-left px-4 py-3 rounded-2xl border text-xs font-bold transition ${filter === "all" ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"}`}
            >
              🌐 All Hives & Territories
            </button>
            <button 
              onClick={() => setFilter("high-level")}
              className={`text-left px-4 py-3 rounded-2xl border text-xs font-bold transition ${filter === "high-level" ? "bg-orange-500/20 border-orange-500/30 text-orange-400" : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"}`}
            >
              🔥 High-Level Hives (Lvl 5+)
            </button>
            <button 
              onClick={() => setFilter("active")}
              className={`text-left px-4 py-3 rounded-2xl border text-xs font-bold transition ${filter === "active" ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"}`}
            >
              ⚔️ Active Conflict Zones
            </button>
          </div>
        </div>

        {selectedHive ? (
          <div className="mt-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/20 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">{selectedHive.name}</h3>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-slate-300">Lvl {selectedHive.level}</span>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Coordinates</span>
                  <span className="text-cyan-400 font-mono">{Math.round(selectedHive.map_x)}, {Math.round(selectedHive.map_y)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Sector</span>
                  <span className="text-white font-medium">{selectedHive.map_label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Activity</span>
                  <span className="text-emerald-400 font-medium">{selectedHive.activity_log ? selectedHive.activity_log.length : 0} Ops</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHive(null)}
                className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto rounded-2xl bg-white/5 border border-white/5 p-5 text-center">
            <div className="text-2xl mb-2 opacity-50">🎯</div>
            <p className="text-xs font-medium text-slate-400">Select a map marker to view detailed telemetry.</p>
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
          {/* Overlay grid */}
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:5%_5%]" />
          
          {/* Markers */}
          {filteredHives.map((hive) => {
            const isSelected = selectedHive?.id === hive.id;
            const isHighLevel = hive.level >= 5;
            
            return (
              <div 
                key={hive.id} 
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer" 
                style={{ left: `${hive.map_x}%`, top: `${hive.map_y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHive(hive);
                }}
              >
                {/* Ping animation for selected or high-level */}
                {(isSelected || isHighLevel) && (
                  <div className={`absolute -inset-2 rounded-full animate-ping opacity-75 ${isSelected ? 'bg-cyan-400' : 'bg-orange-500'}`} />
                )}
                
                {/* Map Pin */}
                <div className={`relative h-5 w-5 rounded-full border-[3px] shadow-2xl transition-all duration-300 ${
                  isSelected 
                    ? 'border-white bg-cyan-400 scale-125 shadow-cyan-500/50' 
                    : isHighLevel 
                      ? 'border-white bg-orange-500 hover:scale-110 shadow-orange-500/50' 
                      : 'border-white/80 bg-slate-800 hover:scale-110 hover:bg-slate-600'
                }`} />

                {/* Tooltip on hover */}
                {!isSelected && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-50">
                    <div className="rounded-xl border border-white/20 bg-slate-950/90 px-3 py-1.5 text-[10px] font-black text-white whitespace-nowrap shadow-2xl backdrop-blur">
                      {hive.name}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Draft Selection Marker */}
          {draft && (
            <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>
              <div className="h-6 w-6 animate-ping rounded-full bg-orange-500/40" />
              <div className="absolute inset-0 rounded-full border-2 border-white bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,1)]" />
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          {onPick && (
            <div className="absolute bottom-full right-0 mb-4 rounded-xl bg-slate-950/80 px-4 py-2 border border-white/10 backdrop-blur w-48 text-right shadow-2xl pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Targeting Active</span>
              <div className="text-xs font-bold text-slate-300">Click map to set coordinates</div>
            </div>
          )}
          <button 
            onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
            className="h-10 w-10 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition shadow-2xl"
            title="Reset View"
          >
            ⛶
          </button>
          <div className="flex rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 shadow-2xl overflow-hidden">
            <button 
              onClick={() => setScale(s => Math.min(5, s + 0.5))}
              className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/10 transition border-r border-white/10"
            >
              +
            </button>
            <button 
              onClick={() => setScale(s => Math.max(1, s - 0.5))}
              className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/10 transition"
            >
              -
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
