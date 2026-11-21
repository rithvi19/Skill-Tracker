import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import CircularProgress from '../components/CircularProgress';
import VideoModal from '../components/VideoModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Edit3, Trash2, CheckCircle2, Circle, RefreshCw, 
  Plus, Check, X, ShieldAlert, BookOpen, Layers, GripVertical, AlertCircle, Save,
  Sparkles, Calendar, Clock, Youtube, Play, ExternalLink, ChevronDown, ChevronUp,
  BrainCircuit, Target, Rocket, Trophy, CheckSquare, Square
} from 'lucide-react';
import { Skill, Task, AIRecommendation, YouTubeVideo, RoadmapStep } from '../types';

export default function SkillDetails({ skillId, onGoBack }: { skillId: string; onGoBack: () => void }) {
  const { token, updateSkill, deleteSkill, addToast, skills } = useApp();
  
  const skill = skills.find(s => s.id === skillId);
  
  // Note autosave states
  const [notesText, setNotesText] = useState(skill?.notes || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  
  // Tasks states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // AI recommendations & Roadmap states
  const [recs, setRecs] = useState<AIRecommendation | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [expandedStepNumber, setExpandedStepNumber] = useState<number | null>(null);
  const [stepOperating, setStepOperating] = useState<number | null>(null);

  // Video Player Modal state
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  // Edit metadata modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(skill?.name || '');
  const [editCategory, setEditCategory] = useState(skill?.category || '');
  const [editDifficulty, setEditDifficulty] = useState(skill?.difficulty || 'Beginner');
  const [editGoalDate, setEditGoalDate] = useState(skill?.goalDate || '');
  const [updatingMeta, setUpdatingMeta] = useState(false);

  // Delete Confirmation Modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debouncing Ref for Notes
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Data Loader
  useEffect(() => {
    if (skill) {
      setNotesText(skill.notes);
      setEditName(skill.name);
      setEditCategory(skill.category);
      setEditDifficulty(skill.difficulty);
      setEditGoalDate(skill.goalDate || '');
      fetchTasks();
      fetchRecommendations();
    }
  }, [skillId]);

  // Set default expanded step when roadmap loads
  useEffect(() => {
    if (recs?.roadmapSteps && recs.roadmapSteps.length > 0 && expandedStepNumber === null) {
      const firstIncomplete = recs.roadmapSteps.find(s => !s.completed);
      setExpandedStepNumber(firstIncomplete ? firstIncomplete.stepNumber : 1);
    }
  }, [recs, expandedStepNumber]);

  // Persist tasks in local backup on any client modifications
  useEffect(() => {
    if (skillId && tasks && tasks.length > 0) {
      localStorage.setItem('skill_backup_tasks_' + skillId, JSON.stringify(tasks));
    }
  }, [skillId, tasks]);

  // Handle Note Changes with Autosave
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotesText(val);
    setSaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const ok = await updateSkill(skillId, { notes: val });
        if (ok) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        setSaveStatus('error');
      }
    }, 1000);
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Fetch Tasks
  const fetchTasks = async () => {
    if (!token) return;
    setTasksLoading(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (e) {
      addToast("Failed to fetch milestone tasks.", "error");
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch AI Recommendations
  const fetchRecommendations = async () => {
    if (!token) return;
    setRecsLoading(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecs(data.recommendations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecsLoading(false);
    }
  };

  // Regenerate Learning Roadmap
  const handleRegenerateRecommendations = async () => {
    if (!token) return;
    setRecsLoading(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/recommendations/regenerate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecs(data.recommendations);
        if (data.recommendations?.roadmapSteps?.length > 0) {
          setExpandedStepNumber(data.recommendations.roadmapSteps[0].stepNumber);
        }
        await updateSkill(skillId, {});
        addToast("AI learning roadmap & video tutorials refreshed!", "success");
      } else {
        addToast("Roadmap generation failed. Please try again.", "error");
      }
    } catch (e) {
      addToast("Failed to regenerate roadmap.", "error");
    } finally {
      setRecsLoading(false);
    }
  };

  // Toggle Roadmap Step Completion
  const handleToggleRoadmapStep = async (stepNumber: number, currentCompleted: boolean) => {
    if (!token) return;
    setStepOperating(stepNumber);
    const nextCompleted = !currentCompleted;

    // Optimistic UI update
    setRecs(prev => {
      if (!prev || !prev.roadmapSteps) return prev;
      return {
        ...prev,
        roadmapSteps: prev.roadmapSteps.map(s => 
          s.stepNumber === stepNumber
            ? { ...s, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined }
            : s
        )
      };
    });

    try {
      const res = await fetch(`/api/skills/${skillId}/roadmap/steps/${stepNumber}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: nextCompleted })
      });

      if (res.ok) {
        const data = await res.json();
        setRecs(data.recommendation);
        // Refresh skill in AppContext to propagate overall progress to Dashboard & Sidebar
        await updateSkill(skillId, {});
        addToast(
          nextCompleted ? `Step #${stepNumber} completed! Overall progress updated.` : `Step #${stepNumber} marked incomplete.`,
          nextCompleted ? "success" : "info"
        );
      } else {
        fetchRecommendations(); // Revert on failure
        addToast("Could not update step completion.", "error");
      }
    } catch (err) {
      fetchRecommendations();
      addToast("Network error updating step.", "error");
    } finally {
      setStepOperating(null);
    }
  };

  // Toggle Practical Exercise Completion
  const handleToggleExercise = async (stepNumber: number, exerciseIndex: number) => {
    if (!token) return;

    // Optimistic UI update
    setRecs(prev => {
      if (!prev || !prev.roadmapSteps) return prev;
      return {
        ...prev,
        roadmapSteps: prev.roadmapSteps.map(s => {
          if (s.stepNumber !== stepNumber) return s;
          const currentExercises = s.completedExercises || [];
          const exists = currentExercises.includes(exerciseIndex);
          const nextExercises = exists
            ? currentExercises.filter(idx => idx !== exerciseIndex)
            : [...currentExercises, exerciseIndex];
          return { ...s, completedExercises: nextExercises };
        })
      };
    });

    try {
      const res = await fetch(`/api/skills/${skillId}/roadmap/steps/${stepNumber}/exercise`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ exerciseIndex })
      });

      if (res.ok) {
        const data = await res.json();
        setRecs(data.recommendation);
      } else {
        fetchRecommendations();
      }
    } catch (err) {
      fetchRecommendations();
    }
  };

  // Start Step Learning
  const handleStartStep = async (stepNumber: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/skills/${skillId}/roadmap/steps/${stepNumber}/start`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecs(data.recommendation);
        addToast(`Started learning Step #${stepNumber}!`, "info");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !token) return;

    const tempId = Math.random().toString();
    const tempTask: Task = {
      id: tempId,
      skillId,
      title: newTaskTitle,
      completed: false,
      order: tasks.length,
      createdAt: new Date().toISOString()
    };
    
    setTasks(prev => [...prev, tempTask]);
    setNewTaskTitle('');

    try {
      const res = await fetch(`/api/skills/${skillId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: tempTask.title })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === tempId ? data.task : t));
        addToast("Milestone added.", "success");
        await updateSkill(skillId, {});
      } else {
        setTasks(prev => prev.filter(t => t.id !== tempId));
        addToast("Could not add task.", "error");
      }
    } catch (err) {
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: Task) => {
    if (!token) return;
    const originalComplete = task.completed;
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !originalComplete })
      });
      if (res.ok) {
        await updateSkill(skillId, {});
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: originalComplete } : t));
        addToast("Could not toggle milestone.", "error");
      }
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: originalComplete } : t));
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!token) return;
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast("Milestone removed.", "info");
        await updateSkill(skillId, {});
      } else {
        setTasks(originalTasks);
        addToast("Could not delete task.", "error");
      }
    } catch (err) {
      setTasks(originalTasks);
    }
  };

  // Update Skill Metadata
  const handleUpdateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setUpdatingMeta(true);
    try {
      const ok = await updateSkill(skillId, {
        name: editName,
        category: editCategory,
        difficulty: editDifficulty as any,
        goalDate: editGoalDate || null
      });
      if (ok) {
        setIsEditOpen(false);
        addToast("Skill details updated.", "success");
      } else {
        addToast("Update failed.", "error");
      }
    } catch (err) {
      addToast("Failed to update skill parameters.", "error");
    } finally {
      setUpdatingMeta(false);
    }
  };

  // Delete Entire Skill
  const handleDeleteSkill = async () => {
    setIsDeleting(true);
    try {
      const ok = await deleteSkill(skillId);
      if (ok) {
        addToast("Skill deleted successfully.", "info");
        onGoBack();
      } else {
        addToast("Failed to delete skill.", "error");
      }
    } catch (err) {
      addToast("Delete operation failed.", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  if (!skill) {
    return (
      <div className="p-8 text-center text-gray-500 font-sans">
        <p>Skill not found or has been removed.</p>
        <button
          onClick={onGoBack}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Calculate Roadmap Progress metrics
  const roadmapSteps = recs?.roadmapSteps || [];
  const completedRoadmapSteps = roadmapSteps.filter(s => s.completed).length;
  const roadmapProgressPct = roadmapSteps.length > 0 
    ? Math.round((completedRoadmapSteps / roadmapSteps.length) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans">
      
      {/* 1. TOP NAVIGATION & HEADER ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Skills Roster</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-purple-300 dark:hover:border-purple-800 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Edit Skill Details</span>
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SKILL IDENTITY & PROGRESS OVERVIEW HERO */}
      <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 via-fuchsia-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">
                {skill.category}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                skill.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/50' :
                skill.difficulty === 'Intermediate' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200/50' :
                'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200/50'
              }`}>
                {skill.difficulty} Level
              </span>
              {skill.goalDate && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Target: {skill.goalDate}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
              {skill.name}
            </h1>

            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Created on {new Date(skill.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-6 bg-gray-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/70 shrink-0">
            <CircularProgress value={skill.progress} size={88} strokeWidth={8} />
            <div>
              <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">Overall Progress</div>
              <div className="text-2xl font-black text-gray-900 dark:text-zinc-50">{skill.progress}%</div>
              <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                {roadmapSteps.length > 0 ? `${completedRoadmapSteps}/${roadmapSteps.length} Roadmap Steps` : `${tasks.filter(t => t.completed).length}/${tasks.length} Milestones`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI LEARNING ROADMAP & YOUTUBE RECOMMENDATIONS SECTION (CORE ENHANCEMENT) */}
      <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden transition-colors duration-300">
        
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
                  AI Learning Roadmap with Video Recommendations
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/50">
                  <Youtube className="w-3 h-3" /> YouTube Enhanced
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Step-by-step master sequence personalized for your skill level, paired with relevant video masterclasses.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerateRecommendations}
            disabled={recsLoading}
            className="px-4 py-2.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-white bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 dark:hover:bg-purple-500 border border-purple-200 dark:border-purple-800/40 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate Learning Roadmap</span>
          </button>
        </div>

        {/* Roadmap Progress Bar */}
        {roadmapSteps.length > 0 && (
          <div className="my-6 p-4 rounded-2xl bg-gray-50/70 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
                {completedRoadmapSteps}/{roadmapSteps.length}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">Roadmap Curriculum Progress</p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  {completedRoadmapSteps === roadmapSteps.length && roadmapSteps.length > 0
                    ? "All milestones completed! Full roadmap mastered."
                    : `${roadmapSteps.length - completedRoadmapSteps} milestone steps remaining.`}
                </p>
              </div>
            </div>

            <div className="w-full sm:max-w-xs flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${roadmapProgressPct}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-emerald-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 font-mono w-10 text-right">
                {roadmapProgressPct}%
              </span>
            </div>
          </div>
        )}

        {/* AI Personalized Learning Advisory Card */}
        {recs?.advisory && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-transparent dark:from-purple-950/30 dark:via-zinc-900/60 dark:to-transparent border border-purple-200/60 dark:border-purple-800/40"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 shadow-md shadow-purple-500/20">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-widest">
                    AI Personalization Advisor
                  </span>
                  {recs.advisory.nextStepNumber && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-200/60 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                      Next Step: #{recs.advisory.nextStepNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-800 dark:text-zinc-200 leading-relaxed font-medium">
                  {recs.advisory.recommendationText}
                </p>

                {recs.advisory.practiceSuggestions && recs.advisory.practiceSuggestions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {recs.advisory.practiceSuggestions.map((tip, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-800/70 border border-gray-200/60 dark:border-zinc-700/60 text-gray-700 dark:text-zinc-300">
                        <Target className="w-3 h-3 text-purple-500" />
                        <span>{tip}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Content Container (Skeletons vs Roadmap Steps) */}
        <div>
          <AnimatePresence mode="wait">
            {recsLoading ? (
              // Multi-step Loading Skeletons
              <motion.div 
                key="skeleton-roadmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 animate-pulse"
              >
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="p-5 border border-gray-150 dark:border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-zinc-800" />
                        <div className="h-4 w-48 bg-gray-200 dark:bg-zinc-800 rounded" />
                      </div>
                      <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-3 w-3/4 bg-gray-100 dark:bg-zinc-850 rounded" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      {[1, 2, 3].map(vIdx => (
                        <div key={vIdx} className="h-28 bg-gray-100 dark:bg-zinc-850 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : roadmapSteps.length === 0 ? (
              // Empty state
              <motion.div 
                key="empty-roadmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 text-center text-gray-400 font-sans space-y-3"
              >
                <Youtube className="w-10 h-10 text-red-500/30 mx-auto" />
                <h4 className="text-sm font-bold text-gray-700 dark:text-zinc-300">No Learning Roadmap Compiled Yet</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Click below to generate a comprehensive AI-powered learning roadmap with relevant YouTube tutorial videos.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateRecommendations}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Roadmap & Video Tutorials</span>
                </button>
              </motion.div>
            ) : (
              // Interactive Expandable Step Cards
              <motion.div 
                key="content-roadmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {roadmapSteps.map((step) => {
                  const isExpanded = expandedStepNumber === step.stepNumber;
                  const completedExercisesCount = (step.completedExercises || []).length;
                  const totalExercisesCount = step.practicalExercises.length;

                  return (
                    <div
                      key={step.stepNumber}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        step.completed 
                          ? 'border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isExpanded
                            ? 'border-purple-300 dark:border-purple-800/80 bg-white dark:bg-zinc-900 shadow-md'
                            : 'border-gray-150 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-950/20 hover:border-purple-200 dark:hover:border-purple-900/50'
                      }`}
                    >
                      {/* STEP HEADER / ACCORDION TRIGGER */}
                      <div 
                        onClick={() => setExpandedStepNumber(isExpanded ? null : step.stepNumber)}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Step Number Pill */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-sm transition ${
                            step.completed
                              ? 'bg-emerald-600 text-white'
                              : isExpanded
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                          }`}>
                            {step.stepNumber}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`font-bold text-sm sm:text-base truncate ${
                                step.completed ? 'text-gray-900 dark:text-zinc-100 line-through decoration-emerald-500/60' : 'text-gray-900 dark:text-zinc-100'
                              }`}>
                                {step.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                step.difficulty === 'Beginner' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' :
                                step.difficulty === 'Intermediate' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' :
                                'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              }`}>
                                {step.difficulty}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {step.estimatedTime}
                              </span>
                              <span>•</span>
                              <span>{step.topics.length} topics</span>
                              {step.videos.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                    <Youtube className="w-3.5 h-3.5" /> {step.videos.length} videos
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Action Icons & Toggle */}
                        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                          {/* Complete Toggle Button */}
                          <button
                            type="button"
                            disabled={stepOperating === step.stepNumber}
                            onClick={() => handleToggleRoadmapStep(step.stepNumber, step.completed)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                              step.completed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent'
                            }`}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${step.completed ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <span className="hidden sm:inline">
                              {step.completed ? 'Completed' : 'Mark Complete'}
                            </span>
                          </button>

                          {/* Accordion Chevron */}
                          <div className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* STEP DETAILS BODY (EXPANDABLE) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-gray-150 dark:border-zinc-800/80 p-5 sm:p-6 space-y-6 text-xs text-gray-600 dark:text-zinc-300"
                          >
                            {/* Detailed Explanation */}
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-purple-600" />
                                What You Will Learn
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed font-sans">
                                {step.detailedExplanation}
                              </p>
                            </div>

                            {/* Topics Pills */}
                            {step.topics && step.topics.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-purple-600" />
                                  Core Topics
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {step.topics.map((topic, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/70 dark:border-zinc-700/60"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Prerequisites (if any) */}
                            {step.prerequisites && step.prerequisites.length > 0 && (
                              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-950/40 border border-gray-200/60 dark:border-zinc-800/60 flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                  <span className="font-semibold text-gray-800 dark:text-zinc-200">Prerequisites: </span>
                                  <span className="text-gray-600 dark:text-zinc-400">{step.prerequisites.join(" • ")}</span>
                                </div>
                              </div>
                            )}

                            {/* RECOMMENDED YOUTUBE TUTORIAL VIDEOS */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                                  <div className="p-1 rounded bg-red-600 text-white">
                                    <Youtube className="w-3.5 h-3.5" />
                                  </div>
                                  <span>Recommended YouTube Video Masterclasses</span>
                                </h4>
                                {step.fallbackSearchUrl && (
                                  <a
                                    href={step.fallbackSearchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>Search more on YouTube</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>

                              {step.videos && step.videos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                  {step.videos.map((vid) => (
                                    <div
                                      key={vid.videoId}
                                      className="group bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden hover:border-purple-300 dark:hover:border-purple-800/70 hover:shadow-lg transition-all duration-200 flex flex-col"
                                    >
                                      {/* Thumbnail container */}
                                      <div 
                                        onClick={() => setActiveVideo(vid)}
                                        className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden group-hover:opacity-95 transition"
                                      >
                                        <img
                                          src={vid.thumbnail}
                                          alt={vid.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                          loading="lazy"
                                        />
                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition">
                                          <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-200">
                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                          </div>
                                        </div>
                                        {/* Duration badge */}
                                        {vid.duration && (
                                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-semibold">
                                            {vid.duration}
                                          </div>
                                        )}
                                      </div>

                                      {/* Video Info */}
                                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                                        <div>
                                          <h5 
                                            onClick={() => setActiveVideo(vid)}
                                            className="font-bold text-xs text-gray-900 dark:text-zinc-100 line-clamp-2 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
                                            title={vid.title}
                                          >
                                            {vid.title}
                                          </h5>
                                          <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                            <span className="truncate">{vid.channelTitle}</span>
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                                          <button
                                            type="button"
                                            onClick={() => setActiveVideo(vid)}
                                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-500 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
                                          >
                                            <Play className="w-3 h-3 fill-current" />
                                            <span>Watch Video</span>
                                          </button>

                                          <a
                                            href={vid.watchUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition"
                                            title="Open on YouTube"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // Fallback when YouTube API key not provided or quota reached
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
                                      <Youtube className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                                        Explore Community Tutorials on YouTube
                                      </p>
                                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                                        Live YouTube search query tailored specifically for "{step.title}".
                                      </p>
                                    </div>
                                  </div>

                                  <a
                                    href={step.fallbackSearchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5 shrink-0 shadow-sm"
                                  >
                                    <span>Watch "{step.title}" on YouTube</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* PRACTICAL EXERCISES */}
                            {step.practicalExercises && step.practicalExercises.length > 0 && (
                              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-zinc-950/40 border border-gray-200/60 dark:border-zinc-800/70 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target className="w-4 h-4 text-purple-600" />
                                    <span>Practical Hands-on Exercises</span>
                                  </h4>
                                  <span className="text-[11px] text-gray-500 font-medium">
                                    {completedExercisesCount}/{totalExercisesCount} Completed
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {step.practicalExercises.map((exercise, eIdx) => {
                                    const isDone = (step.completedExercises || []).includes(eIdx);
                                    return (
                                      <div
                                        key={eIdx}
                                        onClick={() => handleToggleExercise(step.stepNumber, eIdx)}
                                        className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition select-none ${
                                          isDone 
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40' 
                                            : 'bg-white dark:bg-zinc-900 border-gray-200/80 dark:border-zinc-800 hover:border-purple-300'
                                        }`}
                                      >
                                        <div className="text-purple-600 dark:text-purple-400 shrink-0">
                                          {isDone ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <span className={`text-xs ${isDone ? 'line-through text-gray-400 dark:text-zinc-500 font-medium' : 'text-gray-800 dark:text-zinc-200 font-medium'}`}>
                                          {exercise}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* MINI-PROJECT & LEARNING OUTCOME */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {step.miniProjects && step.miniProjects.length > 0 && (
                                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-1.5">
                                  <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
                                    <Rocket className="w-4 h-4 text-purple-600" />
                                    <span>Milestone Mini-Project</span>
                                  </div>
                                  <p className="text-xs text-gray-800 dark:text-zinc-200 font-medium">
                                    {step.miniProjects[0]}
                                  </p>
                                </div>
                              )}

                              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-1.5">
                                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                                  <Trophy className="w-4 h-4 text-emerald-600" />
                                  <span>Learning Outcome</span>
                                </div>
                                <p className="text-xs text-gray-800 dark:text-zinc-200 font-medium">
                                  {step.learningOutcome}
                                </p>
                              </div>
                            </div>

                            {/* ACTION FOOTER */}
                            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-zinc-800/80">
                              <div className="flex items-center gap-2">
                                {!step.started && !step.completed && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartStep(step.stepNumber)}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Start Learning Step</span>
                                  </button>
                                )}
                                {step.started && !step.completed && (
                                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    ⚡ Learning In Progress
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={stepOperating === step.stepNumber}
                                  onClick={() => handleToggleRoadmapStep(step.stepNumber, step.completed)}
                                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm ${
                                    step.completed
                                      ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  }`}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{step.completed ? 'Mark Incomplete' : 'Mark as Completed'}</span>
                                </button>
                              </div>
                            </div>

                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. NOTES & MILESTONE TASKS (PRESERVED & ENHANCED) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Notes Autosave Card */}
        <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-600">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-50">Skill Notes & Code Snippets</h3>
                  <p className="text-[11px] text-gray-400">Autosaves continuously as you type</p>
                </div>
              </div>

              {saveStatus === 'saving' && <span className="text-[11px] text-amber-500 font-medium">Saving...</span>}
              {saveStatus === 'saved' && <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
              {saveStatus === 'error' && <span className="text-[11px] text-rose-500 font-medium">Save error</span>}
            </div>

            <textarea
              value={notesText}
              onChange={handleNotesChange}
              placeholder="Record your takeaways, code snippets, gotchas, or links from the tutorials..."
              rows={8}
              className="w-full p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition leading-relaxed resize-none font-mono"
            />
          </div>
        </div>

        {/* Custom Milestone Tasks Card */}
        <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-600">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-50">Custom Checklist Milestones</h3>
                  <p className="text-[11px] text-gray-400">Personal objectives & practice goals</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-500 font-mono">
                {tasks.filter(t => t.completed).length}/{tasks.length}
              </span>
            </div>

            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add custom milestone..."
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-xs text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No custom milestones added yet.</p>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800/80 bg-gray-50/40 dark:bg-zinc-950/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div 
                      onClick={() => handleToggleTask(task)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                    >
                      <div className="text-purple-600 shrink-0">
                        {task.completed ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </div>
                      <span className={`truncate font-medium ${task.completed ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-800 dark:text-zinc-200'}`}>
                        {task.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 5. EMBEDDED VIDEO PLAYER MODAL */}
      <VideoModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />

      {/* 6. EDIT SKILL METADATA MODAL */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 w-full max-w-lg p-6 md:p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2 text-base">
                  <Edit3 className="w-5 h-5 text-purple-600" /> Edit Skill Parameters
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateMeta} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Skill Focus Area</label>
                  <input 
                    type="text" 
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select 
                      value={editCategory} 
                      onChange={e => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-800 dark:text-zinc-100 focus:outline-none font-medium"
                    >
                      {["Programming", "Design", "Writing", "Fitness", "Music", "Languages", "Business", "Academic", "Other"].map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Difficulty</label>
                    <select 
                      value={editDifficulty} 
                      onChange={e => setEditDifficulty(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-800 dark:text-zinc-100 focus:outline-none font-medium"
                    >
                      {["Beginner", "Intermediate", "Advanced"].map(diff => (
                        <option key={diff} value={diff}>{diff}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Goal Date</label>
                  <input 
                    type="date" 
                    value={editGoalDate}
                    onChange={e => setEditGoalDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-medium"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingMeta}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    {updatingMeta ? 'Updating...' : 'Save Parameters'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-red-200 dark:border-red-900/40 w-full max-w-md p-6 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950/60">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-zinc-50">Delete Skill?</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to delete <strong>"{skill.name}"</strong>? This will permanently remove its roadmap, notes, video recommendations, and progress tracking history.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-500 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteSkill}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
