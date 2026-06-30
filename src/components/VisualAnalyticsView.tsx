import React, { useState } from 'react';
import { 
  Flame, 
  Zap, 
  Activity, 
  Percent,
  CheckCircle,
  AlertTriangle,
  ListTodo,
  Clock,
  Circle,
  Ban,
  CornerDownRight,
  PlayCircle,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mission, Task } from '../types';
import { useMissionStore } from '../store/useMissionStore';

interface VisualAnalyticsProps {
  activeMission: Mission | null;
  missions: Mission[];
  onStartFocusSession?: (task: Task) => void;
  onFetchTaskStrategy?: (task: Task) => void;
}

export function VisualAnalyticsView({ 
  activeMission, 
  missions,
  onStartFocusSession,
  onFetchTaskStrategy
}: VisualAnalyticsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const updateTaskStatus = useMissionStore((state) => state.updateTaskStatus);
  const sortedUpcomingTasks = useMissionStore((state) => state.sortedUpcomingTasks);

  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'tomorrow' | 'this_week' | 'high_risk' | 'current_mission' | 'overdue'>('all');

  const formatSafeDate = (isoString?: string) => {
    if (!isoString) return 'Flexible Target';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return isoString || 'Flexible Target';
    }
  };

  const renderTaskCard = (task: any, isFeatured = false) => {
    const targetMissionId = task.parentMissionId || (activeMission?.id || '');
    const isCompleted = task.status === 'completed';
    const isSkipped = task.status === 'skipped';
    const isMissed = task.status === 'missed';
    const isDelayed = task.status === 'delayed';
    const isTaskExpanded = expandedTasks[task.id] ?? false;

    // Get color based on priority: Red for critical, Orange for high, Yellow for medium, Green for low
    const getPriorityColorBar = (priority: string) => {
      switch (priority?.toLowerCase()) {
        case 'critical': return 'bg-rose-500';
        case 'high': return 'bg-orange-500';
        case 'medium': return 'bg-yellow-500';
        case 'low': return 'bg-emerald-500';
        default: return 'bg-slate-700';
      }
    };

    const getRiskColorClass = (risk: string) => {
      switch (risk?.toLowerCase()) {
        case 'critical':
          return 'bg-rose-950/25 text-rose-400 border-rose-900/30';
        case 'high':
        case 'very high':
          return 'bg-orange-950/25 text-orange-400 border-orange-900/30';
        case 'medium':
          return 'bg-yellow-950/25 text-yellow-400 border-yellow-900/30';
        case 'low':
          return 'bg-emerald-950/25 text-emerald-400 border-emerald-900/30';
        default:
          return 'bg-slate-900/50 text-slate-400 border-slate-800';
      }
    };

    return (
      <div
        key={`${targetMissionId}-${task.id}`}
        className={`flex items-stretch border rounded-xl hover:border-slate-800 transition-all duration-300 group relative overflow-hidden ${
          isFeatured 
            ? 'bg-gradient-to-br from-slate-950 via-slate-950 to-teal-950/15 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.12)] hover:border-teal-500/50 scale-[1.01]' 
            : 'bg-slate-950/40 border-slate-900 hover:bg-slate-950/70 hover:translate-y-[-1px]'
        } ${
          isCompleted ? 'opacity-60 border-emerald-500/20' : ''
        }`}
      >
        {/* Left Priority Color Bar */}
        <div className={`w-1.5 shrink-0 ${getPriorityColorBar(task.priority)}`} />

        {/* Main Card Content */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-3 min-w-0">
          
          {/* Top/Main Row */}
          <div className="flex items-start justify-between gap-4">
            
            {/* Left side: Checkbox, Task Name, Mission Name */}
            <div className="flex items-start gap-3 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextS = isCompleted ? 'todo' : 'completed';
                  updateTaskStatus(targetMissionId, task.id, nextS);
                }}
                className={`w-5 h-5 rounded border bg-slate-950 flex items-center justify-center cursor-pointer transition shrink-0 mt-1 ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black text-[9px]' 
                    : 'border-slate-800 hover:border-teal-500/60'
                }`}
              >
                {isCompleted && "✓"}
              </button>
              
              <div className="min-w-0">
                <h4 
                  className={`font-bold tracking-tight text-white truncate font-sans ${
                    isFeatured ? 'text-[18px] md:text-[20px] leading-snug' : 'text-[15px] md:text-[17px] leading-snug'
                  } ${isCompleted ? 'text-slate-400 line-through' : ''}`}
                  title={task.name}
                >
                  {task.name}
                </h4>
                
                <p className="text-[13px] md:text-[14px] text-slate-400 font-medium mt-1 flex items-center gap-1.5 truncate">
                  <span className="text-slate-600 font-mono text-[11px]">📁</span>
                  <span className="truncate">{task.parentMissionTitle || 'Direct Task'}</span>
                </p>
              </div>
            </div>

            {/* Right side: Remaining Time & Duration & Play button */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-mono font-bold text-teal-400 bg-teal-500/5 px-2 py-0.5 rounded border border-teal-500/10">
                  ⏳ {task.durationMinutes} min
                </div>
                {task.timeRemainingStr && (
                  <div className="text-[11px] font-mono text-slate-500 mt-1 font-semibold">
                    {task.timeRemainingStr}
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartFocusSession && onStartFocusSession(task);
                  }}
                  className={`px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px] font-extrabold select-none ${
                    isFeatured ? 'shadow-[0_0_12px_rgba(20,184,166,0.25)]' : ''
                  }`}
                >
                  ▶ Start
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                  }}
                  title="More Options"
                  className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-850 hover:border-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  ⋮
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Row */}
          <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-900/65 text-xs text-slate-400 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Deadline */}
              {task.parentMissionDeadline && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  📅 {formatSafeDate(task.parentMissionDeadline)}
                </span>
              )}

              {/* Risk Badge */}
              {task.parentMissionRiskLevel && (
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${getRiskColorClass(task.parentMissionRiskLevel)}`}>
                  ⚠️ {task.parentMissionRiskLevel} Risk
                </span>
              )}

              {/* Dependencies Icon */}
              {task.dependencies && task.dependencies.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                  }}
                  className="flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 font-bold bg-purple-500/5 border border-purple-500/10 px-1.5 py-0.2 rounded"
                  title="Click to view dependency details"
                >
                  🔗 {task.dependencies.length}
                </button>
              )}

              {/* Mobile inline Duration */}
              <div className="sm:hidden text-right">
                <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/5 px-1.5 py-0.2 rounded border border-teal-500/10">
                  ⏳ {task.durationMinutes}m
                </span>
              </div>
            </div>

            {/* AI Score confidence indicator */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">AI Priority</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850 p-0.2">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${task.importanceScore || 75}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-teal-400">
                  {task.importanceScore || 75}%
                </span>
              </div>
            </div>
          </div>

          {/* More details drawer inside card */}
          <AnimatePresence initial={false}>
            {isTaskExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-slate-900/65 pt-3 text-xs space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Description</span>
                    <p className="text-slate-350 leading-relaxed font-sans text-xs">
                      {task.description || "No description provided."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">ESTIMATED DURATION</span>
                      <p className="text-slate-300 font-mono text-xs">
                        ⏱️ {task.durationMinutes} minutes
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">DEPENDENCIES</span>
                      <p className="text-slate-350 font-sans text-xs">
                        {task.dependencies && task.dependencies.length > 0 ? (
                          <span className="text-purple-400 font-mono text-[10px] leading-relaxed">
                            Requires: {task.dependencies.map(depId => {
                              const pm = missions.find(m => m.id === targetMissionId) || activeMission;
                              const tName = pm?.tasks.find(tk => tk.id === depId)?.name || depId;
                              return `"${tName}"`;
                            }).join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">None (Ready to execute)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {task.reasoning && (
                  <div className="bg-[#0E152B]/45 border border-[#1C2C57]/30 p-2.5 rounded-lg">
                    <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider block mb-1 font-bold">🤖 AI reasoning</span>
                    <p className="text-slate-300 italic leading-relaxed text-[11px] font-sans">
                      " {task.reasoning} "
                    </p>
                  </div>
                )}

                {/* Combined task management actions tucked inside More */}
                <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-900/80">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(targetMissionId, task.id, 'skipped');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-755 rounded-lg transition-all cursor-pointer text-[10px] font-mono font-bold uppercase select-none"
                  >
                    <RotateCcw className="w-3 h-3" /> Skip
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(targetMissionId, task.id, 'delayed');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-850 text-amber-500/80 hover:text-amber-400 border border-slate-850 hover:border-amber-900/30 rounded-lg transition-all cursor-pointer text-[10px] font-mono font-bold uppercase select-none"
                  >
                    <Clock className="w-3 h-3" /> Delay
                  </button>
                  {onFetchTaskStrategy && (
                    <button
                      onClick={() => onFetchTaskStrategy(task)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400 hover:text-teal-300 border border-teal-500/15 hover:border-teal-500/30 rounded-lg transition-all cursor-pointer text-[10px] font-mono font-bold uppercase select-none"
                    >
                      <Sparkles className="w-3 h-3 text-teal-400" /> AI Strategy
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // Fallback / standard metrics if no mission active
  const totalMissions = missions.length;
  const completedMissions = missions.filter(m => m.status === 'completed').length;
  
  // Find all active incomplete missions (concurrent streams)
  const activeIncompleteMissions = missions.filter(m => m.status === 'active' && m.tasks.some(t => t.status === 'todo'));
  const sortedCloseMissions = [...activeIncompleteMissions].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  
  let isParallelMode = false;
  let parallelMissions: Mission[] = [];
  
  if (sortedCloseMissions.length >= 2) {
    const m1 = sortedCloseMissions[0];
    const m2 = sortedCloseMissions[1];
    const diffMs = Math.abs(new Date(m1.deadline).getTime() - new Date(m2.deadline).getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours <= 24) {
      isParallelMode = true;
      parallelMissions = [m1, m2];
    }
  }

  // Gather all tasks from all active missions (Requested global task priority engine)
  let displayTasks: (Task & { parentMissionId?: string; parentMissionTitle?: string; parentMissionDeadline?: string; parentMissionRiskLevel?: string })[] = [];

  missions.filter(m => m.status === 'active').forEach(m => {
    m.tasks.forEach(t => {
      displayTasks.push({
        ...t,
        parentMissionId: m.id,
        parentMissionTitle: m.title || m.goal,
        parentMissionDeadline: m.deadline,
        parentMissionRiskLevel: m.riskLevel || 'Low'
      });
    });
  });

  const completedTasks = displayTasks.filter(t => t.status === 'completed');
  const skippedTasks = displayTasks.filter(t => t.status === 'skipped');
  const todoTasks = displayTasks.filter(t => t.status === 'todo');

  const totalTasksCount = displayTasks.length;
  const completedCount = completedTasks.length;
  const skippedCount = skippedTasks.length;
  const todoCount = todoTasks.length;

  // Completion %
  const completionPercentage = totalTasksCount > 0 
    ? Math.round((completedCount / totalTasksCount) * 100) 
    : 0;

  // Risk Rating calculation (speedometer needle position, 0 is safe, 100 is critical)
  const calculateRiskValue = () => {
    if (isParallelMode) {
      let maxRisk = 15;
      parallelMissions.forEach(m => {
        const confidence = m.confidenceScore || 80;
        const baseRisk = 100 - confidence;
        const deadlineDiff = new Date(m.deadline).getTime() - Date.now();
        const hoursRemaining = deadlineDiff / (1000 * 60 * 60);
        let timeRisk = 0;
        if (hoursRemaining < 24 && hoursRemaining > 0) {
          timeRisk = 30;
        } else if (hoursRemaining <= 0) {
          timeRisk = 60;
        }
        const mRisk = Math.min(100, Math.max(5, Math.round(baseRisk + timeRisk)));
        if (mRisk > maxRisk) maxRisk = mRisk;
      });
      return maxRisk;
    }

    if (!activeMission) return 15; // low risk default
    // Risk factors: past deadline, skipped tasks, confidence score
    const confidence = activeMission.confidenceScore || 80;
    const baseRisk = 100 - confidence;
    const deadlineDiff = new Date(activeMission.deadline).getTime() - Date.now();
    const hoursRemaining = deadlineDiff / (1000 * 60 * 60);
    
    let timeRisk = 0;
    if (hoursRemaining < 24 && hoursRemaining > 0) {
      timeRisk = 30;
    } else if (hoursRemaining <= 0) {
      timeRisk = 60;
    }

    return Math.min(100, Math.max(5, Math.round(baseRisk + timeRisk)));
  };

  const riskValue = calculateRiskValue();

  // Streak counter (mock or active calculation)
  const streakDays = completedCount > 0 ? 7 : 0;

  // Today's Energy Meter (battery %)
  // Drops slightly per completed task, or increases as tasks finish - let's make it a cognitive capacity rating
  const cognitiveCapacity = Math.max(10, 100 - (completedCount * 12));

  // Focus time logged (e.g. 25 minutes per completed task)
  const focusMinutesLogged = completedCount * 30;

  const calculateImportanceScore = (task: Task, parentMission: Mission | null) => {
    let score = 50; // base score
    
    // 1. Priority Impact
    if (task.priority === 'high') score += 25;
    else if (task.priority === 'medium') score += 10;
    else if (task.priority === 'low') score -= 15;

    // 2. Dependencies Impact
    if (parentMission) {
      const dependentCount = parentMission.tasks.filter(t => t.dependencies?.includes(task.id)).length;
      score += dependentCount * 10; // high impact if other tasks wait on this
    }

    // 3. Duration Impact (Shorter tasks have slightly higher dynamic prioritization for momentum)
    if (task.durationMinutes <= 30) score += 5;
    else if (task.durationMinutes > 90) score -= 10;

    // 4. Time position impact
    if (task.scheduledTime) {
      // earlier slots get higher focus
      const isMorning = task.scheduledTime.includes('AM') || task.scheduledTime.startsWith('08:') || task.scheduledTime.startsWith('09:') || task.scheduledTime.startsWith('10:') || task.scheduledTime.startsWith('11:');
      if (isMorning) score += 10;
    }

    return Math.min(100, Math.max(5, score));
  };

  // Filter list of tasks based on the active sticky filter chip
  const filteredTasks = (sortedUpcomingTasks || []).filter((t) => {
    // Only show incomplete/todo/delayed tasks
    if (t.status !== 'todo' && t.status !== 'delayed') return false;

    const deadlineTime = t.parentMissionDeadline ? new Date(t.parentMissionDeadline).getTime() : 0;
    const msRemaining = deadlineTime - Date.now();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    switch (taskFilter) {
      case 'today':
        return hoursRemaining >= 0 && hoursRemaining <= 24;
      case 'tomorrow':
        return hoursRemaining > 24 && hoursRemaining <= 48;
      case 'this_week':
        return hoursRemaining >= 0 && hoursRemaining <= 168;
      case 'high_risk':
        return t.parentMissionRiskLevel === 'Critical' || t.parentMissionRiskLevel === 'Very High' || t.parentMissionRiskLevel === 'High';
      case 'current_mission':
        return activeMission ? t.parentMissionId === activeMission.id : true;
      case 'overdue':
        return hoursRemaining < 0;
      case 'all':
      default:
        return true;
    }
  });

  const getGroup = (t: any) => {
    if (!t.parentMissionDeadline) return 'Later / Flexible';
    const deadlineTime = new Date(t.parentMissionDeadline).getTime();
    const msRemaining = deadlineTime - Date.now();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    if (hoursRemaining < 0) return 'Overdue';
    if (hoursRemaining <= 24) return '🔥 Today';
    if (hoursRemaining <= 48) return 'Tomorrow';
    if (hoursRemaining <= 168) return 'Later This Week';
    return 'Later / Flexible';
  };

  // Pull out the first task as "🔥 DO THIS NEXT" featured task
  const featuredTask = filteredTasks[0] || null;
  const remainingTasks = filteredTasks.slice(1);

  const groupedTasks: Record<string, typeof filteredTasks> = {
    'Overdue': [],
    '🔥 Today': [],
    'Tomorrow': [],
    'Later This Week': [],
    'Later / Flexible': []
  };

  remainingTasks.forEach(t => {
    const grp = getGroup(t);
    groupedTasks[grp].push(t);
  });

  return (
    <div className="space-y-6">
      
      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: SPEEDOMETER RISK DIAL & ENERGY */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest">RISK SPEEDOMETER & ENERGY</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>

          {/* Speedometer Gauge Dial */}
          <div className="flex flex-col items-center justify-center relative pt-4">
            <svg className="w-36 h-20" viewBox="0 0 100 50">
              {/* Arc background */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke="#11172A" 
                strokeWidth="8" 
                strokeLinecap="round" 
              />
              {/* Gradient Arc cover */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke="url(#speedometerGradient)" 
                strokeWidth="8" 
                strokeLinecap="round" 
                strokeDasharray={`${(riskValue / 100) * 126} 126`}
                className="transition-all duration-1000 ease-out"
              />
              {/* Pointer Center */}
              <circle cx="50" cy="50" r="4" fill="#E2E8F0" />
              {/* Pointer Needle */}
              <line 
                x1="50" 
                y1="50" 
                x2={50 + 35 * Math.cos((Math.PI) * (1 - riskValue / 100))} 
                y2={50 - 35 * Math.sin((Math.PI) * (1 - riskValue / 100))} 
                stroke="#14B8A6" 
                strokeWidth="2" 
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              
              <defs>
                <linearGradient id="speedometerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />     {/* Green */}
                  <stop offset="50%" stopColor="#F59E0B" />    {/* Orange */}
                  <stop offset="100%" stopColor="#EF4444" />   {/* Red */}
                </linearGradient>
              </defs>
            </svg>

            {/* Numerical details */}
            <div className="text-center mt-2">
              <div className="text-2xl font-black font-mono text-white tracking-tight">
                {riskValue}%
              </div>
              <div className="text-[9.5px] font-mono uppercase font-bold tracking-wider text-slate-500">
                {riskValue > 65 ? '🔴 High Slip Risk' : riskValue > 35 ? '🟡 Tight Tolerance' : '🟢 Secure Control'}
              </div>
            </div>
          </div>

          {/* Energy battery level at the bottom */}
          <div className="pt-4 border-t border-slate-950 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Today's Battery:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-950 border border-slate-900 h-2 rounded overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-sm transition-all duration-1000 ${
                    cognitiveCapacity > 60 ? 'bg-teal-400' : cognitiveCapacity > 30 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${cognitiveCapacity}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-250">{cognitiveCapacity}%</span>
            </div>
          </div>
        </div>

        {/* Card 2: STREAK FLAME & FOCUS TIME LOGGED */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest">PRODUCTIVITY STREAK</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>

          <div className="flex items-center gap-5 py-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-rose-500/10 blur-xl rounded-full animate-pulse" />
              <div className="w-14 h-14 bg-rose-950/20 border border-rose-900/30 rounded-2xl flex items-center justify-center text-rose-400">
                <Flame className="w-8 h-8 fill-rose-500/10 animate-bounce" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-3xl font-black font-mono text-white tracking-tighter">
                {streakDays} <span className="text-xs text-slate-400 font-medium">days</span>
              </div>
              <p className="text-[10px] text-slate-450 leading-normal font-sans">
                Consecutive days completing planned tasks. Keep the streak hot!
              </p>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-950 flex justify-between items-center">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono text-slate-500 uppercase">Focus Time Logged</span>
              <div className="text-sm font-mono font-bold text-teal-400">{focusMinutesLogged} mins</div>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-mono text-slate-500 uppercase">Average / Day</span>
              <div className="text-sm font-mono font-bold text-slate-300">45 mins</div>
            </div>
          </div>
        </div>

        {/* Card 3: COMPOSITE TASK PROGRESS RING */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest">COMPLETION DENSITY</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex justify-center items-center relative py-1">
            <svg className="w-28 h-28 transform -rotate-90">
              {/* Outer ring */}
              <circle cx="56" cy="56" r="44" stroke="#11172A" strokeWidth="8" fill="transparent" />
              <circle 
                cx="56" 
                cy="56" 
                r="44" 
                stroke="#14B8A6" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray="276"
                strokeDashoffset={276 - (276 * completionPercentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-white leading-none">{completionPercentage}%</span>
              <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest mt-1">DONE</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-bold pt-2 border-t border-slate-950">
            <div>
              <span className="block text-[8px] text-slate-500">TODO</span>
              <span className="text-slate-200">{todoCount}</span>
            </div>
            <div>
              <span className="block text-[8px] text-teal-400">DONE</span>
              <span className="text-teal-400">{completedCount}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500">SKIP</span>
              <span className="text-slate-400">{skippedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks Section (Redesigned) */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md space-y-4">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-950 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-mono text-white font-bold uppercase tracking-wider">
              Upcoming Focus Tasks
            </h3>
            {filteredTasks.length > 0 && (
              <span className="px-1.5 py-0.2 bg-teal-500/15 text-teal-400 text-[9px] rounded-full font-bold">
                {filteredTasks.length} left
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono text-slate-500 uppercase">
            {isParallelMode ? "Multi-Stream Active" : (activeMission ? activeMission.title || activeMission.goal : 'No context loaded')}
          </span>
        </div>

        {/* Sticky Quick Task Filters */}
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md py-3 -mx-6 px-6 border-b border-slate-900/50 flex flex-wrap gap-1.5 items-center">
          <span className="font-mono text-slate-500 uppercase text-[9px] mr-2 font-bold tracking-widest">Filter:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'tomorrow', label: 'Tomorrow' },
              { value: 'this_week', label: 'This Week' },
              { value: 'high_risk', label: 'High Risk' },
              { value: 'current_mission', label: 'Current Mission' },
              { value: 'overdue', label: 'Overdue' }
            ].map((chip) => {
              const count = (sortedUpcomingTasks || []).filter((t) => {
                if (t.status !== 'todo' && t.status !== 'delayed') return false;
                const deadlineTime = t.parentMissionDeadline ? new Date(t.parentMissionDeadline).getTime() : 0;
                const msRemaining = deadlineTime - Date.now();
                const hoursRemaining = msRemaining / (1000 * 60 * 60);

                if (chip.value === 'all') return true;
                if (chip.value === 'today') return hoursRemaining >= 0 && hoursRemaining <= 24;
                if (chip.value === 'tomorrow') return hoursRemaining > 24 && hoursRemaining <= 48;
                if (chip.value === 'this_week') return hoursRemaining >= 0 && hoursRemaining <= 168;
                if (chip.value === 'high_risk') return t.parentMissionRiskLevel === 'Critical' || t.parentMissionRiskLevel === 'Very High' || t.parentMissionRiskLevel === 'High';
                if (chip.value === 'current_mission') return activeMission ? t.parentMissionId === activeMission.id : true;
                if (chip.value === 'overdue') return hoursRemaining < 0;
                return true;
              }).length;

              return (
                <button
                  key={chip.value}
                  onClick={() => setTaskFilter(chip.value as any)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium font-sans transition-all cursor-pointer select-none flex items-center gap-1.5 border ${
                    taskFilter === chip.value
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.05)] font-semibold'
                      : 'bg-slate-900/40 text-slate-400 border-slate-850 hover:text-white hover:bg-slate-900 hover:border-slate-800'
                  }`}
                >
                  {chip.label}
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                    taskFilter === chip.value 
                      ? 'bg-teal-500/20 text-teal-300' 
                      : 'bg-slate-950 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeMission || isParallelMode || filteredTasks.length > 0 ? (
          filteredTasks.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/80 mx-auto" />
              <p className="text-xs text-slate-400 font-sans">No tasks found for this filter. 🎯</p>
            </div>
          ) : (
            <div className="space-y-6 pt-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* Featured DO THIS NEXT Section */}
              {featuredTask && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                      🔥 DO THIS NEXT
                    </span>
                    <div className="h-[1px] flex-1 bg-amber-500/10" />
                  </div>
                  <div className="relative">
                    <div className="absolute top-0 right-0 bg-teal-500 text-slate-950 text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-bl-lg uppercase flex items-center gap-1 shadow-md z-[2]">
                      ✨ OPTIMAL FOCUS
                    </div>
                    {renderTaskCard(featuredTask, true)}
                  </div>
                </div>
              )}

              {/* Grouped Lists */}
              {['Overdue', '🔥 Today', 'Tomorrow', 'Later This Week', 'Later / Flexible'].map((groupName) => {
                const tasksInGroup = groupedTasks[groupName] || [];
                if (tasksInGroup.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                        {groupName}
                      </span>
                      <div className="h-[1px] flex-1 bg-slate-900" />
                      <span className="text-[9px] font-mono text-slate-500 font-semibold bg-slate-950/40 border border-slate-900 px-1.5 py-0.2 rounded-full">
                        {tasksInGroup.length}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {tasksInGroup.map((task) => renderTaskCard(task, false))}
                    </div>
                  </div>
                );
              })}

            </div>
          )
        ) : (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">No Active Stream</h4>
              <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
                Select or activate a focus stream from the <strong className="text-teal-400">Streams</strong> tab to load its upcoming task list.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
