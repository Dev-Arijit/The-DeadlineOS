import React, { useState, useRef, useEffect } from 'react';
import { 
  Mission, 
  Task, 
  Milestone 
} from '../types';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Sparkles, 
  Compass, 
  Activity, 
  Award, 
  HelpCircle,
  PlayCircle,
  AlertCircle,
  Trash2,
  Archive,
  Edit,
  ExternalLink,
  Plus,
  ArrowLeft,
  X,
  Tag,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MissionDetailsViewProps {
  missions: Mission[];
  activeMission: Mission | null;
  onSelectMission: (missionId: string) => void;
  onArchiveMission: (missionId: string) => Promise<void>;
  onDeleteMission: (missionId: string) => Promise<void>;
  onEditMission: (missionId: string, updatedFields: Partial<Mission>) => Promise<void>;
  onApplySuggestedFix: (suggestedFix: string) => Promise<void>;
  onTaskStatusUpdate: (taskId: string, newStatus: 'completed' | 'skipped' | 'todo') => Promise<void>;
  onCreateNewMissionClick: () => void;
  loading: boolean;
  rankedMissionIds?: string[];
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

export function MissionDetailsView({ 
  missions, 
  activeMission, 
  onSelectMission, 
  onArchiveMission, 
  onDeleteMission, 
  onEditMission, 
  onApplySuggestedFix, 
  onTaskStatusUpdate,
  onCreateNewMissionClick,
  loading,
  rankedMissionIds = []
}: MissionDetailsViewProps) {
  const [selectedMissionIdForDetails, setSelectedMissionIdForDetails] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [confirmDeleteMission, setConfirmDeleteMission] = useState<Mission | null>(null);

  // States for Editing Form
  const [editTitle, setEditTitle] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editYear, setEditYear] = useState(2026);
  const [editMonth, setEditMonth] = useState(1);
  const [editDay, setEditDay] = useState(1);
  const [editDeadlineTime, setEditDeadlineTime] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editEstHours, setEditEstHours] = useState(20);
  const [editDailyCapacity, setEditDailyCapacity] = useState(4);
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  const editDeadlineDate = `${editYear}-${String(editMonth).padStart(2, '0')}-${String(editDay).padStart(2, '0')}`;
  const editDateError = getDeadlineError(editYear, editMonth, editDay, editDeadlineTime);

  const handleStartEdit = (m: Mission) => {
    setEditingMission(m);
    setEditTitle(m.title || m.goal || 'Untitled Mission');
    setEditGoal(m.goal || m.description || '');
    
    // Parse deadline
    try {
      const d = new Date(m.deadline);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      setEditYear(year);
      setEditMonth(month);
      setEditDay(day);
      const timeParts = m.deadline.split('T');
      if (timeParts.length === 2) {
        setEditDeadlineTime(timeParts[1].substring(0, 5));
      } else {
        setEditDeadlineTime('18:00');
      }
    } catch {
      setEditYear(2026);
      setEditMonth(6);
      setEditDay(28);
      setEditDeadlineTime('18:00');
    }

    setEditPriority(m.priority || 'medium');
    setEditEstHours(m.estimatedHours || 20);
    setEditDailyCapacity(m.dailyCapacity || 4);
    setEditTags(m.tags || []);
    setEditTagsInput('');
  };

  const handleSaveEdit = async () => {
    if (!editingMission) return;
    if (!!editDateError) return;
    
    // Sanitize the input editDeadlineDate to make sure out-of-bound days are corrected
    let sanitizedDate = editDeadlineDate;
    const maxDays = new Date(editYear, editMonth, 0).getDate();
    const safeDay = Math.min(editDay, Math.max(1, maxDays));
    sanitizedDate = `${editYear}-${String(editMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

    const fullDeadline = `${sanitizedDate}T${editDeadlineTime}:00Z`;
    await onEditMission(editingMission.id, {
      title: editTitle.trim(),
      goal: editGoal.trim(),
      deadline: fullDeadline,
      priority: editPriority,
      estimatedHours: editEstHours,
      dailyCapacity: editDailyCapacity,
      tags: editTags
    });
    setEditingMission(null);
  };

  const handleAddTag = () => {
    const trimmed = editTagsInput.trim().toLowerCase();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setEditTagsInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const formatISOToDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 85) return { text: 'EXCELLENT', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 65) return { text: 'HEALTHY', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' };
    if (score >= 45) return { text: 'MODERATE RISK', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { text: 'CRITICAL HAZARD', color: 'text-rose-450', bg: 'bg-rose-500/10 border-rose-500/20' };
  };

  // If a mission is chosen for Deep Spec Details, render that specific breakdown
  if (selectedMissionIdForDetails) {
    const selectedMission = missions.find(m => m.id === selectedMissionIdForDetails);
    if (!selectedMission) {
      setSelectedMissionIdForDetails(null);
      return null;
    }

    const { goal, title, deadline, confidenceScore, shadowTimeline, failurePrediction, milestones, tasks } = selectedMission;
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const confidence = getConfidenceLevel(confidenceScore || 75);

    return (
      <div className="space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between pb-2">
          <button
            onClick={() => setSelectedMissionIdForDetails(null)}
            className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition cursor-pointer select-none px-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 text-teal-400" />
            BACK TO MISSION LIST
          </button>
          
          <div className="flex gap-2">
            {activeMission?.id !== selectedMission.id && (
              <button
                onClick={() => {
                  onSelectMission(selectedMission.id);
                  setSelectedMissionIdForDetails(null);
                }}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
              >
                ENGAGE ACTIVE FOCUS
              </button>
            )}
          </div>
        </div>

        {/* Overview Block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Goal and Cutoff */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold">MISSION BLUEPRINT</span>
            </div>
            
            <h1 className="text-2xl font-bold text-white tracking-tight leading-normal font-sans">
              "{title || goal}"
            </h1>
            {title && (
              <p className="text-xs text-slate-450 italic leading-relaxed">
                Objective: {goal}
              </p>
            )}

            <div className="pt-4 border-t border-slate-950 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>DEADLINE CUTOFF:</span>
                <span className="text-white font-bold">{formatISOToDate(deadline)}</span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>PROGRESS STATUS:</span>
                <span className="text-emerald-400 font-bold">{progressPercent}% COMPLETE ({completedTasks}/{totalTasks} TASKS)</span>
              </div>
            </div>
          </div>

          {/* Confidence Gauge */}
          <div className={`p-6 rounded-2xl border backdrop-blur-md flex flex-col justify-between ${confidence.bg}`}>
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-3 uppercase tracking-widest font-bold">
                <span>Confidence Score</span>
                <span className={confidence.color}>{confidence.text}</span>
              </div>
              
              <div className="text-4xl font-black font-sans leading-none text-white tracking-tight flex items-baseline gap-1">
                {confidenceScore || 75}
                <span className="text-sm text-slate-500 font-normal">% probability</span>
              </div>

              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Calculated real-time relative to current milestone completion rates and task dependencies order.
              </p>
            </div>

            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-4">
              <div 
                style={{ width: `${confidenceScore || 75}%` }} 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" 
              />
            </div>
          </div>
        </div>

        {/* Shadow Timeline */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-teal-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">DYNAMIC SHADOW TIMELINE</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">BUFFER MARGINS IN ACTIVE HOURS</span>
          </div>

          <p className="text-xs text-slate-350 leading-relaxed max-w-2xl">
            Standard linear estimates ignore unexpected breakdowns. The shadow timeline represents probability distributions for the core deliverables under varying friction models.
          </p>

          {/* Timeline Visualization charts */}
          <div className="pt-6 relative space-y-6">
            {[
              { 
                label: '☀️ Best Case Scenario (Perfect Flow)', 
                hours: shadowTimeline?.bestCaseHours || 6, 
                color: 'from-emerald-500 to-teal-400', 
                desc: 'Ideal momentum with zero configuration drift or service outages.' 
              },
              { 
                label: '⚡ Expected Case Scenario (Regular Flow)', 
                hours: shadowTimeline?.expectedCaseHours || 10, 
                color: 'from-teal-500 to-cyan-400', 
                desc: 'Normal flow with standard configuration debug overheads included.' 
              },
              { 
                label: '🔥 Worst Case Scenario (Crisis Flow)', 
                hours: shadowTimeline?.worstCaseHours || 18, 
                color: 'from-rose-500 to-amber-500', 
                desc: 'Substantial configuration hurdles or third-party credential blocks.' 
              }
            ].map((sc, i) => {
              const maxVal = Math.max(
                shadowTimeline?.worstCaseHours || 1, 
                shadowTimeline?.expectedCaseHours || 1, 
                shadowTimeline?.bestCaseHours || 1, 
                20
              );
              const percentage = Math.max(12, Math.min(100, (sc.hours / maxVal) * 100));
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-semibold">{sc.label}</span>
                    <span className="text-white font-bold">{sc.hours} Hours</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-lg overflow-hidden flex relative border border-slate-900">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-full bg-gradient-to-r ${sc.color}`}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 leading-normal">{sc.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failure Predictor Card */}
        <div className="p-6 rounded-2xl border border-rose-950/20 bg-rose-950/5/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <h3 className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">AI FAIL-SAFE PROJECTION MODEL</h3>
            </div>
            <div className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 font-bold">
              PROBABILITY OF DELAY: {failurePrediction?.probability || 25}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="space-y-4">
              <div>
                <span className="block font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-semibold">PREDICTED MAIN BOTTLENECK</span>
                <p className="font-semibold text-white leading-relaxed">
                  {failurePrediction?.bottleneck || 'No immediate structural block.'}
                </p>
              </div>
              <div>
                <span className="block font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-semibold">COGNITIVE ROOT CAUSE ANALYSIS</span>
                <p className="leading-relaxed text-slate-400">
                  {failurePrediction?.reason || 'The orchestrator confirms your current cadence is compatible with the cutoff.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-900/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-teal-400 text-[11px] font-mono font-bold uppercase mb-2 tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  RECOVERY PROTOCOLS INSTRUCTED
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {failurePrediction?.suggestedFix || 'Keep executing on schedule. Clear individual backlogs sequentially.'}
                </p>
              </div>

              {failurePrediction?.suggestedFix && (
                <button
                  onClick={() => onApplySuggestedFix(failurePrediction.suggestedFix)}
                  disabled={loading}
                  className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-mono font-bold text-[10.5px] rounded-lg tracking-wider transition cursor-pointer select-none active:scale-98 flex items-center justify-center gap-1 animate-pulse"
                >
                  AUTO-ENGAGE MITIGATION protocol
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">CRITICAL MILESTONE GATEWAYS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {milestones?.map((m, idx) => {
              const milestoneTasks = tasks?.filter(t => t.milestoneId === m.id) || [];
              const isMilestoneDone = milestoneTasks.length > 0 && milestoneTasks.every(t => t.status === 'completed');
              
              return (
                <div 
                  key={m.id} 
                  className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
                    isMilestoneDone 
                      ? 'bg-emerald-950/10 border-emerald-500/20' 
                      : 'bg-slate-950/50 border-slate-900 hover:border-slate-850 transition'
                  }`}
                >
                  <div className="absolute top-1 right-1 p-2 font-mono text-[9px] text-slate-700">
                    STAGE 0{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5 truncate">
                      {isMilestoneDone ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                      )}
                      {m.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-900/80 flex justify-between items-center text-[9.5px] font-mono text-slate-405">
                    <span>DEADLINE:</span>
                    <span className="text-white font-semibold">{m.deadline}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // default: render the multi-mission control board list
  return (
    <div className="space-y-6 relative">
      {/* List Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-900 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <h1 className="text-lg font-bold font-mono tracking-wider text-white uppercase">MISSION CONTROL CENTER</h1>
          </div>
          <p className="text-xs text-slate-400">
            Monitor, prioritize, and calibrate high-stakes workstreams dynamically.
          </p>
        </div>
        
        <button
          onClick={onCreateNewMissionClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 cursor-pointer transition select-none active:scale-98"
        >
          <Plus className="w-4 h-4 shrink-0" />
          PLAN NEW MISSION
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {missions.map((m) => {
          const isCurrentlyActive = activeMission?.id === m.id;
          const totalTasks = m.tasks?.length || 0;
          const completedTasks = m.tasks?.filter(t => t.status === 'completed').length || 0;
          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          const confidence = getConfidenceLevel(m.confidenceScore || 75);
          
          // Find AI Rank based on order in rankedMissionIds
          const aiRank = rankedMissionIds.indexOf(m.id) !== -1 ? rankedMissionIds.indexOf(m.id) + 1 : null;

          return (
            <motion.div
              key={m.id}
              layoutId={`mission_card_${m.id}`}
              className={`p-5 rounded-2xl border backdrop-blur-sm relative overflow-hidden flex flex-col justify-between min-h-[240px] transition-all duration-300 ${
                isCurrentlyActive 
                  ? 'bg-slate-900/80 border-teal-500/30 ring-1 ring-teal-500/10' 
                  : 'bg-slate-900/20 border-slate-900 hover:border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    {/* Urgency Rank */}
                    {aiRank && m.status !== 'archived' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                        aiRank === 1 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/25 animate-pulse' 
                          : aiRank === 2 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/25'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/25'
                      }`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        AI RANK #{aiRank} {aiRank === 1 ? '(URGENT FOCUS)' : ''}
                      </span>
                    )}

                    <h2 className="text-sm font-bold text-white tracking-tight font-sans line-clamp-1">
                      {m.title || m.goal}
                    </h2>
                  </div>

                  {/* Priority Indicator */}
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase tracking-widest ${
                    m.priority === 'high' 
                      ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50' 
                      : m.priority === 'low'
                      ? 'bg-teal-950/40 text-teal-400 border border-teal-900/50'
                      : 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                  }`}>
                    {m.priority || 'medium'}
                  </span>
                </div>

                {/* Subtitle / Objective */}
                <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                  {m.goal || m.description || 'No objective outlined.'}
                </p>

                {/* Tags */}
                {m.tags && m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {m.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono text-slate-405 border border-slate-900">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress & Stats */}
              <div className="space-y-3 pt-3 border-t border-slate-950 my-3">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-455" />
                    DEADLINE: <strong className="text-slate-300 font-bold">{formatISOToDate(m.deadline)}</strong>
                  </span>
                  <span>{progressPercent}% Complete</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${progressPercent}%` }} 
                    className={`h-full ${
                      progressPercent === 100 
                        ? 'bg-emerald-400' 
                        : isCurrentlyActive 
                        ? 'bg-teal-400' 
                        : 'bg-slate-700'
                    }`}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500">
                    TASKS: <strong className="text-slate-300 font-bold">{completedTasks} completed</strong> / {totalTasks} total
                  </span>
                  <span className={`${confidence.color} font-bold flex items-center gap-1`}>
                    <Activity className="w-3 h-3" />
                    {m.confidenceScore || 75}% RISK INTEGRITY
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-2 gap-2 border-t border-slate-950/50 mt-auto">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEdit(m)}
                    className="p-2 hover:bg-slate-950 text-slate-450 hover:text-white rounded-lg transition cursor-pointer"
                    title="Edit Parameters"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {m.status !== 'archived' && (
                    <button
                      onClick={() => onArchiveMission(m.id)}
                      className="p-2 hover:bg-slate-950 text-slate-450 hover:text-amber-400 rounded-lg transition cursor-pointer"
                      title="Archive Stream"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteMission(m)}
                    className="p-2 hover:bg-slate-950 text-slate-450 hover:text-rose-450 rounded-lg transition cursor-pointer"
                    title="Delete Mission"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedMissionIdForDetails(m.id)}
                    className="px-2.5 py-1.5 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-white border border-slate-900 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    SPECS
                  </button>
                  {isCurrentlyActive ? (
                    <span className="px-2.5 py-1.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE FOCUS
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectMission(m.id)}
                      className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-slate-950 border border-teal-500/20 hover:border-transparent rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                    >
                      ENGAGE
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {missions.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-4 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-400">No active mission pipelines</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Click "Plan New Mission" to configure a high-stakes timeline and commission co-pilot agents.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Mission Modal Dialog */}
      <AnimatePresence>
        {editingMission && (
          <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-850 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingMission(null)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                <Edit className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold font-mono text-white uppercase">EDIT MISSION PARAMETERS</h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold">Mission Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Build Hackathon Project"
                  />
                </div>

                {/* Goal / Objective */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold">Description / Goal Objective</label>
                  <textarea
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Formulate code, database schema, landing page..."
                  />
                </div>

                {/* Deadline Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-555 uppercase tracking-widest font-bold">Deadline Date</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <select
                          id="edit-deadline-month"
                          value={editMonth}
                          onChange={(e) => setEditMonth(parseInt(e.target.value, 10))}
                          className={`w-full bg-slate-900 border text-[11px] text-white rounded-xl p-2.5 focus:outline-none transition font-mono ${
                            editDateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-850 focus:border-teal-500'
                          }`}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m} className="bg-slate-900 text-white">
                              {MONTH_NAMES[m]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          id="edit-deadline-day"
                          value={editDay}
                          onChange={(e) => setEditDay(parseInt(e.target.value, 10))}
                          className={`w-full bg-slate-900 border text-[11px] text-white rounded-xl p-2.5 focus:outline-none transition font-mono ${
                            editDateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-850 focus:border-teal-500'
                          }`}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d} className="bg-slate-900 text-white">
                              {String(d).padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          id="edit-deadline-year"
                          value={editYear}
                          onChange={(e) => setEditYear(parseInt(e.target.value, 10))}
                          className={`w-full bg-slate-900 border text-[11px] text-white rounded-xl p-2.5 focus:outline-none transition font-mono ${
                            editDateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-850 focus:border-teal-500'
                          }`}
                        >
                          {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                            <option key={y} value={y} className="bg-slate-900 text-white">
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {editDateError && (
                      <p className="text-rose-500 text-[9px] mt-1 font-mono font-bold uppercase tracking-wider animate-pulse animate-duration-1000">
                        ⚠️ {editDateError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold">Cutoff Time (UTC)</label>
                    <input
                      type="time"
                      value={editDeadlineTime}
                      onChange={(e) => setEditDeadlineTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 font-mono text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Priority, Hours & Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold mb-1">Priority Level</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditPriority(p)}
                          className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase transition select-none ${
                            editPriority === p
                              ? p === 'high'
                                ? 'bg-rose-500/25 border-rose-500 text-rose-300'
                                : p === 'medium'
                                ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                                : 'bg-teal-500/25 border-teal-500 text-teal-300'
                              : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-slate-550 uppercase font-bold">Effort & Capacity</span>
                      <span className="text-white font-bold">{editEstHours}H / {editDailyCapacity}H D</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="block text-[9px] font-mono text-slate-500">EST EFFORT</span>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={editEstHours}
                          onChange={(e) => setEditEstHours(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-900 border border-slate-850 text-xs font-mono text-center py-1 rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[9px] font-mono text-slate-500">DAILY LIMIT</span>
                        <input
                          type="number"
                          min="1"
                          max="16"
                          value={editDailyCapacity}
                          onChange={(e) => setEditDailyCapacity(Math.max(1, Math.min(16, Number(e.target.value))))}
                          className="w-full bg-slate-900 border border-slate-850 text-xs font-mono text-center py-1 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags Edit */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold">Tags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. research"
                      value={editTagsInput}
                      onChange={(e) => setEditTagsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-grow bg-slate-900 border border-slate-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-mono text-white transition font-bold"
                    >
                      ADD
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 min-h-[25px] pt-1">
                    {editTags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-teal-300 flex items-center gap-1"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-slate-500 hover:text-white font-black hover:scale-110"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Edit Modal Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900">
                <button
                  onClick={() => setEditingMission(null)}
                  className="px-4 py-2 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-850 rounded-xl text-xs font-mono transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!!editDateError}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-mono font-bold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                >
                  SAVE CHANGES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {confirmDeleteMission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0E0B0C] border border-rose-900/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-rose-950">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-xs font-bold font-mono text-rose-400 uppercase tracking-widest">
                  CONFIRM PURGE SEQUENCE
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  You are about to permanently delete this focus stream:
                </p>
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                  <span className="text-sm font-extrabold text-rose-300 font-mono block">
                    {confirmDeleteMission.title || confirmDeleteMission.goal}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans">
                  This will immediately erase all linked milestones, priority queues, performance logs, and backups. This action is irreversible.
                </p>
              </div>

              <div className="flex gap-3 pt-2 font-mono">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteMission(null)}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold uppercase rounded-xl transition hover:border-slate-700 cursor-pointer text-center"
                >
                  ABORT
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const mid = confirmDeleteMission.id;
                    setConfirmDeleteMission(null);
                    await onDeleteMission(mid);
                  }}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-[10px] uppercase rounded-xl shadow-lg shadow-rose-500/10 transition cursor-pointer text-center"
                >
                  CONFIRM PURGE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
