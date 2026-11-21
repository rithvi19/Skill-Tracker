import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { JSONDb } from "./server/db";
import { generateRecommendations } from "./server/gemini";
import { searchYouTubeTutorials } from "./server/youtube";

// Extend Request types to hold custom user object
interface AuthRequest extends Request {
  user?: any;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with ample limits for base64 avatars
  app.use(express.json({ limit: '10mb' }));

  // Request logs for troubleshooting
  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  // Bearer Token Authentication Middleware
  const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <userId>"
    
    if (!token) {
      res.status(401).json({ error: "Access token required" });
      return;
    }

    const user = JSONDb.getUserById(token);
    if (!user) {
      res.status(403).json({ error: "Invalid or expired session" });
      return;
    }

    req.user = user;
    next();
  };

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  app.post("/api/auth/signup", (req, res) => {
    try {
      const { name, email, password } = req.body;
      const trimmedEmail = email?.trim();
      const trimmedName = name?.trim();
      if (!trimmedName || !trimmedEmail || !password) {
        res.status(400).json({ error: "All profile fields are mandatory." });
        return;
      }

      const existing = JSONDb.getUserByEmail(trimmedEmail);
      if (existing) {
        res.status(400).json({ error: "An account with this email is already registered." });
        return;
      }

      const hashedPassword = JSONDb.hash(password);
      const user = JSONDb.createUser({
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        onboardingCompleted: false,
        avatar: "🎨",
        streak: 1,
        lastActiveDate: new Date().toISOString()
      });

      // Simple response omitting password
      const { password: _, ...secureUser } = user;
      res.status(201).json({ user: secureUser, token: secureUser.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const trimmedEmail = email?.trim();
      if (!trimmedEmail || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
      }

      const user = JSONDb.getUserByEmail(trimmedEmail);
      if (!user) {
        res.status(400).json({ error: "No account matched this email address." });
        return;
      }

      const hashedPassword = JSONDb.hash(password);
      if (user.password !== hashedPassword) {
        res.status(400).json({ error: "Incorrect account password." });
        return;
      }

      // Check and update streak
      const updatedUser = JSONDb.updateActiveStreak(user.id) || user;
      
      const { password: _, ...secureUser } = updatedUser;
      res.json({ user: secureUser, token: secureUser.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/verify", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { code } = req.body;
      const user = req.user;

      if (!code) {
        res.status(400).json({ error: "Verification code is required." });
        return;
      }

      const trimmedCode = code?.trim();
      if (user.verificationCode !== trimmedCode && trimmedCode !== "123456") { // A bypass "123456" for extremely smooth testing!
        res.status(400).json({ error: "Incorrect verification code. Try verification shortcut '123456'." });
        return;
      }

      const updated = JSONDb.updateUser(user.id, { emailVerified: true });
      JSONDb.createLog(user.id, "Email Verified", "Completed user email verification flow.");
      
      const { password: _, ...secureUser } = updated;
      res.json({ user: secureUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    try {
      const { email } = req.body;
      const trimmedEmail = email?.trim();
      if (!trimmedEmail) {
        res.status(400).json({ error: "Email address is required." });
        return;
      }

      const user = JSONDb.getUserByEmail(trimmedEmail);
      if (!user) {
        res.status(400).json({ error: "No account matches this email address." });
        return;
      }

      // Generate a quick random reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      JSONDb.updateUser(user.id, { resetToken, resetTokenExpiry });
      
      // Since we don't send emails, we'll provide the reset path inside the response.
      // The frontend can display it in a mock tooltip/notif to make testing easy.
      res.json({ 
        message: "Reset link generated successfully.", 
        resetToken,
        resetUrl: `/reset-password?token=${resetToken}` 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ error: "Pass fields and token are required." });
        return;
      }

      const user = JSONDb.getUserByResetToken(token);
      if (!user) {
        res.status(400).json({ error: "Invalid or expired password reset token." });
        return;
      }

      const hashedPassword = JSONDb.hash(password);
      JSONDb.updateUser(user.id, {
        password: hashedPassword,
        resetToken: undefined,
        resetTokenExpiry: undefined
      });

      JSONDb.createLog(user.id, "Password Reset", "Successfully completed password reset process.");
      res.json({ message: "Password updated successfully! Please log in with your new password." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/sync", (req, res) => {
    try {
      const { user, skills, tasks, logs } = req.body;
      if (!user || !user.email) {
        res.status(400).json({ error: "Missing sync user payload" });
        return;
      }
      
      const syncedUser = JSONDb.syncBackup(user, skills || [], tasks || [], logs || []);
      const { password: _, ...secureUser } = syncedUser;
      res.json({ success: true, user: secureUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // PROFILE / USER ROUTES
  // ==========================================

  app.get("/api/user/me", authenticateToken, (req: AuthRequest, res) => {
    try {
      const updatedUser = JSONDb.updateActiveStreak(req.user.id) || req.user;
      const { password: _, ...secureUser } = updatedUser;
      res.json({ user: secureUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/user/profile", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { name, avatar, onboardingCompleted } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (avatar !== undefined) updates.avatar = avatar;
      if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;

      const updated = JSONDb.updateUser(req.user.id, updates);
      
      if (onboardingCompleted === true && !req.user.onboardingCompleted) {
        JSONDb.createLog(req.user.id, "Onboarding Finished", "Completed user onboarding journey.");
      } else {
        JSONDb.createLog(req.user.id, "Profile Updated", "Modified profile details.");
      }

      const { password: _, ...secureUser } = updated;
      res.json({ user: secureUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/user/password", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new password are required." });
        return;
      }

      const user = req.user;
      const hashedCurrent = JSONDb.hash(currentPassword);
      if (user.password !== hashedCurrent) {
        res.status(400).json({ error: "The old password you typed is incorrect." });
        return;
      }

      JSONDb.updateUser(user.id, { password: JSONDb.hash(newPassword) });
      JSONDb.createLog(user.id, "Password Changed", "Updated profile credential password.");
      res.json({ message: "Password updated successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/user", authenticateToken, (req: AuthRequest, res) => {
    try {
      JSONDb.deleteUser(req.user.id);
      res.json({ message: "Account and personal tracking histories deleted permanently." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SKILLS ROUTES
  // ==========================================

  app.get("/api/skills", authenticateToken, (req: AuthRequest, res) => {
    try {
      const list = JSONDb.getSkills(req.user.id);
      res.json({ skills: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/skills/:id", authenticateToken, (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.id);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill tracking details not found." });
        return;
      }
      res.json({ skill });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/skills", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, category, difficulty, notes, goalDate } = req.body;
      if (!name || !category || !difficulty) {
        res.status(400).json({ error: "Name, category, and difficulty are mandatory fields." });
        return;
      }

      const newSkill = JSONDb.createSkill({
        userId: req.user.id,
        name,
        category,
        difficulty,
        notes: notes || "",
        goalDate: goalDate || null
      });

      // Fire and forget or sync generate initial recommendations in background so the UI doesn't lag!
      generateRecommendations(name, category, difficulty)
        .then(recs => {
          JSONDb.createOrUpdateRecommendations(newSkill.id, recs);
          console.log(`Generated and cached initial AI learning plan for skill: ${name}`);
        })
        .catch(err => console.error("Could not seed initial AI recommendation:", err));

      res.status(201).json({ skill: newSkill });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/skills/:id", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { name, category, difficulty, notes, goalDate } = req.body;
      const skill = JSONDb.getSkillById(req.params.id);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.category = category;
      if (difficulty !== undefined) updates.difficulty = difficulty;
      if (notes !== undefined) updates.notes = notes;
      if (goalDate !== undefined) updates.goalDate = goalDate;

      const updated = JSONDb.updateSkill(skill.id, updates);
      res.json({ skill: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/skills/:id", authenticateToken, (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.id);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }

      JSONDb.deleteSkill(skill.id);
      res.json({ message: "Skill deleted successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TASKS ROUTES
  // ==========================================

  app.get("/api/skills/:skillId/tasks", authenticateToken, (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const list = JSONDb.getTasksBySkill(skill.id);
      res.json({ tasks: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/skills/:skillId/tasks", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { title } = req.body;
      if (!title) {
        res.status(400).json({ error: "Task title cannot be blank." });
        return;
      }

      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill dashboard not found." });
        return;
      }

      const newTask = JSONDb.createTask({
        skillId: skill.id,
        title,
        completed: false
      });

      res.status(201).json({ task: newTask });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { title, completed } = req.body;
      const db = JSONDb.getTasksBySkill; // checking helper logic
      
      const taskList = JSONDb.getUserById(req.user.id); // validation dummy
      const task = JSONDb.getTasksBySkill(""); // dummy validation check or write logic helper
      
      // Look for the task safely
      // We'll filter all databases for safety
      const allSkills = JSONDb.getSkills(req.user.id);
      const skillIds = allSkills.map(s => s.id);
      
      const targetTask = JSONDb.getTasksBySkill(skillIds[0] || ""); // default lookups
      // Better: find task in global schema safely
      const dbInstance = (JSONDb as any).load();
      const dbTask = dbInstance.tasks.find((t: any) => t.id === req.params.id);
      
      if (!dbTask || !skillIds.includes(dbTask.skillId)) {
        res.status(404).json({ error: "Task not found as child of owned skills." });
        return;
      }

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (completed !== undefined) updates.completed = completed;

      const updated = JSONDb.updateTask(dbTask.id, updates);
      res.json({ task: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/skills/:skillId/tasks/reorder", authenticateToken, (req: AuthRequest, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        res.status(400).json({ error: "Ordered id array is mandatory." });
        return;
      }

      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const list = JSONDb.reorderTasks(skill.id, orderedIds);
      res.json({ tasks: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, (req: AuthRequest, res) => {
    try {
      const allSkills = JSONDb.getSkills(req.user.id);
      const skillIds = allSkills.map(s => s.id);
      
      const dbInstance = (JSONDb as any).load();
      const dbTask = dbInstance.tasks.find((t: any) => t.id === req.params.id);
      
      if (!dbTask || !skillIds.includes(dbTask.skillId)) {
        res.status(404).json({ error: "Task not found as child of owned skills." });
        return;
      }

      JSONDb.deleteTask(dbTask.id);
      res.json({ message: "Task deleted successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AI LEARNING ROADMAP & YOUTUBE RECOMMENDATIONS ROUTES
  // ==========================================

  app.get("/api/skills/:skillId/recommendations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      let recs = JSONDb.getRecommendationsBySkill(skill.id);
      // Auto-generate if not existing or if legacy format lacks structured roadmapSteps
      if (!recs || !recs.roadmapSteps || recs.roadmapSteps.length === 0) {
        const generated = await generateRecommendations(skill.name, skill.category, skill.difficulty);
        recs = JSONDb.createOrUpdateRecommendations(skill.id, generated);
      }

      res.json({ recommendations: recs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/skills/:skillId/recommendations/regenerate", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const generated = await generateRecommendations(skill.name, skill.category, skill.difficulty);
      const recs = JSONDb.createOrUpdateRecommendations(skill.id, generated);
      
      JSONDb.createLog(req.user.id, "AI Roadmap Regenerated", `Regenerated interactive learning roadmap with YouTube video tutorials for "${skill.name}".`);
      
      res.json({ recommendations: recs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle completion of a specific roadmap step and auto-update skill progress
  app.put("/api/skills/:skillId/roadmap/steps/:stepNumber/complete", authenticateToken, (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const stepNumber = parseInt(req.params.stepNumber, 10);
      if (isNaN(stepNumber)) {
        res.status(400).json({ error: "Invalid step number." });
        return;
      }

      const { completed } = req.body;
      const result = JSONDb.toggleRoadmapStep(skill.id, stepNumber, Boolean(completed));

      const action = completed ? "Roadmap Step Completed" : "Roadmap Step Reopened";
      JSONDb.createLog(req.user.id, action, `Marked Step #${stepNumber} as ${completed ? 'completed' : 'incomplete'} in "${skill.name}".`);

      res.json({
        recommendation: result.recommendation,
        skill: result.skill
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle practical exercise completion in a roadmap step
  app.put("/api/skills/:skillId/roadmap/steps/:stepNumber/exercise", authenticateToken, (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const stepNumber = parseInt(req.params.stepNumber, 10);
      const exerciseIndex = parseInt(req.body.exerciseIndex, 10);

      if (isNaN(stepNumber) || isNaN(exerciseIndex)) {
        res.status(400).json({ error: "Invalid step number or exercise index." });
        return;
      }

      const updated = JSONDb.toggleRoadmapStepExercise(skill.id, stepNumber, exerciseIndex);
      res.json({ recommendation: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start a roadmap step
  app.put("/api/skills/:skillId/roadmap/steps/:stepNumber/start", authenticateToken, (req: AuthRequest, res) => {
    try {
      const skill = JSONDb.getSkillById(req.params.skillId);
      if (!skill || skill.userId !== req.user.id) {
        res.status(404).json({ error: "Skill not found." });
        return;
      }

      const stepNumber = parseInt(req.params.stepNumber, 10);
      if (isNaN(stepNumber)) {
        res.status(400).json({ error: "Invalid step number." });
        return;
      }

      const updated = JSONDb.startRoadmapStep(skill.id, stepNumber);
      JSONDb.createLog(req.user.id, "Step Learning Started", `Started learning Step #${stepNumber} in "${skill.name}".`);
      res.json({ recommendation: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Standalone YouTube Search API endpoint
  app.get("/api/youtube/search", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const query = (req.query.q as string)?.trim();
      if (!query) {
        res.status(400).json({ error: "Search query 'q' parameter is required." });
        return;
      }

      const maxResults = parseInt(req.query.maxResults as string, 10) || 3;
      const result = await searchYouTubeTutorials("", query, [], maxResults);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // LOGS SYSTEM
  // ==========================================

  app.get("/api/logs", authenticateToken, (req: AuthRequest, res) => {
    try {
      const list = JSONDb.getLogs(req.user.id);
      res.json({ logs: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // VITE DEVELOPMENT MIDDLEWARE OR STATIC PRODUCTION SERVING
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/db.json', '**/db.json*'],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server successfully to PORT 3000 (Required hard requirement of proxy)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Ready & running on port http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[CRITICAL] Failed to boot full-stack Skill Tracker server:", err);
});
