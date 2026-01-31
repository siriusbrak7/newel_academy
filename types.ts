// =======================
// GLOBAL TYPES
// =======================

export type Role = 'admin' | 'teacher' | 'student';
export type Theme = 'Cosmic' | 'Cyber-Dystopian';
export type QuestionFormat = 'plain_text' | 'table' | 'image' | 'diagram' | 'code' | 'multipart';

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
  
  // NEW FIELDS FOR FORMAT SUPPORT
  format?: QuestionFormat;
  metadata?: any; // JSON for table headers, image URLs, etc.
  content?: string; // HTML/rich content
  
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
  ai_graded?: boolean;
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
  type?: 'academic' | 'challenge' | 'assessments';
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

// =======================
// THEORY SUBMISSIONS
// =======================

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
  user?: { username: string };
  graded_by_user?: { username: string };
  topic?: { title: string };
  checkpoint?: { title: string; checkpoint_number: number };
}

// =======================
// ANNOUNCEMENTS & NOTIFICATIONS - UPDATED TO MATCH DATABASE
// =======================

// FRONTEND INTERFACE (what your components use)
export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_name: string;
  expires_at: string;
  created_at: string; // ISO string from database
  // Optional fields
  author?: string;      // UUID from database (optional)
  updated_at?: string;  // ISO string from database
}

// DATABASE INTERFACE (what matches your Supabase schema)
export interface DbAnnouncement {
  id: string;
  title: string;
  content: string;
  author?: string;       // UUID (nullable)
  author_name?: string;  // Display name (nullable)
  created_at?: string;
  updated_at?: string;
  expires_at?: string;   // Added to match your column
}

// HELPER: Convert DbAnnouncement to Announcement
export const dbToFrontendAnnouncement = (dbAnn: DbAnnouncement): Announcement => ({
  id: dbAnn.id,
  title: dbAnn.title,
  content: dbAnn.content,
  author_name: dbAnn.author_name || 'System',
  created_at: dbAnn.created_at || new Date().toISOString(),
  expires_at: dbAnn.expires_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  author: dbAnn.author,
  updated_at: dbAnn.updated_at
});

// HELPER: Convert Announcement to DbAnnouncement for saving
export const frontendToDbAnnouncement = (ann: Partial<Announcement>): Partial<DbAnnouncement> => ({
  title: ann.title,
  content: ann.content,
  author_name: ann.author_name,
  expires_at: ann.expires_at
  // Don't send id, created_at, updated_at - let database handle
});

export interface Notification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  timestamp: number;
  metadata?: {
    userId?: string;
    username?: string;
    courseId?: string;
    topicId?: string;
    checkpointId?: string;
    assessmentId?: string;
    score?: number;
    actionUrl?: string;
  };
  expiresAt?: number;
}

export interface NotificationPreferences {
  userId: string;
  courseUpdates: boolean;
  newAssessments: boolean;
  leaderboardUpdates: boolean;
  submissionGraded: boolean;
  topicCompleted: boolean;
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
  
  // NEW FIELDS FOR FORMAT SUPPORT
  format?: QuestionFormat;
  metadata?: any;
  content?: string;
  
  created_at?: string;
}

/**
 * Helper to map database question to frontend question
 */
export function mapDbQuestionToFrontend(dbQuestion: any): Question {
  return {
    id: dbQuestion.id,
    text: dbQuestion.text,
    options: dbQuestion.options || [],
    correctAnswer: dbQuestion.correct_answer || '',
    type: dbQuestion.type as 'MCQ' | 'THEORY',
    difficulty: dbQuestion.difficulty as 'IGCSE' | 'AS' | 'A_LEVEL',
    topic: dbQuestion.topic || '',
    modelAnswer: dbQuestion.model_answer,
    explanation: dbQuestion.explanation,
    format: dbQuestion.format as QuestionFormat,
    metadata: dbQuestion.metadata,
    content: dbQuestion.content,
    
    // Keep database fields for reference
    topic_id: dbQuestion.topic_id,
    subtopic_name: dbQuestion.subtopic_name,
    sort_order: dbQuestion.sort_order
  };
}

/**
 * Helper to map database checkpoint to frontend checkpoint
 */
export function mapDbCheckpointToFrontend(dbCheckpoint: any): FrontendCheckpoint {
  return {
    id: dbCheckpoint.id,
    title: dbCheckpoint.title,
    checkpointNumber: dbCheckpoint.checkpoint_number,
    requiredScore: dbCheckpoint.required_score || 85,
    questionCount: dbCheckpoint.question_count || 5,
    description: dbCheckpoint.description,
    isFinalAssessment: dbCheckpoint.is_final_assessment || false,
    timeLimitPerQuestion: dbCheckpoint.time_limit_per_question || 25
  };
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

export interface DbNotification {
  id: string;
  user_id: string;
  text: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  metadata?: any;
  created_at?: string;
}