export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Hashed password, omitted on frontend
  onboardingCompleted: boolean;
  avatar: string; // Base64 or emoji identifier or pre-defined URL
  createdAt: string;
  streak: number;
  lastActiveDate: string | null;
  emailVerified: boolean;
  verificationCode?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  notes: string;
  progress: number;
  goalDate: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  skillId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  description: string;
  duration?: string;
  publishedAt?: string;
  watchUrl: string;
  embedUrl: string;
}

export interface RoadmapStep {
  stepNumber: number;
  title: string;
  detailedExplanation: string;
  topics: string[];
  prerequisites: string[];
  practicalExercises: string[];
  miniProjects: string[];
  estimatedTime: string;
  difficulty: Difficulty;
  learningOutcome: string;
  completed: boolean;
  completedAt?: string;
  started?: boolean;
  completedExercises?: number[]; // indices of completed practical exercises
  videos: YouTubeVideo[];
  fallbackSearchUrl: string;
}

export interface RoadmapAdvisory {
  nextStepNumber?: number;
  nextStepTitle?: string;
  recommendationText: string;
  identifiedGaps: string[];
  practiceSuggestions: string[];
}

export interface AIRecommendation {
  id: string;
  skillId: string;
  steps?: string[];
  topics: string[];
  projects: string[];
  exercises: string[];
  roadmap: string[];
  interviewPrep: string[];
  advanced: string[];
  roadmapSteps?: RoadmapStep[];
  advisory?: RoadmapAdvisory;
  createdAt: string;
}
