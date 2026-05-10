"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function BrawlEventPromo() {
  const [isVisible, setIsVisible] = useState(false);
  const [regCount, setRegCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000);
    
    // Fetch real registration count
    fetch("/api/brawl/count")
      .then(r => r.json())
      .then(data => {
        if (data.ok) setRegCount(data.count);
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`relative mt-12 overflow-hidden rounded-[2.5rem] border border-orange-500/30 bg-slate-950/40 p-1 backdrop-blur-md transition-all duration-1000 ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
      }`}
    >
      <div className="relative overflow-hidden rounded-[2.3rem] bg-gradient-to-br from-orange-600/20 via-slate-900 to-cyan-600/10">
        {/* Animated background glow */}
        <div className="absolute -left-20 -top-20 h-64 w-64 animate-pulse rounded-full bg-orange-500/20 blur-[80px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 animate-pulse rounded-full bg-cyan-500/20 blur-[80px] delay-700" />
        
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Content Side */}
          <div className="relative z-10 flex flex-col justify-center p-8 sm:p-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300">New Community Event</span>
            </div>
            
            <h2 className="font-[family:var(--font-brand-display)] text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
              Once Human <br/>
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                Brawl Event
              </span>
            </h2>
            
            <p className="mt-6 text-lg leading-relaxed text-stone-300">
              The ultimate showdown is here. Join the <span className="text-orange-400 font-bold">NewHopeGGN Brawl</span>. 
              Battle for supremacy in the arena, win exclusive wipe packs, and claim your title as the Apex Survivor.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <a 
                href="/support?subject=Brawl%20Event%20Registration" 
                className="group relative flex h-14 items-center justify-center rounded-2xl bg-orange-500 px-8 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-orange-400 active:scale-95"
              >
                <span className="relative z-10">Register Now</span>
                <div className="absolute inset-0 -z-10 rounded-2xl bg-orange-400 blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
              <a 
                href="/community" 
                className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Learn More
              </a>
            </div>
            
            <div className="mt-8 flex items-center gap-4 border-t border-white/5 pt-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 40}`} alt="avatar" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                <span className="font-bold text-white">{regCount}+ Survivors</span> already registered for the next round.
              </p>
            </div>
          </div>
          
          {/* Visual Side */}
          <div className="relative min-h-[300px] lg:min-h-full">
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-900 lg:from-transparent to-transparent" />
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-900 lg:from-transparent to-transparent" />
            
            <div className="h-full w-full overflow-hidden">
              <img 
                src="/brawl-event-art.png" 
                alt="Brawl Event Art" 
                className="h-full w-full object-cover transition-transform duration-[10s] hover:scale-110"
              />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
