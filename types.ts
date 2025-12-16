
export type Role = 'admin' | 'teacher' | 'student';
export type Theme = 'Cosmic' | 'Cyber-Dystopian';

export interface User {
  username: string;
  password?: string;
  role: Role;
  approved: boolean;
  securityQuestion: string;
  securityAnswer: string;
  gradeLevel?: string; // '9', '10', '11', '12'
  assignedStudents?: string[];
  lastLogin?: number;
  loginHistory?: number[]; // Array of timestamps for streak calculation
}

export interface AuthState {
  loggedIn: boolean;
  user: User | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[]; // for MCQ
  correctAnswer: string; // text match
  type: 'MCQ' | 'THEORY';
  difficulty: 'IGCSE' | 'AS' | 'A_LEVEL';
  topic: string;
  modelAnswer?: string; // For AI grading of theory
}

export interface Material {
  id: string;
  title: string;
  type: 'text' | 'file' | 'link';
  content: string; // Text content or Base64/URL
}

export interface Topic {
  id: string; // e.g., 'cell_biology'
  title: string; // e.g., 'Cell Biology'
  gradeLevel: string;
  description: string;
  subtopics: string[]; // List of subtopic names
  materials: Material[];
  subtopicQuestions?: Record<string, Question[]>; // Map subtopic name to list of questions
}

export interface CourseStructure {
  [subject: string]: {
    [topicId: string]: Topic;
  };
}

export interface Assessment {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  questions: Question[];
  assignedTo: string[]; // usernames or 'all'
  targetGrade: string; // '9', '10', '11', '12', 'all'
  createdBy: string;
  dueDate?: number;
}

export interface Submission {
  assessmentId: string;
  username: string;
  answers: Record<string, string>; // questionId -> answer
  submittedAt: number;
  graded: boolean;
  score?: number; // percentage
  feedback?: string;
  aiGraded?: boolean;
}

export interface TopicProgress {
  subtopics: { [subtopicName: string]: boolean }; // true if passed
  checkpointScores: { [subtopicName: string]: number };
  mainAssessmentScore?: number;
  mainAssessmentPassed: boolean;
  lastAccessed?: number; // timestamp
}

export interface UserProgress {
  [subject: string]: {
    [topicId: string]: TopicProgress;
  };
}

export interface LeaderboardEntry {
  username: string;
  score: number; // % completion or raw score
  gradeLevel?: string;
}

export interface Notification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: number;
}

export interface StudentStats {
  username: string;
  gradeLevel: string;
  avgScore: number;
  completionRate: number;
  lastActive: string;
  streak: number;
  activeDays: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  author: string;
}

// Add these to your existing types.ts file
export interface DbUser {
  id: string;
  username: string;
  password_hash?: string;
  role: Role;
  approved: boolean;
  security_question?: string;
  security_answer?: string;
  grade_level?: string;
  assigned_students?: string[];
  last_login?: string;
  login_history?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DbSubject {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface DbTopic {
  id: string;
  subject_id: string;
  title: string;
  description?: string;
  grade_level?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbMaterial {
  id: string;
  topic_id: string;
  title: string;
  type: 'text' | 'file' | 'link';
  content?: string;
  storage_path?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbQuestion {
  id: string;
  topic_id: string;
  subtopic_name?: string;
  text: string;
  type: 'MCQ' | 'THEORY';
  difficulty?: 'IGCSE' | 'AS' | 'A_LEVEL';
  options: string[];
  correct_answer?: string;
  model_answer?: string;
  explanation?: string;
  sort_order?: number;
  created_at?: string;
}

export interface DbAssessment {
  id: string;
  title: string;
  subject?: string;
  topic_id?: string;
  target_grade: string;
  created_by?: string;
  assigned_to: string[];
  due_date?: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbSubmission {
  id: string;
  assessment_id: string;
  user_id: string;
  answers: Record<string, string>;
  submitted_at: string;
  graded: boolean;
  score?: number;
  feedback?: string;
  ai_graded: boolean;
  grading_metadata?: any;
}

export interface DbUserProgress {
  id: string;
  user_id: string;
  topic_id: string;
  subtopics: Record<string, boolean>;
  checkpoint_scores: Record<string, number>;
  main_assessment_score?: number;
  main_assessment_passed: boolean;
  last_accessed: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbLeaderboard {
  id: string;
  username: string;
  user_id?: string;
  board_type: 'academic' | 'challenge' | 'assessments';
  score: number;
  grade_level?: string;
  metadata?: any;
  recorded_at?: string;
}

export interface DbAnnouncement {
  id: string;
  title: string;
  content: string;
  author?: string;
  author_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  text: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  metadata?: any;
  created_at?: string;
}
