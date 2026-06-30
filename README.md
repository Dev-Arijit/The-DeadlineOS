<div align="center">

# 🚀 DeadlineOS

### AI-Powered Productivity Operating System

Plan smarter. Execute faster. Never miss a deadline.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-orange?logo=firebase)
![Gemini](https://img.shields.io/badge/Google-Gemini-blue?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

# 📖 Overview

**DeadlineOS** is an AI-powered productivity operating system that intelligently organizes your work, prioritizes deadlines, creates optimized schedules, and continuously adapts your workflow to maximize productivity.

Unlike traditional task managers, DeadlineOS acts as an AI execution assistant that constantly answers one question:

> **"What should I work on right now?"**

Whether you're preparing for exams, building software, managing client work, or participating in hackathons, DeadlineOS creates a dynamic execution plan that evolves with your progress.

---

# ✨ Features

## 🎯 AI Task Prioritization

- Intelligent task ranking
- Deadline risk analysis
- Dynamic reprioritization
- Smart workload balancing

---

## 📅 Smart Calendar

- Daily Planner
- Weekly Planner
- Monthly Calendar
- Automatic scheduling
- Live timeline updates

---

## 🤖 AI Strategist

Powered by **Google Gemini**

The AI can:

- Suggest what to do next
- Reprioritize tasks
- Generate recovery plans
- Detect deadline risks
- Optimize schedules
- Break large goals into smaller tasks

---

## ⚡ Focus Mode

Displays:

- Current Mission
- Current Task
- Next Task
- Countdown Timer
- Progress
- AI Recommendations

Designed to eliminate decision fatigue.

---

## 📈 Live Progress Tracking

Track

- Mission Progress
- Daily Progress
- Completion Percentage
- Remaining Time
- Task Completion
- Deadline Health

---

## 🔄 Dynamic Recovery Planning

When you fall behind:

- AI rebuilds your schedule
- Removes unnecessary work
- Reallocates time
- Creates a recovery roadmap

---

## 📤 Workspace Management

- Export Missions
- Import Backups
- Local Storage
- Restore Snapshots

---

## 🌗 Theme Support

- Dark Mode
- Light Mode
- Persistent Theme Preferences

---

# 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React | Frontend |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Firebase | Authentication & Database |
| Firestore | Data Storage |
| Google Gemini API | AI Planning & Recommendations |
| Tailwind CSS | UI Styling |
| Zustand | Global State Management |

---

# 📂 Project Structure

```
src/
│
├── components/
│   ├── Dashboard
│   ├── AIStrategist
│   ├── Calendar
│   ├── Missions
│   ├── Settings
│   ├── Analytics
│   ├── Notifications
│   └── Authentication
│
├── store/
│   └── Global Mission Store
│
├── lib/
│   └── Firebase Configuration
│
├── App.tsx
├── main.tsx
└── types.ts

firebase/
│
├── firestore.rules
├── firebase.json
└── firebase.ts
```

---

# 🧠 AI Workflow

```
Create Mission
      │
      ▼
Add Tasks
      │
      ▼
Gemini Analysis
      │
      ▼
Priority Calculation
      │
      ▼
Schedule Generation
      │
      ▼
Calendar Planning
      │
      ▼
Live Progress Tracking
      │
      ▼
Automatic Replanning
```

---

# 🚀 Getting Started

## Prerequisites

- Node.js 18+
- npm
- Firebase Project
- Google Gemini API Key

---

## Installation

Clone the repository

```bash
git clone https://github.com/yourusername/deadlineos.git
```

Go into the project

```bash
cd deadlineos
```

Install dependencies

```bash
npm install
```

Create an environment file

```env
GEMINI_API_KEY=YOUR_API_KEY
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

Run the application

```bash
npm run dev
```

---

# 🔥 Firebase Setup

Create a Firebase project.

Enable:

- Authentication
- Firestore Database

Update your Firebase configuration inside:

```
src/lib/firebase.ts
```

Deploy Firestore Rules

```bash
firebase deploy --only firestore
```

---

# 🤖 Google Gemini Setup

Generate a Gemini API Key from

https://aistudio.google.com/app/apikey

Add it to

```
.env.local
```

```
GEMINI_API_KEY=YOUR_KEY
```

---

# 📸 Screenshots

Add screenshots here

```
/screenshots

dashboard.png

calendar.png

ai-strategist.png

focus-mode.png

priority-list.png
```

---

# 🎯 Future Improvements

- Google Calendar Integration
- Email Reminders
- Mobile App
- Offline Support
- Team Collaboration
- Voice Commands
- AI Time Estimation
- Pomodoro Integration
- Habit Tracking
- Analytics Dashboard

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository

2. Create your feature branch

```bash
git checkout -b feature/NewFeature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to your branch

```bash
git push origin feature/NewFeature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Arijit Garai**

AI Developer • Full Stack Developer

GitHub:
https://github.com/Dev-Arijit

LinkedIn:
https://lnk.ink/arijit-garai-linkedin

---

<div align="center">

### ⭐ If you found this project useful, consider giving it a star!

Made with ❤️ using React, Firebase and Google Gemini.

</div>
