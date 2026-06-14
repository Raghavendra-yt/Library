import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Sparkles, 
  HelpCircle, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  Keyboard 
} from 'lucide-react';

export default function UserGuide({ isOpen, onClose }) {
  const shouldReduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Sri Gowthami LMS",
      description: "This next-generation dashboard replaces manual operations with real-time tracking, rule-based fine calculation, and LLM-assisted academic support.",
      icon: BookOpen,
      iconColor: "text-[#8b5cf6] bg-violet-50 dark:bg-[#8b5cf6]/10 border-violet-100 dark:border-[#8b5cf6]/20",
      details: [
        "Transitioned from static spreadsheets to central SQLite/Postgres database tables.",
        "Operational workflows simplified across key administrative modules.",
        "Fully accessible layout built in compliance with WCAG Level AA guidelines."
      ]
    },
    {
      title: "Priority Bento Dashboard",
      description: "Designed using the F-pattern grid format, bringing critical operational alerts directly to your top-left field of view.",
      icon: AlertTriangle,
      iconColor: "text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20",
      details: [
        "Overdue list tracks active student borrow times and fine structures.",
        "WhatsApp remind buttons trigger simulated API dispatches to parents.",
        "Stat cards display database aggregates for books, issues, and active members."
      ]
    },
    {
      title: "AI Counseling & Doubt Solver",
      description: "Powered by cognitive AI abstractions, helping administrators make educational interventions and answering student queries.",
      icon: Sparkles,
      iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
      details: [
        "Counseling panel automatically estimates student dropout risk metrics.",
        "Generates customized academic study pathways and placement checklists.",
        "Interactive chat explains complex topics in both English and Telugu."
      ]
    },
    {
      title: "Book Catalog & Circulation Form",
      description: "Manage physical inventory details and log transactions without typing mistakes.",
      icon: Send,
      iconColor: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
      details: [
        "Catalog tab supports debounced filtering by title, author, or ISBN code.",
        "Circulation tab handles issues and returns with dropdown selections.",
        "Dynamic previews auto-calculate overdue days and fees (₹10/day)."
      ]
    },
    {
      title: "Begin Your Walkthrough Test",
      description: "Ready to test the prototype? Follow these three quick test loops to see the system in action:",
      icon: CheckCircle2,
      iconColor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
      details: [
        "1. Click 'Send Alert' in the Overdue List to log a WhatsApp reminder.",
        "2. Navigate to 'AI Counselor' and ask: 'Explain recursion in Telugu'.",
        "3. Go to 'Circulation', select 'Return Book', select Sita Rama, and submit."
      ]
    }
  ];

  // Handle keyboard arrow keys for navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const ActiveIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Guide Box */}
      <motion.div
        initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl p-6 relative z-10 text-left border border-slate-100 dark:border-slate-800 shadow-2xl"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Indicator Header */}
        <div className="flex items-center gap-1.5 mb-5 text-[10px] font-bold text-[#8b5cf6] dark:text-[#a78bfa] uppercase tracking-widest font-heading">
          <span>Sri Gowthami Interactive Tour</span>
          <span>•</span>
          <span>Step {currentStep + 1} of {steps.length}</span>
        </div>

        {/* Slide Content */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl border flex-shrink-0 ${steps[currentStep].iconColor}`}>
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight mt-0.5 font-heading">
                {steps[currentStep].title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {/* Details Bullet List */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 space-y-2.5">
            {steps[currentStep].details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6] mt-2 flex-shrink-0" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accessibility Tips */}
        {currentStep === 0 && (
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard navigation supported: Use Arrow Keys (← / →) to flip slides, Escape to close.</span>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {/* Dot Indicators */}
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  currentStep === idx ? 'w-5 bg-[#8b5cf6]' : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Button actions */}
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-500 rounded-xl cursor-pointer transition-colors border border-slate-150 dark:border-slate-750"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl font-bold cursor-pointer transition shadow-md shadow-[#8b5cf6]/20 text-xs"
            >
              <span>{currentStep === steps.length - 1 ? "Start Testing" : "Next Page"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
