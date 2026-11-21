import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Skill, Task, ActivityLog, AIRecommendation } from '../src/types';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  users: User[];
  skills: Skill[];
  tasks: Task[];
  logs: ActivityLog[];
  recommendations: AIRecommendation[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: "demo-user",
      name: "Rithvik",
      email: "rithvik0806@gmail.com",
      // sha256 of "password123"
      password: crypto.createHash('sha256').update('password123').digest('hex'),
      onboardingCompleted: true,
      avatar: "🔥",
      createdAt: new Date().toISOString(),
      streak: 5,
      lastActiveDate: new Date().toISOString(),
      emailVerified: true
    }
  ],
  skills: [
    {
      id: "demo-skill-1",
      userId: "demo-user",
      name: "TypeScript Mastery",
      category: "Programming",
      difficulty: "Intermediate",
      notes: "Focusing on advanced types, interfaces, utility types, and strict mode configurations. Build a state-backed Express + Vite app next.",
      progress: 60,
      goalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days out
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-skill-2",
      userId: "demo-user",
      name: "UI Design & Typography",
      category: "Design",
      difficulty: "Advanced",
      notes: "Deep-dive into Swiss international style, proper typographic hierarchies, and microinteractions using framer motion.",
      progress: 33,
      goalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 25 days out
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  tasks: [
    {
      id: "demo-task-1",
      skillId: "demo-skill-1",
      title: "Master Utility Types (Omit, Pick, Record)",
      completed: true,
      order: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-task-2",
      skillId: "demo-skill-1",
      title: "Write custom generic Express routing wrappers",
      completed: true,
      order: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-task-3",
      skillId: "demo-skill-1",
      title: "Implement Strict Type Check limits in compiler settings",
      completed: false,
      order: 2,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-task-4",
      skillId: "demo-skill-2",
      title: "Audit color contrasts for AA Web Accessibility",
      completed: true,
      order: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-task-5",
      skillId: "demo-skill-2",
      title: "Build consistent spacing scale using 8px multipliers",
      completed: false,
      order: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-task-6",
      skillId: "demo-skill-2",
      title: "Design multi-screen onboarding fluid flow micro-motion",
      completed: false,
      order: 2,
      createdAt: new Date().toISOString()
    }
  ],
  logs: [
    {
      id: "log-1",
      userId: "demo-user",
      action: "Skill Created",
      detail: "Created 'TypeScript Mastery' tracking dashboard.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "log-2",
      userId: "demo-user",
      action: "Task Completed",
      detail: "Finished 'Master Utility Types' in TypeScript Mastery.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "log-3",
      userId: "demo-user",
      action: "Streak Milestone",
      detail: "Consecutive daily tracking active for 5 days. Steady progress!",
      createdAt: new Date().toISOString()
    }
  ],
  recommendations: [
    {
      id: "rec-1",
      skillId: "demo-skill-1",
      topics: [
        "Conditional Types & Distributive properties",
        "Template Literal Types",
        "Mapped Type modifiers",
        "Advance Generic Constraints"
      ],
      projects: [
        "Dynamic JSON DB parser engine",
        "Strict-type safe state-machine router"
      ],
      exercises: [
        "Recreate Exclude<T, U> using extends rules",
        "Write typed event listeners with event key lookups"
      ],
      roadmap: [
        "Phase 1: Deepening generics & utility types",
        "Phase 2: Master meta-programming and decorators",
        "Phase 3: Perfect full-stack type orchestration (RPC and Schema validations)"
      ],
      interviewPrep: [
        "Explain when to use 'unknown' instead of 'any'",
        "Contrast interface and type declarations for extensions"
      ],
      advanced: [
        "Global ambient type overriding tricks",
        "Higher-order generic Currying types"
      ],
      createdAt: new Date().toISOString()
    }
  ]
};

export class JSONDb {
  private static load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
        return DEFAULT_DB;
      }
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading JSON database:", e);
      return DEFAULT_DB;
    }
  }

  private static save(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error writing JSON database:", e);
    }
  }

  // PW Hashing
  public static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  // Users CRUD
  public static getUsers(): User[] {
    return this.load().users;
  }

  public static getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public static getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public static getUserByResetToken(token: string): User | undefined {
    const db = this.load();
    return db.users.find(u => u.resetToken === token && u.resetTokenExpiry && new Date(u.resetTokenExpiry) > new Date());
  }

  public static createUser(u: Partial<User>): User {
    const db = this.load();
    const newUser: User = {
      id: crypto.randomUUID(),
      name: u.name || '',
      email: u.email || '',
      password: u.password || '',
      onboardingCompleted: false,
      avatar: u.avatar || '👤',
      createdAt: new Date().toISOString(),
      streak: 1,
      lastActiveDate: new Date().toISOString(),
      emailVerified: false,
      verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
      ...u
    };
    db.users.push(newUser);
    this.save(db);
    return newUser;
  }

  public static updateUser(id: string, updates: Partial<User>): User {
    const db = this.load();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error("User not found");
    db.users[idx] = { ...db.users[idx], ...updates };
    this.save(db);
    return db.users[idx];
  }

  public static deleteUser(id: string): void {
    const db = this.load();
    db.users = db.users.filter(u => u.id !== id);
    db.skills = db.skills.filter(s => s.userId !== id);
    // Delete cascade
    const userSkills = db.skills.filter(s => s.userId === id).map(s => s.id);
    db.tasks = db.tasks.filter(t => !userSkills.includes(t.skillId));
    db.recommendations = db.recommendations.filter(r => !userSkills.includes(r.skillId));
    db.logs = db.logs.filter(l => l.userId !== id);
    this.save(db);
  }

  // Streak Tracker update on active login or interaction
  public static updateActiveStreak(userId: string): User {
    const db = this.load();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return null as any;

    const user = db.users[idx];
    const today = new Date().toISOString().split('T')[0];
    
    if (!user.lastActiveDate) {
      user.streak = 1;
      user.lastActiveDate = new Date().toISOString();
    } else {
      const lastActive = user.lastActiveDate.split('T')[0];
      if (lastActive === today) {
        // Already active today, streak is maintained
      } else {
        const lastActiveDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Yes! Active yesterday
          user.streak += 1;
          // Add Activity Log
          db.logs.push({
            id: crypto.randomUUID(),
            userId,
            action: 'Streak Milestone',
            detail: `Maintained daily streak! Current streak is now ${user.streak} days.`,
            createdAt: new Date().toISOString()
          });
        } else if (diffDays > 1) {
          // Streak broken
          user.streak = 1;
        }
        user.lastActiveDate = new Date().toISOString();
      }
    }
    
    db.users[idx] = user;
    this.save(db);
    return user;
  }

  // Skills CRUD
  public static getSkills(userId: string): Skill[] {
    return this.load().skills.filter(s => s.userId === userId);
  }

  public static getSkillById(id: string): Skill | undefined {
    return this.load().skills.find(s => s.id === id);
  }

  public static createSkill(s: Omit<Skill, 'id' | 'createdAt' | 'progress'> & { id?: string }): Skill {
    const db = this.load();
    const newSkill: Skill = {
      ...s,
      id: s.id || crypto.randomUUID(),
      progress: 0,
      createdAt: new Date().toISOString()
    };
    db.skills.push(newSkill);
    
    // Create baseline activity log
    db.logs.push({
      id: crypto.randomUUID(),
      userId: s.userId,
      action: 'Skill Created',
      detail: `Started tracking progress for "${s.name}" under ${s.category}.`,
      createdAt: new Date().toISOString()
    });

    this.save(db);
    return newSkill;
  }

  public static updateSkill(id: string, updates: Partial<Skill>): Skill {
    const db = this.load();
    const idx = db.skills.findIndex(s => s.id === id);
    if (idx === -1) throw new Error("Skill not found");
    const oldName = db.skills[idx].name;
    db.skills[idx] = { ...db.skills[idx], ...updates };
    
    if (updates.name && updates.name !== oldName) {
      db.logs.push({
        id: crypto.randomUUID(),
        userId: db.skills[idx].userId,
        action: 'Skill Renamed',
        detail: `Renamed skill focus from "${oldName}" to "${updates.name}".`,
        createdAt: new Date().toISOString()
      });
    }

    this.save(db);
    return db.skills[idx];
  }

  public static deleteSkill(id: string): void {
    const db = this.load();
    const skill = db.skills.find(s => s.id === id);
    if (!skill) return;
    
    db.skills = db.skills.filter(s => s.id !== id);
    db.tasks = db.tasks.filter(t => t.skillId !== id);
    db.recommendations = db.recommendations.filter(r => r.skillId !== id);
    
    db.logs.push({
      id: crypto.randomUUID(),
      userId: skill.userId,
      action: 'Skill Deleted',
      detail: `Deleted tracking dashboard for "${skill.name}".`,
      createdAt: new Date().toISOString()
    });

    this.save(db);
  }

  // Tasks CRUD
  public static getTasksBySkill(skillId: string): Task[] {
    return this.load().tasks
      .filter(t => t.skillId === skillId)
      .sort((a, b) => a.order - b.order);
  }

  public static createTask(t: Omit<Task, 'id' | 'createdAt' | 'order'>): Task {
    const db = this.load();
    const skillTasks = db.tasks.filter(tk => tk.skillId === t.skillId);
    const order = skillTasks.length;

    const newTask: Task = {
      ...t,
      id: crypto.randomUUID(),
      order,
      createdAt: new Date().toISOString()
    };
    db.tasks.push(newTask);
    this.save(db);

    // Dynamic progress re-calc
    this.recalculateSkillProgress(t.skillId);

    // Logging
    const skill = this.getSkillById(t.skillId);
    if (skill) {
      const ldb = this.load();
      ldb.logs.push({
        id: crypto.randomUUID(),
        userId: skill.userId,
        action: 'Task Added',
        detail: `Added milestone "${t.title}" to ${skill.name}.`,
        createdAt: new Date().toISOString()
      });
      this.save(ldb);
    }

    return newTask;
  }

  public static updateTask(id: string, updates: Partial<Task>): Task {
    const db = this.load();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("Task not found");
    
    const taskBefore = db.tasks[idx];
    const completedStateChanged = updates.completed !== undefined && updates.completed !== taskBefore.completed;
    
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    this.save(db);

    // Dynamic progress re-calc
    this.recalculateSkillProgress(taskBefore.skillId);

    // Logging completion state change
    if (completedStateChanged) {
      const skill = this.getSkillById(taskBefore.skillId);
      if (skill) {
        const ldb = this.load();
        ldb.logs.push({
          id: crypto.randomUUID(),
          userId: skill.userId,
          action: updates.completed ? 'Task Completed' : 'Task Re-opened',
          detail: updates.completed 
            ? `Finished progress milestone "${taskBefore.title}" in ${skill.name}.`
            : `Re-opened milestone "${taskBefore.title}" in ${skill.name}.`,
          createdAt: new Date().toISOString()
        });
        this.save(ldb);
      }
    }

    return db.tasks[idx];
  }

  public static reorderTasks(skillId: string, orderedIds: string[]): Task[] {
    const db = this.load();
    const taskIdsSet = new Set(orderedIds);
    
    db.tasks = db.tasks.map(t => {
      if (t.skillId === skillId) {
        const newOrder = orderedIds.indexOf(t.id);
        if (newOrder !== -1) {
          return { ...t, order: newOrder };
        }
      }
      return t;
    });

    this.save(db);
    return this.getTasksBySkill(skillId);
  }

  public static deleteTask(id: string): void {
    const db = this.load();
    const task = db.tasks.find(t => t.id === id);
    if (!task) return;

    db.tasks = db.tasks.filter(t => t.id !== id);
    this.save(db);

    this.recalculateSkillProgress(task.skillId);
  }

  private static recalculateSkillProgress(skillId: string): void {
    const db = this.load();
    const skillIdx = db.skills.findIndex(s => s.id === skillId);
    if (skillIdx === -1) return;

    const skillTasks = db.tasks.filter(t => t.skillId === skillId);
    if (skillTasks.length === 0) {
      db.skills[skillIdx].progress = 0;
    } else {
      const completed = skillTasks.filter(t => t.completed).length;
      db.skills[skillIdx].progress = Math.round((completed / skillTasks.length) * 100);
    }
    this.save(db);
  }

  // Logs CRUD
  public static getLogs(userId: string): ActivityLog[] {
    return this.load().logs
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50); // Keep top 50
  }

  public static createLog(userId: string, action: string, detail: string): ActivityLog {
    const db = this.load();
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      userId,
      action,
      detail,
      createdAt: new Date().toISOString()
    };
    db.logs.push(newLog);
    this.save(db);
    return newLog;
  }

  // Recommendations CRUD
  public static getRecommendationsBySkill(skillId: string): AIRecommendation | undefined {
    return this.load().recommendations.find(r => r.skillId === skillId);
  }

  public static createOrUpdateRecommendations(skillId: string, recs: Omit<AIRecommendation, 'id' | 'skillId' | 'createdAt'>): AIRecommendation {
    const db = this.load();
    const idx = db.recommendations.findIndex(r => r.skillId === skillId);
    
    const recData: AIRecommendation = {
      id: idx !== -1 ? db.recommendations[idx].id : crypto.randomUUID(),
      skillId,
      ...recs,
      createdAt: new Date().toISOString()
    };

    if (idx !== -1) {
      db.recommendations[idx] = recData;
    } else {
      db.recommendations.push(recData);
    }

    this.save(db);
    return recData;
  }

  public static syncBackup(user: User, skills: Skill[], tasks: Task[], logs: ActivityLog[]): User {
    const db = this.load();
    
    // 1. Sync User
    let uIdx = db.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
    if (uIdx === -1) {
      db.users.push(user);
    } else {
      db.users[uIdx] = { ...db.users[uIdx], ...user };
    }
    
    // 2. Sync Skills
    if (Array.isArray(skills)) {
      for (const s of skills) {
        if (!db.skills.some(skill => skill.id === s.id)) {
          db.skills.push(s);
        }
      }
    }
    
    // 3. Sync Tasks
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        if (!db.tasks.some(task => task.id === t.id)) {
          db.tasks.push(t);
        }
      }
    }
    
    // 4. Sync Logs
    if (Array.isArray(logs)) {
      for (const l of logs) {
        if (!db.logs.some(log => log.id === l.id)) {
          db.logs.push(l);
        }
      }
    }
    
    this.save(db);
    return user;
  }
}
