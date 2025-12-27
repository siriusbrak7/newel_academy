import { supabase } from '../../services/supabaseClient';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseStructure, Topic, Question, Material } from '../../types';
import { getAITutorResponse } from "../../services/geminiService";
import { 
  getCourses, 
  saveTopic, 
  uploadFileToSupabase,
  getPendingTheorySubmissions,
  getTopicCheckpoints,
  getTopicQuestions,
  deleteMaterial
} from '../../services/storageService';
import { 
  Plus, Save, Upload, File, Link as LinkIcon, FileText, 
  Trash2, Edit, ArrowLeft, Wand2, HelpCircle, CheckCircle, 
  Search, BookOpen, MessageSquare, Clock, Eye, Sparkles,
  X, Users, AlertCircle, FolderOpen, Download, Filter
} from 'lucide-react';

export const CourseManager: React.FC = () => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [activeSubject, setActiveSubject] = useState('Biology');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'create' | 'edit'>('create');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '', 
    gradeLevel: 'all', 
    description: '', 
    subtopics: '', 
    materialTitle: '', 
    materialType: 'text', 
    materialContent: '',
    checkpointsRequired: 3,
    checkpointPassPercentage: 80,
    finalAssessmentRequired: true
  });
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Record<string, Question[]>>({});
  const [addMatForm, setAddMatForm] = useState({ title: '', type: 'text', content: '' });
  const [addMatFile, setAddMatFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'topics' | 'theory'>('topics');
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  
  // ADD THESE STATES FOR LAZY LOADING QUESTIONS
  const [topicQuestions, setTopicQuestions] = useState<Record<string, Record<string, Question[]>>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);
  const [showQuestionsForTopic, setShowQuestionsForTopic] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      const coursesData = await getCourses();
      setCourses(coursesData);
    };
    loadCourses();
    loadTheorySubmissions();
  }, []);

  // FIXED: Move loadQuestionsForTopic function inside the component
  const loadQuestionsForTopic = async (topicId: string) => {
    if (topicQuestions[topicId]) {
      return; // Already loaded
    }
    
    setLoadingQuestions(topicId);
    try {
      const questions = await getTopicQuestions(topicId);
      setTopicQuestions(prev => ({
        ...prev,
        [topicId]: questions
      }));
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoadingQuestions(null);
    }
  };

  // When user clicks on a topic to view questions
  const handleViewQuestions = async (topicId: string) => {
    await loadQuestionsForTopic(topicId);
    setShowQuestionsForTopic(topicId);
  };

  const loadTheorySubmissions = async () => {
    try {
      const submissions = await getPendingTheorySubmissions();
      setTheorySubmissions(submissions || []);
    } catch (error) {
      console.error('Error loading theory submissions:', error);
    }
  };

  const editingTopic = selectedTopicId && courses[activeSubject] 
    ? courses[activeSubject][selectedTopicId] 
    : null;
  
  const parsedSubtopics = createForm.subtopics.split(',').map(s => s.trim()).filter(Boolean);

  // FIXED: CORRECT handleDeleteMaterial function
  const handleDeleteMaterial = async (materialIndex: number, materialId?: string) => {
    if (!editingTopic || !selectedTopicId || !courses[activeSubject]) {
      alert('No topic selected');
      return;
    }

    const material = editingTopic.materials[materialIndex];
    if (!material) {
      alert('Material not found');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${material.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      console.log('🗑️ Starting material deletion process...');
      console.log('Material details:', {
        title: material.title,
        id: material.id,
        type: material.type
      });

      // Try to delete from database if we have a valid material ID
      // Material IDs from database are UUIDs, not temp_ IDs
      if (material.id && !material.id.startsWith('temp_')) {
        try {
          console.log(`🗑️ Attempting to delete material from database: ${material.id}`);
          await deleteMaterial(material.id);
          console.log(`✅ Successfully deleted material from database: ${material.id}`);
        } catch (dbError) {
          console.error('❌ Failed to delete from database, but will continue with local delete:', dbError);
          // Continue with local delete even if database delete fails
        }
      } else {
        console.log('ℹ️ Material has temp ID or no ID, skipping database deletion');
      }

      // Remove the material from the local array
      const updatedMaterials = [...editingTopic.materials];
      updatedMaterials.splice(materialIndex, 1);

      const updatedTopic = { 
        ...editingTopic, 
        materials: updatedMaterials 
      };
      
      // Save the updated topic (without the deleted material)
      console.log('💾 Saving updated topic to database...');
      await saveTopic(activeSubject, updatedTopic);
      
      // Force refresh the courses data to get latest from database
      console.log('🔄 Refreshing courses data...');
      const updatedCourses = await getCourses(true); // Force refresh cache
      setCourses(updatedCourses);
      console.log('✅ Material deletion process completed successfully!');

      // Also update the editingTopic reference
      const refreshedTopic = updatedCourses[activeSubject]?.[selectedTopicId];
      if (refreshedTopic) {
        // We need to trigger a re-render by updating state
        // This is a bit hacky but works
        setSelectedTopicId(null);
        setTimeout(() => setSelectedTopicId(selectedTopicId), 100);
      }
      
      console.log('✅ Material deletion process completed');
      alert('✅ Material deleted successfully!');
      
    } catch (error) {
      console.error('❌ Error during material deletion:', error);
      alert('Failed to delete material. Please try again.');
    }
  };

  // FIXED: Add the missing handleSelectTopic function
  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setViewMode('edit');
    setAddMatForm({ title: '', type: 'text', content: '' });
    setAddMatFile(null);
    setShowQuestionsForTopic(null); // Hide questions when selecting a new topic
  };

  const handleSwitchToCreate = () => {
    setSelectedTopicId(null);
    setViewMode('create');
    setCreateForm({
      title: '', 
      gradeLevel: 'all', 
      description: '', 
      subtopics: '', 
      materialTitle: '', 
      materialType: 'text', 
      materialContent: '',
      checkpointsRequired: 3,
      checkpointPassPercentage: 80,
      finalAssessmentRequired: true
    });
    setCreateFile(null);
    setShowQuestionsForTopic(null);
  };

  const handleCreateTopic = async () => {
    if (!createForm.title) {
      alert('Topic Title required');
      return;
    }
    
    let materialContent = createForm.materialContent;

    if (createForm.materialType === 'file' && createFile) {
      setIsUploading(true);
      try {
        const publicUrl = await uploadFileToSupabase(createFile);
        if (!publicUrl) {
          alert("Failed to upload file. Please try again.");
          setIsUploading(false);
          return;
        }
        materialContent = publicUrl;
      } catch (error) {
        console.error('Upload error:', error);
        alert("Upload failed. Please try again.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    const newTopic: any = {
      title: createForm.title,
      gradeLevel: createForm.gradeLevel,
      description: createForm.description,
      subtopics: parsedSubtopics,
      materials: createForm.materialTitle ? [{
        title: createForm.materialTitle,
        type: createForm.materialType as 'text'|'link'|'file',
        content: materialContent
      }] : [],
      checkpoints_required: createForm.checkpointsRequired,
      checkpoint_pass_percentage: createForm.checkpointPassPercentage,
      final_assessment_required: createForm.finalAssessmentRequired
    };

    await saveTopic(activeSubject, newTopic);
    
    const updatedCourses = await getCourses();
    setCourses(updatedCourses);
    
    alert('✅ Topic saved successfully!');
    handleSwitchToCreate();
  };

  const handleAddMaterialToTopic = async () => {
    if (!editingTopic) return;
    if (!addMatForm.title) {
      alert("Title required");
      return;
    }

    let content = addMatForm.content;
    if (addMatForm.type === 'file') {
      if (!addMatFile) {
        alert("Please select a file");
        return;
      }
      setIsUploading(true);
      try {
        const url = await uploadFileToSupabase(addMatFile);
        if (!url) {
          alert("Upload failed");
          setIsUploading(false);
          return;
        }
        content = url;
      } catch (error) {
        console.error('Upload error:', error);
        alert("Upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else if (!content) {
      alert("Content required");
      return;
    }

    const newMat: Material = {
      id: `temp_${Date.now()}`,
      title: addMatForm.title,
      type: addMatForm.type as 'text' | 'link' | 'file',
      content: content
    };

    const updatedTopic = { 
      ...editingTopic, 
      materials: [...editingTopic.materials, newMat] 
    };
    
    await saveTopic(activeSubject, updatedTopic);
    
    const updatedCourses = await getCourses();
    setCourses(updatedCourses);
    
    alert('✅ Material added successfully!');
    
    setAddMatForm({ title: '', type: 'text', content: '' });
    setAddMatFile(null);
  };

  // Get filtered topics
  const allTopics = Object.values(courses[activeSubject] || {}) as Topic[];
  const filteredTopics = allTopics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (topic.description && topic.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGrade = filterGrade === 'all' || topic.gradeLevel === filterGrade;
    
    return matchesSearch && matchesGrade;
  });

  // Add QuestionsView component inside the main component
  const QuestionsView = ({ topicId }: { topicId: string }) => {
    const questions = topicQuestions[topicId] || {};
    
    return (
      <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-xl p-6">
        <h4 className="text-lg font-medium text-white mb-4 flex items-center justify-between">
          <span>Topic Questions</span>
          <button
            onClick={() => setShowQuestionsForTopic(null)}
            className="text-sm text-gray-400 hover:text-white"
          >
            Hide
          </button>
        </h4>
        
        {loadingQuestions === topicId ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading questions...</p>
          </div>
        ) : Object.keys(questions).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            No questions available for this topic
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(questions).map(([subtopic, qs]) => (
              <div key={subtopic} className="mb-6">
                <h5 className="font-medium text-cyan-300 mb-3 text-sm uppercase tracking-wider">
                  {subtopic} ({qs.length} questions)
                </h5>
                <div className="space-y-3">
                  {qs.map((q: any) => (
                    <div key={q.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <p className="text-white mb-2">{q.text}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="px-2 py-1 bg-gray-700 rounded">{q.type}</span>
                        <span className="px-2 py-1 bg-gray-700 rounded">{q.difficulty}</span>
                        {q.options && (
                          <span className="px-2 py-1 bg-gray-700 rounded">
                            {q.options.length} options
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // FIXED: Add theory submission content
  const renderTheorySubmissionDetails = (submission: any) => {
    if (!submission) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h5 className="text-lg font-medium text-white">{submission.user?.username || 'Unknown Student'}</h5>
            <p className="text-sm text-gray-400">
              {submission.topic?.title || 'Unknown Topic'} • Checkpoint {submission.checkpoint?.checkpoint_number || 'N/A'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            submission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
            submission.status === 'ai_graded' ? 'bg-blue-500/20 text-blue-400' :
            submission.status === 'teacher_graded' ? 'bg-green-500/20 text-green-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            {submission.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Question</label>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <p className="text-white">{submission.question_text}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Student Answer</label>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <p className="text-white">{submission.student_answer}</p>
            </div>
          </div>
          
          {submission.ai_suggested_score !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">AI Suggested Score</label>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">{submission.ai_suggested_score}%</span>
                <span className="text-xs text-gray-400">(Auto-generated)</span>
              </div>
            </div>
          )}
          
          {submission.teacher_score !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teacher Score</label>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold">{submission.teacher_score}%</span>
                <span className="text-xs text-gray-400">
                  Graded by: {submission.graded_by_user?.username || submission.graded_by || 'Unknown'}
                </span>
              </div>
            </div>
          )}
          
          {submission.teacher_feedback && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teacher Feedback</label>
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <p className="text-white">{submission.teacher_feedback}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm">
            Grade Now
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm">
            View Rubric
          </button>
          {submission.ai_suggested_score !== undefined && (
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
              Use AI Score
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/teacher-dashboard')}
                className="mr-4 p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Course Manager</h1>
                <p className="text-sm text-gray-400">Manage topics and learning materials</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('theory')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'theory' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Theory Submissions
                {theorySubmissions.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {theorySubmissions.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'topics' ? (
          <div className="space-y-8">
            {/* Subject Selection */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Select Subject</h2>
                  <p className="text-sm text-gray-400">Choose a subject to manage its topics</p>
                </div>
                <div className="flex gap-2">
                  {['Biology', 'Physics', 'Chemistry'].map((subject) => (
                    <button
                      key={subject}
                      onClick={() => {
                        setActiveSubject(subject);
                        setSelectedTopicId(null);
                        setViewMode('create');
                        setSearchTerm('');
                        setShowQuestionsForTopic(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeSubject === subject
                          ? 'bg-cyan-600 text-white shadow-lg'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search topics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="all">All Grades</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
                
                <button
                  onClick={handleSwitchToCreate}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Topic
                </button>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Topic List */}
              <div className="lg:col-span-1">
                <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Topics ({filteredTopics.length})</h3>
                    <span className="text-sm text-gray-400">{activeSubject}</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {filteredTopics.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No topics found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {searchTerm ? 'Try a different search' : 'Create your first topic'}
                        </p>
                      </div>
                    ) : (
                      filteredTopics.map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => handleSelectTopic(topic.id!)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedTopicId === topic.id
                              ? 'bg-cyan-900/30 border-cyan-500/50 shadow-lg'
                              : 'bg-gray-900/50 border-gray-700 hover:bg-gray-800/50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-white mb-1">{topic.title}</h4>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="px-2 py-1 bg-gray-800 rounded text-gray-300">
                                  Grade {topic.gradeLevel}
                                </span>
                                <span className="text-gray-500">
                                  {topic.materials?.length || 0} materials
                                </span>
                              </div>
                            </div>
                            {selectedTopicId === topic.id && (
                              <div className="bg-cyan-500 w-2 h-2 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          {topic.description && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                              {topic.description}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Content Area */}
              <div className="lg:col-span-2">
                {viewMode === 'create' ? (
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <Plus className="w-6 h-6 text-cyan-400" />
                      Create New Topic
                    </h3>
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Topic Title *
                        </label>
                        <input
                          type="text"
                          value={createForm.title}
                          onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="e.g., Cell Biology"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Grade Level
                        </label>
                        <select
                          value={createForm.gradeLevel}
                          onChange={(e) => setCreateForm({...createForm, gradeLevel: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          <option value="all">All Grades</option>
                          <option value="9">Grade 9</option>
                          <option value="10">Grade 10</option>
                          <option value="11">Grade 11</option>
                          <option value="12">Grade 12</option>
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={createForm.description}
                          onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Brief description of the topic..."
                        />
                      </div>
                    </div>

                    {/* Material Upload - SIMPLIFIED */}
                    <div className="mb-8">
                      <h4 className="text-lg font-medium text-white mb-4">Add Initial Material (Optional)</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Material Title
                          </label>
                          <input
                            type="text"
                            value={createForm.materialTitle}
                            onChange={(e) => setCreateForm({...createForm, materialTitle: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            placeholder="e.g., Introduction PDF"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Type
                            </label>
                            <select
                              value={createForm.materialType}
                              onChange={(e) => setCreateForm({...createForm, materialType: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              <option value="text">Text</option>
                              <option value="link">Link</option>
                              <option value="file">File</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Content
                            </label>
                            {createForm.materialType === 'file' ? (
                              <div className="relative">
                                <div className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white">
                                  {createFile ? (
                                    <div className="flex items-center justify-between">
                                      <span className="text-green-400">{createFile.name}</span>
                                      <CheckCircle className="w-5 h-5 text-green-400" />
                                    </div>
                                  ) : (
                                    <div className="text-gray-400">No file selected</div>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                                />
                              </div>
                            ) : createForm.materialType === 'link' ? (
                              <input
                                type="url"
                                value={createForm.materialContent}
                                onChange={(e) => setCreateForm({...createForm, materialContent: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                placeholder="https://..."
                              />
                            ) : (
                              <textarea
                                value={createForm.materialContent}
                                onChange={(e) => setCreateForm({...createForm, materialContent: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                placeholder="Enter text content..."
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={handleCreateTopic}
                      disabled={isUploading || !createForm.title}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          Creating Topic...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save New Topic
                        </>
                      )}
                    </button>
                  </div>
                ) : editingTopic ? (
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-6">
                    {/* Topic Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{editingTopic.title}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="px-3 py-1 bg-gray-800 rounded-full text-gray-300">
                            Grade {editingTopic.gradeLevel}
                          </span>
                          <span className="text-gray-400">
                            {editingTopic.materials?.length || 0} materials
                          </span>
                          <span className="text-gray-400">
                            Pass: {editingTopic.checkpoint_pass_percentage || 80}%
                          </span>
                        </div>
                        {editingTopic.description && (
                          <p className="text-gray-300 mt-4">{editingTopic.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewQuestions(editingTopic.id!)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Questions
                        </button>
                        <button
                          onClick={handleSwitchToCreate}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          New Topic
                        </button>
                      </div>
                    </div>

                    {/* Questions View - Conditionally rendered */}
                    {showQuestionsForTopic === editingTopic.id && (
                      <QuestionsView topicId={editingTopic.id!} />
                    )}

                    {/* Existing Materials */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-white">Existing Materials ({editingTopic.materials?.length || 0})</h4>
                        {editingTopic.materials?.length > 0 && (
                          <span className="text-sm text-gray-400">Click trash icon to delete</span>
                        )}
                      </div>
                      {editingTopic.materials?.length === 0 ? (
                        <div className="text-center py-8 bg-gray-900/50 rounded-xl">
                          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400">No materials yet</p>
                          <p className="text-sm text-gray-500">Add your first material below</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editingTopic.materials?.map((material, index) => (
                            <div key={material.id || index} className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    material.type === 'file' ? 'bg-green-900/30' : 
                                    material.type === 'link' ? 'bg-blue-900/30' : 
                                    'bg-gray-800'
                                  }`}>
                                    {material.type === 'file' ? <File className="w-5 h-5" /> : 
                                     material.type === 'link' ? <LinkIcon className="w-5 h-5" /> : 
                                     <FileText className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-white">{material.title}</h5>
                                    <p className="text-xs text-gray-400 uppercase">{material.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {material.type !== 'text' ? (
                                    <a
                                      href={material.content}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> Open
                                    </a>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        alert(`Material Content:\n\n${material.content.substring(0, 500)}${material.content.length > 500 ? '...' : ''}`);
                                      }}
                                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> View
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteMaterial(index, material.id)}
                                    className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                                    title="Delete Material"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add New Material */}
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                      <h4 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-cyan-400" />
                        Add New Material
                      </h4>
                      
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Title *
                            </label>
                            <input
                              type="text"
                              value={addMatForm.title}
                              onChange={(e) => setAddMatForm({...addMatForm, title: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              placeholder="e.g., Worksheet PDF"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Type
                            </label>
                            <select
                              value={addMatForm.type}
                              onChange={(e) => setAddMatForm({...addMatForm, type: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              <option value="text">Text</option>
                              <option value="link">Link</option>
                              <option value="file">File</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Content *
                          </label>
                          {addMatForm.type === 'file' ? (
                            <div className="relative">
                              <div className="w-full px-4 py-8 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg text-center cursor-pointer hover:border-cyan-500 transition-colors">
                                {addMatFile ? (
                                  <div className="space-y-2">
                                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                                    <p className="text-green-400 font-medium">{addMatFile.name}</p>
                                    <p className="text-sm text-gray-400">Click to change file</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Upload className="w-8 h-8 text-gray-500 mx-auto" />
                                    <p className="text-gray-400">Click to select file</p>
                                    <p className="text-xs text-gray-500">Supports PDF, DOC, PPT, Images</p>
                                  </div>
                                )}
                              </div>
                              <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => setAddMatFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          ) : addMatForm.type === 'link' ? (
                            <input
                              type="url"
                              value={addMatForm.content}
                              onChange={(e) => setAddMatForm({...addMatForm, content: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              placeholder="https://..."
                              required
                            />
                          ) : (
                            <textarea
                              value={addMatForm.content}
                              onChange={(e) => setAddMatForm({...addMatForm, content: e.target.value})}
                              rows={4}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              placeholder="Enter material content..."
                              required
                            />
                          )}
                        </div>
                        
                        <button
                          onClick={handleAddMaterialToTopic}
                          disabled={isUploading || !addMatForm.title || (!addMatForm.content && addMatForm.type !== 'file') || (addMatForm.type === 'file' && !addMatFile)}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3"
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5" />
                              Add Material
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-12 text-center">
                    <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Select a Topic</h3>
                    <p className="text-gray-400 mb-6">Choose a topic from the list to edit or add materials</p>
                    <button
                      onClick={handleSwitchToCreate}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Or Create New Topic
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* THEORY SUBMISSIONS TAB */
          <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white mb-2">Theory Submissions</h3>
              <p className="text-gray-400">Review and grade student theory answers</p>
            </div>
            
            {/* Theory submissions content */}
            <div className="p-6">
              {theorySubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No pending theory submissions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Submission list */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Pending Review</h4>
                    {theorySubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                          selectedSubmission?.id === sub.id
                            ? 'bg-cyan-900/30 border-cyan-500'
                            : 'bg-gray-900/50 border-gray-700 hover:bg-gray-800/50'
                        }`}
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-white">{sub.user?.username || 'Unknown Student'}</h5>
                            <p className="text-sm text-gray-400">
                              {sub.topic?.title || 'Unknown Topic'} • Checkpoint {sub.checkpoint?.checkpoint_number || 'N/A'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            sub.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            sub.status === 'ai_graded' ? 'bg-blue-500/20 text-blue-400' :
                            sub.status === 'teacher_graded' ? 'bg-green-500/20 text-green-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {sub.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-300 line-clamp-2">
                          {sub.question_text?.substring(0, 100)}...
                        </div>
                        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                          <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                          {sub.ai_suggested_score !== undefined && (
                            <span className="text-blue-400">AI Score: {sub.ai_suggested_score}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Submission details */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Submission Details</h4>
                    {!selectedSubmission ? (
                      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 text-center">
                        <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">Select a submission to view details</p>
                      </div>
                    ) : (
                      renderTheorySubmissionDetails(selectedSubmission)
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};