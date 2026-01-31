import { supabase } from '../../services/supabaseClient';
import { Question, mapDbQuestionToFrontend } from '../../types';

/**
 * Fetch questions for a checkpoint
 */
export async function getCheckpointQuestions(checkpointId: string): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('checkpoint_questions')
      .select(`
        question_id,
        questions:question_id (
          id,
          text,
          options,
          correct_answer,
          type,
          difficulty,
          model_answer,
          explanation,
          format,
          metadata,
          content,
          topic_id,
          subtopic_name,
          sort_order
        )
      `)
      .eq('checkpoint_id', checkpointId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }

    // Transform the data
    const questions = (data || []).map((item: any) => {
      // Depending on how Supabase returns the joined row, `item.questions` may be present
      // If not, fall back to the question_id object
      const dbQuestion = item.questions || item;
      const question = mapDbQuestionToFrontend(dbQuestion);
      return question;
    });

    console.log('Fetched questions:', questions.length);
    return questions;
  } catch (error) {
    console.error('Error in getCheckpointQuestions:', error);
    return [];
  }
}

/**
 * Submit and grade a quiz
 */
export async function submitQuiz(
  checkpointId: string,
  userId: string,
  username: string,
  answers: Record<string, string>
): Promise<{
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
}> {
  try {
    // 1. Get questions for the checkpoint
    const questions = await getCheckpointQuestions(checkpointId);

    // 2. Calculate score
    let correctCount = 0;
    const answerDetails: Array<{
      questionId: string;
      questionText: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
    }> = [];

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) {
        correctCount++;
      }

      answerDetails.push({
        questionId: question.id,
        questionText: question.text,
        userAnswer: userAnswer || 'No answer',
        correctAnswer: question.correctAnswer || '',
        isCorrect
      });
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 3. Get required score from checkpoint
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('required_score')
      .eq('id', checkpointId)
      .single();

    const requiredScore = checkpoint?.required_score || 85;
    const passed = score >= requiredScore;

    // 4. Debug logging
    console.log('=== QUIZ GRADING DETAILS ===');
    console.log('Total questions:', totalQuestions);
    console.log('Correct answers:', correctCount);
    console.log('Score:', score, '%');
    console.log('Required score:', requiredScore, '%');
    console.log('Passed:', passed);
    console.log('Answer details:', answerDetails);

    // 5. Save progress
    const { error: progressError } = await supabase
      .from('student_checkpoint_progress')
      .upsert({
        user_id: userId,
        checkpoint_id: checkpointId,
        score,
        passed,
        completed_at: new Date().toISOString()
      });

    if (progressError) {
      console.error('Error saving progress:', progressError);
    }

    return {
      score,
      passed,
      correctCount,
      totalQuestions
    };
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return {
      score: 0,
      passed: false,
      correctCount: 0,
      totalQuestions: 0
    };
  }
}

/**
 * Check if user can access a checkpoint
 */
export async function canAccessCheckpoint(
  userId: string,
  checkpointId: string
): Promise<boolean> {
  try {
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('prerequisite_checkpoint_id')
      .eq('id', checkpointId)
      .single();

    if (!checkpoint?.prerequisite_checkpoint_id) {
      return true; // No prerequisite
    }

    // Check if prerequisite is passed
    const { data: progress } = await supabase
      .from('student_checkpoint_progress')
      .select('passed')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint.prerequisite_checkpoint_id)
      .single();

    return progress?.passed || false;
  } catch (error) {
    console.error('Error checking checkpoint access:', error);
    return false;
  }
}

/**
 * Grade a quiz where user answers are stored as option indices
 */
export async function gradeQuiz(
  checkpointId: string,
  userAnswers: Record<string, number>
): Promise<{
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
}> {
  try {
    const { data: questionsData, error } = await supabase
      .from('checkpoint_questions')
      .select(`
        question_id,
        questions:question_id (
          id,
          text,
          options,
          correct_answer
        )
      `)
      .eq('checkpoint_id', checkpointId);

    if (error || !questionsData) {
      console.error('Error fetching questions for grading:', error);
      return { score: 0, passed: false, correctCount: 0, totalQuestions: 0 };
    }

    let correctCount = 0;

    questionsData.forEach((item: any) => {
      const q = item.questions;
      if (!q) return;
      const selectedIndex = userAnswers[q.id];

      if (selectedIndex === undefined || selectedIndex === null) {
        return; // unanswered
      }

      const userSelectedText = Array.isArray(q.options) ? q.options[selectedIndex] : undefined;

      if (userSelectedText === q.correct_answer) {
        correctCount++;
      } else {
        // Debug logging for incorrect answers
        console.log('Incorrect answer for question:', q.id);
        console.log('User selected text:', userSelectedText);
        console.log('Correct answer:', q.correct_answer);
        console.log('Options:', q.options);
      }
    });

    const totalQuestions = questionsData.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Get required score
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('required_score')
      .eq('id', checkpointId)
      .single();

    const requiredScore = checkpoint?.required_score || 85;
    const passed = score >= requiredScore;

    console.log('=== GRADING RESULTS ===');
    console.log('Total questions:', totalQuestions);
    console.log('Correct answers:', correctCount);
    console.log('Score:', score + '%');
    console.log('Required score:', requiredScore + '%');
    console.log('Passed:', passed);

    return { score, passed, correctCount, totalQuestions };
  } catch (error) {
    console.error('Error grading quiz:', error);
    return { score: 0, passed: false, correctCount: 0, totalQuestions: 0 };
  }
}

/**
 * Submit quiz using selected option indices; stores answer text in `submissions`
 */
export async function submitQuizWithAnswers(
  checkpointId: string,
  userId: string,
  username: string,
  selectedAnswers: Record<string, number>
) {
  try {
    // Grade first
    const { score, passed } = await gradeQuiz(checkpointId, selectedAnswers);

    // Convert indices to text for storage
    const { data: questionsData } = await supabase
      .from('checkpoint_questions')
      .select(`
        question_id,
        questions:question_id (
          id,
          options
        )
      `)
      .eq('checkpoint_id', checkpointId);

    const answersForStorage: Record<string, string> = {};

    if (questionsData) {
      questionsData.forEach((item: any) => {
        const q = item.questions;
        if (!q) return;
        const selectedIndex = selectedAnswers[q.id];
        if (selectedIndex !== undefined && Array.isArray(q.options)) {
          const answerText = q.options[selectedIndex];
          answersForStorage[q.id] = answerText;
        }
      });
    }

    // Save submission
    const { error } = await supabase
      .from('submissions')
      .insert({
        assessment_id: checkpointId,
        user_id: userId,
        username: username,
        answers: answersForStorage,
        score: score,
        graded: true,
        submitted_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving submission:', error);
    }

    // Save progress (upsert)
    const { error: progressError } = await supabase
      .from('student_checkpoint_progress')
      .upsert({
        user_id: userId,
        checkpoint_id: checkpointId,
        score,
        passed,
        completed_at: new Date().toISOString()
      });

    if (progressError) {
      console.error('Error saving progress after submission:', progressError);
    }

    return { score, passed };
  } catch (error) {
    console.error('Error in submitQuizWithAnswers:', error);
    return { score: 0, passed: false };
  }
}

/**
 * Test function to verify grading logic
 */
export async function testQuizGrading() {
  try {
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('id, title')
      .eq('topic_id', '6ae866b2-08ff-49b4-ad64-f8bd1a49e367')
      .eq('checkpoint_number', 1)
      .single();

    if (!checkpoint) {
      console.error('No checkpoint found');
      return;
    }

    console.log('Testing checkpoint:', checkpoint.title);

    const { data: questions } = await supabase
      .from('checkpoint_questions')
      .select(`
        question_id,
        questions (
          id,
          text,
          options,
          correct_answer
        )
      `)
      .eq('checkpoint_id', checkpoint.id)
      .limit(3);

    if (!questions) {
      console.error('No questions found');
      return;
    }

    questions.forEach((item: any, index: number) => {
      const q = item.questions;
      console.log(`\nQuestion ${index + 1}: ${q.text.substring(0, 50)}...`);
      console.log('Options:', q.options);
      console.log('Correct answer:', q.correct_answer);

      const correctIndex = Array.isArray(q.options) ? q.options.indexOf(q.correct_answer) : -1;
      console.log('Correct index:', correctIndex);

      const testAnswer = correctIndex;
      const userSelectedText = Array.isArray(q.options) ? q.options[testAnswer] : undefined;
      const isCorrect = userSelectedText === q.correct_answer;

      console.log('User selected text:', userSelectedText);
      console.log('Is correct?', isCorrect);
    });
  } catch (error) {
    console.error('Error in testQuizGrading:', error);
  }
}

/**
 * Save quiz submission to `submissions` table
 */
export async function saveQuizSubmission(
  assessmentId: string,
  userId: string,
  username: string,
  answers: Record<string, string>,
  score: number
) {
  const { error } = await supabase.from('submissions').upsert({
    assessment_id: assessmentId,
    user_id: userId,
    username: username,
    answers: answers,
    score: score,
    submitted_at: new Date().toISOString(),
    graded: true,
    ai_graded: false
  });

  if (error) {
    console.error('Error saving submission:', error);
  }
}
