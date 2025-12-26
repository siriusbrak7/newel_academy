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
  getTopicCheckpoints
} from '../../services/storageService';
import { 
  Plus, Save, Upload, File, Link as LinkIcon, FileText, 
  Trash2, Edit, ArrowLeft, Wand2, HelpCircle, CheckCircle, 
  Search, BookOpen, MessageSquare, Clock, Eye, Sparkles,
  X, Users, AlertCircle
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
  const [qEntry, setQEntry] = useState<{
    subtopic: string, text: string, a: string, b: string, c: string, d: string, correct: string
  } | null>(null);
  const [addMatForm, setAddMatForm] = useState({ title: '', type: 'text', content: '' });
  const [addMatFile, setAddMatFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'topics' | 'theory'>('topics');
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  useEffect(() => {
    const loadCourses = async () => {
      const coursesData = await getCourses();
      setCourses(coursesData);
    };
    loadCourses();
    loadTheorySubmissions();
  }, []);

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

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setViewMode('edit');
    setAddMatForm({ title: '', type: 'text', content: '' });
    setAddMatFile(null);
  };

  const handleSwitchToCreate = () => {
    setSelectedTopicId(null);
    setViewMode('create');
    setQuestionsMap({});
    setQEntry(null);
    setSearchTerm('');
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
  };

  const summarizeContent = async () => {
    if (!createForm.materialContent || createForm.materialType !== 'text') return;
    try {
      const text = await getAITutorResponse(
        `Summarize these teaching notes in 3 bullet points: ${createForm.materialContent}`
      );
      setAiSummary(text);
    } catch (error) {
      console.error('AI Summary error:', error);
      setAiSummary("Could not generate summary.");
    }
  };

  const handleAddQuestion = () => {
    if (!qEntry) return;
    
    const newQ: Question = {
      id: Date.now().toString(),
      text: qEntry.text,
      type: 'MCQ',
      difficulty: 'IGCSE',
      topic: createForm.title || 'custom',
      options: [qEntry.a, qEntry.b, qEntry.c, qEntry.d],
      correctAnswer: qEntry.correct === 'A' ? qEntry.a : 
                    qEntry.correct === 'B' ? qEntry.b : 
                    qEntry.correct === 'C' ? qEntry.c : qEntry.d
    };

    setQuestionsMap(prev => ({
      ...prev,
      [qEntry.subtopic]: [...(prev[qEntry.subtopic] || []), newQ]
    }));
    setQEntry(null);
  };

  const handleRemoveQuestion = (subtopic: string, qId: string) => {
    setQuestionsMap(prev => ({
      ...prev,
      [subtopic]: prev[subtopic].filter(q => q.id !== qId)
    }));
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
      subtopicQuestions: questionsMap,
      checkpoints_required: createForm.checkpointsRequired,
      checkpoint_pass_percentage: createForm.checkpointPassPercentage,
      final_assessment_required: createForm.finalAssessmentRequired
    };

    await saveTopic(activeSubject, newTopic);
    
    const updatedCourses = await getCourses();
    setCourses(updatedCourses);
    
    alert('Topic saved!');
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
    setQuestionsMap({});
    setAiSummary('');
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
        console.log(`✅ Additional file uploaded: ${url}`);
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

  const handleDeleteMaterial = async (materialId: string) => {
    if (!editingTopic) return;
    
    if (!confirm("Are you sure you want to delete this material?")) return;

    const materialToDelete = editingTopic.materials.find(m => m.id === materialId);
    if (materialToDelete?.id?.startsWith('temp_')) {
      const updatedTopic = {
        ...editingTopic,
        materials: editingTopic.materials.filter(m => m.id !== materialId)
      };
      
      await saveTopic(activeSubject, updatedTopic);
    } else {
      try {
        const { error } = await supabase
          .from('materials')
          .delete()
          .eq('id', materialId);
        
        if (error) {
          console.error('Error deleting material from database:', error);
          alert('Failed to delete material from database');
          return;
        }
        
        const updatedCourses = await getCourses();
        setCourses(updatedCourses);
        alert('✅ Material deleted from database');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting material');
      }
    }
  };

  // Get filtered topics for dropdown/search
  const allTopics = Object.values(courses[activeSubject] || {}) as Topic[];
  const filteredTopics = allTopics.filter(topic => 
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (topic.description && topic.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Course Management</h2>
        <button 
          onClick={() => navigate('/teacher-dashboard')} 
          className="text-white/50 hover:text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-1">
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'topics' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-white/50 hover:text-white'
          }`}
        >
          <BookOpen size={16} className="inline mr-2" /> Manage Topics
        </button>
        <button
          onClick={() => {
            setActiveTab('theory');
            loadTheorySubmissions();
          }}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors relative ${
            activeTab === 'theory' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-white/50 hover:text-white'
          }`}
        >
          <MessageSquare size={16} className="inline mr-2" /> Theory Submissions
          {theorySubmissions.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {theorySubmissions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'topics' ? (
        <div>
          {/* Subject Tabs */}
          <div className="flex gap-4 mb-8 border-b border-white/10 pb-1">
            {['Biology', 'Physics', 'Chemistry'].map(sub => (
              <button
                key={sub}
                onClick={() => { 
                  setActiveSubject(sub); 
                  setSelectedTopicId(null); 
                  setViewMode('create'); 
                  setSearchTerm('');
                }}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  activeSubject === sub 
                    ? 'text-cyan-400 border-b-2 border-cyan-400' 
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-12 gap-6 h-[600px] relative">
            {/* LEFT SIDE: Topic Selection */}
            <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
              <button 
                onClick={handleSwitchToCreate}
                className={`w-full py-3 mb-4 rounded-xl border border-dashed flex items-center justify-center gap-2 transition-all ${
                  viewMode === 'create' 
                    ? 'bg-cyan-600/20 border-cyan-400 text-cyan-300' 
                    : 'text-white/50 hover:text-white hover:bg-white/5 border-white/20'
                }`}
              >
                <Plus size={18}/> Create New Topic
              </button>
              
              {/* Search Box */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-white/40"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search size={16} className="text-white/40" />
                </div>
              </div>
              
              {/* Topic Dropdown/List */}
              <div className="flex-grow overflow-y-auto">
                {filteredTopics.length === 0 ? (
                  <div className="text-center text-white/30 italic text-sm py-4">
                    {searchTerm ? 'No topics match your search' : 'No topics found.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTopics.slice(0, 20).map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedTopicId === topic.id 
                            ? 'bg-purple-600 text-white border-purple-400' 
                            : 'bg-black/20 text-white/70 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-bold text-sm truncate">{topic.title}</div>
                        <div className="text-xs opacity-50 flex justify-between mt-1">
                          <span>Grade {topic.gradeLevel}</span>
                          <span>{topic.materials?.length || 0} Materials</span>
                        </div>
                      </button>
                    ))}
                    {filteredTopics.length > 20 && (
                      <div className="text-center text-white/40 text-xs py-2">
                        Showing 20 of {filteredTopics.length} topics
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Content Area - FIXED BLUR ISSUE */}
            <div className="md:col-span-8 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto">
              {viewMode === 'create' ? (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Plus size={20} className="text-cyan-400"/> Create New Topic
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Topic Title</label>
                      <input 
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                        placeholder="e.g. Cell Biology" 
                        value={createForm.title} 
                        onChange={e => setCreateForm({...createForm, title: e.target.value})} 
                      />
                    </div>
                    
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Grade Level</label>
                      <select 
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                        value={createForm.gradeLevel} 
                        onChange={e => setCreateForm({...createForm, gradeLevel: e.target.value})}
                      >
                        <option value="all">All Grades</option>
                        <option value="9">Grade 9</option>
                        <option value="10">Grade 10</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Subtopics (comma separated)</label>
                      <input 
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                        placeholder="e.g. Cell Structure, Cell Function, Cell Division" 
                        value={createForm.subtopics} 
                        onChange={e => setCreateForm({...createForm, subtopics: e.target.value})} 
                      />
                    </div>
                    
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Checkpoints Required</label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                        placeholder="3" 
                        value={createForm.checkpointsRequired} 
                        onChange={e => setCreateForm({...createForm, checkpointsRequired: parseInt(e.target.value) || 3})} 
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Checkpoint Pass Percentage</label>
                      <input 
                        type="number"
                        min="50"
                        max="100"
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                        placeholder="85" 
                        value={createForm.checkpointPassPercentage} 
                        onChange={e => setCreateForm({...createForm, checkpointPassPercentage: parseInt(e.target.value) || 85})} 
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <div className="flex items-center gap-2 p-3">
                        <input 
                          type="checkbox"
                          id="finalAssessment"
                          checked={createForm.finalAssessmentRequired}
                          onChange={e => setCreateForm({...createForm, finalAssessmentRequired: e.target.checked})}
                          className="w-5 h-5 accent-cyan-500"
                        />
                        <label htmlFor="finalAssessment" className="text-white text-sm">
                          Final Assessment Required
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white mb-6" 
                    placeholder="Description / Instructions" 
                    value={createForm.description} 
                    onChange={e => setCreateForm({...createForm, description: e.target.value})} 
                    rows={3}
                  />
                  
                  {/* Material Upload */}
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5 mb-6">
                    <p className="text-white/60 text-sm mb-3 font-bold uppercase">Initial Material (Optional)</p>
                    <div className="flex gap-4 mb-2">
                      <input 
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white" 
                        placeholder="Material Title" 
                        value={createForm.materialTitle} 
                        onChange={e => setCreateForm({...createForm, materialTitle: e.target.value})} 
                      />
                      <select 
                        className="bg-white/5 border border-white/10 rounded-lg p-3 text-white w-32" 
                        value={createForm.materialType} 
                        onChange={e => setCreateForm({...createForm, materialType: e.target.value})}
                      >
                        <option value="text">Text</option>
                        <option value="link">Link</option>
                        <option value="file">File</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2 items-start">
                      {createForm.materialType === 'file' ? (
                        <div className="relative w-full">
                          <div className="w-full bg-white/5 border border-white/10 border-dashed rounded-lg p-6 text-center hover:bg-white/10 transition-colors">
                            <div className="relative z-10">
                              {createFile ? (
                                <div className="text-green-400 flex items-center justify-center gap-2">
                                  <CheckCircle size={18}/> {createFile.name} selected
                                </div>
                              ) : (
                                <div className="text-white/50 flex flex-col items-center">
                                  <Upload size={24} className="mb-2"/>
                                  <span>Click to select file to upload</span>
                                </div>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                              onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                            />
                          </div>
                        </div>
                      ) : createForm.materialType === 'link' ? (
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" 
                          placeholder="https://..." 
                          value={createForm.materialContent} 
                          onChange={e => setCreateForm({...createForm, materialContent: e.target.value})} 
                        />
                      ) : (
                        <textarea 
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" 
                          placeholder="Content text" 
                          value={createForm.materialContent} 
                          onChange={e => setCreateForm({...createForm, materialContent: e.target.value})} 
                          rows={4}
                        />
                      )}
                      
                      {createForm.materialType === 'text' && (
                        <button 
                          onClick={summarizeContent}
                          className="bg-purple-600/50 hover:bg-purple-600 text-white p-3 rounded-lg h-full"
                          type="button"
                        >
                          <Wand2 size={20}/>
                        </button>
                      )}
                    </div>
                    {aiSummary && (
                      <div className="mt-2 p-3 bg-purple-900/20 border border-purple-500/30 rounded text-xs text-white/80 italic">
                        {aiSummary}
                      </div>
                    )}
                  </div>

                  {/* Question Creation Section */}
                  {parsedSubtopics.length > 0 && (
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 mb-6">
                      <p className="text-white/60 text-sm mb-3 font-bold uppercase flex items-center gap-2">
                        <HelpCircle size={14}/> Checkpoint Questions (Optional)
                      </p>
                      <p className="text-xs text-white/40 mb-4">
                        Define questions for each subtopic here. If skipped, default questions from the global bank will be used.
                      </p>
                      
                      <div className="space-y-4">
                        {parsedSubtopics.map((st, idx) => (
                          <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-white font-bold text-sm">{st}</h4>
                              <span className="text-xs text-cyan-400">
                                {questionsMap[st]?.length || 0}/5 Questions
                              </span>
                            </div>
                            
                            {questionsMap[st] && questionsMap[st].length > 0 && (
                              <ul className="text-xs text-white/70 mb-3 space-y-1">
                                {questionsMap[st].map(q => (
                                  <li key={q.id} className="flex justify-between hover:bg-white/5 p-1 rounded">
                                    <span className="truncate w-3/4">{q.text}</span>
                                    <button 
                                      onClick={() => handleRemoveQuestion(st, q.id)}
                                      className="text-red-400 hover:text-red-300"
                                      type="button"
                                    >
                                      <Trash2 size={12}/>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {qEntry && qEntry.subtopic === st ? (
                              <div className="bg-black/40 p-3 rounded-lg border border-white/10 mt-2">
                                <input 
                                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm mb-2" 
                                  placeholder="Question Text" 
                                  value={qEntry.text} 
                                  onChange={e => setQEntry({...qEntry, text: e.target.value})} 
                                />
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {['a','b','c','d'].map(opt => (
                                    <input 
                                      key={opt}
                                      className="bg-white/5 border border-white/10 rounded p-2 text-white text-xs" 
                                      placeholder={`Option ${opt.toUpperCase()}`}
                                      value={(qEntry as any)[opt]}
                                      onChange={e => setQEntry({...qEntry, [opt]: e.target.value})}
                                    />
                                  ))}
                                </div>
                                <div className="flex justify-between items-center">
                                  <select 
                                    className="bg-white/5 border border-white/10 rounded p-1 text-white text-xs"
                                    value={qEntry.correct}
                                    onChange={e => setQEntry({...qEntry, correct: e.target.value})}
                                  >
                                    <option value="A">Correct: A</option>
                                    <option value="B">Correct: B</option>
                                    <option value="C">Correct: C</option>
                                    <option value="D">Correct: D</option>
                                  </select>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setQEntry(null)}
                                      className="text-xs text-white/50 hover:text-white"
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={handleAddQuestion}
                                      className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs"
                                      type="button"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setQEntry({ 
                                  subtopic: st, text: '', a: '', b: '', c: '', d: '', correct: 'A' 
                                })}
                                className="w-full border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 rounded py-1 text-xs transition-colors"
                                disabled={questionsMap[st]?.length >= 5}
                                type="button"
                              >
                                {questionsMap[st]?.length >= 5 ? 'Maximum 5 questions reached' : '+ Add Custom Question'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleCreateTopic} 
                    disabled={isUploading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2"
                    type="button"
                  >
                    {isUploading ? 'Uploading...' : <Save size={18}/>}
                    {isUploading ? 'Uploading...' : 'Save New Topic'}
                  </button>
                </div>
              ) : editingTopic ? (
                <div className="animate-fade-in space-y-8">
                  <div className="flex justify-between items-start border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                        <Edit size={20} className="text-purple-400"/> Edit Topic
                      </h3>
                      <p className="text-white/50">{editingTopic.title} (Grade {editingTopic.gradeLevel})</p>
                      <div className="flex gap-4 mt-2 text-sm text-white/60">
                        <span>Checkpoints Required: {editingTopic.checkpoints_required || 3}</span>
                        <span>Pass Percentage: {editingTopic.checkpoint_pass_percentage || 80}%</span>
                        <span>Final Assessment: {editingTopic.final_assessment_required ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Materials List */}
                  <div>
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <FileText size={18}/> Existing Materials
                    </h4>
                    <div className="space-y-2">
                      {editingTopic.materials?.length === 0 && (
                        <p className="text-white/30 italic">No materials.</p>
                      )}
                      {editingTopic.materials?.map(m => (
                        <div key={m.id} className="bg-black/20 p-3 rounded-lg flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${
                              m.type === 'file' ? 'bg-green-500/20 text-green-300' : 
                              m.type === 'link' ? 'bg-blue-500/20 text-blue-300' : 
                              'bg-white/10 text-white'
                            }`}>
                              {m.type === 'file' ? <File size={16}/> : 
                              m.type === 'link' ? <LinkIcon size={16}/> : 
                              <FileText size={16}/>}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{m.title}</p>
                              <p className="text-xs text-white/40 uppercase">{m.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.type !== 'text' ? (
                              <a 
                                href={m.content} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs bg-white/5 hover:bg-white/20 text-white px-2 py-1 rounded"
                              >
                                View
                              </a>
                            ) : (
                              <button 
                                onClick={() => alert(m.content)}
                                className="text-xs bg-white/5 hover:bg-white/20 text-white px-2 py-1 rounded"
                                type="button"
                              >
                                View
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="text-white/20 hover:text-red-400 p-2"
                              type="button"
                            >
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Material */}
                  <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-5">
                    <h4 className="text-purple-300 font-bold mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                      <Plus size={16}/> Add New Material
                    </h4>
                    
                    <div className="flex gap-4 mb-3">
                      <input 
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" 
                        placeholder="Title (e.g. Lab PDF)" 
                        value={addMatForm.title} 
                        onChange={e => setAddMatForm({...addMatForm, title: e.target.value})} 
                      />
                      <select 
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm w-28" 
                        value={addMatForm.type} 
                        onChange={e => setAddMatForm({...addMatForm, type: e.target.value})}
                      >
                        <option value="text">Text</option>
                        <option value="link">Link</option>
                        <option value="file">File</option>
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      {addMatForm.type === 'file' ? (
                        <div className="relative w-full">
                          <div className="w-full bg-black/40 border border-white/10 border-dashed rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
                            <div className="relative z-10">
                              {addMatFile ? (
                                <div className="text-green-400 flex items-center justify-center gap-2 text-sm">
                                  <CheckCircle size={16}/> {addMatFile.name}
                                </div>
                              ) : (
                                <div className="text-white/40 text-sm flex items-center justify-center gap-2">
                                  <Upload size={16}/> Choose file...
                                </div>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                              onChange={(e) => setAddMatFile(e.target.files?.[0] || null)}
                            />
                          </div>
                        </div>
                      ) : addMatForm.type === 'link' ? (
                        <input 
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" 
                          placeholder="URL..." 
                          value={addMatForm.content} 
                          onChange={e => setAddMatForm({...addMatForm, content: e.target.value})} 
                        />
                      ) : (
                        <textarea 
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm h-20" 
                          placeholder="Notes..." 
                          value={addMatForm.content} 
                          onChange={e => setAddMatForm({...addMatForm, content: e.target.value})} 
                        />
                      )}
                    </div>
                    
                    <button 
                      onClick={handleAddMaterialToTopic} 
                      disabled={isUploading}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm flex justify-center items-center gap-2"
                      type="button"
                    >
                      {isUploading ? 'Uploading...' : <Plus size={16}/>}
                      {isUploading ? 'Uploading...' : 'Add Material'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/30">
                  Select a topic to edit
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* THEORY SUBMISSIONS TAB */
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Theory Submissions</h3>
            <p className="text-white/60 text-sm">
              Review and grade student theory answers from checkpoint assessments
            </p>
          </div>
          
          <div className="p-6">
            {theorySubmissions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 italic">No pending theory submissions</p>
                <p className="text-white/30 text-sm mt-2">
                  Students' theory answers will appear here when they submit
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Submission List */}
                <div className="space-y-3">
                  <h4 className="text-white font-bold mb-3">Pending Review</h4>
                  {theorySubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-lg cursor-pointer transition ${
                        selectedSubmission?.id === sub.id
                          ? 'bg-cyan-600/20 border border-cyan-500/50'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold">
                              {sub.user?.username || 'Student'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              sub.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              sub.status === 'ai_graded' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {sub.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm">
                            {sub.topic?.title || 'Topic'} • Checkpoint {sub.checkpoint?.checkpoint_number || '?'}
                          </p>
                          <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                            <Clock size={12} /> 
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {sub.ai_suggested_score && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-400">
                              {sub.ai_suggested_score}%
                            </div>
                            <div className="text-xs text-white/50">Newel Suggested</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Submission Details */}
                <div>
                  <h4 className="text-white font-bold mb-3">Submission Details</h4>
                  {!selectedSubmission ? (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                      <Eye size={32} className="text-white/20 mx-auto mb-3" />
                      <p className="text-white/40">Select a submission to view details</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                      <div>
                        <label className="block text-white/60 text-sm mb-1">Question</label>
                        <div className="bg-black/20 p-3 rounded text-white text-sm whitespace-pre-wrap">
                          {selectedSubmission.question_text}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-white/60 text-sm mb-1">Student Answer</label>
                        <div className="bg-black/20 p-3 rounded text-white text-sm whitespace-pre-wrap min-h-[150px]">
                          {selectedSubmission.student_answer}
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-white/60 text-sm mb-2">Actions:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate('/teacher-assessments')}
                            className="flex-1 py-2 bg-purple-600 text-white rounded font-bold text-sm flex items-center justify-center gap-2"
                          >
                            <Sparkles size={14} /> Grade in Assessment Panel
                          </button>
                        </div>
                        <p className="text-white/40 text-xs mt-2 text-center">
                          Use the full grading panel for detailed feedback and scoring
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};