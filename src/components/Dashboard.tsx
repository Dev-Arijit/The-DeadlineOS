import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle, 
  RotateCcw, 
  Plus, 
  ListTodo, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon,
  MessageSquare,
  Trash2,
  PlayCircle,
  Pause,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Compass,
  ArrowRight,
  Check,
  User,
  Heart,
  ArrowLeft,
  Activity,
  Award,
  Flame,
  ChevronDown,
  ChevronUp,
  Folder,
  Bot,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMissionStore } from '../store/useMissionStore';
import { CreateMissionWizard } from './CreateMissionWizard';
import { SettingsView } from './SettingsView';
import { VisualAnalyticsView } from './VisualAnalyticsView';

const tzMap: Record<string, string> = {
  'UTC-8': 'America/Los_Angeles',
  'UTC-7': 'America/Denver',
  'UTC-6': 'America/Chicago',
  'UTC-5': 'America/New_York',
  'UTC-0': 'UTC',
  'UTC+5.5': 'Asia/Kolkata',
};
import { AIStrategistView } from './AIStrategistView';
import { CalendarFlowView } from './CalendarFlowView';
import { AgentCenterView } from './AgentCenterView';
import { MissionsManagerView } from './MissionsManagerView';
import { Task, Mission, calculateMissionProgress } from '../types';

const formatSafeDate = (isoString: string, options?: Intl.DateTimeFormatOptions) => {
  if (!isoString) return 'Flexible Target';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return isoString;
    }
    if (options && ('dateStyle' in options || 'timeStyle' in options)) {
      return d.toLocaleString([], options);
    }
    return d.toLocaleDateString(undefined, options || { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
};

export function Dashboard({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const missions = useMissionStore((state) => state.missions);
  const activeMissionId = useMissionStore((state) => state.activeMissionId);
  const isCreatingNewMission = useMissionStore((state) => state.isCreatingNewMission);
  const conflictWarning = useMissionStore((state) => state.conflictWarning);
  const conflictRecommendation = useMissionStore((state) => state.conflictRecommendation);
  const loading = useMissionStore((state) => state.loading);
  const loadingMessage = useMissionStore((state) => state.loadingMessage);
  
  // Store actions
  const planNewMission = useMissionStore((state) => state.planNewMission);
  const updateTaskStatus = useMissionStore((state) => state.updateTaskStatus);
  const deleteMission = useMissionStore((state) => state.deleteMission);
  const editMission = useMissionStore((state) => state.editMission);
  const updateTask = useMissionStore((state) => state.updateTask);
  const setIsCreatingNewMission = useMissionStore((state) => state.setIsCreatingNewMission);
  const setActiveMissionId = useMissionStore((state) => state.setActiveMissionId);
  const recalculateEverything = useMissionStore((state) => state.recalculateEverything);

  const chatHistory = useMissionStore((state) => state.chatHistory);
  const chatLoading = useMissionStore((state) => state.chatLoading);
  const setChatHistory = useMissionStore((state) => state.setChatHistory);
  const setChatLoading = useMissionStore((state) => state.setChatLoading);
  const userSettings = useMissionStore((state) => state.userSettings);

  // Tabs: mission (the home screen), tasks (priority list), streams, strategist, calendar, settings
  const [activeTab, setActiveTab] = useState<'mission' | 'tasks' | 'streams' | 'strategist' | 'calendar' | 'agents' | 'settings'>('mission');

  // Collapsible missions dictionary for the Priority List page
  const [expandedMissions, setExpandedMissions] = useState<Record<string, boolean>>({});

  // Collapsible individual tasks state
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Flag to display all tasks in task list by mission
  const [showAllTasks, setShowAllTasks] = useState<Record<string, boolean>>({});

  // Selected Task Detail Page state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskStrategyText, setTaskStrategyText] = useState<string>('');
  const [taskStrategyLoading, setTaskStrategyLoading] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'completed'>('all');

  const fetchTaskStrategy = async (task: Task) => {
    if (!task) return;
    setTaskStrategyText('');
    setTaskStrategyLoading(true);
    try {
      const res = await fetch('/api/task-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: task.name,
          taskDescription: task.description,
          taskPriority: task.priority,
          taskDuration: task.durationMinutes,
          missionGoal: activeMission?.goal || 'Project Completion'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTaskStrategyText(data.strategy);
      } else {
        setTaskStrategyText('### The Core Focus\nFocus on minimum viable completion of this item.\n\n### Action Checklist\n- Review task requirements\n- Avoid perfectionism\n- Deliver simple implementation first\n\n### Encouragement\nYou are completely on track. Take a deep breath and start.');
      }
    } catch (err) {
      console.error(err);
      setTaskStrategyText('### Core Focus\nMaintain focus on completing this item as scheduled.\n\n### Direct Action Steps\n- Execute basic core functional structure\n- Keep elements clear and clean\n- Track details on the go.');
    } finally {
      setTaskStrategyLoading(false);
    }
  };

  // Interactive focus timer state
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(0);
  const [focusRunning, setFocusRunning] = useState(false);
  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Confirmation dialog overlays state (replaces window.confirm)
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // AI Strategist Chat state
  const [chatInput, setChatInput] = useState('');

  // Initialize all missions as expanded in Priority List
  useEffect(() => {
    if (missions.length > 0) {
      const initial: Record<string, boolean> = {};
      missions.forEach(m => {
        initial[m.id] = true;
      });
      setExpandedMissions(prev => ({ ...initial, ...prev }));
    }
  }, [missions]);

  // Find active mission (using same closest-deadline-first sort order)
  const activeMission = missions.find(m => m.id === activeMissionId && m.status === 'active') || 
                  [...missions]
                    .filter(m => m.status === 'active')
                    .sort((a, b) => {
                      const timeA = new Date(a.deadline).getTime();
                      const timeB = new Date(b.deadline).getTime();
                      if (timeA !== timeB) return timeA - timeB;

                      const pWeights = { high: 3, medium: 2, low: 1 };
                      const pA = pWeights[a.priority || 'medium'] || 2;
                      const pB = pWeights[b.priority || 'medium'] || 2;
                      return pB - pA;
                    })[0] || 
                  null;

  // Keep store's activeMissionId in sync with derived activeMission
  useEffect(() => {
    if (activeMission && activeMission.id !== activeMissionId) {
      setActiveMissionId(activeMission.id);
    }
  }, [activeMission, activeMissionId, setActiveMissionId]);

  // Synchronize focus timer
  useEffect(() => {
    if (focusRunning && focusTimeLeft > 0) {
      focusIntervalRef.current = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            setFocusRunning(false);
            if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
      }
    }
    return () => {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, [focusRunning, focusTimeLeft]);

  // Launch Focus Session
  const startFocusSession = (task: Task) => {
    setActiveFocusTask(task);
    setFocusTimeLeft(task.durationMinutes * 60);
    setFocusRunning(true);
  };

  // Complete task from Focus Session
  const completeFocusTask = async () => {
    if (!activeMission || !activeFocusTask) return;
    setFocusRunning(false);
    const taskId = activeFocusTask.id;
    setActiveFocusTask(null);
    await updateTaskStatus(activeMission.id, taskId, 'completed', true);
  };

  // Submit Chat Message
  const submitChatMessage = async (msgText: string) => {
    if (!msgText.trim() || chatLoading) return;
    
    const userMsg = {
      id: Math.random().toString(36).substring(2, 11),
      role: 'user' as const,
      text: msgText
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const formattedHistory = chatHistory.map(h => ({
        role: h.role,
        text: h.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          history: formattedHistory,
          activeMission: activeMission,
          missions: missions,
          activeMissionId: activeMissionId,
          currentLocalTime: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        const modelMsg = {
          id: Math.random().toString(36).substring(2, 11),
          role: 'model' as const,
          text: data.text
        };
        setChatHistory(prev => [...prev, modelMsg]);

        // Execute any AI Agent tool calls locally in the Zustand Store
        if (data.toolCalls && Array.isArray(data.toolCalls)) {
          for (const call of data.toolCalls) {
            const { name, args } = call;
            try {
              if (name === 'update_task_status') {
                const { missionId, taskId, status } = args;
                if (missionId && useMissionStore.getState().activeMissionId !== missionId) {
                  useMissionStore.getState().setActiveMissionId(missionId);
                }
                await useMissionStore.getState().updateTaskStatus(missionId, taskId, status);
              } 
              else if (name === 'add_task_to_mission') {
                const { missionId, name: taskName, description, durationMinutes, priority } = args;
                if (missionId && useMissionStore.getState().activeMissionId !== missionId) {
                  useMissionStore.getState().setActiveMissionId(missionId);
                }
                await useMissionStore.getState().addTask({
                  name: taskName,
                  description: description || '',
                  durationMinutes: Number(durationMinutes) || 30,
                  priority: priority || 'medium',
                  milestoneId: 'ms-core',
                  dependencies: [],
                  scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                });
              } 
              else if (name === 'delete_task_from_mission') {
                const { missionId, taskId } = args;
                if (missionId && useMissionStore.getState().activeMissionId !== missionId) {
                  useMissionStore.getState().setActiveMissionId(missionId);
                }
                await useMissionStore.getState().deleteTask(taskId);
              } 
              else if (name === 'create_new_mission') {
                const { title, goal, deadline, dailyCapacityHours, priority } = args;
                await useMissionStore.getState().planNewMission(
                  goal,
                  deadline,
                  Number(dailyCapacityHours) || 4,
                  ['Morning', 'Evening'],
                  title,
                  priority || 'medium'
                );
              } 
              else if (name === 'replan_user_mission') {
                const { missionId } = args;
                if (missionId) {
                  await useMissionStore.getState().applySuggestedFix(missionId, 'replan');
                }
              }
            } catch (err) {
              console.error(`AI Agent tool execution error for ${name}:`, err);
            }
          }
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 11),
        role: 'model' as const,
        text: "I experienced a connection hitch, but don't panic. Check your scheduled tasks below or ask me again."
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Active / Next Tasks filters sorted by highest priority first
  const priorityWeights = { high: 3, medium: 2, low: 1 };
  const incompleteTasks = activeMission 
    ? [...activeMission.tasks]
      .filter(t => t.status === 'todo')
      .sort((a, b) => {
        const pA = priorityWeights[a.priority] || 2;
        const pB = priorityWeights[b.priority] || 2;
        if (pA !== pB) return pB - pA; // High priority first
        return a.order - b.order;      // Then original order
      })
    : [];

  const doNowTask = incompleteTasks[0] || null;
  const nextTasksList = incompleteTasks.slice(1);

  // Parallel stream detection
  const activeIncompleteMissions = missions.filter(m => m.status === 'active' && m.tasks.some(t => t.status === 'todo'));
  const sortedCloseMissions = [...activeIncompleteMissions].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  let isParallelMode = false;
  let parallelMissionA: Mission | null = null;
  let parallelMissionB: Mission | null = null;
  let parallelTaskA: Task | null = null;
  let parallelTaskB: Task | null = null;
  let closeDeadlineDiffHours = 0;

  if (sortedCloseMissions.length >= 2) {
    const m1 = sortedCloseMissions[0];
    const m2 = sortedCloseMissions[1];
    const diffMs = Math.abs(new Date(m1.deadline).getTime() - new Date(m2.deadline).getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours <= 24) {
      isParallelMode = true;
      parallelMissionA = m1;
      parallelMissionB = m2;
      closeDeadlineDiffHours = diffHours;

      // Find top priority task for each
      const tasksA = [...m1.tasks]
        .filter(t => t.status === 'todo')
        .sort((a, b) => {
          const pA = priorityWeights[a.priority] || 2;
          const pB = priorityWeights[b.priority] || 2;
          if (pA !== pB) return pB - pA;
          return a.order - b.order;
        });
      parallelTaskA = tasksA[0] || null;

      const tasksB = [...m2.tasks]
        .filter(t => t.status === 'todo')
        .sort((a, b) => {
          const pA = priorityWeights[a.priority] || 2;
          const pB = priorityWeights[b.priority] || 2;
          if (pA !== pB) return pB - pA;
          return a.order - b.order;
        });
      parallelTaskB = tasksB[0] || null;
    }
  }

  // Calculate formatted countdown
  const getCountdownString = () => {
    if (!activeMission) return '';
    const diffMs = new Date(activeMission.deadline).getTime() - Date.now();
    if (diffMs <= 0) return 'Deadline Reached';
    
    const totalMin = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    
    if (hrs > 24) {
      const days = Math.floor(hrs / 24);
      return `${days}d ${hrs % 24}h remaining`;
    }
    return `${hrs}h ${mins}m remaining`;
  };

  // Format focus timer
  const formatFocusTimer = () => {
    const mins = Math.floor(focusTimeLeft / 60);
    const secs = focusTimeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Interactive local recovery action: Compress remaining tasks
  const handleCompressRecovery = async () => {
    if (!activeMission) return;
    const updatedTasks = activeMission.tasks.map(t => {
      if (t.status === 'todo') {
        return { ...t, durationMinutes: Math.max(10, Math.round(t.durationMinutes * 0.75)) };
      }
      return t;
    });
    
    await editMission(activeMission.id, {
      tasks: updatedTasks,
      confidenceScore: Math.min(98, (activeMission.confidenceScore || 85) + 12)
    });
    recalculateEverything();
  };

  // Interactive local recovery action: Skip lowest priority task
  const handleSkipLowestPriority = async () => {
    if (!activeMission) return;
    const todos = activeMission.tasks.filter(t => t.status === 'todo');
    if (todos.length === 0) return;
    
    const sortedLow = [...todos].sort((a, b) => {
      const priorityWeights = { low: 1, medium: 2, high: 3 };
      return priorityWeights[a.priority] - priorityWeights[b.priority];
    });

    const lowestTask = sortedLow[0];
    await updateTaskStatus(activeMission.id, lowestTask.id, 'skipped');
  };

  // Toggle mission expansion inside the Priority List page
  const toggleMissionExpanded = (id: string) => {
    setExpandedMissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate high priority total and overdue items for priority stats
  const totalMissionsCount = missions.length;
  const totalTasksCount = missions.reduce((sum, m) => sum + m.tasks.length, 0);
  const overdueTasksCount = missions.reduce((sum, m) => {
    const isOverdue = new Date(m.deadline).getTime() < Date.now();
    return sum + m.tasks.filter(t => t.status === 'todo' && (isOverdue || t.priority === 'high')).length;
  }, 0);
  const completedTodayCount = missions.reduce((sum, m) => sum + m.tasks.filter(t => t.status === 'completed').length, 0);

  // Dynamic AI recommendation as one sentence (Requested Item!)
  const getAIRecommendationText = () => {
    if (!activeMission) return "🌸 Friend: Tell me what you're working on, and let's craft a perfect, stress-free plan together!";
    const todos = activeMission.tasks.filter(t => t.status === 'todo');
    if (todos.length === 0) return "🌸 Friend: We did it! Every single task is fully completed. No stress here—go enjoy some well-deserved rest!";
    
    const goalLower = (activeMission.title || activeMission.goal || '').toLowerCase();
    const isLowImpact = goalLower.includes('trip') || goalLower.includes('travel') || goalLower.includes('vacation') || goalLower.includes('holiday') || goalLower.includes('itinerary') || goalLower.includes('clean') || goalLower.includes('playlist');
    const isHighImpact = goalLower.includes('exam') || goalLower.includes('study') || goalLower.includes('test') || goalLower.includes('assignment') || goalLower.includes('quiz') || goalLower.includes('submission') || goalLower.includes('write') || goalLower.includes('paper') || goalLower.includes('project');

    if (isLowImpact) {
      return `🌸 Friend: Since "${activeMission.title || 'this trip'}" is a fun, low-stakes adventure, don't sweat the small stuff! Let's handle "${todos[0].name}" quickly and keep it completely stress-free.`;
    }

    if (isHighImpact) {
      const isBehind = activeMission.confidenceScore < 65;
      if (isBehind) {
        const lowPriority = todos.find(t => t.priority === 'low');
        if (lowPriority) {
          return `🌸 Friend: Hey, "${activeMission.title}" is super important for your goals! Let's bypass the low-value details like "${lowPriority.name}" to save ${lowPriority.durationMinutes} mins and focus on the main win.`;
        }
        return `🌸 Friend: We have some slippage risk on this critical project, but I've got your back! Let's spend just ${Math.round(todos[0].durationMinutes * 0.75)} mins on "${todos[0].name}" and keep our momentum high.`;
      }
      return `🌸 Friend: This assignment has high real-world impact! Let's dive into "${todos[0].name}" right now to secure a massive success margin. I'm right here with you!`;
    }

    // Default general supportive friend message
    const isBehind = activeMission.confidenceScore < 65;
    if (isBehind) {
      return `🌸 Friend: Take a deep breath! Let's focus our energy strictly on "${todos[0].name}" to get back on track. We can totally do this!`;
    }
    return `🌸 Friend: You're doing incredible! Let's tackle "${todos[0].name}" next to build an amazing momentum index.`;
  };

  // Calculate estimated finish time based on remaining durations starting from now
  const getEstimatedFinishTime = () => {
    if (!activeMission) return '';
    const totalRemMinutes = incompleteTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    const now = new Date();
    const finishDate = new Date(now.getTime() + totalRemMinutes * 60000);
    const tzName = tzMap[userSettings.timezone] || 'UTC';
    try {
      return finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tzName });
    } catch (e) {
      return finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const activeProgress = calculateMissionProgress(activeMission);

  return (
    <div className="min-h-screen md:h-screen bg-[#090C15] text-slate-100 flex flex-col md:flex-row font-sans antialiased md:overflow-hidden">
      
      {/* Global Rethinking & Operation Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#06080F]/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Interactive Orbital Sphere Animation */}
            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
              {/* Outer Glow Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-teal-500/30"
              />
              {/* Inner Pulsing Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                className="absolute inset-3 rounded-full border border-teal-400/40 border-t-transparent border-b-transparent"
              />
              {/* Deep Orbital Core Ring */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute inset-8 rounded-full bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 flex items-center justify-center shadow-inner"
              />
              {/* Glowing Core */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: 45 }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-10 h-10 rounded-lg bg-gradient-to-tr from-teal-400 to-emerald-300 flex items-center justify-center shadow-lg shadow-teal-500/20"
              >
                <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
              </motion.div>
            </div>

            {/* Title / Action Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="max-w-md space-y-3"
            >
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Rethinking Strategy...
              </h2>
              <p className="text-xs text-slate-400 font-mono leading-relaxed px-4">
                {loadingMessage || "Re-calibrating focus milestones and optimizing schedule buffers..."}
              </p>
              
              {/* Encouragement Dose */}
              <div className="pt-4 border-t border-slate-900/60 mt-4 flex items-center justify-center gap-1.5 text-[10px] text-teal-400 font-mono font-bold uppercase tracking-wider">
                <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                Empathetic AI Friend Active
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT NAVIGATION COLUMN - Consistent Sidebar */}
      <aside className="w-full md:w-64 bg-[#0D1222] border-b md:border-b-0 md:border-r border-slate-900 flex flex-col justify-between shrink-0 md:h-full md:overflow-y-auto">
        
        <div className="flex flex-col flex-grow">
          {/* App Title */}
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-teal-500/10">
                Ω
              </div>
              <div>
                <h1 className="font-bold justify-center tracking-tight text-sm text-white">DeadlineOS</h1>
        
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed border-t border-slate-900 pt-3 mt-3">
              AI Productivity OS
            </p>
          </div>

          {/* Create Mission Action Button - High Contrast & Prominent */}
          <div className="px-4 mb-3">
            <button
              onClick={() => {
                setIsCreatingNewMission(true);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 cursor-pointer flex items-center justify-center gap-1.5 transition-all select-none font-mono uppercase"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3px]" />
              New Focus Stream
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="px-3 space-y-1 flex-grow">
            {[
              { id: 'mission', label: 'My Focus', icon: Clock },
              { id: 'tasks', label: 'Priority List', icon: ListTodo },
              { id: 'streams', label: 'My Streams', icon: Folder },
              { id: 'strategist', label: 'AI Strategist', icon: MessageSquare },
              { id: 'calendar', label: 'Calendar Flow', icon: CalendarIcon },
              { id: 'agents', label: 'AI Syndicate', icon: Bot },
              { id: 'settings', label: 'Settings', icon: SettingsIcon }
            ].map((item) => {
              const Icon = item.icon;
              const isSel = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsCreatingNewMission(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isSel 
                      ? 'bg-[#181F36] text-teal-400 border border-teal-500/10 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-[#11172A]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSel ? 'text-teal-400' : 'text-slate-450'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Signout */}
        <div className="p-3.5 border-t border-slate-900 bg-[#0A0E1A]">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-none mb-0.5">{user.displayName}</p>
              <p className="text-[8.5px] font-mono text-slate-500 truncate leading-none">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full py-1.5 bg-slate-900/60 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-950 text-slate-400 hover:text-rose-400 text-[9px] font-mono font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            SIGN OUT PROTOCOL
          </button>
        </div>

      </aside>

      {/* RIGHT MAIN CONTENT PANEL */}
      <main className="flex-1 flex flex-col bg-[#090C15] overflow-y-auto relative p-6 md:p-8">

        {/* IF CREATING NEW MISSION - Display wizard */}
        {isCreatingNewMission ? (
          <div className="max-w-3xl mx-auto w-full py-6">
            <CreateMissionWizard 
              onPlanNewMission={async (goal, deadline, capacity, workTimes, title, priority, estHours, tags) => {
                await planNewMission(goal, deadline, capacity, workTimes, title, priority, estHours, tags);
                setIsCreatingNewMission(false);
                setActiveTab('mission');
              }}
              onCancel={() => setIsCreatingNewMission(false)}
              loading={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            
            {/* GLOBAL OS STATUS HEADER - Always display at the top across all tabs (Requested Item!) */}
            {activeMission && (
              <div className="w-full bg-[#0D1222] border border-slate-900 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl mb-6 shrink-0 select-none">
                {/* Left Info: Mission Name & Status */}
                <div className="flex items-center gap-3.5">
                  <div className="relative w-12 h-12 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" stroke="#11172A" strokeWidth="3" fill="transparent" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        stroke="#14B8A6" 
                        strokeWidth="3.5" 
                        fill="transparent" 
                        strokeDasharray="100"
                        strokeDashoffset={100 - activeProgress}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-black text-teal-400">
                      {activeProgress}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1 block font-black">STUDY MISSION STREAM</span>
                    <h2 className="text-xs sm:text-sm font-black text-white leading-tight truncate max-w-xs sm:max-w-md">
                      {activeMission.title || activeMission.goal}
                    </h2>
                  </div>
                </div>

                {/* Center Grid Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto text-[10px] font-mono font-bold border-t lg:border-t-0 lg:border-l border-slate-900 pt-3 lg:pt-0 lg:pl-6">
                  
                  {/* Deadline Countdown */}
                  <div>
                    <span className="block text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">COUNTDOWN</span>
                    <span className="text-teal-400 font-black">{getCountdownString() || "None"}</span>
                  </div>

                  {/* Current Status */}
                  <div>
                    <span className="block text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">INTEGRITY STATUS</span>
                    <span className={`flex items-center gap-1 ${
                      activeMission.confidenceScore >= 75 ? 'text-emerald-400' : activeMission.confidenceScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {activeMission.confidenceScore >= 75 ? '🟢 On Track' : activeMission.confidenceScore >= 50 ? '🟡 Tight Schedule' : '🔴 Critical'}
                    </span>
                  </div>

                  {/* Next Task */}
                  <div className="col-span-1">
                    <span className="block text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">NEXT FOCUS</span>
                    <span className="text-slate-300 truncate block max-w-[120px]" title={doNowTask?.name}>
                      {doNowTask ? doNowTask.name : '🎉 Completed'}
                    </span>
                  </div>

                  {/* Estimated Time */}
                  <div>
                    <span className="block text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">EST. FOCUS BLOCK</span>
                    <span className="text-white font-black">{doNowTask ? `${doNowTask.durationMinutes} min` : '0 min'}</span>
                  </div>

                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              
              {/* MY FOCUS PAGE (Home Dashboard) */}
              {activeTab === 'mission' && (
                <motion.div
                  key="mission"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-5xl mx-auto w-full space-y-6"
                >
                  
                  {!activeMission ? (
                    <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-8 text-center space-y-6 max-w-lg mx-auto mt-12 shadow-xl">
                      <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto text-teal-400">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white">Create First Mission</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          No study missions configured yet. Leverage our high-intensity, stress-free task mapper to schedule milestones, organize study blocks, and bypass panic.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsCreatingNewMission(true)}
                        className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 cursor-pointer select-none transition"
                      >
                        Plan My Goals Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Dynamic Overload banner */}
                      {(activeMission.failurePrediction?.probability > 25 || conflictWarning) && (
                        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
                          <div className="flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">⚠️ TIMELINE RISK DETECTED</h4>
                              <p className="text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                                {conflictWarning || activeMission.failurePrediction?.bottleneck || "Capacity allocation presents an overload hazard."}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                            <button
                              onClick={handleCompressRecovery}
                              className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500 text-amber-300 text-[10.5px] font-mono font-bold rounded-lg transition cursor-pointer"
                            >
                              COMPRESS TIMELINE (Cuts time 25%)
                            </button>
                            <button
                              onClick={handleSkipLowestPriority}
                              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-950/80 hover:bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white text-[10.5px] font-mono font-bold rounded-lg transition cursor-pointer"
                            >
                              SKIP LOWEST PRIORITY
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Home Page Visual layout (circular rings & giant Next Task card) */}
                      {isParallelMode && parallelMissionA && parallelMissionB ? (
                        <div className="w-full space-y-6">
                          {/* Parallel Alert Banner */}
                          <div className="relative flex items-center justify-between p-3 px-4 bg-teal-500/5 border border-teal-500/20 rounded-xl group cursor-help transition hover:bg-teal-500/10">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                              </span>
                              <span className="text-[10px] font-mono text-teal-400 font-black tracking-wider uppercase">🤖 AI Multi-Stream Coordination Protocol Active</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                              <span>Hover for details</span>
                              <Info className="w-3.5 h-3.5 text-teal-400" />
                            </div>
                            
                            {/* Hover Tooltip Details Popover */}
                            <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-[#0D1222] border border-slate-800 rounded-lg shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-200 z-50 text-xs text-slate-300 leading-relaxed font-sans">
                              Deadlines for <strong className="text-white">"{parallelMissionA.title}"</strong> and <strong className="text-white">"{parallelMissionB.title}"</strong> are extremely close ({Math.round(closeDeadlineDiffHours)} hours apart). Co-staff agents have interleaved workloads to prevent critical bottleneck congestion.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                            {/* Stream A Column */}
                            <div className="space-y-6 flex flex-col justify-between h-full">
                              {/* Stream A Metrics Shield */}
                              <div className="bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[240px] shadow-xl text-center relative group">
                                <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest block mb-4">
                                  🟢 STREAM A METRICS SHIELD
                                </span>
                                {(() => {
                                  const progA = Math.round((parallelMissionA!.tasks.filter(t => t.status === 'completed').length / parallelMissionA!.tasks.length) * 100) || 0;
                                  const diffMs = new Date(parallelMissionA!.deadline).getTime() - Date.now();
                                  const countdownA = diffMs <= 0 ? 'Deadline Reached' : (() => {
                                    const totalMin = Math.floor(diffMs / (1000 * 60));
                                    const hrs = Math.floor(totalMin / 60);
                                    const mins = totalMin % 60;
                                    return `${hrs}h ${mins}m left`;
                                  })();
                                  return (
                                    <div className="flex flex-col items-center space-y-3 w-full">
                                      <span className="text-[11px] font-mono text-teal-400 font-bold uppercase truncate max-w-[240px]" title={parallelMissionA!.title}>
                                        {parallelMissionA!.title}
                                      </span>
                                      <div className="relative w-32 h-32 flex items-center justify-center transform hover:scale-105 transition duration-300">
                                        <div className="absolute inset-0 bg-teal-500/5 rounded-full blur-xl animate-pulse" />
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                          <circle cx="50" cy="50" r="42" stroke="#11172A" strokeWidth="6" fill="transparent" />
                                          <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="42" 
                                            stroke="#14B8A6" 
                                            strokeWidth="7" 
                                            fill="transparent" 
                                            strokeDasharray="264"
                                            strokeDashoffset={264 - (264 * progA) / 100}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <span className="text-2xl font-black font-mono text-white tracking-tighter">{progA}%</span>
                                          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-widest mt-0.5">PROGRESS</span>
                                        </div>
                                      </div>
                                      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1.5 mt-2">
                                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                                        <span>{countdownA}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Stream A Card */}
                              <div className="bg-[#0D1222]/45 border border-teal-500/20 rounded-xl p-5 flex flex-col justify-between flex-1 min-h-[350px] shadow-lg relative">
                                <div>
                                  <div className="flex justify-between items-center border-b border-slate-950 pb-2.5 mb-3">
                                    <span className="text-[8.5px] font-mono text-teal-400 uppercase font-black tracking-wider block">
                                      🟢 STREAM A NEXT TASK
                                    </span>
                                    {parallelTaskA && (
                                      <span className="px-1.5 py-0.5 bg-rose-950/20 text-rose-400 border border-rose-900/30 rounded text-[7.5px] font-mono font-bold uppercase">
                                        {parallelTaskA.priority}
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-[10px] text-slate-450 font-mono block mb-1 uppercase font-bold">
                                    Parent: {parallelMissionA.title}
                                  </span>

                                  {parallelTaskA ? (
                                    <div className="space-y-3">
                                      <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                                        {parallelTaskA.name}
                                      </h3>
                                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-3">
                                        {parallelTaskA.description || "Core stream implementation workload."}
                                      </p>
                                      {parallelTaskA.reasoning && (
                                        <div className="p-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-[10px] text-slate-450 italic leading-relaxed">
                                          "{parallelTaskA.reasoning}"
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-12 text-center space-y-2 text-slate-500">
                                      <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                                      <p className="text-xs font-mono font-bold uppercase text-emerald-400">Stream Complete</p>
                                      <p className="text-[11px] font-sans">No remaining tasks here.</p>
                                    </div>
                                  )}
                                </div>

                                {parallelTaskA && (
                                  <div className="pt-3.5 border-t border-slate-950 space-y-2 mt-4">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => startFocusSession(parallelTaskA!)}
                                        className="flex-1 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-bold text-[10px] rounded-lg cursor-pointer transition select-none flex items-center justify-center gap-1"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5 fill-slate-950" />
                                        FOCUS
                                      </button>
                                      <button
                                        onClick={() => updateTaskStatus(parallelMissionA!.id, parallelTaskA!.id, 'completed', true)}
                                        className="py-2 px-3 bg-slate-900 hover:bg-slate-850 text-teal-455 border border-slate-850 rounded-lg font-bold text-[10px] transition cursor-pointer select-none flex items-center justify-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        COMPLETE
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => updateTaskStatus(parallelMissionA!.id, parallelTaskA!.id, 'skipped')}
                                      className="w-full py-1.5 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 border border-slate-855 rounded-lg font-mono text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 select-none"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      SKIP WORKLOAD ITEM
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Stream B Column */}
                            <div className="space-y-6 flex flex-col justify-between h-full">
                              {/* Stream B Metrics Shield */}
                              <div className="bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[240px] shadow-xl text-center relative group">
                                <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest block mb-4">
                                  🔵 STREAM B METRICS SHIELD
                                </span>
                                {(() => {
                                  const progB = Math.round((parallelMissionB!.tasks.filter(t => t.status === 'completed').length / parallelMissionB!.tasks.length) * 100) || 0;
                                  const diffMs = new Date(parallelMissionB!.deadline).getTime() - Date.now();
                                  const countdownB = diffMs <= 0 ? 'Deadline Reached' : (() => {
                                    const totalMin = Math.floor(diffMs / (1000 * 60));
                                    const hrs = Math.floor(totalMin / 60);
                                    const mins = totalMin % 60;
                                    return `${hrs}h ${mins}m left`;
                                  })();
                                  return (
                                    <div className="flex flex-col items-center space-y-3 w-full">
                                      <span className="text-[11px] font-mono text-sky-400 font-bold uppercase truncate max-w-[240px]" title={parallelMissionB!.title}>
                                        {parallelMissionB!.title}
                                      </span>
                                      <div className="relative w-32 h-32 flex items-center justify-center transform hover:scale-105 transition duration-300">
                                        <div className="absolute inset-0 bg-sky-500/5 rounded-full blur-xl animate-pulse" />
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                          <circle cx="50" cy="50" r="42" stroke="#11172A" strokeWidth="6" fill="transparent" />
                                          <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="42" 
                                            stroke="#38BDF8" 
                                            strokeWidth="7" 
                                            fill="transparent" 
                                            strokeDasharray="264"
                                            strokeDashoffset={264 - (264 * progB) / 100}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <span className="text-2xl font-black font-mono text-white tracking-tighter">{progB}%</span>
                                          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-widest mt-0.5">PROGRESS</span>
                                        </div>
                                      </div>
                                      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1.5 mt-2">
                                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                                        <span>{countdownB}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Stream B Card */}
                              <div className="bg-[#0D1222]/45 border border-sky-500/20 rounded-xl p-5 flex flex-col justify-between flex-1 min-h-[350px] shadow-lg relative">
                                <div>
                                  <div className="flex justify-between items-center border-b border-slate-950 pb-2.5 mb-3">
                                    <span className="text-[8.5px] font-mono text-sky-400 uppercase font-black tracking-wider block">
                                      🔵 STREAM B NEXT TASK
                                    </span>
                                    {parallelTaskB && (
                                      <span className="px-1.5 py-0.5 bg-rose-950/20 text-rose-400 border border-rose-900/30 rounded text-[7.5px] font-mono font-bold uppercase">
                                        {parallelTaskB.priority}
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-[10px] text-slate-450 font-mono block mb-1 uppercase font-bold">
                                    Parent: {parallelMissionB.title}
                                  </span>

                                  {parallelTaskB ? (
                                    <div className="space-y-3">
                                      <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                                        {parallelTaskB.name}
                                      </h3>
                                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-3">
                                        {parallelTaskB.description || "Core stream implementation workload."}
                                      </p>
                                      {parallelTaskB.reasoning && (
                                        <div className="p-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-[10px] text-slate-450 italic leading-relaxed">
                                          "{parallelTaskB.reasoning}"
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-12 text-center space-y-2 text-slate-500">
                                      <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                                      <p className="text-xs font-mono font-bold uppercase text-emerald-400">Stream Complete</p>
                                      <p className="text-[11px] font-sans">No remaining tasks here.</p>
                                    </div>
                                  )}
                                </div>

                                {parallelTaskB && (
                                  <div className="pt-3.5 border-t border-slate-950 space-y-2 mt-4">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => startFocusSession(parallelTaskB!)}
                                        className="flex-1 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-bold text-[10px] rounded-lg cursor-pointer transition select-none flex items-center justify-center gap-1"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5 fill-slate-950" />
                                        FOCUS
                                      </button>
                                      <button
                                        onClick={() => updateTaskStatus(parallelMissionB!.id, parallelTaskB!.id, 'completed', true)}
                                        className="py-2 px-3 bg-slate-900 hover:bg-slate-850 text-teal-455 border border-slate-855 rounded-lg font-bold text-[10px] transition cursor-pointer select-none flex items-center justify-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        COMPLETE
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => updateTaskStatus(parallelMissionB!.id, parallelTaskB!.id, 'skipped')}
                                      className="w-full py-1.5 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 border border-slate-855 rounded-lg font-mono text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 select-none"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      SKIP WORKLOAD ITEM
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                          {/* Left Column: Large Animated circular progress */}
                          <div className="md:col-span-5 bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[380px] h-full shadow-xl text-center relative group">
                            
                            <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest block mb-4">
                              COMPLETION FORCE FIELD
                            </span>
                            
                            <>
                              {/* Animated Progress Circle */}
                              <div className="relative w-48 h-48 flex items-center justify-center transform group-hover:scale-105 transition duration-500">
                                <div className="absolute inset-0 bg-teal-500/5 rounded-full blur-2xl animate-pulse" />
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  {/* Background arc */}
                                  <circle cx="50" cy="50" r="42" stroke="#11172A" strokeWidth="6" fill="transparent" />
                                  {/* Animated active arc */}
                                  <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="42" 
                                    stroke="#14B8A6" 
                                    strokeWidth="7" 
                                    fill="transparent" 
                                    strokeDasharray="264"
                                    strokeDashoffset={264 - (264 * activeProgress) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-4xl font-black font-mono text-white tracking-tighter">{activeProgress}%</span>
                                  <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest mt-1">CAPACITY INDEX</span>
                                </div>
                              </div>

                              {/* Countdown timer under progress */}
                              <div className="mt-4 space-y-1">
                                <div className="text-xs font-mono font-bold text-slate-400 flex items-center justify-center gap-1.5 uppercase">
                                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                                  <span>{getCountdownString() || "0h 0m left"}</span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-mono">Today's Remaining Working Hours limit: 4.5 hrs</span>
                              </div>
                            </>

                          </div>

                          {/* Right Column: Giant "Next Task" card */}
                          <div className="md:col-span-7 bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between min-h-[380px] shadow-xl relative">
                            <div>
                              <div className="flex justify-between items-center border-b border-slate-950 pb-3 mb-4">
                                <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                                  DIRECT ACTION DIRECTIVE
                                </span>
                                {doNowTask && (
                                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase ${
                                    doNowTask.priority === 'high' ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30' : 'bg-slate-900 text-slate-500'
                                  }`}>
                                    {doNowTask.priority} priority
                                  </span>
                                )}
                              </div>

                              {doNowTask ? (
                                <div className="space-y-4">
                                  <h2 className="text-lg font-bold text-white leading-snug tracking-tight font-sans">
                                    {doNowTask.name}
                                  </h2>
                                  <p className="text-xs text-slate-350 leading-relaxed max-w-xl font-sans">
                                    {doNowTask.description || "Core study implementation block. Start Zen Deep Work Overlay to bypass anxiety."}
                                  </p>
                                  
                                  {doNowTask.reasoning && (
                                    <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl text-[11px] text-slate-450 italic leading-relaxed">
                                      " {doNowTask.reasoning} "
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-12 text-center space-y-3">
                                  <Award className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Everything is finished.</h3>
                                  <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
                                    All study items completed. Enjoy your free time.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Start/Complete buttons */}
                            {doNowTask && (
                              <div className="pt-4 border-t border-slate-950 space-y-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button
                                    onClick={() => startFocusSession(doNowTask)}
                                    className="flex-grow py-3 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 cursor-pointer transition flex items-center justify-center gap-1.5 select-none"
                                  >
                                    <PlayCircle className="w-4 h-4 fill-slate-950" />
                                    LAUNCH ZEN FOCUS
                                  </button>
                                  <button
                                    onClick={() => updateTaskStatus(activeMission.id, doNowTask.id, 'completed')}
                                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-850 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 select-none"
                                  >
                                    <Check className="w-4 h-4" />
                                    MARK COMPLETE
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                  <button
                                    onClick={() => updateTaskStatus(activeMission.id, doNowTask.id, 'skipped')}
                                    className="w-full py-2.5 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 border border-slate-850 hover:border-slate-700 rounded-xl font-mono text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 select-none"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    SKIP
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI One-Sentence recommendation card (Requested Item!) */}
                      <div className="bg-[#0E162D] border border-[#1E2E5D]/40 rounded-2xl p-4 flex items-center gap-3 shadow-md">
                        <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
                        <span className="text-xs font-medium text-teal-100 font-sans leading-relaxed">
                          {getAIRecommendationText()}
                        </span>
                      </div>

                      {/* Bottom progress strip: Completed / Remaining / Estimated Finish Time (Requested Item!) */}
                      {isParallelMode && parallelMissionA && parallelMissionB ? (
                        <div className="p-4 bg-[#0D1222]/30 border border-slate-900 rounded-2xl shadow-md space-y-4">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                            <span>COMPLETED STRIPS (CONCURRENT)</span>
                            <span>ESTIMATED END-TIMES</span>
                          </div>
                          
                          {/* Stream A Progress Strip */}
                          {(() => {
                            const progA = calculateMissionProgress(parallelMissionA);
                            const incompleteA = parallelMissionA!.tasks.filter(t => t.status === 'todo');
                            const totalRemA = incompleteA.reduce((sum, t) => sum + t.durationMinutes, 0);
                            const tzName = tzMap[userSettings.timezone] || 'UTC';
                            let finishA = '';
                            try {
                              finishA = new Date(Date.now() + totalRemA * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tzName });
                            } catch (e) {
                              finishA = new Date(Date.now() + totalRemA * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono font-semibold text-teal-400">
                                  <span>🟢 STREAM A: {parallelMissionA!.title}</span>
                                  <span>{progA}%</span>
                                </div>
                                <div className="w-full bg-slate-950 border border-slate-900 h-4 rounded-lg overflow-hidden flex relative">
                                  <div 
                                    className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
                                    style={{ width: `${progA}%` }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-between px-3 text-[8.5px] font-mono font-black text-white mix-blend-difference select-none">
                                    <span>{progA}% COMPLETED</span>
                                    <span>{incompleteA.length > 0 ? `EXPECTED FINISH AT ${finishA}` : 'ALL COMPLETED'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Stream B Progress Strip */}
                          {(() => {
                            const progB = calculateMissionProgress(parallelMissionB);
                            const incompleteB = parallelMissionB!.tasks.filter(t => t.status === 'todo');
                            const totalRemB = incompleteB.reduce((sum, t) => sum + t.durationMinutes, 0);
                            const tzName = tzMap[userSettings.timezone] || 'UTC';
                            let finishB = '';
                            try {
                              finishB = new Date(Date.now() + totalRemB * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tzName });
                            } catch (e) {
                              finishB = new Date(Date.now() + totalRemB * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono font-semibold text-sky-400">
                                  <span>🔵 STREAM B: {parallelMissionB!.title}</span>
                                  <span>{progB}%</span>
                                </div>
                                <div className="w-full bg-slate-950 border border-slate-900 h-4 rounded-lg overflow-hidden flex relative">
                                  <div 
                                    className="bg-gradient-to-r from-sky-500 to-sky-400 h-full transition-all duration-500"
                                    style={{ width: `${progB}%` }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-between px-3 text-[8.5px] font-mono font-black text-white mix-blend-difference select-none">
                                    <span>{progB}% COMPLETED</span>
                                    <span>{incompleteB.length > 0 ? `EXPECTED FINISH AT ${finishB}` : 'ALL COMPLETED'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="p-4 bg-[#0D1222]/30 border border-slate-900 rounded-2xl shadow-md space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                            <span>COMPLETED STRIP</span>
                            <span>ESTIMATED END-TIME</span>
                          </div>
                          <div className="w-full bg-slate-950 border border-slate-900 h-4 rounded-lg overflow-hidden flex relative">
                            <div 
                              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
                              style={{ width: `${activeProgress}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3 text-[8.5px] font-mono font-black text-white mix-blend-difference select-none">
                              <span>{activeProgress}% COMPLETED</span>
                              <span>{getEstimatedFinishTime() ? `EXPECTED FINISH AT ${getEstimatedFinishTime()}` : 'ALL COMPLETED'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Integrated visual charts instead of paragraphs */}
                      <div className="pt-4 border-t border-slate-950 space-y-4">
                        <div className="flex justify-between items-center pb-2">
                          <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest">VISUAL METRIC CONTROL</h3>
                        </div>
                        <VisualAnalyticsView 
                          activeMission={activeMission} 
                          missions={missions} 
                          onStartFocusSession={startFocusSession}
                          onFetchTaskStrategy={fetchTaskStrategy}
                        />
                      </div>

                    </div>
                  )}

                </motion.div>
              )}

              {/* PRIORITY CONTROL LIST (Grouped by Mission with Collapsible panels!) */}
              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto w-full space-y-6"
                >
                  {/* Stats Row at the top (Requested Item!) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-4 text-center">
                      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black">TOTAL MISSIONS</span>
                      <span className="text-lg font-mono font-black text-white">{totalMissionsCount}</span>
                    </div>
                    <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-4 text-center">
                      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black">TOTAL TASKS</span>
                      <span className="text-lg font-mono font-black text-white">{totalTasksCount}</span>
                    </div>
                    <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-4 text-center">
                      <span className="block text-[8px] font-mono text-rose-400 uppercase tracking-widest font-black">RISK OVERDUE</span>
                      <span className="text-lg font-mono font-black text-rose-400">{overdueTasksCount}</span>
                    </div>
                    <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-4 text-center">
                      <span className="block text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-black">COMPLETED TODAY</span>
                      <span className="text-lg font-mono font-black text-emerald-400">{completedTodayCount}</span>
                    </div>
                  </div>

                  {/* If selecting detail */}
                  {selectedTaskId ? (() => {
                    // Find the task and its parent mission across all missions
                    let taskParentMission: Mission | null = null;
                    let task: Task | null = null;
                    for (const m of missions) {
                      const t = m.tasks.find(tk => tk.id === selectedTaskId);
                      if (t) {
                        taskParentMission = m;
                        task = t;
                        break;
                      }
                    }
                    if (!task || !taskParentMission) return null;

                    return (
                      <div className="space-y-6 animate-fade-in bg-[#0D1222]/20 border border-slate-900 p-6 rounded-2xl shadow-xl">
                        {/* Back button */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-950">
                          <button
                            onClick={() => {
                              setSelectedTaskId(null);
                              setTaskStrategyText('');
                            }}
                            className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition cursor-pointer select-none px-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl"
                          >
                            <ArrowLeft className="w-4 h-4 text-teal-400" />
                            BACK TO PRIORITY GRID
                          </button>
                        </div>

                        {/* Main Header / Title */}
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                              task.priority === 'high' 
                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                                : 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                            }`}>
                              {task.priority} Priority
                            </span>
                          </div>
                          <h1 className="text-lg font-bold text-white tracking-tight leading-normal font-sans">
                            {task.name}
                          </h1>
                          <p className="text-xs text-slate-350 leading-relaxed font-sans">
                            {task.description || "No deep description entered."}
                          </p>
                        </div>

                        {/* Info cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-[#0D1222] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between">
                            <span className="block text-[8px] font-mono text-slate-500 uppercase font-black">ESTIMATED STUDY TIME</span>
                            <div className="text-xl font-black font-mono text-teal-400">{task.durationMinutes} min</div>
                          </div>
                          <div className="bg-[#0D1222] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between">
                            <span className="block text-[8px] font-mono text-slate-500 uppercase font-black">TIMESLOT TARGET</span>
                            <div className="text-xs font-bold font-mono text-slate-200 uppercase truncate">
                              {task.scheduledTime || "Flexible Window"}
                            </div>
                          </div>
                        </div>

                        {/* AI coach strategy detailed guide */}
                        <div className="bg-[#0E152B] border border-[#1C2C57] rounded-2xl p-6 shadow-xl space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-[#1C2C57]/45">
                            <div className="flex items-center gap-2 text-teal-400">
                              <Sparkles className="w-5 h-5 animate-pulse" />
                              <span className="text-xs font-bold uppercase font-mono tracking-wider">AI Strategist: Implementation Guide</span>
                            </div>
                            {taskStrategyText && !taskStrategyLoading && (
                              <button
                                  onClick={() => fetchTaskStrategy(task!)}
                                className="text-[10px] font-mono text-slate-400 hover:text-teal-300 flex items-center gap-1.5 transition cursor-pointer select-none"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> RE-CALCULATE
                              </button>
                            )}
                          </div>

                          {taskStrategyLoading ? (
                            <div className="py-8 text-center space-y-4">
                              <div className="inline-block w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                              <p className="text-xs text-slate-450 font-mono animate-pulse">
                                Creating specialized stress-free tactical checklist...
                              </p>
                            </div>
                          ) : taskStrategyText ? (
                            <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans space-y-4">
                              {taskStrategyText}
                            </div>
                          ) : (
                            <div className="py-6 text-center space-y-3">
                              <p className="text-xs text-slate-450 leading-relaxed font-sans max-w-sm mx-auto">
                                Fetch a dynamic cognitive study blueprint optimal for this specific item.
                              </p>
                              <button
                                  onClick={() => fetchTaskStrategy(task!)}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-mono font-bold rounded-xl transition cursor-pointer select-none"
                              >
                                GET COGNITIVE PLAN
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Launcher */}
                        <div className="bg-[#0D1222] border border-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-5">
                          <p className="text-xs text-slate-440 max-w-md">
                            Lock out distraction and execute deep study overlay with calming respiration assistance.
                          </p>
                          <button
                            onClick={() => startFocusSession(task!)}
                            className="px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition select-none flex items-center gap-1.5"
                          >
                            <PlayCircle className="w-4 h-4 fill-slate-950" /> LAUNCH DEEP WORK
                          </button>
                        </div>

                        {/* Status Controls */}
                        <div className="bg-[#0D1222] border border-slate-900 rounded-2xl p-6 space-y-4">
                          <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black">CALIBRATE TASK STATUS</span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            <button
                              onClick={() => {
                                updateTaskStatus(taskParentMission.id, task!.id, 'completed');
                                setSelectedTaskId(null);
                              }}
                              className={`py-2.5 rounded-xl text-[10px] font-mono font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                                  : 'bg-slate-950 border-slate-900 text-emerald-400 hover:border-emerald-500/30'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              COMPLETE
                            </button>
                            
                            <button
                              onClick={() => {
                                updateTaskStatus(taskParentMission.id, task!.id, 'todo');
                                setSelectedTaskId(null);
                              }}
                              className={`py-2.5 rounded-xl text-[10px] font-mono font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                task.status === 'todo'
                                  ? 'bg-teal-500 border-teal-500 text-slate-950'
                                  : 'bg-slate-950 border-slate-900 text-teal-400 hover:border-teal-500/30'
                              }`}
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                              TO-DO
                            </button>

                            <button
                              onClick={() => {
                                updateTaskStatus(taskParentMission.id, task!.id, 'delayed');
                                setSelectedTaskId(null);
                              }}
                              className={`py-2.5 rounded-xl text-[10px] font-mono font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                task.status === 'delayed'
                                  ? 'bg-amber-500 border-amber-500 text-slate-950'
                                  : 'bg-slate-950 border-slate-900 text-amber-400 hover:border-amber-500/30'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              DELAYED
                            </button>

                            <button
                              onClick={() => {
                                updateTaskStatus(taskParentMission.id, task!.id, 'missed');
                                setSelectedTaskId(null);
                              }}
                              className={`py-2.5 rounded-xl text-[10px] font-mono font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                task.status === 'missed'
                                  ? 'bg-rose-500 border-rose-500 text-slate-950'
                                  : 'bg-slate-950 border-slate-900 text-rose-400 hover:border-rose-500/30'
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              MISSED
                            </button>

                            <button
                              onClick={() => {
                                updateTaskStatus(taskParentMission.id, task!.id, 'skipped');
                                setSelectedTaskId(null);
                              }}
                              className={`py-2.5 rounded-xl text-[10px] font-mono font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 select-none col-span-2 sm:col-span-1 ${
                                task.status === 'skipped'
                                  ? 'bg-slate-700 border-slate-700 text-white'
                                  : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              SKIP
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="space-y-6">
                      
                      {/* Priority List Header */}
                      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-900">
                        <div className="space-y-1">
                          <h1 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1.5">
                            <ListTodo className="w-4 h-4 text-teal-400" />
                            ORGANIZATION SCHEDULER
                          </h1>
                          <p className="text-xs text-slate-450">Grouped by active missions. Expand or collapse to filter load.</p>
                        </div>
                      </div>

                      {/* Main Grouped List */}
                      <div className="space-y-4">
                        {missions
                          .filter((mission) => mission.status === 'active') // automatically delete/hide completed or expired missions from priority list
                          .sort((a, b) => {
                            const pWeights = { high: 3, medium: 2, low: 1 };
                            const pA = pWeights[a.priority || 'medium'] || 2;
                            const pB = pWeights[b.priority || 'medium'] || 2;
                            if (pA !== pB) return pB - pA; // High priority first
                            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Then earliest deadline first
                          })
                          .map((mission) => {
                            const isExpanded = expandedMissions[mission.id] ?? true;
                            const activeTasks = mission.tasks
                              .filter((task) => task.status !== 'completed' && task.status !== 'skipped' && task.status !== 'missed') // automatically delete/hide completed, skipped, missed tasks from priority list
                              .sort((a, b) => {
                                const pWeights = { high: 3, medium: 2, low: 1 };
                                const pA = pWeights[a.priority] || 2;
                                const pB = pWeights[b.priority] || 2;
                                if (pA !== pB) return pB - pA; // High priority first
                                return a.order - b.order;      // Then original order
                              });
                            return (
                              <div key={mission.id} className="bg-[#0D1222]/30 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
                                
                                {/* Group Header / Mission bar (Collapsible!) (Requested Item!) */}
                                <div 
                                  onClick={() => toggleMissionExpanded(mission.id)}
                                  className="p-4 bg-[#0D1222] border-b border-slate-950 hover:bg-[#12182B] transition-all cursor-pointer flex justify-between items-center select-none"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Folder className="w-4 h-4 text-teal-400" />
                                    <div>
                                      <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">{mission.title || mission.goal}</h3>
                                      <span className="text-[9px] font-mono text-slate-500 uppercase block mt-0.5">Deadline: {formatSafeDate(mission.deadline)}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase">{activeTasks.length} TASKS</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                  </div>
                                </div>

                                {/* Task List (Animate collapse) */}
                                {isExpanded && (
                                  <div className="p-4 space-y-4 bg-[#090C15]/20 animate-slide-down">
                                    {activeTasks.length === 0 ? (
                                      <p className="text-xs text-slate-500 font-mono text-center py-2">No incomplete tasks in this stream</p>
                                    ) : (
                                      <>
                                        {(showAllTasks[mission.id] ? activeTasks : activeTasks.slice(0, 3)).map((task) => {
                                          const isCompleted = task.status === 'completed';
                                          const isSkipped = task.status === 'skipped';
                                          const isMissed = task.status === 'missed';
                                          const isDelayed = task.status === 'delayed';
                                          const isTaskExpanded = expandedTasks[task.id] ?? false;
                                          return (
                                            <div
                                              key={task.id}
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
                                                      updateTaskStatus(mission.id, task.id, nextS);
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
                                                        startFocusSession(task);
                                                      }}
                                                      title="Launch Zen Focus"
                                                      className="p-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 hover:border-teal-400 rounded-lg transition cursor-pointer flex items-center justify-center select-none"
                                                    >
                                                      <PlayCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateTaskStatus(mission.id, task.id, 'skipped');
                                                      }}
                                                      title="Skip Task"
                                                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-850 hover:border-slate-700 rounded-lg transition cursor-pointer flex items-center justify-center select-none"
                                                    >
                                                      <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateTaskStatus(mission.id, task.id, 'delayed');
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
                                                    <div>
                                                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Description</span>
                                                      <p className="text-slate-350 leading-relaxed font-sans text-xs">
                                                        {task.description || "No description provided."}
                                                      </p>
                                                    </div>

                                                    {task.reasoning && (
                                                      <div className="bg-[#0E152B]/40 border border-[#1C2C57]/45 p-3 rounded-xl">
                                                        <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider block mb-1">🤖 AI reasoning</span>
                                                        <p className="text-slate-400 italic leading-relaxed text-[11px] font-sans">
                                                          " {task.reasoning} "
                                                        </p>
                                                      </div>
                                                    )}

                                                    <div className="flex justify-end pt-1">
                                                      <button
                                                        onClick={() => {
                                                          setSelectedTaskId(task.id);
                                                          fetchTaskStrategy(task);
                                                        }}
                                                        className="text-[10px] font-mono font-bold text-teal-400 hover:text-teal-300 transition flex items-center gap-1 bg-teal-500/5 hover:bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/15"
                                                      >
                                                        Open Full AI Strategy <ChevronRight className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                          );
                                        })}

                                        {/* View All Tasks Button */}
                                        {activeTasks.length > 3 && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowAllTasks(prev => ({ ...prev, [mission.id]: !prev[mission.id] }));
                                            }}
                                            className="w-full mt-3 py-2.5 text-center text-xs font-mono font-bold text-teal-400 hover:text-teal-300 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 select-none"
                                          >
                                            {showAllTasks[mission.id] ? (
                                              <>Show Fewer Tasks <ChevronUp className="w-3.5 h-3.5" /></>
                                            ) : (
                                              <>View All Tasks ({activeTasks.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}

                            </div>
                          );
                        })}

                        {missions.length === 0 && (
                          <div className="py-12 text-center text-slate-500 italic bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
                            All quiet on the scheduling front. Formulate your first stream above.
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </motion.div>
              )}

              {/* CHAT GPT-STYLE AI STRATEGIST */}
              {activeTab === 'strategist' && (
                <motion.div
                  key="strategist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-6xl mx-auto w-full px-2"
                >
                  <AIStrategistView 
                    chatHistory={chatHistory}
                    chatLoading={chatLoading}
                    onSendMessage={submitChatMessage}
                    activeMission={activeMission}
                    user={user}
                  />
                </motion.div>
              )}

               {/* STREAMS MANAGER TAB */}
              {activeTab === 'streams' && (
                <motion.div
                  key="streams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-6xl mx-auto w-full"
                >
                  <MissionsManagerView 
                    missions={missions}
                    activeMissionId={activeMissionId}
                    setActiveMissionId={setActiveMissionId}
                    deleteMission={deleteMission}
                    setIsCreatingNewMission={setIsCreatingNewMission}
                    setActiveTab={setActiveTab}
                  />
                </motion.div>
              )}

              {/* CALENDAR FLOW TIMELINE TAB */}
              {activeTab === 'calendar' && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-5xl mx-auto w-full"
                >
                  <CalendarFlowView 
                    activeMission={activeMission}
                    onUpdateTask={updateTask}
                  />
                </motion.div>
              )}

              {/* AGENT SYNDICATE CENTER AND DECISION LOG */}
              {activeTab === 'agents' && activeMission && (
                <motion.div
                  key="agents"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-5xl mx-auto w-full"
                >
                  <AgentCenterView mission={activeMission} />
                </motion.div>
              )}

              {/* SYSTEM CALIBRATION SETTINGS */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto w-full space-y-6"
                >
                  <div className="pb-4 border-b border-slate-950">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4 text-teal-400" />
                      OS Console Calibration
                    </h2>
                    <p className="text-xs text-slate-450 mt-0.5">Calibrate AI strategist planning styles, notifications, and export backups.</p>
                  </div>

                  <SettingsView user={user} />

                  {/* Purge portal zone */}
                  <div className="p-6 bg-[#160E12] border border-rose-950 rounded-2xl space-y-4 shadow-xl">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">⚠️ EMERGENCY RESET OVERRIDE</h4>
                      <p className="text-xs text-rose-200/80 leading-relaxed">
                        This action will immediately wipe the active focus plan and clear corresponding Cloud backups. This is irreversible.
                      </p>
                    </div>
                    {activeMission ? (
                      <button
                        onClick={() => setShowPurgeConfirm(true)}
                        className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500 text-rose-300 text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        WIPE ACTIVE WORKSTREAM
                      </button>
                    ) : (
                      <p className="text-[11px] font-mono text-slate-500 italic">No active stream configured for purge.</p>
                    )}
                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>
        )}

      </main>

      {/* ZEN FOCUS MODE OVERLAY TIMER */}
      <AnimatePresence>
        {activeFocusTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#06080F]/98 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6"
          >


            <div className="max-w-md w-full text-center space-y-10 animate-fade-in">
              
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-teal-400 tracking-widest font-bold uppercase block">⚡ ZEN DEEP WORK IMMERSION</span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug">{activeFocusTask.name}</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">{activeFocusTask.description}</p>
              </div>

              {/* Circular Ticking Clock */}
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 bg-teal-500/5 rounded-full blur-2xl animate-pulse" />
                <div className="w-48 h-48 rounded-full border border-slate-800 bg-[#0E1324]/50 flex flex-col items-center justify-center relative shadow-2xl">
                  {focusRunning && (
                    <div className="absolute inset-[-4px] border-t-2 border-teal-500 border-r-2 border-transparent rounded-full animate-spin duration-3000" />
                  )}
                  <span className="text-4xl font-black font-mono text-white tracking-tighter">
                    {formatFocusTimer()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider font-bold mt-1 uppercase">
                    {focusRunning ? "FOCUSING" : "PAUSED"}
                  </span>
                </div>
              </div>

              {/* Respiration assisting card */}
              <div className="p-4 bg-[#0A0D18] border border-slate-900 rounded-xl space-y-2 max-w-xs mx-auto">
                <div className="flex justify-center items-center gap-1.5 text-xs text-teal-400 font-bold">
                  <Heart className="w-4 h-4 animate-pulse fill-teal-400/20" />
                  <span>Calm Breathing Cycles</span>
                </div>
                <p className="text-[10.5px] text-slate-450 leading-normal">
                  Inhale as the visual ring expands. Exhale calmly. You have completely got this covered.
                </p>
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setFocusRunning(!focusRunning)}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer h-12"
                >
                  {focusRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-white" /> PAUSE
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" /> RESUME
                    </>
                  )}
                </button>
                <button
                  onClick={completeFocusTask}
                  className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-mono text-xs font-extrabold rounded-xl shadow-lg shadow-teal-500/10 transition flex items-center gap-1.5 cursor-pointer h-12 select-none"
                >
                  <CheckCircle className="w-4 h-4 fill-slate-950" /> COMPLETE
                </button>
              </div>

              <button
                onClick={() => setShowAbandonConfirm(true)}
                className="text-xs font-mono text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer block mx-auto"
              >
                ABANDON FOCUS OVERLAY
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM PURGE CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showPurgeConfirm && activeMission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0E0B0C] border border-rose-900/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-rose-950">
                <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-xs font-bold font-mono text-rose-400 uppercase tracking-widest">
                  EMERGENCY SYSTEM RESET
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  You are about to initiate an override reset on the active stream:
                </p>
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                  <span className="text-sm font-extrabold text-rose-300 font-mono block">
                    {activeMission.title || activeMission.goal}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans">
                  This will immediately wipe all milestones, priority queues, performance diagnostics, and corresponding cloud database entries. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2 font-mono">
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold uppercase rounded-xl transition hover:border-slate-700 cursor-pointer text-center"
                >
                  ABORT RESET SEQUENCE
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowPurgeConfirm(false);
                    await deleteMission(activeMission.id);
                  }}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-[10px] uppercase rounded-xl shadow-lg shadow-rose-500/10 transition cursor-pointer text-center"
                >
                  CONFIRM ENTIRE PURGE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM ABANDON TIMER CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showAbandonConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0E0F0B] border border-amber-900/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-amber-950">
                <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">
                  ABANDON ACTIVE SESSION
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Abandoning this active focus session will forfeit your active stopwatch progress and exit the zen-mode interface immediately.
                </p>
                <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans">
                  This task state will be restored back to "Todo" in the matrix. Your time spent in this session will not be saved.
                </p>
              </div>

              <div className="flex gap-3 pt-2 font-mono">
                <button
                  type="button"
                  onClick={() => setShowAbandonConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold uppercase rounded-xl transition hover:border-slate-700 cursor-pointer text-center"
                >
                  RETURN TO TIMELINE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAbandonConfirm(false);
                    setActiveFocusTask(null);
                    setFocusRunning(false);
                  }}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer text-center"
                >
                  CONFIRM ABANDON
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
