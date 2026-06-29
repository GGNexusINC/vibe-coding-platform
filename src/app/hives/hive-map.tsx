"use client";
import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import type { HiveRecord } from "@/lib/hive-store";

type HiveMapProps = {
  hives: HiveRecord[];
  onHiveClick: (hiveId: string) => void;
  selectedHiveId: string | null;
  userHiveId: string | null;
};

// Convert map x (0-100) and y (0-100) to lat/lon
function coordsToLatLon(x: number, y: number): [number, number] {
  const lon = (x / 100) * 360 - 180;
  const lat = ((100 - y) / 100) * 180 - 90;
  return [lat, lon];
}

export function HiveMap({ hives, onHiveClick, selectedHiveId, userHiveId }: HiveMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [phi, setPhi] = useState(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0.3); // slight tilt
  const [hoveredNode, setHoveredNode] = useState<HiveRecord | null>(null);

  // Focus on selected hive or user's hive
  const activeHiveId = selectedHiveId || userHiveId;
  const activeHive = hives.find(h => h.id === activeHiveId);

  useEffect(() => {
    const current = canvasRef.current;
    if (!current) return;

    // Map all hives to markers
    const markers = hives.map(hive => {
      const [lat, lon] = coordsToLatLon(hive.map_x, hive.map_y);
      const isSelected = activeHiveId === hive.id;
      const isUser = userHiveId === hive.id;
      
      let size = 0.05 + (hive.level * 0.01);
      if (isSelected) size *= 1.5;

      return {
        location: [lat, lon] as [number, number],
        size,
      };
    });

    const globe = createGlobe(current, {
      devicePixelRatio: 2,
      width: 1000,
      height: 1000,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.05, 0.1, 0.15],
      markerColor: [0.2, 0.8, 0.5], // Emerald base for markers
      glowColor: [0.1, 0.6, 0.4],
      markers,
      onRender: (state: any) => {
        // Auto rotate if not interacting
        if (!pointerInteracting.current) {
          if (activeHive) {
            // Spin smoothly towards the active hive
            const [targetLat, targetLon] = coordsToLatLon(activeHive.map_x, activeHive.map_y);
            const targetPhi = -targetLon * (Math.PI / 180) + Math.PI;
            const targetTheta = targetLat * (Math.PI / 180);
            
            // Interpolate
            phiRef.current += (targetPhi - phiRef.current) * 0.05;
            thetaRef.current += (targetTheta - thetaRef.current) * 0.05;
          } else {
            phiRef.current += 0.003;
          }
        }
        state.phi = phiRef.current + pointerInteractionMovement.current;
        state.theta = thetaRef.current;
      },
    } as any);

    return () => {
      globe.destroy();
    };
  }, [hives, activeHiveId, userHiveId, activeHive]);

  return (
    <div className="relative w-full h-[600px] lg:h-[700px] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden bg-[#020617] group flex items-center justify-center">
      
      {/* HUD Info Panel for Active Hive */}
      {activeHive && (
        <div className="absolute top-8 left-8 z-50 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="rounded-2xl border border-emerald-500/50 bg-slate-900/90 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] p-6 w-80">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Target Locked</div>
                <h3 className="font-black uppercase tracking-tight text-2xl leading-tight text-white">{activeHive.name}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shadow-inner">
                <span className="text-xl font-black text-emerald-400">{activeHive.level}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Status</span>
                <span className={`font-bold uppercase tracking-wider ${activeHive.status === 'under_attack' ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {activeHive.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Troop Count</span>
                <span className="text-white font-bold">{activeHive.members.length} Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Commander</span>
                <span className="text-white font-bold truncate max-w-[120px]">{activeHive.owner_username}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Base XP</span>
                <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" style={{ width: `${(activeHive.xp / activeHive.next_reward_xp) * 100}%` }} />
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-medium">
                {activeHive.xp} / {activeHive.next_reward_xp}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The Globe Canvas */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-90 transition-opacity duration-1000">
        <div className="w-full max-w-[800px] aspect-square">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              pointerInteracting.current = e.clientX;
              if (currentCanvas) currentCanvas.style.cursor = "grabbing";
            }}
            onPointerUp={() => {
              pointerInteracting.current = null;
              if (currentCanvas) currentCanvas.style.cursor = "grab";
            }}
            onPointerOut={() => {
              pointerInteracting.current = null;
              if (currentCanvas) currentCanvas.style.cursor = "grab";
            }}
            onMouseMove={(e) => {
              if (pointerInteracting.current !== null) {
                const delta = e.clientX - pointerInteracting.current;
                pointerInteractionMovement.current = delta;
                setPhi(delta / 200);
              }
            }}
            onTouchMove={(e) => {
              if (pointerInteracting.current !== null && e.touches[0]) {
                const delta = e.touches[0].clientX - pointerInteracting.current;
                pointerInteractionMovement.current = delta;
                setPhi(delta / 100);
              }
            }}
          />
        </div>
      </div>

      {/* Decorative Overlays */}
      <div className="absolute inset-0 pointer-events-none rounded-[2.5rem] shadow-[inset_0_0_100px_rgba(0,0,0,1)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

      {/* Crosshairs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-20">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white -translate-x-1/2" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white -translate-y-1/2" />
        <div className="absolute inset-0 rounded-full border border-white" />
      </div>

      {/* Tech Grid Background (Faint) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />
      
      {/* Corner Brackets */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-cyan-500/50 rounded-br-xl pointer-events-none" />

      <div className="absolute bottom-8 right-8 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-none">
        <div className="flex gap-1">
          <div className="w-1 h-3 bg-cyan-500 animate-pulse" />
          <div className="w-1 h-3 bg-cyan-500/50 animate-pulse delay-75" />
          <div className="w-1 h-3 bg-cyan-500/20 animate-pulse delay-150" />
        </div>
        <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Global Scan Active</div>
      </div>
    </div>
  );
}

// Helper for type
let currentCanvas: HTMLCanvasElement | null = null;
