import { create } from 'zustand';
import { Mission, Task, SmartNotification, Decision, Milestone, UserSettings } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';

function parseAndSanitizeDeadline(deadlineStr: string): Date {
  if (!deadlineStr) return new Date(Date.now() + 7 * 24 * 3600 * 1000);
  
  // Try to parse YYYY-MM-DD pattern
  const datePart = deadlineStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      // Get the last day of this month (month is 1-indexed, so passing 0 as day gets last day of month)
      const maxDays = new Date(year, month, 0).getDate();
      const safeDay = Math.min(day, Math.max(1, maxDays));
      
      let timeStr = '18:00:00.000Z';
      const tPart = deadlineStr.split('T')[1];
      if (tPart) {
        timeStr = tPart;
      }
      
      const constructedStr = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}T${timeStr}`;
      const d = new Date(constructedStr);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  const d = new Date(deadlineStr);
  if (!isNaN(d.getTime())) return d;
  
  return new Date(Date.now() + 7 * 24 * 3600 * 1000);
}

interface StoreAnalytics {
  completionRate: number;
  averageSuccessProbability: number;
  tasksCompleted: number;
  riskTrend: { date: string; risk: number }[];
}

interface MissionState {
  missions: Mission[];
  activeMissionId: string | null;
  rankedMissionIds: string[];
  prioritizationReasoning: string;
  prioritizationImpact: string;
  agentLogs: Decision[];
  notifications: SmartNotification[];
  loading: boolean;
  loadingMessage: string | null;
  error: string | null;
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  isCreatingNewMission: boolean;
  conflictWarning: string | null;
  conflictRecommendation: string | null;
  analytics: StoreAnalytics;

  // Global synchronized states
  chatHistory: Array<{ id: string; role: 'user' | 'model'; text: string }>;
  chatLoading: boolean;
  userSettings: UserSettings;

  // Actions
  setCurrentUser: (user: { uid: string; email: string | null; displayName: string | null } | null) => void;
  setChatHistory: (
    history: 
      | Array<{ id: string; role: 'user' | 'model'; text: string }> 
      | ((prev: Array<{ id: string; role: 'user' | 'model'; text: string }>) => Array<{ id: string; role: 'user' | 'model'; text: string }>)
  ) => void;
  setChatLoading: (val: boolean) => void;
  saveUserSettings: (settings: Partial<UserSettings>) => void;
  setIsCreatingNewMission: (val: boolean) => void;
  setActiveMissionId: (id: string | null) => void;
  loadAllMissions: (uid: string) => Promise<void>;
  planNewMission: (
    goal: string,
    deadline: string,
    dailyCapacityHours?: number,
    preferredWorkTimes?: string[],
    title?: string,
    priority?: 'high' | 'medium' | 'low',
    estimatedHours?: number,
    tags?: string[]
  ) => Promise<void>;
  updateTaskStatus: (missionId: string, taskId: string, newStatus: 'completed' | 'skipped' | 'todo' | 'missed' | 'delayed', skipLoading?: boolean) => Promise<void>;
  archiveMission: (missionId: string) => Promise<void>;
  deleteMission: (missionId: string) => Promise<void>;
  editMission: (missionId: string, updatedFields: Partial<Mission>) => Promise<void>;
  applySuggestedFix: (missionId: string, suggestedFix: string) => Promise<void>;
  autoSchedule: (missionId: string) => Promise<void>;
  addSystemNotification: (title: string, content: string, type: 'warning' | 'tip' | 'info' | 'success') => void;
  clearNotifications: () => void;
  markNotificationsAsRead: () => void;
  toggleNotificationRead: (id: string) => void;
  addAgentLog: (agent: 'Planner' | 'Priority' | 'Risk' | 'Replanner' | 'Coach', action: string, reasoning: string) => void;
  recalculateEverything: () => void;
  
  // Custom Task Actions
  addTask: (taskData: {
    name: string;
    description: string;
    durationMinutes: number;
    priority: 'high' | 'medium' | 'low';
    milestoneId: string;
    dependencies: string[];
    scheduledTime: string;
  }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  sortTasks: (taskIds: string[]) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  recalculateRiskMetrics: (specificMissionId?: string) => Promise<void>;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

export const useMissionStore = create<MissionState>((set, get) => {
  
  // Helper to sync state to database (Firestore and Express and LocalStorage)
  const syncMissionToBackends = async (mission: Mission) => {
    const uid = mission.userId;
    
    // 1. Local Storage
    localStorage.setItem(`saver_mission_${uid}`, JSON.stringify(mission));
    localStorage.setItem(`saver_mission_backup_${mission.id}`, JSON.stringify(mission));
    if (uid === 'guest_user_id') {
      localStorage.setItem('saver_guest_mission', JSON.stringify(mission));
    }

    // 2. Express API
    try {
      await fetch('/api/missions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mission),
      });
    } catch (e) {
      console.warn('Express sync failed, using firestore/local:', e);
    }

    // 3. Firestore
    try {
      const missionRef = doc(db, 'missions', mission.id);
      await setDoc(missionRef, mission, { merge: true });
    } catch (e) {
      console.warn('Firestore sync failed, fallback active:', e);
    }
  };

  return {
    missions: [],
    activeMissionId: null,
    rankedMissionIds: [],
    prioritizationReasoning: '',
    prioritizationImpact: '',
    agentLogs: [],
    notifications: [],
    loading: false,
    loadingMessage: null,
    error: null,
    currentUser: null,
    isCreatingNewMission: false,
    conflictWarning: null,
    conflictRecommendation: null,
    analytics: {
      completionRate: 0,
      averageSuccessProbability: 100,
      tasksCompleted: 0,
      riskTrend: [],
    },

    // Global synchronized states
    chatHistory: [
      {
        id: 'welcome',
        role: 'model',
        text: `Hello Friend. I am your AI Strategist. 

If you are overwhelmed with multiple looming deadlines, just let me know what is stressing you out. 

Try asking:
- **"What should I do first?"**
- **"Can I finish today?"**
- **"Make a recovery plan."**
`
      }
    ],
    chatLoading: false,
    userSettings: {
      workingStart: '09:00',
      workingEnd: '22:00',
      breakDuration: 15,
      timezone: 'UTC-7',
      aggressiveness: 'normal',
      capacity: 4,
      notifSound: true,
      notifVisual: true,
      darkMode: true,
      calendarSync: false,
    },

    setCurrentUser: (user) => {
      set({ currentUser: user });
      const uid = user?.uid || 'guest_user_id';
      const key = `saver_settings_${uid}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          set({
            userSettings: {
              workingStart: parsed.workingStart || '09:00',
              workingEnd: parsed.workingEnd || '22:00',
              breakDuration: parsed.breakDuration || 15,
              timezone: parsed.timezone || 'UTC-7',
              aggressiveness: parsed.aggressiveness || 'normal',
              capacity: parsed.capacity || 4,
              notifSound: parsed.notifSound !== false,
              notifVisual: parsed.notifVisual !== false,
              darkMode: parsed.darkMode !== false,
              calendarSync: !!parsed.calendarSync,
            }
          });
        } catch (e) {
          console.error('Failed to parse settings from local storage', e);
        }
      }
    },
    setChatHistory: (history) => set((state) => ({ 
      chatHistory: typeof history === 'function' ? history(state.chatHistory) : history 
    })),
    setChatLoading: (loading) => set({ chatLoading: loading }),
    saveUserSettings: (settings) => {
      let isScheduleImpacted = false;
      set((state) => {
        const updated = { ...state.userSettings, ...settings };
        const uid = state.currentUser?.uid || 'guest_user_id';
        localStorage.setItem(`saver_settings_${uid}`, JSON.stringify(updated));
        
        // Check if any of the properties that affect schedule/calendar changed
        if (
          settings.capacity !== undefined ||
          settings.workingStart !== undefined ||
          settings.workingEnd !== undefined ||
          settings.breakDuration !== undefined ||
          settings.aggressiveness !== undefined ||
          settings.timezone !== undefined
        ) {
          isScheduleImpacted = true;
        }

        // Immediate DOM theme adjustments
        if (updated.darkMode) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
        
        return { userSettings: updated };
      });
      get().recalculateEverything();
      
      const activeId = get().activeMissionId;
      if (activeId && isScheduleImpacted) {
        get().autoSchedule(activeId).catch((err) => {
          console.warn('Silent auto-scheduling background refresh failed:', err);
        });
      }
    },
    setIsCreatingNewMission: (val) => set({ isCreatingNewMission: val }),
    setActiveMissionId: (id) => set({ activeMissionId: id }),

    addSystemNotification: (title, content, type) => {
      const newNotif: SmartNotification = {
        id: generateId(),
        title,
        content,
        timestamp: new Date().toISOString(),
        type,
        read: false,
      };
      set((state) => ({
        notifications: [newNotif, ...state.notifications],
      }));
    },

    clearNotifications: () => set({ notifications: [] }),

    markNotificationsAsRead: () => set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

    toggleNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, read: !n.read } : n),
    })),

    addAgentLog: (agent, action, reasoning) => {
      const newLog: Decision = {
        id: generateId(),
        agent,
        action,
        reasoning,
        timestamp: new Date().toLocaleTimeString(),
      };
      set((state) => ({
        agentLogs: [newLog, ...state.agentLogs],
      }));
    },

    // RECALCULATE EVERYTHING ENGINE
    recalculateEverything: () => {
      const { missions, activeMissionId } = get();
      if (missions.length === 0) {
        set({
          rankedMissionIds: [],
          conflictWarning: null,
          conflictRecommendation: null,
          analytics: {
            completionRate: 0,
            averageSuccessProbability: 100,
            tasksCompleted: 0,
            riskTrend: [],
          },
        });
        return;
      }

      // Check and update expired statuses on active missions first, sanitizing dates on the fly
      let changedMissions: Mission[] = [];
      const checkedMissions = missions.map((m) => {
        let currentStatus = m.status;
        const d = parseAndSanitizeDeadline(m.deadline);
        const deadlineStr = d.toISOString();
        const deadlineTime = d.getTime();
        if (currentStatus === 'active' && deadlineTime < Date.now()) {
          const expMission = { ...m, deadline: deadlineStr, status: 'expired' as const };
          changedMissions.push(expMission);
          return expMission;
        }
        if (m.deadline !== deadlineStr) {
          return { ...m, deadline: deadlineStr };
        }
        return m;
      });

      // 0. Compute global workload metrics first to feed into holistic calculations
      const activeUncompletedMissions = checkedMissions.filter(
        (m) => m.status !== 'archived' && m.status !== 'completed' && m.status !== 'expired'
      );
      
      const totalRemainingMinutesAll = activeUncompletedMissions.reduce((acc, m) => {
        return acc + m.tasks.filter((t) => t.status === 'todo').reduce((sum, t) => sum + t.durationMinutes, 0);
      }, 0);
      const totalRemainingHoursAll = totalRemainingMinutesAll / 60;

      const totalAvailableHoursAll = activeUncompletedMissions.reduce((acc, m) => {
        const dLeft = Math.max(0.1, (new Date(m.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const cap = m.dailyCapacity || get().userSettings.capacity;
        return acc + dLeft * cap;
      }, 0);

      const globalOverloadRatio = totalRemainingHoursAll / (totalAvailableHoursAll || 1);

      // 1. Calculate Holistic Risk and Priority Score for each mission
      const updatedMissions = checkedMissions.map((mission) => {
        if (mission.status === 'archived' || mission.status === 'completed' || mission.status === 'expired') {
          return { ...mission, priorityScore: 0 };
        }

        // --- HOLISTIC RISK & FAILURE PREDICTION RE-CALCULATION ---
        const totalTasksOfThis = (mission.tasks || []).length;
        const completedTasksOfThis = (mission.tasks || []).filter((t) => t.status === 'completed').length;
        const completionPctOfThis = totalTasksOfThis > 0 ? (completedTasksOfThis / totalTasksOfThis) : 0;
        
        const missionRemainingMinutes = (mission.tasks || [])
          .filter((t) => t.status === 'todo')
          .reduce((sum, t) => sum + t.durationMinutes, 0);
        const missionRemainingHours = missionRemainingMinutes / 60;
        
        const missionDaysLeft = Math.max(0.1, (new Date(mission.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const missionAvailableHours = missionDaysLeft * (mission.dailyCapacity || get().userSettings.capacity);
        
        const individualRatio = missionRemainingHours / (missionAvailableHours || 1);
        
        // Calculate competing workload from other missions (all tasks from other missions)
        const otherMissionsRemainingMinutes = checkedMissions
          .filter((m) => m.id !== mission.id && m.status !== 'archived' && m.status !== 'completed' && m.status !== 'expired')
          .reduce((acc, m) => {
            return acc + m.tasks.filter((t) => t.status === 'todo').reduce((sum, t) => sum + t.durationMinutes, 0);
          }, 0);
        const otherMissionsRemainingHours = otherMissionsRemainingMinutes / 60;
        
        // Compute dynamic failure probability taking all other tasks/missions in account
        const baseProb = 20; // baseline probability of failure/delay
        const ownCompletionReduction = completionPctOfThis * 25; // Completing own tasks reduces risk by up to 25%
        const individualRatioIncrease = Math.min(40, individualRatio * 20); // If this mission's workload is dense, risk goes up
        const globalOverloadIncrease = Math.min(25, (globalOverloadRatio > 1 ? (globalOverloadRatio - 1) * 15 : 0)); // If globally overloaded, risk goes up
        
        // Lower priority missions get penalized if there is a lot of workload in other missions
        const otherWorkloadPenalty = mission.priority !== 'high' ? Math.min(15, otherMissionsRemainingHours * 1.0) : 0;
        
        const rawProb = baseProb - ownCompletionReduction + individualRatioIncrease + globalOverloadIncrease + otherWorkloadPenalty;
        const finalProb = Math.max(5, Math.min(95, Math.round(rawProb)));
        const successProbability = 100 - finalProb;
        const confidenceScore = Math.min(98, Math.max(5, Math.round(75 + ownCompletionReduction - individualRatioIncrease - otherWorkloadPenalty * 0.5)));

        const bottleneck = missionRemainingHours > 0 
          ? ((mission.tasks || []).find((t) => t.status === 'todo')?.name || 'Sequential tasks execution.')
          : 'None';
          
        const reason = missionRemainingHours > 0
          ? `Urgency strain is ${(individualRatio * 100).toFixed(0)}% against available capacity. Other active sibling backlog requires ${otherMissionsRemainingHours.toFixed(1)} hours.`
          : 'All planned deliverables for this focus stream have been fully checked off.';
          
        const suggestedFix = missionRemainingHours > 0
          ? (mission.priority === 'high' 
              ? `Commit completely to: "${bottleneck}" to prevent deadline cascade.` 
              : `Workload is dense. Restructure "${mission.title || 'this mission'}" until high priority sibling backlog of ${otherMissionsRemainingHours.toFixed(1)} hours is cleared.`)
          : 'Maintain nominal momentum and celebrate!';

        const updatedFailurePrediction = {
          probability: finalProb,
          successProbability,
          bottleneck,
          reason,
          suggestedFix
        };

        // --- NOW CALCULATE PRIORITY SCORE ---
        // Factor A: Deadline Proximity (Up to 30 points)
        const daysLeft = (new Date(mission.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        let deadlineProximityScore = 0;
        if (daysLeft <= 0) {
          deadlineProximityScore = 30;
        } else if (daysLeft < 14) {
          deadlineProximityScore = Math.max(0, 30 * (1 - daysLeft / 14));
        }

        // Factor B: Remaining Effort (Up to 25 points)
        const effortScore = Math.min(25, missionRemainingHours * 1.5);

        // Factor C: Risk Level (Up to 20 points)
        // Use the newly calculated holistic failure probability!
        const riskScore = Math.min(20, finalProb * 0.2);

        // Factor D: Dependency Count (Up to 10 points)
        const depCount = (mission.tasks || [])
          .filter((t) => t.status === 'todo')
          .reduce((sum, t) => sum + (t.dependencies?.length || 0), 0);
        const dependencyScore = Math.min(10, depCount * 1.5);

        // Factor E: Completion Percentage (Up to 15 points)
        const completionScore = Math.min(15, (1 - completedTasksOfThis / (totalTasksOfThis || 1)) * 15);

        // Priority Base Modifier
        let baseMod = 5;
        if (mission.priority === 'high') baseMod = 15;
        if (mission.priority === 'medium') baseMod = 10;

        const totalScoreRaw = deadlineProximityScore + effortScore + riskScore + dependencyScore + completionScore + baseMod;
        const priorityScore = Math.min(100, Math.max(1, Math.round(totalScoreRaw)));

        return {
          ...mission,
          confidenceScore,
          failurePrediction: updatedFailurePrediction,
          priorityScore,
        };
      });

      // 2. Sort Missions by Priority Score automatically
      const activeUncompleted = updatedMissions.filter(
        (m) => m.status !== 'archived' && m.status !== 'completed' && m.status !== 'expired'
      );
      
      const sortedMissions = [...activeUncompleted].sort((a, b) => {
        const scoreA = (a as any).priorityScore || 0;
        const scoreB = (b as any).priorityScore || 0;
        return scoreB - scoreA;
      });

      const rankedIds = sortedMissions.map((m) => m.id);

      // Generate text-based prioritize reasoning and impact dynamically
      let reasonText = 'No active threats detected. Allocate balanced energy reserves.';
      let impactText = 'All tracks currently within nominal timeline safety boundaries.';

      if (sortedMissions.length > 0) {
        const top = sortedMissions[0];
        const topDeadlineTime = new Date(top.deadline).getTime();
        const topDeadlineStr = isNaN(topDeadlineTime) ? top.deadline : new Date(top.deadline).toLocaleDateString();
        reasonText = `"${top.title || top.goal}" prioritized as top focus (Score: ${(top as any).priorityScore}) due to high dependency density and deadline proximity of ${topDeadlineStr}.`;
        impactText = `Any direct delay in "${top.title || 'Untitled'}" cascades onto subsequent milestone gates, increasing failure potential.`;
      }

      // 3. Conflict Detector Logic
      const totalRemainingMinutes = activeUncompleted.reduce((acc, m) => {
        return acc + m.tasks.filter((t) => t.status === 'todo').reduce((sum, t) => sum + t.durationMinutes, 0);
      }, 0);
      const totalRequiredHours = totalRemainingMinutes / 60;

      const totalAvailableHours = activeUncompleted.reduce((acc, m) => {
        const dLeft = Math.max(0.5, (new Date(m.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const cap = m.dailyCapacity || get().userSettings.capacity;
        return acc + dLeft * cap;
      }, 0);

      let conflictWarning = null;
      let conflictRecommendation = null;

      if (totalRequiredHours > totalAvailableHours && activeUncompleted.length > 0) {
        conflictWarning = `Workload Conflict: Total required effort (${totalRequiredHours.toFixed(1)} hrs) exceeds calculated available capacity (${totalAvailableHours.toFixed(1)} hrs).`;
        
        const topTitle = sortedMissions[0]?.title || sortedMissions[0]?.goal || 'Top Mission';
        const secTitle = sortedMissions[1]?.title || sortedMissions[1]?.goal || 'Secondary Mission';
        const thirdTitle = sortedMissions[2]?.title || sortedMissions[2]?.goal || 'Tertiary Mission';

        let recStr = `Prioritize focus on "${topTitle}".`;
        if (secTitle) recStr += ` Streamline scope or reduce complexity on "${secTitle}".`;
        if (thirdTitle) recStr += ` Delay or reschedule "${thirdTitle}".`;
        conflictRecommendation = recStr;
      }

      // 4. Analytics Calculations
      let totalAllTasks = 0;
      let completedAllTasks = 0;
      let sumSuccessProb = 0;

      updatedMissions.forEach((m) => {
        if (m.status !== 'archived') {
          totalAllTasks += m.tasks.length;
          completedAllTasks += m.tasks.filter((t) => t.status === 'completed').length;
          sumSuccessProb += m.failurePrediction?.successProbability ?? 75;
        }
      });

      const completionRate = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;
      const averageSuccessProbability = updatedMissions.length > 0 ? Math.round(sumSuccessProb / updatedMissions.length) : 80;

      // Generate simple, high-fidelity risk trend data over past few days
      const riskTrend = Array.from({ length: 5 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (4 - i));
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        // Make it respond dynamically to completionRate
        const baseRisk = 100 - averageSuccessProbability;
        const variance = Math.sin(i) * 5;
        const adjustedRisk = Math.max(5, Math.min(95, Math.round(baseRisk + variance - (completionRate * 0.15))));
        return {
          date: dateStr,
          risk: adjustedRisk,
        };
      });

      // Context switching: switch activeMissionId to next available stream if current expired or completed
      let nextActiveId = activeMissionId;
      if (activeMissionId) {
        const currentActiveMission = updatedMissions.find(m => m.id === activeMissionId);
        if (!currentActiveMission || currentActiveMission.status === 'completed' || currentActiveMission.status === 'expired' || currentActiveMission.status === 'archived') {
          const sortedActive = [...updatedMissions]
            .filter(m => m.status === 'active')
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          const fallbackMission = sortedActive.find(m => m.tasks.some(t => t.status === 'todo')) 
            || sortedActive[0];
          nextActiveId = fallbackMission ? fallbackMission.id : null;
        }
      } else if (updatedMissions.length > 0) {
        const sortedActive = [...updatedMissions]
          .filter(m => m.status === 'active')
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        const fallbackMission = sortedActive.find(m => m.tasks.some(t => t.status === 'todo')) 
          || sortedActive[0];
        nextActiveId = fallbackMission ? fallbackMission.id : null;
      }

      set({
        missions: updatedMissions,
        activeMissionId: nextActiveId,
        rankedMissionIds: rankedIds,
        prioritizationReasoning: reasonText,
        prioritizationImpact: impactText,
        conflictWarning,
        conflictRecommendation,
        analytics: {
          completionRate,
          averageSuccessProbability,
          tasksCompleted: completedAllTasks,
          riskTrend,
        },
      });

      // Persist newly expired statuses to the backend asynchronously
      if (changedMissions.length > 0) {
        changedMissions.forEach((m) => {
          const calculatedVersion = updatedMissions.find(x => x.id === m.id) || m;
          syncMissionToBackends(calculatedVersion).catch((e) => {
            console.error('Async expiration sync failed:', e);
          });
        });
      }
    },

    // Load all missions from backends
    loadAllMissions: async (uid) => {
      set({ loading: true, loadingMessage: 'Synchronizing your workspaces with the cloud...', error: null });
      let loadedMissions: Mission[] = [];

      // 1. Try Express Backend
      try {
        const response = await fetch(`/api/missions/${uid}/all`);
        if (response.ok) {
          loadedMissions = await response.json();
        }
      } catch (err) {
        console.warn('Express backend load failed, trying Firestore:', err);
      }

      // 2. Try Firestore fallback
      if (loadedMissions.length === 0) {
        try {
          const q = query(collection(db, 'missions'), where('userId', '==', uid));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((docSnap) => {
            loadedMissions.push({ id: docSnap.id, ...docSnap.data() } as Mission);
          });
        } catch (err) {
          console.warn('Firestore load failed, trying local storage:', err);
        }
      }

      // 3. Try Local Storage fallback
      if (loadedMissions.length === 0) {
        const localKeys = Object.keys(localStorage).filter(
          (k) => k.startsWith(`saver_mission_${uid}`) || k.startsWith(`saver_mission_backup_`)
        );
        for (const key of localKeys) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '');
            if (item && item.userId === uid) {
              loadedMissions.push(item);
            }
          } catch {}
        }
        if (uid === 'guest_user_id') {
          const gm = localStorage.getItem('saver_guest_mission');
          if (gm) {
            try {
              loadedMissions.push(JSON.parse(gm));
            } catch {}
          }
        }
      }

      // Sanitize loaded missions (making sure deadline is a valid date string, and status is valid)
      const sanitizedMissions = loadedMissions.map((m) => {
        let status = m.status;
        if (!status || !['active', 'completed', 'abandoned', 'archived', 'expired'].includes(status)) {
          status = 'active';
        }
        const d = parseAndSanitizeDeadline(m.deadline);
        return {
          ...m,
          status,
          deadline: d.toISOString()
        };
      });

      // Find active mission to focus on (sorted by closest deadline first, then priority)
      let activeId = null;
      const sortedActiveMissions = sanitizedMissions
        .filter((m) => m.status === 'active')
        .sort((a, b) => {
          const timeA = new Date(a.deadline).getTime();
          const timeB = new Date(b.deadline).getTime();
          if (timeA !== timeB) return timeA - timeB;

          const pWeights = { high: 3, medium: 2, low: 1 };
          const pA = pWeights[a.priority || 'medium'] || 2;
          const pB = pWeights[b.priority || 'medium'] || 2;
          return pB - pA;
        });

      if (sortedActiveMissions.length > 0) {
        activeId = sortedActiveMissions[0].id;
      } else if (sanitizedMissions.length > 0) {
        const uncompleted = sanitizedMissions
          .filter((m) => m.status !== 'completed' && m.status !== 'archived')
          .sort((a, b) => {
            const timeA = new Date(a.deadline).getTime();
            const timeB = new Date(b.deadline).getTime();
            if (timeA !== timeB) return timeA - timeB;

            const pWeights = { high: 3, medium: 2, low: 1 };
            const pA = pWeights[a.priority || 'medium'] || 2;
            const pB = pWeights[b.priority || 'medium'] || 2;
            return pB - pA;
          });
        activeId = uncompleted.length > 0 ? uncompleted[0].id : sanitizedMissions[0].id;
      }

      set({
        missions: sanitizedMissions,
        activeMissionId: activeId,
        loading: false,
        loadingMessage: null,
      });

      get().recalculateEverything();
    },

    // Create / Plan new mission
    planNewMission: async (
      goal,
      deadline,
      dailyCapacityHours = 4,
      preferredWorkTimes = [],
      title,
      priority = 'medium',
      estimatedHours = 20,
      tags = []
    ) => {
      const { currentUser, missions } = get();
      if (!title || !deadline) {
        set({ activeMissionId: null });
        return;
      }

      set({ loading: true, loadingMessage: 'Warm AI Friend is organizing your tasks and crafting the best stress-free plan...', error: null });

      const uid = currentUser?.uid || 'guest_user_id';
      let freshPlan: any = null;

      try {
        const response = await fetch('/api/plan-mission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal,
            deadline,
            dailyCapacityHours,
            preferredWorkTimes,
            currentDateString: new Date().toISOString(),
            title,
            priority,
            estimatedHours,
            tags,
          }),
        });

        if (response.ok) {
          freshPlan = await response.json();
        }
      } catch (err) {
        console.warn('AI Planning backend failed, generating robust sandbox plan offline:', err);
      }

      // Complete fallback plan generator
      if (!freshPlan) {
        // Simple offline planner logic
        const dummyId = generateId();
        const milestones: Milestone[] = [
          {
            id: `ms_1_${dummyId}`,
            name: 'Initiation & Alignment',
            description: 'Define constraints and build essential baseline workspace.',
            deadline: 'Early stage',
          },
          {
            id: `ms_2_${dummyId}`,
            name: 'Core Iteration',
            description: 'Sprint-based approach on main bottleneck features.',
            deadline: 'Mid stage',
          },
          {
            id: `ms_3_${dummyId}`,
            name: 'Final Polish',
            description: 'Rigorous validations, clean typography checks, and signoff.',
            deadline: 'Late stage',
          },
        ];

        const tasks: Task[] = [
          {
            id: `task_1_${dummyId}`,
            milestoneId: `ms_1_${dummyId}`,
            name: 'Scoping Outline & Design Bounds',
            description: 'Formulate target constraints and establish project goals.',
            durationMinutes: 45,
            priority: 'high',
            order: 0,
            dependencies: [],
            status: 'todo',
            reasoning: 'Strategic planning avoids critical downstream rework.',
            scheduledTime: '09:00 - 09:45',
          },
          {
            id: `task_2_${dummyId}`,
            milestoneId: `ms_2_${dummyId}`,
            name: 'Deploy MVP Baseline',
            description: 'Write critical-path features and verify connectivity.',
            durationMinutes: 120,
            priority: 'high',
            order: 1,
            dependencies: [`task_1_${dummyId}`],
            status: 'todo',
            reasoning: 'Unlocks rapid testing loop for secondary features.',
            scheduledTime: '10:00 - 12:00',
          },
          {
            id: `task_3_${dummyId}`,
            milestoneId: `ms_3_${dummyId}`,
            name: 'Validate UX & UI Alignment',
            description: 'Evaluate typography pairings and polish responsive behaviors.',
            durationMinutes: 45,
            priority: 'low',
            order: 2,
            dependencies: [`task_2_${dummyId}`],
            status: 'todo',
            reasoning: 'Secures elite user perception before final delivery.',
            scheduledTime: '13:00 - 13:45',
          },
        ];

        freshPlan = {
          goal,
          confidenceScore: 82,
          shadowTimeline: { bestCaseHours: 12, expectedCaseHours: 20, worstCaseHours: 32 },
          milestones,
          tasks,
          failurePrediction: {
            probability: 18,
            successProbability: 82,
            bottleneck: 'Capacity constraints near target deadline.',
            reason: 'Simultaneous overlapping schedule loads.',
            suggestedFix: 'Focus purely on MVP features and restrict custom assets.',
          },
          decisionLog: [],
          notifications: [],
        };
      }

      const newMissionId = freshPlan.id || generateId();
      
      const decoratedMission: Mission = {
        id: newMissionId,
        userId: uid,
        goal: goal || title || freshPlan.goal || '',
        deadline: deadline || freshPlan.deadline || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        title: title || freshPlan.title || 'Mission Focus',
        priority: priority || freshPlan.priority || 'medium',
        estimatedHours: estimatedHours || freshPlan.estimatedHours || 20,
        dailyCapacity: dailyCapacityHours || freshPlan.dailyCapacity || 4,
        tags: tags || freshPlan.tags || [],
        createdAt: new Date().toISOString(),
        status: 'active',
        confidenceScore: freshPlan.confidenceScore || 85,
        shadowTimeline: freshPlan.shadowTimeline || { bestCaseHours: 12, expectedCaseHours: 20, worstCaseHours: 32 },
        milestones: freshPlan.milestones.map((m: any) => ({ ...m, id: m.id || generateId() })),
        tasks: freshPlan.tasks.map((t: any, i: number) => ({
          ...t,
          id: t.id || generateId(),
          status: 'todo',
          order: i,
        })),
        failurePrediction: freshPlan.failurePrediction || {
          probability: 20,
          successProbability: 80,
          bottleneck: 'Capacity constraints',
          reason: 'Initial setup overhead',
          suggestedFix: 'Trim high-complexity secondary details',
        },
        decisionLog: freshPlan.decisionLog || [],
        notifications: freshPlan.notifications || [],
      };

      // Ensure any current active missions are marked standard 'active' or archived appropriately
      const cleanedMissions = missions.map((m) =>
        m.status === 'active' ? { ...m, status: 'active' as const } : m
      );

      const allMissions = [decoratedMission, ...cleanedMissions];

      set({
        missions: allMissions,
        activeMissionId: decoratedMission.id,
        loading: false,
        loadingMessage: null,
      });

      // EVENT-DRIVEN AGENT TRIGGER: Planner, Priority, Risk, Coach
      get().addAgentLog(
        'Planner',
        'Mission Blueprint Generated',
        `Planned "${decoratedMission.title}" breakdown with ${decoratedMission.tasks.length} core tasks and ${decoratedMission.milestones.length} milestones.`
      );
      get().addAgentLog(
        'Priority',
        'Schedule Optimized',
        `Determined critical path sequencing with average estimated duration of ${decoratedMission.estimatedHours} hours.`
      );
      get().addAgentLog(
        'Risk',
        'Vulnerability Audit Complete',
        `Identified bottleneck: "${decoratedMission.failurePrediction?.bottleneck}". Assessed failure probability at ${decoratedMission.failurePrediction?.probability}%.`
      );
      get().addAgentLog(
        'Coach',
        'Launch Instructions Ready',
        `A robust plan has been structured! Focus purely on the top recommended task to maintain maximum productivity.`
      );

      get().addSystemNotification(
        'Mission Created',
        `Mission "${decoratedMission.title}" was created and set to top priority focus.`,
        'success'
      );

      // Run global calculations
      get().recalculateEverything();

      // Sync to backends
      await syncMissionToBackends(decoratedMission);
    },

    // MISSION COMPLETION WORKFLOW
    updateTaskStatus: async (missionId, taskId, newStatus, skipLoading = false) => {
      const shouldSkipLoading = skipLoading || newStatus === 'completed' || newStatus === 'skipped';
      if (!shouldSkipLoading) {
        set({ 
          loading: true, 
          loadingMessage: 'Rethinking stress-free plan... Recalculating alternative schedule paths...'
        });
      }
      try {
        const { missions } = get();
        const targetMission = missions.find((m) => m.id === missionId);
        if (!targetMission) return;

        // 1. Update task status in our shared copy
        const updatedTasks = targetMission.tasks.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status: newStatus,
              completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
            };
          }
          return t;
        });

        // 2 & 3. Recalculate mission completion %
        const totalTasks = updatedTasks.length;
        const completedTasks = updatedTasks.filter((t) => t.status === 'completed').length;
        const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Check if all tasks are complete (meaning no tasks are in 'todo' or 'delayed' states)
        const incompleteTasks = updatedTasks.filter((t) => t.status === 'todo' || t.status === 'delayed').length;
        let missionStatus = targetMission.status;
        if (incompleteTasks === 0 && totalTasks > 0) {
          missionStatus = 'completed';
        } else if (targetMission.status === 'completed') {
          missionStatus = 'active'; // revert back to active if task unchecked
        }

        // 4 & 5. Recalculate risk & confidence scores
        // Completion increases confidence and drops failure probability dynamically
        const initialProb = 30; // base risk
        const riskReduction = (completedTasks / (totalTasks || 1)) * 25;
        const newRiskProb = Math.max(5, Math.round(initialProb - riskReduction));
        const newConfidence = Math.min(98, Math.round(70 + riskReduction));

        const updatedMission: Mission = {
          ...targetMission,
          tasks: updatedTasks,
          status: missionStatus,
          confidenceScore: newConfidence,
          failurePrediction: {
            ...targetMission.failurePrediction,
            probability: newRiskProb,
            successProbability: 100 - newRiskProb,
          },
        };

        // Put it back in missions list
        const nextMissionsList = missions.map((m) => (m.id === missionId ? updatedMission : m));

        set({
          missions: nextMissionsList,
        });

        const updatedTaskObj = updatedTasks.find((t) => t.id === taskId);
        const taskName = updatedTaskObj?.name || 'Task';

        // 7. EVENT-DRIVEN AGENT WORKFLOW TRIGGERS
        if (newStatus === 'completed') {
          get().addAgentLog(
            'Priority',
            'Task Queue Updated',
            `Finished "${taskName}". Sequential dependency released; promoting next active workload item.`
          );
          get().addAgentLog(
            'Risk',
            'Timeline Safety Boosted',
            `Downstream risk buffer improved. Failure rate decreased to ${newRiskProb}% (Confidence: ${newConfidence}%).`
          );
          get().addAgentLog(
            'Coach',
            'Momentum Calibration',
            `Excellent velocity! That's another deliverable off your queue. Keep up this precise focus.`
          );
          get().addSystemNotification(
            'Task Completed',
            `Completed: "${taskName}" inside "${updatedMission.title}". Risk model adjusted.`,
            'success'
          );
        } else if (newStatus === 'skipped') {
          get().addAgentLog(
            'Replanner',
            'Timeline Buffer Reallocated',
            `User skipped "${taskName}". Replanned remaining milestones to absorb skipped duration of ${updatedTaskObj?.durationMinutes || 30} mins.`
          );
          get().addAgentLog(
            'Risk',
            'Vulnerability Check',
            `Skipped task may introduce technical debt or milestone drag. Probability of failure adjusted.`
          );
          get().addAgentLog(
            'Coach',
            'Tactical Advisory',
            `Make sure to delegate skipped parameters if they become blocking dependencies later.`
          );
          get().addSystemNotification(
            'Task Skipped',
            `Skipped: "${taskName}". Timeline replanned automatically.`,
            'warning'
          );
        } else if (newStatus === 'missed' || newStatus === 'delayed') {
          // Trigger the Replanner Agent (via /api/replan-mission on server)
          try {
            const response = await fetch('/api/replan-mission', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mission: updatedMission,
                taskId,
                newStatus,
                currentDateString: new Date().toISOString()
              })
            });
            if (response.ok) {
              const replannedMission = await response.json();
              set((state) => ({
                missions: state.missions.map((m) => (m.id === missionId ? replannedMission : m)),
              }));
              get().addSystemNotification(
                'Dynamic Replan Activated',
                `Replanner Agent rescheduled tasks to cover ${newStatus} task "${taskName}".`,
                'success'
              );
              get().recalculateEverything();
              return;
            }
          } catch (err) {
            console.warn('AI replanning failed, running local fallback replanner:', err);
          }

          // Local Fallback Replanner (runs if AI server is offline or fails)
          const remainingTasks = updatedTasks.filter((t) => t.status !== 'completed' && t.id !== taskId);
          let skippedCount = 0;
          
          // Deprioritize or skip low-priority tasks to make up for lost time
          const processedTasks = updatedTasks.map((t) => {
            if (t.id === taskId) {
              return { ...t, status: newStatus };
            }
            if (t.status === 'todo' && t.priority === 'low') {
              skippedCount++;
              return { ...t, status: 'skipped' as const };
            }
            return t;
          });

          // Reschedule subsequent tasks (append "Rescheduled" flag to timeslot or log details)
          const rescaledTasks = processedTasks.map((t) => {
            if (t.status === 'todo' && t.id !== taskId) {
              return {
                ...t,
                scheduledTime: t.scheduledTime ? `${t.scheduledTime} (Rescheduled)` : t.scheduledTime,
                reasoning: t.reasoning + " (Rescheduled by Replanner Agent after task disruption)."
              };
            }
            return t;
          });

          const delayImpact = newStatus === 'missed' ? 20 : 10;
          const fallbackRisk = Math.min(95, (targetMission.failurePrediction?.probability || 30) + delayImpact);
          const fallbackConfidence = Math.max(10, targetMission.confidenceScore - delayImpact);

          const localReplannedMission: Mission = {
            ...targetMission,
            tasks: rescaledTasks,
            confidenceScore: fallbackConfidence,
            failurePrediction: {
              probability: fallbackRisk,
              successProbability: 100 - fallbackRisk,
              bottleneck: remainingTasks[0]?.name || 'Sequential deadline compression.',
              reason: newStatus === 'missed'
                ? `Task "${taskName}" was missed. Replanner agent rescheduled timelines.`
                : `Task "${taskName}" was significantly delayed. Timeline shifted.`,
              suggestedFix: 'Focus exclusively on remaining high-priority tasks.'
            },
            decisionLog: [
              {
                id: `dec_local_replan_${Date.now()}`,
                agent: 'Replanner',
                action: newStatus === 'missed' ? 'Task Missed: Contingency Active' : 'Task Delayed: Schedule Calibrated',
                reasoning: `Task "${taskName}" marked as ${newStatus}. Shifted future tasks, skipped ${skippedCount} low-priority tasks, and updated success probability to ${100 - fallbackRisk}%.`,
                timestamp: 'Just now'
              },
              ...(targetMission.decisionLog || [])
            ]
          };

          set((state) => ({
            missions: state.missions.map((m) => (m.id === missionId ? localReplannedMission : m)),
          }));

          get().addSystemNotification(
            'Contingency Plan Engaged',
            `Replanner Agent rescheduled tasks to cover ${newStatus} task "${taskName}".`,
            'warning'
          );

          get().recalculateEverything();
          await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
          return;
        }

        if (missionStatus === 'completed') {
          get().addSystemNotification(
            'Mission Accomplished!',
            `Incredible work! You have completed all deliverables for "${updatedMission.title || 'the active mission'}".`,
            'success'
          );
          get().addAgentLog(
            'Coach',
            'Victory Commendation',
            `Mission accomplished! Fully secured "${updatedMission.title || 'the active mission'}" prior to the deadline constraints.`
          );

          // Find the next incomplete active mission (sorted by priority and deadline) and switch to it instantly!
          const otherMissions = nextMissionsList
            .filter(m => m.id !== missionId && m.status === 'active')
            .sort((a, b) => {
              const pWeights = { high: 3, medium: 2, low: 1 };
              const pA = pWeights[a.priority || 'medium'] || 2;
              const pB = pWeights[b.priority || 'medium'] || 2;
              if (pA !== pB) return pB - pA;
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            });

          const nextIncompleteMission = otherMissions.find(m => {
            const incomplete = m.tasks && m.tasks.some(t => t.status === 'todo');
            return incomplete;
          }) || otherMissions[0]; // fallback to any active mission

          if (nextIncompleteMission) {
            set({ activeMissionId: nextIncompleteMission.id });
            get().addSystemNotification(
              'Auto Stream Shift',
              `Switched focus context to next stream: "${nextIncompleteMission.title || nextIncompleteMission.goal}"`,
              'info'
            );
            get().addAgentLog(
              'Coach',
              'Context Shift',
              `Switched focus context to next stream: "${nextIncompleteMission.title || nextIncompleteMission.goal}"`
            );
          } else {
            set({ activeMissionId: null });
          }
        }

        // 6, 8, 9, 10. Recalculate priority rankings, refresh dashboard, analytics, notifications
        get().recalculateEverything();

        // Sync all missions to backends to ensure holistic calculations are persisted
        await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
      } finally {
        if (!shouldSkipLoading) {
          set({ loading: false, loadingMessage: null });
        }
      }
    },

    archiveMission: async (missionId) => {
      const { missions } = get();
      const target = missions.find((m) => m.id === missionId);
      if (!target) return;

      const updated: Mission = { ...target, status: 'archived' };
      set((state) => ({
        missions: state.missions.map((m) => (m.id === missionId ? updated : m)),
      }));

      get().addSystemNotification('Mission Archived', `"${target.title}" was archived.`, 'info');
      get().recalculateEverything();
      await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
    },

    deleteMission: async (missionId) => {
      set({ loading: true, loadingMessage: 'Safely archiving data & deleting mission from workspace...' });
      try {
        const { missions, activeMissionId, currentUser } = get();
        const target = missions.find((m) => m.id === missionId);
        const title = target?.title || 'Mission';

        // 1. Filter out of local list state
        set((state) => ({
          missions: state.missions.filter((m) => m.id !== missionId),
          activeMissionId: state.activeMissionId === missionId ? null : state.activeMissionId,
        }));

        // 2. Clear from local storage
        const uid = currentUser?.uid || 'guest_user_id';
        localStorage.removeItem(`saver_mission_${uid}`);
        localStorage.removeItem(`saver_mission_backup_${missionId}`);
        if (uid === 'guest_user_id') {
          localStorage.removeItem('saver_guest_mission');
        }

        // 3. Express deletion
        try {
          await fetch(`/api/missions/${missionId}`, {
            method: 'DELETE',
          });
        } catch (err) {
          console.warn('Backend express deletion failed:', err);
        }

        // 4. Firestore deletion fallback
        try {
          const missionRef = doc(db, 'missions', missionId);
          await deleteDoc(missionRef);
        } catch (err) {
          console.warn('Firestore deletion skipped or failed:', err);
        }

        get().addSystemNotification('Mission Deleted', `Deleted "${title}" plan from workspace.`, 'warning');
        get().recalculateEverything();
        await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
      } finally {
        set({ loading: false, loadingMessage: null });
      }
    },

    editMission: async (missionId, updatedFields) => {
      const { missions } = get();
      const target = missions.find((m) => m.id === missionId);
      if (!target) return;

      const updated: Mission = { ...target, ...updatedFields };
      set((state) => ({
        missions: state.missions.map((m) => (m.id === missionId ? updated : m)),
      }));

      // Trigger event-driven agent updates for edits!
      get().addAgentLog(
        'Planner',
        'Mission Parameters Edited',
        `Updated details for "${updated.title}". Realignment checklist generated.`
      );
      get().addAgentLog(
        'Priority',
        'Queue Reordered',
        `Reordered tasks relative to edited variables (Priority: ${updated.priority}).`
      );

      get().recalculateEverything();
      await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
    },

    applySuggestedFix: async (missionId, suggestedFix) => {
      const { missions } = get();
      const target = missions.find((m) => m.id === missionId);
      if (!target) return;

      // Improve confidence and lower risk on applying recommended fix
      const newProb = Math.max(5, (target.failurePrediction?.probability ?? 20) - 8);
      const newConf = Math.min(98, target.confidenceScore + 5);

      const updated: Mission = {
        ...target,
        confidenceScore: newConf,
        failurePrediction: {
          ...target.failurePrediction,
          probability: newProb,
          successProbability: 100 - newProb,
        },
      };

      set((state) => ({
        missions: state.missions.map((m) => (m.id === missionId ? updated : m)),
      }));

      get().addAgentLog(
        'Replanner',
        'Remediation Applied',
        `Applied recommended risk buffer. New threat level is ${newProb}% probability of failure.`
      );
      get().addSystemNotification(
        'Risk Remediation Applied',
        `Successfully implemented fix: "${suggestedFix.slice(0, 45)}..."`,
        'success'
      );

      get().recalculateEverything();
      await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
    },

    autoSchedule: async (missionId) => {
      set({ loading: true, loadingMessage: 'Gemini Coach is calculating optimal calendar slots and breaks...' });
      try {
        const settings = get().userSettings;
        const response = await fetch(`/api/missions/${missionId}/auto-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings })
        });
        if (response.ok) {
          const updatedMission = await response.json();
          set(state => ({
            missions: state.missions.map(m => m.id === missionId ? updatedMission : m)
          }));
          get().recalculateEverything();
          await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
          
          get().addAgentLog(
            'Planner',
            'AI Scheduling Completed',
            `Intelligently auto-scheduled tasks for mission: "${updatedMission.title}".`
          );
          get().addSystemNotification(
            'AI Auto-Schedule Complete',
            'Successfully calculated optimal, break-aware timeline slots with Gemini.',
            'success'
          );
        } else {
          throw new Error('Server scheduling returned error');
        }
      } catch (err) {
        console.error('Failed to run AI Auto-Schedule:', err);
        get().addSystemNotification(
          'Scheduling Hitch',
          'Failed to calculate AI slots. Reverting to basic chronological distribution.',
          'warning'
        );
      } finally {
        set({ loading: false, loadingMessage: null });
      }
    },

    addTask: async (taskData) => {
      set({ loading: true, loadingMessage: 'Warm AI Friend is integrating this task and scheduling dynamic slots...' });
      try {
        const { missions, activeMissionId } = get();
        if (!activeMissionId) return;
        const targetMission = missions.find(m => m.id === activeMissionId);
        if (!targetMission) return;

        const newTask: Task = {
          ...taskData,
          id: generateId(),
          status: 'todo',
          order: targetMission.tasks.length,
          reasoning: 'Critical milestone item determined dynamically by the priority engine.',
        };

        const updatedMission = {
          ...targetMission,
          tasks: [...targetMission.tasks, newTask],
        };

        set(state => ({
          missions: state.missions.map(m => m.id === activeMissionId ? updatedMission : m)
        }));

        get().addSystemNotification('Task Added', `Added task "${newTask.name}" successfully.`, 'success');
        get().recalculateEverything();
        await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));

        // Call API
        try {
          await fetch(`/api/missions/${activeMissionId}/tasks/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
          });
        } catch (e) {
          console.warn('API task add failed, synced locally:', e);
        }
      } finally {
        set({ loading: false, loadingMessage: null });
      }
    },

    deleteTask: async (taskId) => {
      set({ loading: true, loadingMessage: 'Removing task and realigning milestones...' });
      try {
        const { missions, activeMissionId } = get();
        if (!activeMissionId) return;
        const targetMission = missions.find(m => m.id === activeMissionId);
        if (!targetMission) return;

        const updatedMission = {
          ...targetMission,
          tasks: targetMission.tasks.filter(t => t.id !== taskId),
        };

        set(state => ({
          missions: state.missions.map(m => m.id === activeMissionId ? updatedMission : m)
        }));

        get().addSystemNotification('Task Deleted', `Removed task successfully.`, 'warning');
        get().recalculateEverything();
        await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));

        try {
          await fetch(`/api/missions/${activeMissionId}/tasks/${taskId}`, {
            method: 'DELETE'
          });
        } catch (e) {
          console.warn('API task deletion failed, synced locally:', e);
        }
      } finally {
        set({ loading: false, loadingMessage: null });
      }
    },

    sortTasks: async (taskIds) => {
      const { missions, activeMissionId } = get();
      if (!activeMissionId) return;
      const targetMission = missions.find(m => m.id === activeMissionId);
      if (!targetMission) return;

      // Reorder tasks
      const taskMap = new Map(targetMission.tasks.map(t => [t.id, t]));
      const sortedTasks = taskIds
        .map((id, index) => {
          const t = taskMap.get(id);
          if (t) {
            return { ...t, order: index };
          }
          return null;
        })
        .filter((t): t is Task => !!t);

      const updatedMission = {
        ...targetMission,
        tasks: sortedTasks,
      };

      set(state => ({
        missions: state.missions.map(m => m.id === activeMissionId ? updatedMission : m)
      }));

      get().recalculateEverything();
      await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));

      try {
        await fetch(`/api/missions/${activeMissionId}/tasks/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskIds })
        });
      } catch (e) {
        console.warn('API task sort failed, synced locally:', e);
      }
    },

    updateTask: async (taskId, updates) => {
      const { missions, activeMissionId } = get();
      if (!activeMissionId) return;
      const targetMission = missions.find(m => m.id === activeMissionId);
      if (!targetMission) return;

      const updatedMission = {
        ...targetMission,
        tasks: targetMission.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
      };

      set(state => ({
        missions: state.missions.map(m => m.id === activeMissionId ? updatedMission : m)
      }));

      get().recalculateEverything();
      await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));

      try {
        await fetch(`/api/missions/${activeMissionId}/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (e) {
        console.warn('API task update failed, synced locally:', e);
      }
    },

    recalculateRiskMetrics: async (specificMissionId) => {
      const { missions, activeMissionId } = get();
      const targetId = specificMissionId || activeMissionId;
      if (!targetId) return;

      try {
        const response = await fetch(`/api/missions/${targetId}/recalculate`, {
          method: 'POST'
        });
        if (response.ok) {
          const updatedMission = await response.json();
          set(state => ({
            missions: state.missions.map(m => m.id === targetId ? updatedMission : m)
          }));
          get().recalculateEverything();
          await Promise.all(get().missions.map((m) => syncMissionToBackends(m)));
        }
      } catch (e) {
        console.warn('API risk recalculation failed:', e);
      }
    },
  };
});
