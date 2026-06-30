export interface Task {
  id: string;
  milestoneId?: string;
  name: string;
  description: string;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
  order: number;
  dependencies: string[]; // ids of tasks this task depends on
  status: 'todo' | 'completed' | 'skipped' | 'missed' | 'delayed';
  completedAt?: string | null;
  reasoning: string; // why is this scheduled / ordered here
  scheduledTime: string; // human readable or ISO timestamp
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  deadline: string; // human readable or date-time
}

export interface FailurePrediction {
  probability: number; // e.g. 35 (meaning 35% chance of *failure*, or success details)
  successProbability: number; // e.g. 65% chance of success
  bottleneck: string;
  reason: string;
  suggestedFix: string;
}

export interface Decision {
  id: string;
  agent: 'Planner' | 'Priority' | 'Risk' | 'Replanner' | 'Coach';
  action: string;
  reasoning: string;
  timestamp: string;
}

export interface SmartNotification {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: 'warning' | 'tip' | 'info' | 'success';
  read: boolean;
}

export interface ShadowTimeline {
  bestCaseHours: number;
  expectedCaseHours: number;
  worstCaseHours: number;
}

export interface Mission {
  id: string;
  userId: string;
  goal: string; // retains original compatibility
  title?: string; // custom title
  description?: string; // custom description
  priority?: 'high' | 'medium' | 'low';
  estimatedHours?: number;
  dailyCapacity?: number;
  tags?: string[];
  archived?: boolean;
  deadline: string; // ISO date string or human date
  createdAt: string;
  status: 'active' | 'completed' | 'abandoned' | 'archived' | 'expired';
  confidenceScore: number; // 0 to 100
  shadowTimeline: ShadowTimeline;
  milestones: Milestone[];
  tasks: Task[];
  failurePrediction: FailurePrediction;
  decisionLog: Decision[];
  notifications: SmartNotification[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface UserSettings {
  workingStart: string;
  workingEnd: string;
  breakDuration: number;
  timezone: string;
  aggressiveness: 'relaxed' | 'normal' | 'crisis';
  capacity: number;
  notifSound: boolean;
  notifVisual: boolean;
  darkMode: boolean;
  calendarSync: boolean;
}

export function calculateMissionProgress(mission: Mission | null): number {
  if (!mission || !mission.tasks || mission.tasks.length === 0) return 0;
  const totalDuration = mission.tasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  if (totalDuration === 0) return 0;
  const completedDuration = mission.tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  return Math.round((completedDuration / totalDuration) * 100);
}
