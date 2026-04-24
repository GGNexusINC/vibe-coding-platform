"use client";

import { useEffect, useState } from "react";

type Step = {
  targetId?: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
};

export function TutorialOverlay({ steps, onComplete }: { steps: Step[]; onComplete: () => void }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (currentStep?.targetId) {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStepIndex, currentStep?.targetId]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {targetRect && (
        <div
          className="pointer-events-none absolute border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: "1rem",
          }}
        />
      )}

      <div className="relative w-full max-w-md scale-110 transform rounded-[2.5rem] border border-white/10 bg-slate-900/90 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 font-black text-white shadow-lg">
          {currentStepIndex + 1}/{steps.length}
        </div>

        <h3 className="text-2xl font-black text-white">{currentStep.title}</h3>
        <p className="mt-4 text-slate-300 leading-relaxed font-medium">
          {currentStep.content}
        </p>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition"
          >
            Skip Tutorial
          </button>
          <button
            onClick={handleNext}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:bg-indigo-500 active:scale-95"
          >
            {currentStepIndex < steps.length - 1 ? "Next Step →" : "Finish & Explore"}
          </button>
        </div>
      </div>
    </div>
  );
}
