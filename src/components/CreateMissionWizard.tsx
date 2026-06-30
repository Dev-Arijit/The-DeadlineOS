import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Calendar, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Zap,
  Clock
} from 'lucide-react';

interface CreateMissionWizardProps {
  onPlanNewMission: (
    goal: string, 
    deadline: string, 
    capacity: number, 
    workTimes: string[],
    title: string,
    priority: 'high' | 'medium' | 'low',
    estimatedHours: number,
    tags: string[]
  ) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDeadlineError(year: number, month: number, day: number, timeStr?: string): string | null {
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return "Selected date is invalid.";
  }
  if (month < 1 || month > 12) {
    return "Month must be between 1 and 12.";
  }
  const monthsWith31 = [1, 3, 5, 7, 8, 10, 12];
  const maxDays = new Date(year, month, 0).getDate();
  const currentMonthName = MONTH_NAMES[month] || "Selected month";
  if (day === 31 && !monthsWith31.includes(month)) {
    return `${currentMonthName} does not have 31 days! Selected: ${currentMonthName} ${day}.`;
  }
  if (day < 1 || day > maxDays) {
    return `Invalid date combination: ${currentMonthName} only has ${maxDays} days, so day ${day} does not exist.`;
  }

  // Cannot select a passed date as deadline
  const now = new Date();
  let chosenDate: Date;
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    chosenDate = new Date(year, month - 1, day, isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes);
  } else {
    chosenDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  if (chosenDate < now) {
    return "Deadline date cannot be in the past.";
  }

  return null;
}

export function CreateMissionWizard({ onPlanNewMission, onCancel, loading }: CreateMissionWizardProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState(''); // description (optional)
  
  const [selectedYear, setSelectedYear] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getMonth() + 1; // 1-based
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getDate();
  });
  const [deadlineTime, setDeadlineTime] = useState('18:00');

  const deadlineDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dateError = getDeadlineError(selectedYear, selectedMonth, selectedDay, deadlineTime);

  // Simple goal presets
  const presets = [
    { label: "🚀 Deploy High-Stakes MVP", title: "Deploy MVP", desc: "Build standard features, backend API, landing page, and deploy to staging." },
    { label: "🎓 Submit AI Master Thesis", title: "Submit Master Thesis", desc: "Write final draft, analyze data benchmarks, refine structure and review citations." },
    { label: "💼 Curate Pitch Deck & Financials", title: "Pitch Deck & Financials", desc: "Prepare startup presentation deck, format financial spreadsheets, and run practice test." }
  ];

  const handlePresetSelect = (p: typeof presets[0]) => {
    setTitle(p.title);
    setGoal(p.desc);
  };

  const handleNextStep = () => {
    if (step === 1 && !title.trim()) return;
    if (step === 2 && !!dateError) return;
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmitMission = async () => {
    if (!!dateError) return;
    // Sanitize the input deadlineDate to make sure out-of-bound days are corrected
    let sanitizedDate = deadlineDate;
    const maxDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const safeDay = Math.min(selectedDay, Math.max(1, maxDays));
    sanitizedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

    const fullDeadline = `${sanitizedDate}T${deadlineTime}:00Z`;
    // Pass default/falsy values for hours, slots, priority, and tags.
    // The backend will dynamically calculate and generate the ideal hours, priority, tasks and milestones!
    await onPlanNewMission(
      goal.trim(), 
      fullDeadline, 
      4, // default capacity
      ['morning', 'afternoon', 'evening', 'midnight'], // preferred work slots
      title.trim(), 
      'medium', // default priority (backend can adjust)
      0, // 0 indicates to let AI estimate the hours
      [] // optional tags
    );
  };

  return (
    <div id="create-mission-wizard-container" className="w-full max-w-2xl mx-auto bg-[#0D1222] border border-slate-900 rounded-2xl p-6 sm:p-8 relative shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
        <div>
          <span className="text-[9px] font-mono text-teal-400 font-bold uppercase tracking-widest block mb-1">FOCUS STREAM CREATION</span>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-400" />
            New Focus Stream
          </h2>
        </div>
        <button
          id="wizard-cancel-btn"
          onClick={onCancel}
          className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-850 rounded-xl transition text-[11px] font-mono cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Info', num: 1 },
          { label: 'Deadline', num: 2 },
          { label: 'AI Alignment', num: 3 }
        ].map((s) => {
          const isActive = s.num === step;
          const isCompleted = s.num < step;
          return (
            <div key={s.num} className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className={isActive ? 'text-teal-400 font-bold' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}>
                  STEP {s.num}
                </span>
                {isCompleted && <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />}
              </div>
              <div className={`h-1 rounded-full transition-all duration-300 ${
                isActive ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : isCompleted ? 'bg-emerald-500/80' : 'bg-slate-850'
              }`} />
              <span className={`hidden sm:block text-[9px] font-medium truncate ${
                isActive ? 'text-white' : isCompleted ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Content Area */}
      <div className="min-h-[220px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  FOCUS STREAM TITLE <span className="text-teal-400 font-bold">*</span>
                </label>
                <input
                  id="wizard-title-input"
                  type="text"
                  required
                  placeholder="e.g., Deliver MVP"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-teal-500 transition font-sans mb-3.5"
                />

                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  WHAT IS YOUR GOAL? (DESCRIPTION - OPTIONAL)
                </label>
                <textarea
                  id="wizard-goal-textarea"
                  rows={3}
                  placeholder="e.g., Build standard features, test API routes, and deploy database schema to production... (Leave empty to let AI plan purely based on the title!)"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-teal-500 transition font-sans"
                />
              </div>

              {/* Presets Grid */}
              <div className="space-y-2 pt-1">
                <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Or select a preset goal:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className="w-full text-left p-2.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl transition cursor-pointer flex flex-col gap-0.5 group text-xs text-slate-300"
                    >
                      <span className="font-bold text-teal-400 group-hover:text-teal-300">{p.label}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 text-[11px] text-slate-400 flex gap-2.5 items-center">
                <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  Provide your absolute deadline. Our AI planning syndicate will calculate the necessary timeline, project buffers, and generate all milestones.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">DEADLINE DATE</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <select
                        id="wizard-deadline-month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                        className={`w-full bg-slate-950 border text-[11px] text-white rounded-xl p-2.5 focus:outline-none transition font-mono ${
                          dateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-850 focus:border-teal-500'
                        }`}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m} className="bg-slate-950 text-white">
                            {MONTH_NAMES[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        id="wizard-deadline-day"
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                        className={`w-full bg-slate-950 border text-[11px] text-white rounded-xl p-2.5 focus:outline-none transition font-mono ${
                          dateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-850 focus:border-teal-500'
                        }`}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d} className="bg-slate-950 text-white">
                            {String(d).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        id="wizard-deadline-year"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                        className={`w-full bg-slate-950 border text-[11px] text-white rounded-xl p-2.5 focus:outline-none transition font-mono ${
                          dateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-850 focus:border-teal-500'
                        }`}
                      >
                        {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                          <option key={y} value={y} className="bg-slate-950 text-white">
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {dateError && (
                    <p className="text-rose-500 text-[10px] mt-1.5 font-mono font-bold uppercase tracking-wider animate-pulse animate-duration-1000">
                      ⚠️ {dateError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">CRITICAL CUTOFF TIME (UTC)</label>
                  <input
                    id="wizard-deadline-time"
                    type="time"
                    required
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-teal-500 transition font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4 text-center py-2"
            >
              <div className="relative inline-flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md">
                  <Sparkles className="w-5 h-5 text-slate-950" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">AI Engine Ready!</h3>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Our co-staffs will automatically calculate and estimate required work hours, formulate optimal milestones, and structure your target subtasks.
                </p>
              </div>

              {/* Summary Profile */}
              <div className="max-w-sm mx-auto p-3.5 bg-slate-950 rounded-xl border border-slate-900 text-left space-y-2 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span>STREAM TITLE:</span>
                  <span className="text-white truncate max-w-[180px] font-sans font-bold">{title}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span>DESCRIPTION:</span>
                  <span className="text-slate-300 truncate max-w-[180px] font-sans">
                    {goal.trim() ? goal : <span className="text-slate-500 italic">None provided (AI Auto-plan)</span>}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span>TARGET DEADLINE:</span>
                  <span className="text-teal-400 font-bold">{deadlineDate} at {deadlineTime} UTC</span>
                </div>
                <div className="flex justify-between">
                  <span>ESTIMATED HOURS:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    AI Calculated
                  </span>
                </div>
              </div>

              <button
                id="wizard-submit-btn"
                onClick={handleSubmitMission}
                disabled={loading}
                className="w-full max-w-xs py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-teal-500/10 active:scale-[0.99] transition flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 font-mono uppercase"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                Plan focus stream with AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center border-t border-slate-900 pt-4 mt-5">
        <button
          id="wizard-back-btn"
          onClick={handlePrevStep}
          disabled={step === 1 || loading}
          className="px-3.5 py-2 hover:bg-slate-950 text-slate-400 hover:text-white border border-slate-850 rounded-xl text-[10px] font-mono transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:pointer-events-none min-h-[40px]"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>

        {step < 3 ? (
          <button
            id="wizard-next-btn"
            onClick={handleNextStep}
            disabled={(step === 1 && !title.trim()) || (step === 2 && !!dateError)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 hover:text-teal-200 border border-teal-500/25 rounded-xl text-[10px] font-mono transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 min-h-[40px]"
          >
            Next
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <div className="text-[9px] font-mono text-slate-650 uppercase">Ready to plan</div>
        )}
      </div>
    </div>
  );
}
