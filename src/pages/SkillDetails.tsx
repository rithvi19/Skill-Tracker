import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import CircularProgress from '../components/CircularProgress';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Edit3, Trash2, CheckCircle2, Circle, RefreshCw, 
  Plus, Check, X, ShieldAlert, BookOpen, Layers, GripVertical, AlertCircle, Save,
  Sparkles, Calendar, Clock
} from 'lucide-react';
import { Skill, Task, AIRecommendation } from '../types';

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
  
  // AI recommendations states
  const [recs, setRecs] = useState<AIRecommendation | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  // Edit metadata modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(skill?.name || '');
  const [editCategory, setEditCategory] = useState(skill?.category || '');
  const [editDifficulty, setEditDifficulty] = useState(skill?.difficulty || 'Beginner');
  const [editGoalDate, setEditGoalDate] = useState(skill?.goalDate || '');
  const [updatingMeta, setUpdatingMeta] = useState(false);

  // Debouncing Ref for Notes
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Data Loader
  useEffect(() => {
    if (skill) {
      setNotesText(skill.notes);
      fetchTasks();
      fetchRecommendations();
    }
  }, [skillId]);

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
    }, 1000); // 1-second debounce window
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
      addToast("Failed to lock tasks roster.", "error");
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

  // Regenerate Recommendations
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
        addToast("Premium AI guidelines refreshed and cached!", "success");
      } else {
        addToast("Gemini model generation timed out. Try again.", "error");
      }
    } catch (e) {
      addToast("Failed to request suggestions.", "error");
    } finally {
      setRecsLoading(false);
    }
  };

  // Create Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !token) return;

    // Optimistic check
    const tempId = Math.random().toString();
    const tempTask: Task = {
      id: tempId,
      skillId,
      title: newTaskTitle,
      completed: false,
      order: tasks.length,
      createdAt: new Date().toISOString()
    };
    
    // Optimistic append
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
        // Replace temp task with true database task
        setTasks(prev => prev.map(t => t.id === tempId ? data.task : t));
        addToast("Milestone added.", "success");
        // Quick progress reload triggered in app context (this refreshes circular display)
        await updateSkill(skillId, {}); 
      } else {
        // Revert
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
    
    // Optimistic toggle
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
        await updateSkill(skillId, {}); // Triggers progress updates in context
      } else {
        // Revert on error
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: originalComplete } : t));
        addToast("Could not toggle milestone completed.", "error");
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
        addToast("Tracking milestone scrubbed.", "info");
        await updateSkill(skillId, {});
      } else {
        setTasks(originalTasks);
        addToast("Scrub failure.", "error");
      }
    } catch (err) {
      setTasks(originalTasks);
    }
  };

  // NATIVE HTML5 DRAG & DROP FOR REORDERING WITHOUT fatal React 19 libraries!
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Stringify coordinates
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('text/plain');
    const sourceIdx = parseInt(sourceIdxStr, 10);
    
    if (isNaN(sourceIdx) || sourceIdx === targetIdx) return;

    const list = [...tasks];
    const [removed] = list.splice(sourceIdx, 1);
    list.splice(targetIdx, 0, removed);

    // Optimistically rebind orders local
    const ordered = list.map((t, i) => ({ ...t, order: i }));
    setTasks(ordered);

    try {
      const res = await fetch(`/api/skills/${skillId}/tasks/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderedIds: ordered.map(t => t.id) })
      });
      if (!res.ok) {
        fetchTasks(); // Reload true state from db if api error
        addToast("Reorder synchronization failed.", "error");
      }
    } catch (e) {
      fetchTasks();
    } finally {
      setDraggedIdx(null);
    }
  };

  // Update Skill metadata properties
  const handleUpdateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setUpdatingMeta(true);
    const ok = await updateSkill(skillId, {
      name: editName,
      category: editCategory,
      difficulty: editDifficulty as any,
      goalDate: editGoalDate || null
    });

    if (ok) {
      setIsEditOpen(false);
      addToast("Skill metadata synchronized.", "success");
    }
    setUpdatingMeta(false);
  };

  // Handle Full Skill Deletion
  const handleDeleteSkill = async () => {
    if (window.confirm("Are you positive you'd like to remove this whole tracker? All cached milestones and AI recommendations will be purged permanently.")) {
      const ok = await deleteSkill(skillId);
      if (ok) {
        onGoBack();
      }
    }
  };

  if (!skill) {
    return (
      <div className="p-12 text-center select-none space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
        <p className="text-sm text-gray-500">Could not retrieve matching skill dashboard parameters.</p>
        <button onClick={onGoBack} className="text-purple-600 hover:underline">Return to Hub</button>
      </div>
    );
  }

  // Determine goals remaining text
  let countdownLabel = "Deadline unset";
  if (skill.goalDate) {
    const diff = new Date(skill.goalDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    countdownLabel = days > 0 ? `${days} calendar days left` : days === 0 ? "Deadline is TODAY" : `${Math.abs(days)} days passed deadline`;
  }

  return (
    <div id="skill-details-container" className="space-y-8 select-none">
      
      {/* 1. Navigation header row */}
      <div className="flex items-center justify-between border-b border-gray-150 dark:border-zinc-805 pb-5">
        <button
          type="button"
          onClick={onGoBack}
          className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="p-2.5 rounded-xl text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:text-purple-600 hover:border-violet-400 transition cursor-pointer"
            title="Edit Skill Details"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDeleteSkill}
            className="p-2.5 rounded-xl text-red-500 hover:text-red-700 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-red-400 transition cursor-pointer"
            title="Purge Skill Tracker"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Visual Skill Card Hub with LARGER progress widget */}
      <div className="p-6 md:p-8 bg-gradient-to-tr from-zinc-50 via-white to-white dark:from-zinc-900/40 dark:via-zinc-900/60 dark:to-zinc-900/30 border border-gray-150 dark:border-zinc-800/80 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        {/* Progress Widget centered column */}
        <div className="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-150 dark:border-zinc-805 space-y-3">
          <div className="relative group hover:scale-105 transition duration-300">
            {/* LARGE animated ring */}
            <CircularProgress value={skill.progress} size={150} strokeWidth={11} glow />
          </div>
          <span className="text-xs font-bold font-mono tracking-widest uppercase text-gray-400">Current Progress</span>
        </div>

        {/* Informational column */}
        <div className="md:col-span-2 space-y-4 md:pl-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
            <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {skill.category}
            </span>
            <span className={`px-2.5 py-1 rounded ${
              skill.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-600' :
              skill.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-600' :
              'bg-fuchsia-500/10 text-fuchsia-600'
            }`}>
              {skill.difficulty} Focus Area
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight leading-tight">
              {skill.name}
            </h2>
            {skill.goalDate && (
              <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 font-sans">
                Goal target date: <strong className="text-purple-600 dark:text-purple-400">{new Date(skill.goalDate).toLocaleDateString()}</strong> ({countdownLabel})
              </p>
            )}
          </div>

          {/* Simple Linear progress helper to persist linear metrics */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
              <span>Linear progress multiplier:</span>
              <span>{skill.progress}% completed</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 rounded-full transition-all duration-1000"
                style={{ width: `${skill.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Notes & Tasks Columns Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column Left: Interactive debounced notes journal */}
        <div className="p-5 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex flex-col justify-between space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-950 dark:text-zinc-100">Notes & Daily Journal</h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-purple-500 animate-pulse font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving changes...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Saved to cloud
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Save failed!
                  </span>
                )}
                {saveStatus === 'idle' && (
                  <span className="text-[10px] uppercase font-bold text-gray-300 dark:text-zinc-650 flex items-center gap-1.5">
                    <Save className="w-3 h-3" /> Autosave active
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Autosaves debounced as you detail targets or review links.</p>
          </div>

          <textarea
            value={notesText}
            onChange={handleNotesChange}
            placeholder="Document your study outlines, reference logs, helpful hyperlinks, practice timings, or milestones here..."
            className="w-full flex-1 min-h-[250px] p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none font-sans leading-relaxed"
          />
        </div>

        {/* Column Right: Complete task reorder management */}
        <div className="p-5 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex flex-col justify-between space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <h3 className="font-bold text-gray-950 dark:text-zinc-100">Milestone Action Items</h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Check completed milestones, or drag handle to reorder lists.</p>
          </div>

          {/* Quick Add task form */}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input 
              type="text" 
              required
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Solve 3 Practice Problems" 
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> <span>Add</span>
            </button>
          </form>

          {/* Task lists container */}
          <div className="flex-1 min-h-[230px] max-h-[300px] overflow-y-auto pr-1 space-y-2">
            {tasksLoading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <CheckCircle2 className="w-8 h-8 text-purple-500/20 mb-2" />
                <p className="text-xs text-gray-500">No milestone items listed yet.</p>
                <p className="text-[10px] text-gray-400 mt-1">Append targets above to calculate dynamic progress rings.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      task.completed 
                        ? 'bg-emerald-500/5 dark:bg-zinc-950/20 border-emerald-500/20 text-gray-400 dark:text-gray-500'
                        : draggedIdx === index
                          ? 'bg-purple-500/10 border-purple-500 relative z-20 scale-102 shadow-sm'
                          : 'bg-gray-50 dark:bg-zinc-950/30 border-gray-150 dark:border-zinc-850 hover:bg-white dark:hover:bg-zinc-900 duration-150'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Drag Grip Handle */}
                      <button 
                        type="button" 
                        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-zinc-700 hover:text-gray-500 select-none p-1 pointer-events-auto"
                        title="Drag, then drop to reorder"
                      >
                        <GripVertical className="w-4.5 h-4.5" />
                      </button>

                      {/* Complete Check button */}
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        className={`p-1.5 rounded-lg border transition ${
                          task.completed 
                            ? 'bg-emerald-500 border-transparent text-white'
                            : 'border-gray-300 dark:border-zinc-700 hover:border-emerald-500/50 text-transparent hover:text-emerald-500'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </button>

                      {/* Task title */}
                      <span className={`text-xs font-semibold truncate ${task.completed ? 'line-through' : 'text-gray-700 dark:text-zinc-200'}`}>
                        {task.title}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 px-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-500/5 transition duration-150 ml-1.5"
                      title="Delete action item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Dedicated AI Recommendations Section */}
      <div className="p-5 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl relative overflow-hidden transition duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="absolute top-[-25%] right-[-15%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[80px]" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10 border-b border-gray-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600 rounded-2xl text-white shadow-md shadow-violet-600/15">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-zinc-50">AI Starter Steps</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Clear step-by-step roadmap to start and master this skill.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegenerateRecommendations}
            disabled={recsLoading}
            className="px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-white bg-purple-500/5 dark:bg-purple-400/5 hover:bg-purple-600 dark:hover:bg-purple-500 border border-purple-200 dark:border-purple-800/40 hover:border-transparent rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {recsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Refresh Starter Steps</span>
          </button>
        </div>

        {/* Core items content */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {recsLoading ? (
              // Skeleton loading states
              <motion.div 
                key="skeleton-recs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 animate-pulse"
              >
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="p-4 border border-gray-150 dark:border-zinc-800 rounded-2xl flex gap-4">
                    <div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-3 w-5/6 bg-gray-100 dark:bg-zinc-850 rounded" />
                      <div className="h-2 w-1/2 bg-gray-100 dark:bg-zinc-850 rounded" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : !recs ? (
              <motion.div 
                key="empty-recs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 text-center text-gray-400 font-sans"
              >
                <RefreshCw className="w-8 h-8 text-purple-500/20 mx-auto animate-spin mb-3" />
                <p className="text-sm text-gray-500">Retrieving startup steps from recommendation service...</p>
                <p className="text-xs text-gray-400">Initially loads curated pathways, and enhances dynamically with Gemini AI.</p>
              </motion.div>
            ) : (
              // Content loaded beautifully
              <motion.div 
                key="content-recs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 font-sans text-xs"
              >
                {(() => {
                  const displaySteps = recs.steps && recs.steps.length > 0
                    ? recs.steps
                    : (recs.roadmap && recs.roadmap.length > 0 ? recs.roadmap : []);
                  
                  if (displaySteps.length === 0) {
                    return (
                      <p className="text-gray-500 dark:text-zinc-400 text-center py-6 text-sm font-semibold">
                        No actionable steps compiled yet. Click refresh above to generate steps.
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displaySteps.map((step, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 border border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-950/20 rounded-2xl flex gap-3 items-start transition duration-200 hover:border-purple-200 dark:hover:border-purple-900/40"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 text-white font-mono font-bold text-[10px] shrink-0 mt-0.5 shadow-sm">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-zinc-200 leading-relaxed pt-0.5">
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 5. EDIT SKILL METADATA SHEET OVERLAY MODAL */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 w-full max-w-lg p-6 md:p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-purple-600" /> Edit Skill Tracker Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition cursor-pointer"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select 
                      value={editCategory} 
                      onChange={e => setEditCategory(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-zinc-100 focus:outline-none font-medium"
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
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-zinc-100 focus:outline-none font-medium"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-805 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-505 dark:text-zinc-400 font-semibold text-xs hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingMeta}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {updatingMeta ? 'Updating...' : 'Sync Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
