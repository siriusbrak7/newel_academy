// =======================
// GLOBAL TYPES
// =======================

export type Role = 'admin' | 'teacher' | 'student';
export type Theme = 'Cosmic' | 'Cyber-Dystopian';

// =======================
// USER & AUTH
// =======================

export interface User {
  username: string;
  password?: string;
  role: Role;
  approved: boolean;
  securityQuestion: string;
  securityAnswer: string;
  gradeLevel?: string;
  assignedStudents?: string[];
  lastLogin?: number;
  loginHistory?: number[];
}

export interface AuthState {
  loggedIn: boolean;
  user: User | null;
}

// =======================
// CHAT
// =======================

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// =======================
// QUESTIONS
// =======================

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: 'MCQ' | 'THEORY';
  difficulty: 'IGCSE' | 'AS' | 'A_LEVEL';
  topic: string;
  modelAnswer?: string;

  // DB compatibility
  topic_id?: string;
  subtopic_name?: string;
  explanation?: string;
  sort_order?: number;
}

// =======================
// CHECKPOINTS (DATABASE)
// =======================

export interface Checkpoint {
  id: string;
  topic_id: string;
  checkpoint_number: number;
  title: string;
  description?: string;
  required_score: number;
  question_count: number;
  created_at?: string;
  is_final_assessment?: boolean;
  time_limit_per_question?: number;
  prerequisite_checkpoint_id?: string;
}

// =======================
// CHECKPOINTS (FRONTEND)
// =======================

export interface FrontendCheckpoint {
  id: string;
  title: string;
  checkpointNumber: number;
  requiredScore: number;
  questionCount: number;
  description?: string;
  isFinalAssessment?: boolean;
  timeLimitPerQuestion?: number;
}

// =======================
// CHECKPOINT QUESTIONS
// =======================

export interface CheckpointQuestion {
  id: string;
  checkpoint_id: string;
  question_id: string;
  order: number;
  question?: Question;
}

// =======================
// MATERIALS
// =======================

export interface Material {
  id: string;
  title: string;
  type: 'text' | 'file' | 'link';
  content: string;
}

// =======================
// TOPICS & COURSES
// =======================

export interface Topic {
  id?: string;
  title: string;
  gradeLevel: string;
  description: string;
  subtopics: string[];
  materials: Material[];
  subtopicQuestions?: Record<string, Question[]>;
  checkpoints_required?: number;
  checkpoint_pass_percentage?: number;
  final_assessment_required?: boolean;
  checkpoints?: FrontendCheckpoint[];
}

export interface CourseStructure {
  [subject: string]: {
    [topicId: string]: Topic;
  };
}

// =======================
// ASSESSMENTS
// =======================

export interface Assessment {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  questions: Question[];
  assignedTo: string[];
  targetGrade: string;
  createdBy: string;
  dueDate?: number;
}

// =======================
// SUBMISSIONS
// =======================

export interface Submission {
  assessmentId: string;
  username: string;
  answers: Record<string, string>;
  submittedAt: number;
  graded: boolean;
  score?: number;
  feedback?: string;
  newelGraded?: boolean;
}

// =======================
// PROGRESS TRACKING
// =======================

export interface CheckpointProgress {
  score?: number;
  passed?: boolean;
  completedAt?: string;
}

export interface TopicProgress {
  subtopics: { [subtopicName: string]: boolean };
  checkpointScores: { [subtopicName: string]: number };
  mainAssessmentScore?: number;
  mainAssessmentPassed: boolean;
  lastAccessed?: number;
}

export interface UserProgress {
  [subject: string]: {
    [topicId: string]: TopicProgress;
  };
}

// =======================
// LEADERBOARD & STATS
// =======================

export interface LeaderboardEntry {
  username: string;
  score: number;
  gradeLevel?: string;
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

// Add to your existing interfaces in types.ts
// Add to your TheorySubmission interface in types.ts:
export interface TheorySubmission {
  id: string;
  user_id: string;
  checkpoint_id: string;
  topic_id: string;
  question_text: string;
  student_answer: string;
  ai_suggested_score?: number;
  teacher_score?: number;
  teacher_feedback?: string;
  graded_by?: string;
  submitted_at: string;
  graded_at?: string;
  status: 'pending' | 'ai_graded' | 'teacher_graded' | 'approved';
  // Add these for the joined data
  user?: { username: string };
  graded_by_user?: { username: string };
  topic?: { title: string };
  checkpoint?: { title: string; checkpoint_number: number };
}

// =======================
// ANNOUNCEMENTS & NOTIFICATIONS
// =======================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  author: string;
}

export interface Notification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: number;
}

// =======================
// DATABASE MODELS
// =======================

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
