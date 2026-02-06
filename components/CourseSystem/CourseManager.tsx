import { supabase } from '../../services/supabaseClient';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseStructure, Topic, Question, Material } from '../../types';
import { 
  getCourses, 
  saveTopic, 
  uploadFileToSupabase,
  getTopicQuestions,
  deleteMaterial,
  cache,
  cacheKey
} from '../../services/storageService';
import { 
  Plus, Save, Upload, File, Link as LinkIcon, FileText, 
  Trash2, Edit, ArrowLeft, Search, CheckCircle, 
  X, AlertCircle, FolderOpen, Eye, Download
} from 'lucide-react';

export const CourseManager: React.FC = () => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [activeSubject, setActiveSubject] = useState<'Biology' | 'Physics' | 'Chemistry'>('Biology');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'create' | 'edit'>('create');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  // Create form
  const [createForm, setCreateForm] = useState({
    title: '', 
    gradeLevel: '9', 
    description: '', 
    materialTitle: '', 
    materialType: 'text' as 'text' | 'link' | 'file', 
    materialContent: ''
  });
  const [createFile, setCreateFile] = useState<File | null>(null);
  
  // Add material form
  const [addMatForm, setAddMatForm] = useState({ 
    title: '', 
    type: 'text' as 'text' | 'link' | 'file', 
    content: '' 
  });
  const [addMatFile, setAddMatFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  
  // Questions state
  const [topicQuestions, setTopicQuestions] = useState<Record<string, Record<string, Question[]>>>({});
  const [showQuestionsForTopic, setShowQuestionsForTopic] = useState<string | null>(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    console.log('🔄 Loading courses...');
    const key = cacheKey('courses', 'all');
    try {
      const cached = await cache.get<CourseStructure>(key, 30 * 60 * 1000);
      if (cached) {
        console.log('📦 Courses cache hit');
        setCourses(cached);
        return;
      }
    } catch (e) {
      // ignore cache failures
    }

    const coursesData = await getCourses();
    console.log('✅ Courses loaded:', coursesData);
    setCourses(coursesData);
    try { cache.set(key, coursesData, 30 * 60 * 1000); } catch (e) {}
  };

  // Get the currently editing topic
  const editingTopic = selectedTopicId && courses[activeSubject] 
    ? courses[activeSubject][selectedTopicId] 
    : null;

  // Handle topic selection
  const handleSelectTopic = (topicId: string) => {
    console.log('🎯 Selecting topic:', topicId);
    setSelectedTopicId(topicId);
    setViewMode('edit');
    setAddMatForm({ title: '', type: 'text', content: '' });
    setAddMatFile(null);
    setShowQuestionsForTopic(null);
  };

  // Switch to create mode
  const handleSwitchToCreate = () => {
    console.log('➕ Switching to create mode');
    setSelectedTopicId(null);
    setViewMode('create');
    setCreateForm({
      title: '', 
      gradeLevel: '9', 
      description: '', 
      materialTitle: '', 
      materialType: 'text', 
      materialContent: ''
    });
    setCreateFile(null);
    setShowQuestionsForTopic(null);
  };

  // CREATE TOPIC
  const handleCreateTopic = async () => {
    if (!createForm.title.trim()) {
      alert('Topic Title required');
      return;
    }
    
    console.log('🚀 Creating topic:', createForm.title);
    
    let materialContent = createForm.materialContent;
    
    // Handle file upload if present
    if (createForm.materialType === 'file' && createFile) {
      setIsUploading(true);
      try {
        console.log('📤 Uploading file...');
        const publicUrl = await uploadFileToSupabase(createFile);
        if (!publicUrl) {
          alert("Failed to upload file");
          setIsUploading(false);
          return;
        }
        materialContent = publicUrl;
        console.log('✅ File uploaded:', publicUrl);
      } catch (error) {
        console.error('Upload error:', error);
        alert("Upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    // Build topic object
    const newTopic = {
      title: createForm.title,
      gradeLevel: createForm.gradeLevel,
      description: createForm.description,
      subtopics: [],
      materials: createForm.materialTitle ? [{
        title: createForm.materialTitle,
        type: createForm.materialType,
        content: materialContent
      }] : [],
      checkpointsRequired: 3,
      checkpointPassPercentage: 80,
      finalAssessmentRequired: true
    };
    
    try {
      console.log('💾 Saving new topic to database...');
      const savedTopic = await saveTopic(activeSubject, newTopic);
      
      console.log('✅ Topic saved:', savedTopic);
      
      if (savedTopic && savedTopic.id) {
        // Invalidate cached courses and refresh
        try { cache.clear(cacheKey('courses', 'all')); } catch (e) {}
        await loadCourses();
        
        // Select the new topic
        setSelectedTopicId(savedTopic.id);
        setViewMode('edit');
        
        // Reset form
        setCreateForm({
          title: '', 
          gradeLevel: '9', 
          description: '', 
          materialTitle: '', 
          materialType: 'text', 
          materialContent: ''
        });
        setCreateFile(null);
        
        alert(`✅ Topic "${savedTopic.title}" created successfully!`);
      }
    } catch (error) {
      console.error('❌ Error creating topic:', error);
      alert('Failed to create topic');
    }
  };

  // ADD MATERIAL TO EXISTING TOPIC - FIXED VERSION
  const handleAddMaterialToTopic = async () => {
    if (!editingTopic || !selectedTopicId) {
      alert('No topic selected');
      return;
    }
    
    console.log('📦 Adding material to topic:', {
      topicId: selectedTopicId,
      topicTitle: editingTopic.title,
      currentMaterials: editingTopic.materials?.length || 0
    });
    
    // Validate
    if (!addMatForm.title.trim()) {
      alert("Title required");
      return;
    }
    
    let content = addMatForm.content;
    
    // Handle file upload
    if (addMatForm.type === 'file') {
      if (!addMatFile) {
        alert("Please select a file");
        return;
      }
      setIsUploading(true);
      try {
        console.log('📤 Uploading material file...');
        const url = await uploadFileToSupabase(addMatFile);
        if (!url) {
          alert("Upload failed");
          setIsUploading(false);
          return;
        }
        content = url;
        console.log('✅ File uploaded:', url);
      } catch (error) {
        console.error('Upload error:', error);
        alert("Upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else if (!content.trim()) {
      alert("Content required");
      return;
    }
    
    // Create updated materials array
    const newMaterial = {
      title: addMatForm.title,
      type: addMatForm.type,
      content: content
    };
    
    const updatedMaterials = [
      ...(editingTopic.materials || []),
      newMaterial
    ];
    
    console.log('📝 Updated materials count:', updatedMaterials.length);
    
    // Create complete topic update
    const updatedTopic = {
      ...editingTopic,
      materials: updatedMaterials
    };
    
    try {
      console.log('💾 Saving topic with new material...');
      const savedTopic = await saveTopic(activeSubject, updatedTopic);
      
      console.log('✅ Save response:', {
        saved: !!savedTopic,
        topicId: savedTopic?.id,
        materialsCount: savedTopic?.materials?.length
      });
      
      if (savedTopic) {
        // Invalidate cached courses and refresh
        try { cache.clear(cacheKey('courses', 'all')); } catch (e) {}
        await loadCourses();
        
        // Reselect topic
        setSelectedTopicId(savedTopic.id);
        
        alert(`✅ Material added! Topic now has ${savedTopic.materials?.length || 0} materials.`);
        
        // Reset form
        setAddMatForm({ title: '', type: 'text', content: '' });
        setAddMatFile(null);
      }
    } catch (error) {
      console.error('❌ Error adding material:', error);
      alert("Failed to save material");
    }
  };

  // DELETE MATERIAL - FIXED VERSION
  const handleDeleteMaterial = async (materialIndex: number, materialId: string) => {
    if (!editingTopic || !selectedTopicId) {
      alert('No topic selected');
      return;
    }
    
    const material = editingTopic.materials?.[materialIndex];
    if (!material) {
      alert('Material not found');
      return;
    }
    
    const confirmed = window.confirm(`Delete "${material.title}"?`);
    if (!confirmed) return;
    
    console.log('🗑️ Deleting material:', {
      topicId: selectedTopicId,
      materialIndex,
      materialId,
      materialTitle: material.title
    });
    
    try {
      // Remove from local array
      const updatedMaterials = [...(editingTopic.materials || [])];
      updatedMaterials.splice(materialIndex, 1);
      
      const updatedTopic = {
        ...editingTopic,
        materials: updatedMaterials
      };
      
      // Save to database
      console.log('💾 Saving updated topic...');
      const savedTopic = await saveTopic(activeSubject, updatedTopic);
      
      if (savedTopic) {
      // Invalidate cached courses and refresh
      try { cache.clear(cacheKey('courses', 'all')); } catch (e) {}
      await loadCourses();
        
        // If material has a real ID, also delete from materials table
        if (materialId && !materialId.startsWith('temp_')) {
          try {
            await deleteMaterial(materialId);
            console.log('✅ Material deleted from database');
          } catch (dbError) {
            console.error('Note: Material may have been removed by saveTopic', dbError);
          }
        }
        
        alert('✅ Material deleted successfully!');
      }
    } catch (error) {
      console.error('❌ Error deleting material:', error);
      alert('Failed to delete material');
    }
  };

  // Filter topics
  const allTopics = Object.values(courses[activeSubject] || {}) as Topic[];
  const filteredTopics = allTopics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === 'all' || topic.gradeLevel?.toString() === filterGrade;
    return matchesSearch && matchesGrade;
  });

  // Debug button
  const debugCurrentTopic = async () => {
    if (!selectedTopicId) {
      console.log('No topic selected');
      return;
    }
    
    console.log('🔍 DEBUG Current Topic:', {
      selectedTopicId,
      editingTopic: editingTopic ? {
        title: editingTopic.title,
        id: editingTopic.id,
        materialsCount: editingTopic.materials?.length,
        materials: editingTopic.materials
      } : 'No topic',
      courses: courses[activeSubject] ? Object.keys(courses[activeSubject]).length : 0
    });
    
    // Check database directly
    const { data: dbTopic } = await supabase
      .from('topics')
      .select(`
        *,
        materials (*)
      `)
      .eq('id', selectedTopicId)
      .single();
    
    console.log('📦 Database state:', dbTopic);
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
            
            <button
              onClick={debugCurrentTopic}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
            >
              Debug
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subject Selection */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Select Subject</h2>
              <p className="text-sm text-gray-400">Choose a subject to manage its topics</p>
            </div>
            <div className="flex gap-2">
              {(['Biology', 'Physics', 'Chemistry'] as const).map((subject) => (
                <button
                  key={subject}
                  onClick={() => {
                    setActiveSubject(subject);
                    setSelectedTopicId(null);
                    setViewMode('create');
                    setSearchTerm('');
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            
            <div>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
              // CREATE TOPIC FORM
              <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Plus className="w-6 h-6 text-cyan-400" />
                  Create New Topic
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Topic Title *
                    </label>
                    <input
                      type="text"
                      value={createForm.title}
                      onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="e.g., Cell Biology"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Grade Level *
                      </label>
                      <select
                        value={createForm.gradeLevel}
                        onChange={(e) => setCreateForm({...createForm, gradeLevel: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="9">Grade 9</option>
                        <option value="10">Grade 10</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Initial Material (Optional)
                      </label>
                      <input
                        type="text"
                        value={createForm.materialTitle}
                        onChange={(e) => setCreateForm({...createForm, materialTitle: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Material title"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Brief description..."
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateTopic}
                    disabled={isUploading || !createForm.title}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save New Topic
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : editingTopic ? (
              // EDIT TOPIC VIEW
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
                    </div>
                    {editingTopic.description && (
                      <p className="text-gray-300 mt-4">{editingTopic.description}</p>
                    )}
                  </div>
                  <button
                    onClick={handleSwitchToCreate}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    New Topic
                  </button>
                </div>

                {/* Existing Materials */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-white">
                      Materials ({editingTopic.materials?.length || 0})
                    </h4>
                  </div>
                  
                  {editingTopic.materials?.length === 0 ? (
                    <div className="text-center py-8 bg-gray-900/50 rounded-xl">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No materials yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {editingTopic.materials?.map((material, index) => (
                        <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
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
                                  <Eye className="w-3 h-3" /> View
                                </a>
                              ) : (
                                <button
                                  onClick={() => alert(`Content: ${material.content}`)}
                                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMaterial(index, material.id || '')}
                                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-colors"
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

                {/* Add New Material Form */}
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
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                          onChange={(e) => setAddMatForm({...addMatForm, type: e.target.value as any})}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="w-8 h-8 text-gray-500 mx-auto" />
                                <p className="text-gray-400">Click to select file</p>
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
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="https://..."
                          required
                        />
                      ) : (
                        <textarea
                          value={addMatForm.content}
                          onChange={(e) => setAddMatForm({...addMatForm, content: e.target.value})}
                          rows={4}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Enter material content..."
                          required
                        />
                      )}
                    </div>
                    
                    <button
                      onClick={handleAddMaterialToTopic}
                      disabled={isUploading || !addMatForm.title || (!addMatForm.content && addMatForm.type !== 'file') || (addMatForm.type === 'file' && !addMatFile)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3"
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
              // NO TOPIC SELECTED
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
    </div>
  );
};