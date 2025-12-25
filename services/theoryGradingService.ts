// services/theoryGradingService.ts
import { supabase } from './supabaseClient';
import { TheorySubmission } from '../types';
import { getAITutorResponse } from './geminiService';

// Helper function to get user ID from username
const getUserIdFromUsername = async (username: string): Promise<string> => {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();
  
  if (error || !data) throw new Error(`User ${username} not found`);
  return data.id;
};

// Save a theory question submission
export const saveTheorySubmission = async (
  userId: string,
  checkpointId: string,
  topicId: string,
  questionText: string,
  studentAnswer: string
): Promise<TheorySubmission> => {
  const { data, error } = await supabase
    .from('theory_submissions')
    .insert({
      user_id: userId,
      checkpoint_id: checkpointId,
      topic_id: topicId,
      question_text: questionText,
      student_answer: studentAnswer,
      status: 'pending',
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get theory submissions that need grading
export const getPendingTheorySubmissions = async (): Promise<TheorySubmission[]> => {
  const { data, error } = await supabase
    .from('theory_submissions')
    .select(`
      *,
      student:users!theory_submissions_user_id_fkey(username),
      grader:users!theory_submissions_graded_by_fkey(username),
      topic:topics(title),
      checkpoint:checkpoints(title, checkpoint_number)
    `)
    .in('status', ['pending', 'ai_graded'])
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching theory submissions:', error);
    throw error;
  }
  
  // Transform the data to match the expected structure
  const transformedData = (data || []).map(item => ({
    ...item,
    user: item.student, // Map student to user for backward compatibility
    graded_by_user: item.grader // Keep grader separate
  }));
  
  return transformedData;
};

// Get submissions for a specific student
export const getStudentTheorySubmissions = async (userId: string): Promise<TheorySubmission[]> => {
  const { data, error } = await supabase
    .from('theory_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// AI Auto-grading for theory questions
export const aiGradeTheoryAnswer = async (submissionId: string, questionText: string, studentAnswer: string, modelAnswer?: string): Promise<number> => {
  try {
    const prompt = `Grade this student answer. 
    Q: ${questionText} 
    Rubric: ${modelAnswer || 'General Science Accuracy'} 
    Student: ${studentAnswer}
    Return JSON: { "score": number, "feedback": "string" }`;

    // Call with isJson = true
    const rawResponse = await getAITutorResponse(prompt, 'grading_assistant', true);
    const result = JSON.parse(rawResponse);

    const { error } = await supabase
      .from('theory_submissions')
      .update({
        ai_suggested_score: result.score,
        teacher_feedback: result.feedback, // Storing AI feedback here initially
        status: 'ai_graded'
      })
      .eq('id', submissionId);

    if (error) throw error;
    return result.score;
  } catch (error) {
    console.error('AI grading error:', error);
    return 0;
  }
};

// Teacher manual grading - UPDATED to use UUID
export const teacherGradeTheoryAnswer = async (
  submissionId: string,
  teacherScore: number,
  teacherFeedback: string,
  teacherUsername: string
): Promise<void> => {
  try {
    const teacherId = await getUserIdFromUsername(teacherUsername);
    
    const { error } = await supabase
      .from('theory_submissions')
      .update({
        teacher_score: teacherScore,
        teacher_feedback: teacherFeedback,
        graded_by: teacherId,
        graded_at: new Date().toISOString(),
        status: 'teacher_graded'
      })
      .eq('id', submissionId);

    if (error) throw error;
  } catch (error) {
    console.error('Teacher grading error:', error);
    throw error;
  }
};

// Final approval (teacher confirms AI grade or modifies it) - UPDATED to use UUID
export const approveTheoryGrade = async (
  submissionId: string,
  finalScore: number,
  feedback: string,
  approvedByUsername: string
): Promise<void> => {
  try {
    const approvedById = await getUserIdFromUsername(approvedByUsername);
    
    const { error } = await supabase
      .from('theory_submissions')
      .update({
        teacher_score: finalScore,
        teacher_feedback: feedback,
        graded_by: approvedById,
        graded_at: new Date().toISOString(),
        status: 'approved'
      })
      .eq('id', submissionId);

    if (error) throw error;
  } catch (error) {
    console.error('Approval error:', error);
    throw error;
  }
};