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
  ChevronRight
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

  // Gather all tasks from either the parallel active missions or the single active mission
  let displayTasks: (Task & { parentMissionId?: string; parentMissionTitle?: string })[] = [];

  if (isParallelMode) {
    parallelMissions.forEach(m => {
      m.tasks.forEach(t => {
        displayTasks.push({
          ...t,
          parentMissionId: m.id,
          parentMissionTitle: m.title || m.goal
        });
      });
    });
  } else if (activeMission) {
    activeMission.tasks.forEach(t => {
      displayTasks.push({
        ...t,
        parentMissionId: activeMission.id,
        parentMissionTitle: activeMission.title || activeMission.goal
      });
    });
  }

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

  // Upcoming / active tasks in this mission / all active missions
  const upcomingTasks = displayTasks
    .filter(t => t && t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'missed')
    .map(t => {
      // Find the mission this task belongs to
      const pm = missions.find(m => m.id === t.parentMissionId) || activeMission;
      const score = calculateImportanceScore(t, pm);
      return {
        ...t,
        importanceScore: score,
      };
    })
    .sort((a, b) => {
      // 1. Priority level weight (high -> medium -> low)
      const pWeights = { high: 3, medium: 2, low: 1 };
      const pA = pWeights[a.priority] || 2;
      const pB = pWeights[b.priority] || 2;
      if (pA !== pB) return pB - pA;

      // 2. Importance Score
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }

      // 3. Dependencies length (tasks with more dependencies or depend on more tasks first)
      const depA = a.dependencies?.length || 0;
      const depB = b.dependencies?.length || 0;
      if (depA !== depB) return depB - depA;

      // 4. Duration (shorter first)
      if (a.durationMinutes !== b.durationMinutes) {
        return a.durationMinutes - b.durationMinutes;
      }

      // 5. Original Order
      return (a.order ?? 0) - (b.order ?? 0);
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

      {/* Upcoming Tasks Section (Requested Update) */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-950 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-mono text-white font-bold uppercase tracking-wider">
              {isParallelMode ? "Upcoming Tasks in Concurrent Streams" : "Upcoming Tasks in this Mission"}
            </h3>
            {(activeMission || isParallelMode) && upcomingTasks.length > 0 && (
              <span className="px-1.5 py-0.2 bg-teal-500/15 text-teal-400 text-[9px] rounded-full font-bold">
                {upcomingTasks.length} left
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono text-slate-500 uppercase">
            {isParallelMode ? "Multi-Stream Active" : (activeMission ? activeMission.title || activeMission.goal : 'No context loaded')}
          </span>
        </div>

        {activeMission || isParallelMode ? (
          upcomingTasks.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/80 mx-auto" />
              <p className="text-xs text-slate-400 font-sans">All tasks completed! You are fully up-to-date. 🎯</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {upcomingTasks.map((task) => {
                const targetMissionId = task.parentMissionId || (activeMission?.id || '');
                const isCompleted = task.status === 'completed';
                const isSkipped = task.status === 'skipped';
                const isMissed = task.status === 'missed';
                const isDelayed = task.status === 'delayed';
                const isTaskExpanded = expandedTasks[task.id] ?? false;

                return (
                  <div
                    key={`${targetMissionId}-${task.id}`}
                    className={`flex flex-col gap-3.5 p-4 bg-slate-950 border rounded-xl hover:border-slate-800 transition-all group relative ${
                      isCompleted 
                        ? 'border-emerald-500/20 opacity-60' 
                        : isSkipped 
                        ? 'border-slate-800/40 opacity-50' 
                        : isMissed 
                        ? 'border-rose-500/20 bg-rose-500/5' 
                        : isDelayed 
                        ? 'border-amber-500/20 bg-amber-500/5' 
                        : 'border-slate-900'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Status Check Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextS = isCompleted ? 'todo' : 'completed';
                            updateTaskStatus(targetMissionId, task.id, nextS);
                          }}
                          className={`w-5 h-5 rounded border bg-slate-950 flex items-center justify-center cursor-pointer transition shrink-0 ${
                            isCompleted 
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black text-[9px]' 
                              : isMissed
                              ? 'bg-rose-500 border-rose-500 text-slate-950 font-black text-[9px]'
                              : isDelayed
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-black text-[9px]'
                              : isSkipped
                              ? 'bg-slate-700 border-slate-700 text-white font-black text-[9px]'
                              : 'border-slate-800 hover:border-teal-400'
                          }`}
                        >
                          {isCompleted ? "✓" : isMissed ? "✕" : isDelayed ? "⏳" : isSkipped ? "↷" : ""}
                        </button>
                        
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-snug transition ${
                            isCompleted ? 'text-slate-450 line-through' : 
                            isSkipped ? 'text-slate-550 line-through' : 
                            isMissed ? 'text-rose-400' : 
                            isDelayed ? 'text-amber-300' : 'text-white'
                          }`}>
                            {task.name}
                          </p>
                        </div>
                      </div>

                      {/* Colored badges / details for Priority, Time, Deadline */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          {task.status !== 'todo' && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                              isCompleted 
                                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                : isDelayed
                                ? 'bg-amber-950/20 text-amber-400 border border-amber-900/30'
                                : isMissed
                                ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {isCompleted ? '🟢 Complete' : isDelayed ? '🟡 Delayed' : isMissed ? '🔴 Missed' : '⏭️ Skipped'}
                            </span>
                          )}
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                            task.priority === 'high' 
                              ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30' 
                              : task.priority === 'medium'
                              ? 'bg-amber-950/20 text-amber-400 border border-amber-900/30'
                              : 'bg-teal-950/20 text-teal-400 border border-teal-900/30'
                          }`}>
                            {task.priority === 'high' ? '🔥 High' : task.priority === 'medium' ? '⚡ Medium' : '💤 Low'}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            🤖 AI SCORE: {(task as any).importanceScore || 75}/100
                          </span>
                          {task.dependencies && task.dependencies.length > 0 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase">
                              🔗 DEP: {task.dependencies.length}
                            </span>
                          )}
                          {isParallelMode && task.parentMissionTitle && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono font-semibold bg-slate-900 border border-slate-850 text-slate-400 rounded truncate max-w-[150px]" title={task.parentMissionTitle}>
                              📁 {task.parentMissionTitle}
                            </span>
                          )}
                          {task.scheduledTime && (
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              ⌛ {task.scheduledTime}
                            </span>
                          )}
                          <span className="text-xs font-mono text-slate-400 font-bold">{task.durationMinutes}m</span>
                        </div>

                        {/* Action Buttons: Focus, Skip, Delay, and Accordion Toggle */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocusSession && onStartFocusSession(task);
                            }}
                            title="Launch Zen Focus"
                            className="p-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 hover:border-teal-400 rounded-lg transition cursor-pointer flex items-center justify-center select-none"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatus(targetMissionId, task.id, 'skipped');
                            }}
                            title="Skip Task"
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-850 hover:border-slate-700 rounded-lg transition cursor-pointer flex items-center justify-center select-none"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatus(targetMissionId, task.id, 'delayed');
                            }}
                            title="Delay Task"
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-400 rounded-lg transition cursor-pointer flex items-center justify-center select-none"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                            }}
                            title={isTaskExpanded ? "Hide Details" : "Show Details"}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:border-slate-700 rounded-lg transition cursor-pointer flex items-center justify-center ml-1 select-none"
                          >
                            {isTaskExpanded ? <ChevronUp className="w-3.5 h-3.5 text-teal-400 animate-pulse" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Accordion details */}
                    <AnimatePresence initial={false}>
                      {isTaskExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-slate-900/65 pt-3.5 text-xs space-y-3"
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
                                <p className="text-slate-300 font-sans text-xs">
                                  {task.dependencies && task.dependencies.length > 0 ? (
                                    <span className="text-purple-400 font-mono text-[10px]">
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
                            <div className="bg-[#0E152B]/40 border border-[#1C2C57]/45 p-3 rounded-xl">
                              <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider block mb-1">🤖 AI reasoning</span>
                              <p className="text-slate-400 italic leading-relaxed text-[11px] font-sans">
                                " {task.reasoning} "
                              </p>
                            </div>
                          )}

                          {onFetchTaskStrategy && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => {
                                  onFetchTaskStrategy(task);
                                }}
                                className="text-[10px] font-mono font-bold text-teal-400 hover:text-teal-300 transition flex items-center gap-1 bg-teal-500/5 hover:bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/15"
                              >
                                Open Full AI Strategy <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
