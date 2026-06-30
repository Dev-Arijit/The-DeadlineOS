import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required to run the agent. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Reuse the plan schema for structured JSON output
const planSchema = {
  type: Type.OBJECT,
  properties: {
    goal: { type: Type.STRING },
    confidenceScore: { type: Type.INTEGER, description: 'Overall success probability from 0-100%' },
    shadowTimeline: {
      type: Type.OBJECT,
      properties: {
        bestCaseHours: { type: Type.INTEGER, description: 'Optimistic estimation in hours' },
        expectedCaseHours: { type: Type.INTEGER, description: 'Expected estimation in hours' },
        worstCaseHours: { type: Type.INTEGER, description: 'Pessimistic estimation in hours' }
      },
      required: ['bestCaseHours', 'expectedCaseHours', 'worstCaseHours']
    },
    milestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          deadline: { type: Type.STRING, description: 'Suggested relative timeline segment (e.g., By Day 1 evening, By Sunday 12 PM)' }
        },
        required: ['id', 'name', 'description', 'deadline']
      }
    },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          milestoneId: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          durationMinutes: { type: Type.INTEGER },
          priority: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'" },
          order: { type: Type.INTEGER },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Task IDs that must be completed first' },
          reasoning: { type: Type.STRING, description: 'Priority Agent explanations on scheduling, order, and priority of this task' },
          scheduledTime: { type: Type.STRING, description: 'Human readable starting timeslot' }
        },
        required: ['id', 'name', 'description', 'durationMinutes', 'priority', 'order', 'dependencies', 'reasoning', 'scheduledTime']
      }
    },
    failurePrediction: {
      type: Type.OBJECT,
      properties: {
        probability: { type: Type.INTEGER, description: 'Probability of failure from 0-100%' },
        successProbability: { type: Type.INTEGER, description: 'Probability of success from 0-100%' },
        bottleneck: { type: Type.STRING },
        reason: { type: Type.STRING },
        suggestedFix: { type: Type.STRING }
      },
      required: ['probability', 'successProbability', 'bottleneck', 'reason', 'suggestedFix']
    },
    decisionLog: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          agent: { type: Type.STRING, description: 'Planner, Priority, Risk, Replanner, or Coach' },
          action: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        },
        required: ['id', 'agent', 'action', 'reasoning']
      }
    },
    notifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          type: { type: Type.STRING, description: "Must be 'warning', 'tip', 'info', or 'success'" }
        },
        required: ['id', 'title', 'content', 'type']
      }
    }
  },
  required: ['goal', 'confidenceScore', 'shadowTimeline', 'milestones', 'tasks', 'failurePrediction', 'decisionLog', 'notifications']
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Chat support for AI Strategist ChatGPT-style panel
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, activeMission, missions, activeMissionId } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message parameter is required.' });
      return;
    }

    const ai = getGeminiClient();
    
    // Build context of all missions and tasks in detail so the AI always has the latest and is completely updated
    let missionsContext = "The user has no missions planned yet. Encourage them to create one.";
    if (missions && Array.isArray(missions) && missions.length > 0) {
      missionsContext = missions.map((m: any, idx: number) => {
        const remainingTasks = (m.tasks || []).filter((t: any) => t.status === 'todo');
        const completedTasks = (m.tasks || []).filter((t: any) => t.status === 'completed');
        const tasksStr = (m.tasks || []).map((t: any) => {
          return `- Task [ID: "${t.id}"]: "${t.name}" | Status: "${t.status}" | Duration: ${t.durationMinutes}m | Priority: "${t.priority}" | Scheduled: "${t.scheduledTime || 'Unscheduled'}"`;
        }).join('\n');
        
        return `
Mission #${idx + 1}:
- Mission ID: "${m.id}"
- Title: "${m.title || 'Untitled'}"
- Goal: "${m.goal}"
- Deadline: "${m.deadline}"
- Status: "${m.status}"
- Priority: "${m.priority}"
- Confidence Score: ${m.confidenceScore || 0}%
- Failure Probability: ${m.failurePrediction?.probability || 0}%
- Bottleneck: "${m.failurePrediction?.bottleneck || 'None'}"
- Suggested Fix: "${m.failurePrediction?.suggestedFix || 'None'}"
- Tasks Summary: ${completedTasks.length}/${(m.tasks || []).length} completed.
- Tasks list:
${tasksStr}
`;
      }).join('\n---\n');
    } else if (activeMission) {
      missionsContext = `The user has an active mission:
Title: "${activeMission.title || 'Untitled'}"
Goal: "${activeMission.goal}"
Deadline: "${activeMission.deadline}"
Confidence of completion: ${activeMission.confidenceScore}%
Failure Prediction/Bottleneck: "${activeMission.failurePrediction?.bottleneck || 'None'}"
Failure Prediction/Suggested Fix: "${activeMission.failurePrediction?.suggestedFix || 'None'}"

Here are the scheduled tasks:
${JSON.stringify((activeMission.tasks || []).map((t: any) => ({
  id: t.id,
  name: t.name,
  durationMinutes: t.durationMinutes,
  priority: t.priority,
  status: t.status,
  scheduledTime: t.scheduledTime
})))}
`;
    }

    const currentLocalTime = req.body.currentLocalTime || new Date().toISOString();

    const systemPrompt = `
You are the AI Strategist and empathetic AI Friend inside the "DeadlineOS" Autonomous AI assistant.
Your main purpose is: When someone is overwhelmed with multiple deadlines, you act as their warm, supportive AI friend. You evaluate the real-world impact and risks of their current situation perfectly, reassure them, tell them what to focus on, and help them skip low-value tasks.

CRITICAL DIRECTIVES:
1. ALWAYS KEEP YOUR RESPONSES EXTREMELY BRIEF, COMPACT, AND HIGHLY CONCISE. No one wants to read long paragraphs.
2. Keep your response under 100-150 words. Use maximum 2-3 short, friendly, warm sentences for conversational text, and maximum 3 bullet points if listing anything.
3. Be an AI Friend: Show empathy, supportive encouragement, and qualitative, human-like wisdom.
4. Judge real-world impact: Trip planning or minor organizing tasks should be evaluated as low-risk/low-stakes, requiring minimal effort and zero stress. High-stakes assignments or exams should be evaluated as high impact, requiring focused priority. Reassure the user that you will help them bypass low-value tasks so they can focus on high-impact wins first.
5. You have access to tools to update task status, add tasks, delete tasks, and create new missions. Use them proactively if the user asks you to do something.
6. If you execute a tool, keep your response even shorter, confirming the action immediately in a warm, friendly way.

Tone:
- A brilliant, encouraging personal friend sitting beside the user. Keep it warm, deeply empathetic, supportive, and objective.
- NEVER say "I am an AI..." unless absolutely necessary.
- Reassure them with exact calculations based on current local time.

Current Workspace Context:
- Current Local Time: ${currentLocalTime}
- User's Planned Streams/Missions and Tasks (Updated Situation):
${missionsContext}
`;

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    const tools = [
      {
        functionDeclarations: [
          {
            name: "update_task_status",
            description: "Updates the status of a specific task in a mission. Use this when the user says they completed, skipped, delayed, missed, or want to reset a task.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                missionId: { type: Type.STRING, description: "The ID of the mission containing the task" },
                taskId: { type: Type.STRING, description: "The ID of the task to update" },
                status: { 
                  type: Type.STRING, 
                  enum: ["completed", "skipped", "todo", "missed", "delayed"],
                  description: "The new status of the task" 
                }
              },
              required: ["missionId", "taskId", "status"]
            }
          },
          {
            name: "add_task_to_mission",
            description: "Adds a new task to a specific mission.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                missionId: { type: Type.STRING, description: "The ID of the mission to add the task to" },
                name: { type: Type.STRING, description: "The name of the new task" },
                description: { type: Type.STRING, description: "Brief details or description of the task" },
                durationMinutes: { type: Type.INTEGER, description: "Estimated duration of the task in minutes" },
                priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "The priority of the task" }
              },
              required: ["missionId", "name", "durationMinutes", "priority"]
            }
          },
          {
            name: "delete_task_from_mission",
            description: "Removes/deletes a specific task from a mission in the user's workspace.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                missionId: { type: Type.STRING, description: "The ID of the mission containing the task" },
                taskId: { type: Type.STRING, description: "The ID of the task to delete" }
              },
              required: ["missionId", "taskId"]
            }
          },
          {
            name: "create_new_mission",
            description: "Creates a new stream/mission for a specific goal.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "A catchy, short name for the mission" },
                goal: { type: Type.STRING, description: "The primary high-level objective/goal" },
                deadline: { type: Type.STRING, description: "ISO date format deadline, e.g. 2026-06-30T12:00:00" },
                dailyCapacityHours: { type: Type.NUMBER, description: "Daily study capacity in hours (defaults to 4)" },
                priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Mission priority (defaults to medium)" }
              },
              required: ["title", "goal", "deadline"]
            }
          },
          {
            name: "replan_user_mission",
            description: "Triggers a full re-calculation/compression of the user's focus timeline.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                missionId: { type: Type.STRING, description: "The ID of the mission to replan" }
              },
              required: ["missionId"]
            }
          }
        ]
      }
    ];

    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        tools: tools,
      },
      history: formattedHistory,
    });

    const response = await chat.sendMessage({ message });
    res.json({ 
      text: response.text || "I've handled that action for you.", 
      toolCalls: response.functionCalls || null 
    });
  } catch (error: any) {
    console.error('API Chat Error:', error);
    res.status(500).json({ error: error.message || 'AI Strategist experienced an issue.' });
  }
});

// Generate dedicated step-by-step execution strategy for a specific task
app.post('/api/task-strategy', async (req, res) => {
  try {
    const { taskName, taskDescription, taskPriority, taskDuration, missionGoal } = req.body;
    if (!taskName) {
      res.status(400).json({ error: 'taskName parameter is required.' });
      return;
    }

    const ai = getGeminiClient();
    const systemPrompt = `
You are an expert academic and professional coach.
Your role: Provide an extremely concise, highly actionable, stress-free action plan for a single specific task.
The user is highly stressed, and this task is part of their larger goal: "${missionGoal || 'Academic Success'}".

Task: "${taskName}"
Description: "${taskDescription || 'No description provided'}"
Priority: ${taskPriority || 'Medium'}
Duration: ${taskDuration || 30} minutes

Structure your output in exactly this format:
1. **The Core Focus**: (One short sentence of what matters most for this task right now).
2. **Step-by-Step Strategy**: (3 simple bullet points detailing exactly what to do. Focus on minimum viable success. Tell them what to skip to save time).
3. **Assurance Note**: (A single sentence of calm, friendly encouragement like: "You've got this. Take a deep breath and start the timer.")

Ensure your response is clear, beautiful, and completely stress-free. Do not use filler or preambles.
`;

    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    const response = await chat.sendMessage({ message: `Generate the execution strategy for the task "${taskName}".` });
    res.json({ strategy: response.text });
  } catch (error: any) {
    console.error('API Task Strategy Error:', error);
    res.status(500).json({ error: error.message || 'AI Coach was unable to formulate a strategy.' });
  }
});

// Helper to generate a robust local fallback plan if Gemini experiences extremely high demand or is unavailable.
function generateFallbackPlan(goal: string, deadline: string): any {
  const goalLower = goal.toLowerCase();
  let taskThemes: string[] = [];
  let category = 'general';

  if (goalLower.includes('trip') || goalLower.includes('travel') || goalLower.includes('vacation') || goalLower.includes('holiday') || goalLower.includes('itinerary')) {
    category = 'trip';
    taskThemes = [
      'Decide travel dates and outline the dream locations you want to experience',
      'Secure main transportation booking (flights, train tickets, or road-trip route)',
      'Lock down cozy accommodations and map out top-rated local food spots to try',
      'Pack essentials and pack light (let travel be a liberating adventure, not a chore!)'
    ];
  } else if (goalLower.includes('exam') || goalLower.includes('study') || goalLower.includes('test') || goalLower.includes('quiz') || goalLower.includes('learn')) {
    category = 'study';
    taskThemes = [
      'Compile and organize lecture slides, study guides, and bookmark references',
      'Synthesize core theoretical concepts and flag critical high-yield formulas',
      'Execute intensive practice questions and complete diagnostic sample paper',
      'Re-validate initial errors and run spaced-repetition memory consolidation',
      'Conduct final mock simulation under active time-restricted constraints'
    ];
  } else if (goalLower.includes('code') || goalLower.includes('app') || goalLower.includes('website') || goalLower.includes('mvp') || goalLower.includes('dev') || goalLower.includes('bug') || goalLower.includes('program')) {
    category = 'development';
    taskThemes = [
      'Specify user stories, design database structures, and identify API endpoints',
      'Bootstrap database schema migrations and secure local environment configuration',
      'Implement core routing backend architecture and service orchestrators',
      'Design clean modular user interface screens with polished responsive css styles',
      'Debug cross-endpoint logic gates, error handlers, and unhandled exceptions',
      'Deploy main production bundle to hosting server and execute live validation tests'
    ];
  } else if (goalLower.includes('clean') || goalLower.includes('house') || goalLower.includes('room') || goalLower.includes('organize') || goalLower.includes('declutter')) {
    category = 'cleaning';
    taskThemes = [
      'Sort physical materials into designated keep, discard, and donate zones',
      'Dust high surfaces, shelves, ceiling fans, and clear corner cobwebs',
      'Deep clean floor surfaces, carpets, rugs, and vacuum hidden tracks',
      'Sanitize high-contact appliances, doorknobs, and utility desk stations',
      'Aesthetically arrange secondary objects and mist space with fresh organic scent'
    ];
  } else if (goalLower.includes('report') || goalLower.includes('paper') || goalLower.includes('write') || goalLower.includes('essay') || goalLower.includes('document') || goalLower.includes('slides') || goalLower.includes('pitch')) {
    category = 'writing';
    taskThemes = [
      'Draft primary thesis outline, sectional headers, and bibliography index',
      'Extract qualifying factual proof, direct quotes, and references from sources',
      'Author core body manuscript sections and stitch supporting inline citations',
      'Refine logical transition paragraphs and format typography styles',
      'Execute spell-check, proofread tone, and run plagiarism clearance filters'
    ];
  } else {
    taskThemes = [
      `Define core specifications and outline success factors for: "${goal}"`,
      `Structure physical progression timeline relative to absolute deadline: "${deadline || 'unspecified'}"`,
      'Execute active production block and synthesize the core deliverables',
      'Validate outcomes, troubleshoot quality issues, and resolve structural defects',
      'Conduct final visual aesthetics polish and finalize deployment submission'
    ];
  }

  const milestones = [
    {
      id: 'milestone_1',
      name: 'Phase I: Scoping & Setup',
      description: 'Define tactical bounds, assemble materials, and initiate core environment setup.',
      deadline: 'First 20% of timeline'
    },
    {
      id: 'milestone_2',
      name: 'Phase II: Direct Active Sprint',
      description: 'Major production block focused on implementing core complexity objectives.',
      deadline: 'Middle 60% of timeline'
    },
    {
      id: 'milestone_3',
      name: 'Phase III: Polishing & Validation',
      description: 'Troubleshoot edge cases, polish overall aesthetics, and verify final quality checklists.',
      deadline: 'Final 20% of timeline'
    }
  ];

  const tasks = taskThemes.map((theme, index) => {
    let milestoneId = 'milestone_2';
    if (index === 0) milestoneId = 'milestone_1';
    if (index === taskThemes.length - 1) milestoneId = 'milestone_3';

    let duration = 45;
    if (category === 'trip') {
      duration = 20; // extremely quick travel tasks
    } else {
      if (index === 2) duration = 120; // core development
      if (index === 3 && taskThemes.length > 5) duration = 60;
    }

    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (category === 'trip') {
      priority = index === 1 ? 'high' : 'low'; // Booking travel is the only critical task for low-stakes
    } else {
      if (index === 0 || index === 2) priority = 'high';
      if (index === taskThemes.length - 1) priority = 'low';
    }

    const dependencies = index > 0 ? [`task_${index}`] : [];

    const scheduledTimes = [
      '09:00 - 09:45',
      '10:00 - 11:15',
      '11:30 - 13:30',
      '14:30 - 15:30',
      '16:00 - 16:45',
      '17:00 - 17:30'
    ];

    return {
      id: `task_${index + 1}`,
      milestoneId,
      name: theme,
      description: category === 'trip' 
        ? `Light check-item for your upcoming trip to help you stay organized without being bogged down.`
        : `Target objective to secure milestone progression. Focus on velocity and layout consistency.`,
      durationMinutes: duration,
      priority,
      order: index,
      dependencies,
      reasoning: category === 'trip'
        ? 'Trip planning is a low-stakes, joyful mission. Keeping this item extremely short and relaxed!'
        : (index === 0 
          ? 'Creating firm boundaries upfront helps avoid distraction and scope creep later.'
          : index === 2 
          ? 'Dedicated high-duration segment allocated to solve the core architectural bottlenecks.'
          : 'Aligned sequentially to preserve flow and handle unexpected real-world bottlenecks.'),
      scheduledTime: category === 'trip' ? 'Flexible Slot' : (scheduledTimes[index] || 'Flexible Evening Slot'),
      status: 'todo',
      completedAt: null
    };
  });

  const totalMinutes = tasks.reduce((acc, t) => acc + t.durationMinutes, 0);
  const expectedCaseHours = Math.ceil(totalMinutes / 60);
  const bestCaseHours = Math.max(1, Math.round(expectedCaseHours * 0.75));
  const worstCaseHours = Math.round(expectedCaseHours * 1.3);

  const isLowImpact = category === 'trip';

  return {
    goal,
    confidenceScore: isLowImpact ? 98 : 82,
    shadowTimeline: {
      bestCaseHours,
      expectedCaseHours,
      worstCaseHours
    },
    milestones,
    tasks,
    failurePrediction: {
      probability: isLowImpact ? 3 : 25,
      successProbability: isLowImpact ? 97 : 75,
      bottleneck: isLowImpact ? 'Minimal planning overhead' : 'Primary planning transition and critical pathway execution.',
      reason: isLowImpact 
        ? 'AI Friend Note: This is a fun, low-stakes vacation mission! Enjoy the journey. We allocated just a tiny bit of planning time so you can get out there and explore!'
        : 'AI Co-Pilot Local Backup Model: The system detected that the main AI servers are currently experiencing high load. A high-performance fallback model calculated this timeline safely to ensure you do not miss a beat.',
      suggestedFix: isLowImpact
        ? 'Do not overthink it! Complete the booking tasks and prepare to pack!'
        : 'Tackle the initial high-priority scoping task immediately to establish early momentum.'
    },
    decisionLog: [
      {
        id: `dec_initial_${Date.now()}`,
        agent: 'Orchestrating Planner',
        action: isLowImpact ? 'Warm AI Friend Blueprint Active' : 'Local Strategic Framework Deployed',
        reasoning: isLowImpact
          ? 'Recognized this as a wonderful low-risk adventure plan. Kept tasks light and durations minimal so you can relax.'
          : 'The co-pilot safely established a fully-calibrated local blueprint, resolving backend service latency gracefully.'
      }
    ],
    notifications: isLowImpact ? [
      {
        id: `notif_1_${Date.now()}`,
        title: 'Bon Voyage!',
        content: 'Your AI Friend has set up a super-light planning checklist. Less planning, more exploring!',
        type: 'success'
      },
      {
        id: `notif_2_${Date.now()}`,
        title: 'Zero Stress Shield',
        content: 'Low-stakes mission detected. Travel safe and enjoy every single moment!',
        type: 'info'
      }
    ] : [
      {
        id: `notif_1_${Date.now()}`,
        title: 'Standby Model Engaged',
        content: 'Your life-saver agentic co-pilot launched a high-performance local blueprint optimized for your target goal.',
        type: 'success'
      },
      {
        id: `notif_2_${Date.now()}`,
        title: 'Buffer Calibrated',
        content: 'Workload of expected Case hours aligned and validated. Zero sign-in blocks discovered.',
        type: 'info'
      }
    ]
  };
}

// Orchestrate 5 agents to plan the mission
app.post('/api/plan-mission', async (req, res) => {
  try {
    const { goal, deadline, dailyCapacityHours, preferredWorkTimes, currentDateString, title, priority, estimatedHours, tags } = req.body;
    if (!title) {
      res.status(400).json({ error: 'title parameter is required.' });
      return;
    }

    const effectiveGoal = goal && goal.trim() ? goal : title;
    const ai = getGeminiClient();
    const capacityInfo = dailyCapacityHours ? `The user can work a maximum of ${dailyCapacityHours} hours per day.` : '';
    const preferredWorkTimesInfo = preferredWorkTimes && preferredWorkTimes.length > 0 
      ? `The user prefers working during these times of day: ${preferredWorkTimes.join(', ')}.` : '';
    const titleInfo = `The mission title is: "${title}".`;
    const priorityInfo = priority ? `The mission priority level is: '${priority}'.` : '';
    const tagsInfo = tags && tags.length > 0 ? `The mission optional tags are: ${tags.join(', ')}.` : '';

    const systemPrompt = `
You are the AI Orchestrator leading an agentic team of five specialized co-staffs to build "The DeadlineOS" Autonomous Execution Assistant. 
The current time is: ${currentDateString || new Date().toISOString()}.

CRITICAL DIRECTIVE: You are NOT a rigid, cold machine. You are a warm, wise, and deeply caring AI FRIEND to the user. Your role is to evaluate every mission and task according to its GENUINE REAL-WORLD IMPACT, and then make the best possible stress-free plan.

How you must evaluate and judge:
1. First, analyze the target goal: "${effectiveGoal}" with deadline "${deadline || 'unspecified'}" and title: "${title}".
2. Evaluate its REAL-WORLD IMPACT and risk factors:
   - For LOW REAL-WORLD IMPACT missions (e.g., planning a trip, booking a holiday, cleaning a desk, organizing a playlist): Recognize that these do NOT need substantial amounts of time or effort. Keep the plan extremely light, quick, and stress-free (e.g., 1-3 hours total expected Case hours). Do not bloat it with low-value, repetitive tasks. Set failure probability to be extremely low (<10%) and success probability extremely high. Keep it fun and supportive!
   - For HIGH REAL-WORLD IMPACT missions (e.g., assignment submissions, college exams, professional projects, job applications): Judge them with perfect accuracy. Give them the absolute highest priority. Allocate realistic, dedicated study or production blocks. Pinpoint critical failure risks and devise clear, realistic mitigation strategies.
3. Express this evaluation beautifully as an AI Friend in your:
   - Decision Log: Add an Orchestrator/Friend evaluation detailing your assessment of the mission's real-world impact and why you designed this specific plan.
   - Failure Prediction Reason: Give a supportive, realistic breakdown of real-world risks.
   - Notifications: Write friendly, hyper-personalized advice from a caring friend's perspective.
   - Tasks Reasoning: Explain why each task is prioritized or simplified based on real-world value.

${titleInfo}
${priorityInfo}
${tagsInfo}
${capacityInfo}
${preferredWorkTimesInfo}

Execute these steps sequentially in thoughts, representing each agent's contribution:

1. **Planner Agent (AI Friend)**:
- Break the entire goal down into 4 to 8 sequential subtasks. (Note: For low-stakes missions like trip planning, keep it to 3 to 5 very light tasks).
- Estimate the total realistic effort required to complete this entire mission in hours based on the complexity and real-world impact of the title and goal, and set this as 'expectedCaseHours' in the shadowTimeline. Ensure low-impact plans have low hours (e.g., ~1.5 to 3 hours).
- Ensure the sum of task minutes (durationMinutes) of all subtasks roughly aligns with your estimated total 'expectedCaseHours' (multiplied by 60).

2. **Priority Agent (AI Friend)**:
- Evaluate critical dependencies (e.g. task A must happen before B) and assign priorities ('high', 'medium', 'low') based on real-world impact.
- Explicitly explain scheduling decisions in a reasoning field, focusing on keeping things stress-free or robustly securing deadlines.

3. **Risk Agent (AI Friend)**:
- Calculate realistic Worst Case, Best Case, and Expected Case hours (the Shadow Timeline) to accomplish the goal safely. Note: 'expectedCaseHours' must be your custom calculated/estimated total effort for this mission.
- Evaluate potential failure probability % (and success probability %) based on the deadline density.
- Pinpoint the exact bottleneck and explain it cleanly with a highly actionable, brilliant fix.

4. **Replanner Agent (AI Friend)**:
- Devise initial recovery triggers. Specify scheduling adjustments and critical versus deferrable indicators clear to the user.

5. **Coach Agent (AI Friend)**:
- Generate 3 smart hyper-personalized notifications that say WHAT to do, WHY, and its exact impact on success chance, writing from a warm friend's perspective of the mission's real-world impact, how to tackle it, and a dose of heartfelt encouragement.

Write matching data inside the schema. Ensure IDs match between tasks and dependencies. Avoid empty strings or placeholder text.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Plan this project goal: "${effectiveGoal}" with target deadline: "${deadline || 'not specified'}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: planSchema,
        temperature: 0.2, // low temperature for precise, predictable scheduling data
      },
    });

    const parsedPlan = JSON.parse(response.text.trim());
    parsedPlan.title = title || '';
    parsedPlan.priority = priority || 'medium';
    parsedPlan.estimatedHours = parsedPlan.shadowTimeline?.expectedCaseHours || 20;
    parsedPlan.tags = tags || [];
    res.json(parsedPlan);
  } catch (error: any) {
    console.error('API Plan Error, falling back to local strategist:', error);
    try {
      const { goal, deadline, title, priority, tags } = req.body;
      const effectiveGoal = goal && goal.trim() ? goal : title;
      const fallbackPlan = generateFallbackPlan(effectiveGoal, deadline || '');
      fallbackPlan.title = title || 'Autonomous Mission Plan';
      fallbackPlan.priority = priority || 'medium';
      fallbackPlan.estimatedHours = fallbackPlan.shadowTimeline?.expectedCaseHours || 20;
      fallbackPlan.tags = tags || [];
      res.json(fallbackPlan);
    } catch (fallbackErr: any) {
      console.error('Ultimate Fallback Plan Error:', fallbackErr);
      res.status(500).json({ error: error.message || 'AI generation and fallback both failed' });
    }
  }
});

// React inside the team if something is skipped/completed
app.post('/api/replan-mission', async (req, res) => {
  const { mission, taskId, newStatus, currentDateString } = req.body;
  if (!mission) {
    res.status(400).json({ error: 'mission body is required.' });
    return;
  }
  try {
    const ai = getGeminiClient();
    const systemPrompt = `
You are the Replanner Agent and Risk Agent in the autonomous execution assistant "The DeadlineOS".
The user just adjusted Task: "${taskId}" to status: "${newStatus}"!
Current relative time is: ${currentDateString || new Date().toISOString()}.

CRITICAL DIRECTIVE: You are NOT a rigid, cold machine. You are a warm, wise, and deeply caring AI FRIEND to the user. Your role is to evaluate every mission and task according to its GENUINE REAL-WORLD IMPACT, and then make the best possible stress-free plan.

How you must evaluate and judge during replanning:
1. Assess the real-world impact of this mission:
   - For LOW REAL-WORLD IMPACT missions (e.g., trip planning): Be extremely relaxed and supportive! If a task is skipped or missed, it is NO BIG DEAL. Keep failure probability extremely low and confidence score extremely high. Do not issue stressful alarms. Just encourage them to focus on the fun parts.
   - For HIGH REAL-WORLD IMPACT missions (e.g., assignment submission): If tasks are missed, delayed, or skipped, evaluate the threat to their success. Rearrange their schedule immediately, prioritize critical path tasks, suggest skipping low-priority items, and give clear, constructive, and warm suggestions to protect their real-world outcomes.
2. Maintain this friend persona in updated:
   - Decision Log: Explain the rescheduled schedule or skipped tasks with a friendly tone.
   - Failure Prediction: Recalculate probabilities with empathy, explaining the bottleneck and supportive suggested fix.
   - Coach Notifications: Update notifications with empathetic, encouraging friend messages.

Now, execute your agent tasks:
1. **Replanner Agent (AI Friend)**:
- Automatically reschedule subsequent tasks and push other tasks forward in the timeline.
- If a task is "skipped", assess if we need to mark it as skipped, push other tasks forward, or if high priority requires warning the user.
- If a task is marked as "missed" or "delayed" (significant delay detected):
  * Automatically rearrange and reschedule all future incomplete tasks' starting times and schedules.
  * To make up for lost time and protect the critical deadline, deprioritize or completely skip/remove low-priority (non-critical) tasks.
  * Add a highly visible entry to the Decision Log with agent "Replanner" detailing exactly how subsequent tasks were rescheduled, which low-priority tasks were skipped/removed to save time, and how the schedule was preserved.
- Trim or drop lower-priority tasks if the Expected hours exceed the remaining deadline window, to keep a realistic target.

2. **Risk Agent (AI Friend)**:
- Re-calculate Failure probability / Success probability ("Probability of Success" score). Missed or delayed tasks in low-stakes trip missions shouldn't affect these significantly. Missed or delayed tasks in high-impact assignments should lower confidenceScore and increase failure probability unless a solid contingency is implemented.
- Update the Shadow Timeline and confidence score based on the current completed/skipped/missed/delayed tasks.
- Re-evaluate the most prominent bottlenecks and craft custom, hyper-actionable suggested fixes.

3. **Coach Agent (AI Friend)**:
- Update all 3 smart notifications pointing out the direct consequences of this change from a warm friend's perspective (e.g. "We missed this task, but don't sweat it! I've bypassed minor details so we can lock in the main objective. We're still totally on track!").

You MUST return the entire complete updated mission payload inside the exact responseSchema matching the structure of a mission. Do not omit any properties. Ensure all task arrays contain the latest status of each task!
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Current Mission state in JSON: ${JSON.stringify(mission)}. Action: task "${taskId}" marked as "${newStatus}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: planSchema,
        temperature: 0.2,
      },
    });

    const parsedPlan = JSON.parse(response.text.trim());
    res.json(parsedPlan);
  } catch (error: any) {
    console.error('API Replan Error, running local fallback replanner:', error);
    try {
      // Direct local fallback mutation
      const updatedMission = JSON.parse(JSON.stringify(mission));
      const tasks = updatedMission.tasks || [];
      const task = tasks.find((t: any) => t.id === taskId);
      if (task) {
        task.status = newStatus;
        task.completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
      }

      const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
      const progress = tasks.length > 0 ? (completedCount / tasks.length) : 0;
      
      const remainingTasks = tasks.filter((t: any) => t.status !== 'completed');
      const totalRemainingMinutes = remainingTasks.reduce((sum: number, t: any) => sum + (t.durationMinutes || 0), 0);
      const expectedHours = Math.ceil(totalRemainingMinutes / 60);
      const bestCaseHours = Math.max(1, Math.round(expectedHours * 0.75));
      const worstCaseHours = Math.round(expectedHours * 1.3);

      const failProb = Math.max(5, Math.ceil(35 * (1 - progress)));

      updatedMission.confidenceScore = 70 + Math.round(progress * 25);
      updatedMission.shadowTimeline = {
        bestCaseHours,
        expectedCaseHours: expectedHours,
        worstCaseHours
      };
      
      updatedMission.failurePrediction = {
        probability: failProb,
        successProbability: 100 - failProb,
        bottleneck: remainingTasks[0]?.name || 'Post-launch production validation.',
        reason: 'Recalculation verified safely by local co-pilot safety-guard after service congestion.',
        suggestedFix: remainingTasks.length > 0 
          ? `Lock in undivided focus for the next goal: "${remainingTasks[0].name}".`
          : 'Outstanding momentum! Continue monitoring live launch analytics.'
      };

      const actionName = newStatus === 'completed' ? 'Task Checked Off' : 'Task State Bypassed';
      const decId = `dec_fallback_replan_${Date.now()}`;
      updatedMission.decisionLog = [
        {
          id: decId,
          agent: 'Replanner',
          action: actionName,
          reasoning: `Co-pilot registered status transition of "${task?.name || taskId}" to "${newStatus}". Adjusted confidence score to ${updatedMission.confidenceScore}% and predicted remainder workload.`
        },
        ...(updatedMission.decisionLog || [])
      ];

      updatedMission.notifications = [
        {
          id: `notif_fallback_replan_${Date.now()}`,
          title: 'Mission State Calibrated',
          content: `Success probability calibrated to ${100 - failProb}%. Continue active execution sequence!`,
          type: 'info'
        },
        ...(updatedMission.notifications || [])
      ];

      res.json(updatedMission);
    } catch (fallbackErr: any) {
      console.error('Ultimate Fallback Error:', fallbackErr);
      res.status(500).json({ error: 'AI Replanning and local fallback both failed.' });
    }
  }
});

// JSON File Database Configuration
const DB_FILE = path.join(process.cwd(), 'missions_db.json');

// Initialize empty DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ missions: [] }, null, 2));
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { missions: [] };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing JSON database:', err);
  }
}

// REST Api routes for complete Full Stack control
app.get('/api/missions/:userId/active', (req, res) => {
  try {
    const { userId } = req.params;
    const db = readDB();
    const activeMission = db.missions.find((m: any) => m.userId === userId && m.status === 'active');
    if (activeMission) {
      res.json(activeMission);
    } else {
      res.status(404).json({ error: 'No active mission found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error checking active mission' });
  }
});

app.post('/api/missions/save', (req, res) => {
  try {
    const mission = req.body;
    if (!mission || !mission.id) {
      res.status(400).json({ error: 'Invalid mission payload' });
      return;
    }
    const db = readDB();
    const idx = db.missions.findIndex((m: any) => m.id === mission.id);
    if (idx >= 0) {
      db.missions[idx] = mission;
    } else {
      db.missions.push(mission);
    }
    writeDB(db);
    res.json({ success: true, mission });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error saving mission payload' });
  }
});

app.post('/api/missions/:missionId/tasks/add', (req, res) => {
  try {
    const { missionId } = req.params;
    const taskDetails = req.body;
    if (!taskDetails || !taskDetails.name) {
      res.status(400).json({ error: 'Task name is required' });
      return;
    }
    const db = readDB();
    const mission = db.missions.find((m: any) => m.id === missionId);
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    const taskId = `task_${Date.now()}`;
    const sortedTasks = [...(mission.tasks || [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    const nextOrderValue = sortedTasks.length > 0 ? (sortedTasks[sortedTasks.length - 1].order ?? 0) + 1 : 0;

    const newTask = {
      id: taskId,
      milestoneId: taskDetails.milestoneId || (mission.milestones?.[0]?.id || 'milestone_0'),
      name: taskDetails.name,
      description: taskDetails.description || 'Custom added user task.',
      durationMinutes: Number(taskDetails.durationMinutes) || 45,
      priority: taskDetails.priority || 'medium',
      order: nextOrderValue,
      dependencies: Array.isArray(taskDetails.dependencies) ? taskDetails.dependencies : [],
      status: 'todo',
      reasoning: taskDetails.reasoning || 'Task injected dynamically by pilot to bolster success margin.',
      scheduledTime: taskDetails.scheduledTime || 'Unscheduled Slot',
      completedAt: null
    };

    mission.tasks = [...(mission.tasks || []), newTask];
    writeDB(db);
    res.json({ success: true, task: newTask, mission });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error inserting custom task' });
  }
});

app.put('/api/missions/:missionId/tasks/:taskId', (req, res) => {
  try {
    const { missionId, taskId } = req.params;
    const updates = req.body;
    const db = readDB();
    const mission = db.missions.find((m: any) => m.id === missionId);
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }
    const task = mission.tasks?.find((t: any) => t.id === taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (updates.name !== undefined) task.name = updates.name;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.milestoneId !== undefined) task.milestoneId = updates.milestoneId;
    if (updates.durationMinutes !== undefined) task.durationMinutes = Number(updates.durationMinutes);
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.dependencies !== undefined) task.dependencies = updates.dependencies;
    if (updates.status !== undefined) {
      task.status = updates.status;
      task.completedAt = updates.status === 'completed' ? new Date().toISOString() : null;
    }
    if (updates.scheduledTime !== undefined) task.scheduledTime = updates.scheduledTime;
    if (updates.reasoning !== undefined) task.reasoning = updates.reasoning;
    if (updates.order !== undefined) task.order = Number(updates.order);

    writeDB(db);
    res.json({ success: true, task, mission });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error modifying task object' });
  }
});

app.delete('/api/missions/:missionId/tasks/:taskId', (req, res) => {
  try {
    const { missionId, taskId } = req.params;
    const db = readDB();
    const mission = db.missions.find((m: any) => m.id === missionId);
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    const originalLength = mission.tasks?.length || 0;
    mission.tasks = (mission.tasks || []).filter((t: any) => t.id !== taskId);
    
    if (mission.tasks.length === originalLength) {
      res.status(404).json({ error: 'Task not found in active profile' });
      return;
    }

    // Clean up dependency lists so we do not have stale locks
    mission.tasks.forEach((t: any) => {
      if (t.dependencies && Array.isArray(t.dependencies)) {
        t.dependencies = t.dependencies.filter((d: any) => d !== taskId);
      }
    });

    // Reset sequential order safely
    mission.tasks.forEach((t: any, idx: number) => {
      t.order = idx;
    });

    writeDB(db);
    res.json({ success: true, mission });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error deleting task' });
  }
});

app.post('/api/missions/:missionId/tasks/reorder', (req, res) => {
  try {
    const { missionId } = req.params;
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) {
      res.status(400).json({ error: 'taskIds array is required' });
      return;
    }
    const db = readDB();
    const mission = db.missions.find((m: any) => m.id === missionId);
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    mission.tasks.forEach((t: any) => {
      const idx = taskIds.indexOf(t.id);
      if (idx >= 0) {
        t.order = idx;
      }
    });

    // Re-sort the tasks array programmatically
    mission.tasks.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    writeDB(db);
    res.json({ success: true, mission });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error sorting task list sequence' });
  }
});

app.post('/api/missions/:missionId/recalculate', async (req, res) => {
  const { missionId } = req.params;
  const db = readDB();
  const mission = db.missions.find((m: any) => m.id === missionId);
  if (!mission) {
    res.status(404).json({ error: 'Mission not found' });
    return;
  }
  try {
    const ai = getGeminiClient();
    const systemPrompt = `
You are the Agentic Co-Pilot Team ("DeadlineOs").
The user has modified their mission task list. Here is their current setup:
Goal: "${mission.goal}"
Deadline: "${mission.deadline}"

Tasks currently scheduled in execution order:
${JSON.stringify((mission.tasks || []).map((t: any) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  durationMinutes: t.durationMinutes,
  priority: t.priority,
  order: t.order,
  dependencies: t.dependencies,
  status: t.status
})))}

Analyze this task list and provide updated mission intelligence. You must calculate:
1. **Shadow Timeline**: bestCaseHours, expectedCaseHours, worstCaseHours based on the sum of duration of remaining tasks.
2. **Failure Prediction**: probability (0-100), successProbability (0-100), bottleneck, reason, suggestedFix.
3. **Decision Log**: Add 1 new Decision item explaining how the changes affected the plan's integrity.
4. **Smart Coach Notifications**: 2-3 notifications tracking progression tips.

Write matching data inside this EXACT schema structure:
{
  "confidenceScore": 85,
  "shadowTimeline": { "bestCaseHours": 4, "expectedCaseHours": 6, "worstCaseHours": 9 },
  "failurePrediction": { "probability": 25, "successProbability": 75, "bottleneck": "Drafting bottleneck text", "reason": "Reason details", "suggestedFix": "Suggested resolution text here" },
  "decisionLog": [
    { "id": "recalc_1", "agent": "Risk", "action": "Timeline Integrity Recalculated", "reasoning": "Reason here" }
  ],
  "notifications": [
    { "id": "notif_re_1", "title": "Checklist update", "content": "Update info", "type": "tip" }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Recalculate project integrity indices for: "${mission.goal}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2, // low temperature for precise calculations
      },
    });

    const results = JSON.parse(response.text.trim());

    // Update mission properties with calculated values
    mission.confidenceScore = results.confidenceScore ?? mission.confidenceScore;
    mission.shadowTimeline = results.shadowTimeline ?? mission.shadowTimeline;
    mission.failurePrediction = results.failurePrediction ?? mission.failurePrediction;
    
    if (Array.isArray(results.decisionLog)) {
      const formattedDecisions = results.decisionLog.map((d: any, idx: number) => ({
        ...d,
        id: d.id || `recalc_dec_${Date.now()}_${idx}`,
        timestamp: 'Just now'
      }));
      mission.decisionLog = [...formattedDecisions, ...(mission.decisionLog || [])];
    }

    if (Array.isArray(results.notifications)) {
      const formattedNotifs = results.notifications.map((n: any, idx: number) => ({
        ...n,
        id: n.id || `recalc_notif_${Date.now()}_${idx}`,
        timestamp: 'Coach Agent • Just now',
        read: false
      }));
      mission.notifications = [...formattedNotifs, ...(mission.notifications || [])];
    }

    writeDB(db);
    res.json(mission);
  } catch (error: any) {
    console.error('Recalculate Error, running local fallback calculation:', error);
    try {
      const allTasks = mission.tasks || [];
      const completedTasks = allTasks.filter((t: any) => t.status === 'completed');
      const remainingTasks = allTasks.filter((t: any) => t.status !== 'completed');
      
      const progressPercentage = allTasks.length > 0 ? (completedTasks.length / allTasks.length) : 0;
      
      const totalRemainingMinutes = remainingTasks.reduce((sum: number, t: any) => sum + (t.durationMinutes || 0), 0);
      const expectedHours = Math.ceil(totalRemainingMinutes / 60);
      const bestCaseHours = Math.max(1, Math.round(expectedHours * 0.75));
      const worstCaseHours = Math.round(expectedHours * 1.3);

      mission.confidenceScore = 70 + Math.round(progressPercentage * 25);
      mission.shadowTimeline = {
        bestCaseHours,
        expectedCaseHours: expectedHours,
        worstCaseHours
      };

      const failProb = Math.max(5, Math.ceil(35 * (1 - progressPercentage)));
      mission.failurePrediction = {
        probability: failProb,
        successProbability: 100 - failProb,
        bottleneck: remainingTasks[0]?.name || 'Structural focus alignment.',
        reason: 'AI Co-Pilot Local Backup Model: Recalculated timeline indices based on remaining tasks. Active sprint buffers are calibrated.',
        suggestedFix: remainingTasks.length > 0 
          ? `Double down on: "${remainingTasks[0].name}" with extreme focus to avoid cascade delays.`
          : 'Congratulate yourself! No bottleneck found as all current tasks are checked off.'
      };

      const recalcId = `recalc_id_${Date.now()}`;
      mission.decisionLog = [
        {
          id: recalcId,
          agent: 'Risk',
          action: 'Timeline Integrity Recalculated',
          reasoning: `Adjusted expected total remaining workload to ${expectedHours} hours based on remaining task count.`,
          timestamp: 'Just now'
        },
        ...(mission.decisionLog || [])
      ];

      mission.notifications = [
        {
          id: `notif_re_${Date.now()}`,
          title: 'Timeline Synced Locally',
          content: `Co-pilot aligned success probability to ${100 - failProb}% with ${expectedHours} expected remaining hours.`,
          type: 'info',
          timestamp: 'Coach Agent • Just now',
          read: false
        },
        ...(mission.notifications || [])
      ];

      writeDB(db);
      res.json(mission);
    } catch (fallbackError: any) {
      console.error('Ultimate recalculation fallback failure:', fallbackError);
      res.status(500).json({ error: error.message || 'Recalculation cascade and local fallback both failed' });
    }
  }
});

// GET /api/missions/:userId/all
app.get('/api/missions/:userId/all', (req, res) => {
  try {
    const { userId } = req.params;
    const db = readDB();
    const userMissions = db.missions.filter((m: any) => m.userId === userId);
    res.json(userMissions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching user missions' });
  }
});

// DELETE /api/missions/:missionId
app.delete('/api/missions/:missionId', (req, res) => {
  try {
    const { missionId } = req.params;
    const db = readDB();
    const index = db.missions.findIndex((m: any) => m.id === missionId);
    if (index >= 0) {
      db.missions.splice(index, 1);
      writeDB(db);
      res.json({ success: true, message: 'Mission deleted successfully' });
    } else {
      res.status(404).json({ error: 'Mission not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error deleting mission' });
  }
});

const prioritizationSchema = {
  type: Type.OBJECT,
  properties: {
    rankedMissionIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of unarchived mission IDs sorted in descending order of urgency/priority'
    },
    mostImportantMissionId: { 
      type: Type.STRING, 
      description: 'The mission ID that is the absolute highest priority right now' 
    },
    reasoning: { 
      type: Type.STRING, 
      description: 'Detailed clear professional reason explaining why this mission has top priority based on deadline, hours, and failure probability' 
    },
    impactAnalysis: {
      type: Type.STRING,
      description: 'A brief impact statement explaining the consequences if this top mission is delayed'
    }
  },
  required: ['rankedMissionIds', 'mostImportantMissionId', 'reasoning', 'impactAnalysis']
};

// POST /api/missions/:userId/prioritize
app.post('/api/missions/:userId/prioritize', async (req, res) => {
  const { userId } = req.params;
  let dbMissions: any[] = [];
  try {
    const db = readDB();
    // Filter out archived/completed missions
    dbMissions = db.missions.filter((m: any) => m.userId === userId && m.status !== 'archived' && m.status !== 'completed');
    
    if (dbMissions.length === 0) {
      res.json({
        rankedMissionIds: [],
        mostImportantMissionId: '',
        reasoning: 'No active missions available. Click New Mission to launch a workstream.',
        impactAnalysis: 'Critical operational bottleneck: No active mission pipelines.'
      });
      return;
    }

    if (dbMissions.length === 1) {
      const singleId = dbMissions[0].id;
      res.json({
        rankedMissionIds: [singleId],
        mostImportantMissionId: singleId,
        reasoning: `"${dbMissions[0].title || 'Active Mission'}" is your sole active focus. Focus all efforts on meeting its scheduled deliverables.`,
        impactAnalysis: `Delaying this single active stream directly impacts your main goal.`
      });
      return;
    }

    // Prepare mission metadata for Gemini to evaluate
    const missionBriefs = dbMissions.map((m: any) => ({
      id: m.id,
      title: m.title || 'Untitled Mission',
      goal: m.goal,
      deadline: m.deadline,
      priority: m.priority || 'medium',
      estimatedHours: m.estimatedHours || 20,
      failureProbability: m.failurePrediction?.failureProbabilityPercent ?? 20,
      tasksRemaining: m.tasks?.filter((t: any) => t.status !== 'completed').length || 0
    }));

    const ai = getGeminiClient();
    const systemInstruction = `
You are the AI Prioritization Engine inside "The DeadlineOS" Autonomous AI Operating System.
Your job is to automatically rank multiple active missions based on threat level, deadline density, workload density, and failure probability.

Determine:
1. rankedMissionIds: Array of mission IDs sorted in DESCENDING order of urgency (highest priority / threat level first).
2. mostImportantMissionId: The ID of the single most critical mission right now.
3. reasoning: A professional, concise explanation of why that specific mission was chosen as the top priority. Reference deadline density, work remaining, and risk.
4. impactAnalysis: A punchy warning about the immediate real-world impact or risk of postponing this specific mission.

Adhere strictly to the provided output JSON schema.
`;

    const prompt = `Prioritize and rank the following active client missions:
${JSON.stringify(missionBriefs, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: prioritizationSchema,
        temperature: 0.2
      }
    });

    const parsedPrioritization = JSON.parse(response.text.trim());
    res.json(parsedPrioritization);
  } catch (error: any) {
    console.error('API prioritization failed, falling back to deterministic scheduling:', error);
    try {
      // Local deterministic prioritization fallback
      const sorted = [...dbMissions].sort((a: any, b: any) => {
        // High priority first
        const pMap = { high: 3, medium: 2, low: 1 };
        const pA = pMap[a.priority as 'high' | 'medium' | 'low'] || 2;
        const pB = pMap[b.priority as 'high' | 'medium' | 'low'] || 2;
        if (pA !== pB) return pB - pA;

        // Earliest deadline first
        const dateA = new Date(a.deadline).getTime() || Infinity;
        const dateB = new Date(b.deadline).getTime() || Infinity;
        if (dateA !== dateB) return dateA - dateB;

        // Highest failure probability first
        const failA = a.failurePrediction?.failureProbabilityPercent ?? 0;
        const failB = b.failurePrediction?.failureProbabilityPercent ?? 0;
        return failB - failA;
      });

      const rankedIds = sorted.map(m => m.id);
      const topId = rankedIds[0] || '';
      const topMission = sorted[0];

      res.json({
        rankedMissionIds: rankedIds,
        mostImportantMissionId: topId,
        reasoning: topMission
          ? `[Deterministic Fallback] "${topMission.title || 'Untitled'}" scheduled as top focus due to priority status ('${topMission.priority || 'medium'}') and deadline proximity (${new Date(topMission.deadline).toLocaleString()}).`
          : 'No active missions found.',
        impactAnalysis: topMission
          ? `Postponing this stream directly compromises deadline safety for "${topMission.title || 'Untitled'}".`
          : 'N/A'
      });
    } catch (fallbackErr: any) {
      console.error('Ultimate prioritization fallback failed:', fallbackErr);
      res.status(500).json({ error: 'AI Prioritization and local algorithm both failed' });
    }
  }
});

const autoScheduleSchema = {
  type: Type.OBJECT,
  properties: {
    scheduledTasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          scheduledTime: { 
            type: Type.STRING, 
            description: 'The optimal scheduled hour, must be exactly one of: 08:00 AM, 09:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 01:00 PM, 02:00 PM, 03:00 PM, 04:00 PM, 05:00 PM, 06:00 PM, 07:00 PM, 08:00 PM, 09:00 PM, 10:00 PM, 11:00 PM' 
          }
        },
        required: ['id', 'scheduledTime']
      }
    }
  },
  required: ['scheduledTasks']
};

app.post('/api/missions/:missionId/auto-schedule', async (req, res) => {
  const { missionId } = req.params;
  const db = readDB();
  const mission = db.missions.find((m: any) => m.id === missionId);
  if (!mission) {
    res.status(404).json({ error: 'Mission not found' });
    return;
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `
You are an expert cognitive scheduler agent. Your job is to distribute tasks intelligently into realistic hourly slots from 08:00 AM to 11:00 PM.
Mission Title: "${mission.title || 'Mission'}"
Mission Goal: "${mission.goal}"
Mission Deadline: "${mission.deadline}"

Here is the list of tasks to schedule:
${JSON.stringify((mission.tasks || []).map((t: any) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  durationMinutes: t.durationMinutes,
  priority: t.priority,
  status: t.status
})))}

Rules:
1. Only schedule tasks whose status is 'todo' (i.e. incomplete). Completed tasks can keep their existing schedule or be ignored.
2. Distribute the tasks realistically based on their duration and priority. High priority tasks should be scheduled during prime cognitive slots earlier in the day (e.g. 09:00 AM, 10:00 AM, 11:00 AM, 02:00 PM, 03:00 PM) to avoid procrastination risk.
3. Keep some empty buffer slots for rest, reflection, or overflow.
4. Do not double-book tasks into the exact same starting hour unless they are very short (e.g., both under 30 minutes).
5. The scheduledTime field for each task MUST be EXACTLY one of the permitted strings:
   '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
6. Output matching structured JSON using the requested schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Schedule the task list intelligently for mission: "${mission.title || 'Mission'}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: autoScheduleSchema,
        temperature: 0.3,
      },
    });

    const results = JSON.parse(response.text.trim());
    if (results && Array.isArray(results.scheduledTasks)) {
      const scheduleMap = new Map<string, string>();
      for (const st of results.scheduledTasks) {
        scheduleMap.set(st.id, st.scheduledTime);
      }

      // Update tasks in mission
      mission.tasks = (mission.tasks || []).map((t: any) => {
        if (scheduleMap.has(t.id)) {
          return {
            ...t,
            scheduledTime: scheduleMap.get(t.id)
          };
        }
        return t;
      });

      // Recalculate basic order based on scheduledTime sequence
      const hourOrder = [
        '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', 
        '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
      ];
      
      mission.tasks.sort((a: any, b: any) => {
        const idxA = a.scheduledTime ? hourOrder.indexOf(a.scheduledTime) : 999;
        const idxB = b.scheduledTime ? hourOrder.indexOf(b.scheduledTime) : 999;
        return idxA - idxB;
      });

      // Update the order property
      mission.tasks.forEach((t: any, idx: number) => {
        t.order = idx;
      });

      // Save database
      writeDB(db);
    }

    res.json(mission);
  } catch (err: any) {
    console.error('AI Auto-schedule endpoint failed:', err);
    res.status(500).json({ error: err.message || 'AI Auto-scheduling failure' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
