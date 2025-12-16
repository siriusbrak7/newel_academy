// src/components/CourseSystem/CourseManager.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseStructure, Topic, Question, Material } from '../../types';
import { getAITutorResponse } from "../../services/geminiService";
import { getCourses, saveTopic, uploadFileToSupabase } from '../../services/storageService';
import { 
  Plus, Save, Upload, File, Link as LinkIcon, FileText, 
  Trash2, Edit, ArrowLeft, Wand2, HelpCircle, CheckCircle, X 
} from 'lucide-react';

export const CourseManager: React.FC = () => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [activeSubject, setActiveSubject] = useState('Biology');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'create' | 'edit'>('create');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    id: '', title: '', gradeLevel: 'all', description: '', subtopics: '', 
    materialTitle: '', materialType: 'text', materialContent: ''
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

  useEffect(() => {
    const loadCourses = async () => {
      const coursesData = await getCourses();
      setCourses(coursesData);
    };
    loadCourses();
  }, []);

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
      topic: createForm.id || 'custom',
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
    if (!createForm.id || !createForm.title) {
      alert('Topic ID and Title required');
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
    
    const newTopic: Topic = {
      id: createForm.id.toLowerCase().replace(/\s+/g, '_'),
      title: createForm.title,
      gradeLevel: createForm.gradeLevel,
      description: createForm.description,
      subtopics: parsedSubtopics,
      materials: createForm.materialTitle ? [{
        id: Date.now().toString(),
        title: createForm.materialTitle,
        type: createForm.materialType as 'text'|'link'|'file',
        content: materialContent
      }] : [],
      subtopicQuestions: questionsMap
    };

    await saveTopic(activeSubject, newTopic);
    
    const updatedCourses = await getCourses();
    setCourses(updatedCourses);
    
    alert('Topic saved!');
    setCreateForm({ 
      id: '', title: '', gradeLevel: 'all', description: '', subtopics: '', 
      materialTitle: '', materialType: 'text', materialContent: '' 
    });
    setCreateFile(null);
    setQuestionsMap({});
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
      id: Date.now().toString(),
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
    
    setAddMatForm({ title: '', type: 'text', content: '' });
    setAddMatFile(null);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!editingTopic) return;
    
    if (!confirm("Are you sure you want to delete this material?")) return;

    const updatedTopic = {
      ...editingTopic,
      materials: editingTopic.materials.filter(m => m.id !== materialId)
    };
    
    await saveTopic(activeSubject, updatedTopic);
    
    const updatedCourses = await getCourses();
    setCourses(updatedCourses);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Course Management</h2>
        <button 
          onClick={() => navigate('/teacher-dashboard')} 
          className="text-white/50 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>
      
      <div className="flex gap-4 mb-8 border-b border-white/10 pb-1">
        {['Biology', 'Physics', 'Chemistry'].map(sub => (
          <button
            key={sub}
            onClick={() => { 
              setActiveSubject(sub); 
              setSelectedTopicId(null); 
              setViewMode('create'); 
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

      <div className="grid md:grid-cols-12 gap-6 h-[600px]">
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
          
          <div className="flex-grow overflow-y-auto space-y-2 pr-2">
            {(Object.values(courses[activeSubject] || {}) as Topic[]).map(topic => (
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
            {Object.keys(courses[activeSubject] || {}).length === 0 && (
              <div className="text-center text-white/30 italic text-sm py-4">
                No topics found.
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-8 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto">
          {viewMode === 'create' ? (
            <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Plus size={20} className="text-cyan-400"/> Create New Topic
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <input 
                  className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                  placeholder="Topic ID (e.g. cell_bio)" 
                  value={createForm.id} 
                  onChange={e => setCreateForm({...createForm, id: e.target.value})} 
                />
                <input 
                  className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                  placeholder="Topic Title (e.g. Cell Biology)" 
                  value={createForm.title} 
                  onChange={e => setCreateForm({...createForm, title: e.target.value})} 
                />
                <select 
                  className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                  value={createForm.gradeLevel} 
                  onChange={e => setCreateForm({...createForm, gradeLevel: e.target.value})}
                >
                  <option value="all">All Grades</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
                <input 
                  className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
                  placeholder="Subtopics (comma separated)" 
                  value={createForm.subtopics} 
                  onChange={e => setCreateForm({...createForm, subtopics: e.target.value})} 
                />
              </div>
              
              <textarea 
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white mb-6" 
                placeholder="Description / Instructions" 
                value={createForm.description} 
                onChange={e => setCreateForm({...createForm, description: e.target.value})} 
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
                    <div className="w-full bg-white/5 border border-white/10 border-dashed rounded-lg p-6 text-center hover:bg-white/10 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                      />
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
                    />
                  )}
                  
                  {createForm.materialType === 'text' && (
                    <button 
                      onClick={summarizeContent}
                      className="bg-purple-600/50 hover:bg-purple-600 text-white p-3 rounded-lg h-full"
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
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={handleAddQuestion}
                                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs"
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
                          >
                            View
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="text-white/20 hover:text-red-400 p-2"
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
                    <div className="w-full bg-black/40 border border-white/10 border-dashed rounded-lg p-4 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setAddMatFile(e.target.files?.[0] || null)}
                      />
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
  );
};