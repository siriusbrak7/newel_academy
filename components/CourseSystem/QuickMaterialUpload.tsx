// components/TeacherTools/QuickMaterialUpload.tsx
import React, { useState, useEffect } from 'react';
import { CourseStructure, Material, Topic } from '../../types'; // Add Topic type
import { getCourses, uploadFileToSupabase, saveTopic, cache, cacheKey } from '../../services/storageService';
import { Upload, File, Link as LinkIcon, FileText, Plus, X, CheckCircle } from 'lucide-react';


interface QuickMaterialUploadProps {
  onUploadComplete?: () => void;
}

export const QuickMaterialUpload: React.FC<QuickMaterialUploadProps> = ({ onUploadComplete }) => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Selection states
  const [selectedSubject, setSelectedSubject] = useState<string>('Biology');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  
  // Material form
  const [materialForm, setMaterialForm] = useState({
    title: '',
    type: 'file' as 'text' | 'link' | 'file',
    content: '',
  });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  
  // Load courses
  useEffect(() => {
    const loadCoursesData = async () => {
      setLoading(true);
      try {
        const key = cacheKey('courses', 'all');
        const cached = await cache.get<CourseStructure>(key, 30 * 60 * 1000);
        if (cached) {
          setCourses(cached);
        } else {
          const coursesData = await getCourses();
          setCourses(coursesData);
          try { cache.set(key, coursesData, 30 * 60 * 1000); } catch (e) {}
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCoursesData();
  }, []);
  
  // Get filtered topics based on selections
  // Then update the filteredTopics function:
const filteredTopics = React.useMemo(() => {
  if (!courses[selectedSubject]) return [];
  
  const allTopics = Object.values(courses[selectedSubject]);
  
  // Filter by grade - USE Topic TYPE
  if (selectedGrade === 'all') return allTopics;
  return allTopics.filter((topic: Topic) => topic.gradeLevel === selectedGrade);
}, [courses, selectedSubject, selectedGrade]);
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMaterialFile(file);
      setMaterialForm(prev => ({ ...prev, title: file.name.split('.')[0] }));
    }
  };
  
  // Handle upload
  const handleUpload = async () => {
    if (!selectedTopicId || !materialForm.title) {
      alert('Please select a topic and provide a title');
      return;
    }
    
    if (materialForm.type === 'file' && !materialFile) {
      alert('Please select a file');
      return;
    }
    
    if (materialForm.type !== 'file' && !materialForm.content) {
      alert('Please provide content');
      return;
    }
    
    setUploading(true);
    try {
      const topic = courses[selectedSubject][selectedTopicId];
      if (!topic) throw new Error('Topic not found');
      
      let content = materialForm.content;
      
      // Upload file if type is file
      if (materialForm.type === 'file' && materialFile) {
        const publicUrl = await uploadFileToSupabase(materialFile);
        if (!publicUrl) throw new Error('File upload failed');
        content = publicUrl;
      }
      
      // Create new material
      const newMaterial: Material = {
        id: `quick_${Date.now()}`,
        title: materialForm.title,
        type: materialForm.type,
        content: content,
      };
      
      // Update topic with new material
      const updatedTopic = {
        ...topic,
        materials: [...(topic.materials || []), newMaterial],
      };
      
      await saveTopic(selectedSubject, updatedTopic);
      
      // Invalidate courses cache so users see new material
      try { cache.clear(cacheKey('courses', 'all')); } catch (e) {}
      
      // Reset form
      setMaterialForm({ title: '', type: 'file', content: '' });
      setMaterialFile(null);
      setSelectedTopicId('');
      
      alert('✅ Material uploaded successfully!');
      onUploadComplete?.();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload material');
    } finally {
      setUploading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-2 text-white/60 text-sm">Loading courses...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Subject Selection */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedTopicId('');
            }}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm"
          >
            {['Biology', 'Physics', 'Chemistry'].map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        
        {/* Grade Level Selection */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            Grade Level
          </label>
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setSelectedTopicId('');
            }}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm"
          >
            <option value="all">All Grades</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>
        </div>
        
        {/* Topic Selection */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            Topic
          </label>
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm"
            disabled={filteredTopics.length === 0}
          >
            <option value="">Select a topic</option>
            {filteredTopics.map(topic => (
              <option key={topic.id} value={topic.id}>
                {topic.title} (Grade {topic.gradeLevel})
              </option>
            ))}
          </select>
          {filteredTopics.length === 0 && (
            <p className="text-xs text-white/40 mt-1">No topics found for this selection</p>
          )}
        </div>
      </div>
      
      {/* Material Form */}
      {selectedTopicId && (
        <div className="bg-black/20 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Plus size={16} className="text-cyan-400" />
              Add New Material
            </h4>
            {selectedTopicId && (
              <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                {courses[selectedSubject]?.[selectedTopicId]?.title}
              </span>
            )}
          </div>
          
          {/* Material Title */}
          <div>
            <label className="block text-white/60 text-sm mb-2">
              Material Title *
            </label>
            <input
              type="text"
              value={materialForm.title}
              onChange={(e) => setMaterialForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Worksheet PDF, Video Link, Notes"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30"
            />
          </div>
          
          {/* Material Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'file', label: 'File', icon: File, color: 'bg-green-500/20 text-green-400' },
              { value: 'link', label: 'Link', icon: LinkIcon, color: 'bg-blue-500/20 text-blue-400' },
              { value: 'text', label: 'Text', icon: FileText, color: 'bg-purple-500/20 text-purple-400' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMaterialForm(prev => ({ ...prev, type: value as any }))}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  materialForm.type === value
                    ? `${color} border-current`
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                <Icon size={18} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          
          {/* Content Area */}
          <div>
            {materialForm.type === 'file' ? (
              <div className="relative">
                <div className="w-full bg-black/30 border border-white/10 border-dashed rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer">
                  {materialFile ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                      <p className="text-green-400 font-medium">{materialFile.name}</p>
                      <p className="text-sm text-white/60">Click to change file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-white/40 mx-auto" />
                      <p className="text-white/80">Click to select file</p>
                      <p className="text-xs text-white/50">PDF, DOC, PPT, Images (Max 10MB)</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileSelect}
                />
              </div>
            ) : materialForm.type === 'link' ? (
              <input
                type="url"
                value={materialForm.content}
                onChange={(e) => setMaterialForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30"
              />
            ) : (
              <textarea
                value={materialForm.content}
                onChange={(e) => setMaterialForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter material content..."
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30"
              />
            )}
          </div>
          
          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !materialForm.title || (materialForm.type === 'file' && !materialFile) || (materialForm.type !== 'file' && !materialForm.content)}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Material
              </>
            )}
          </button>
        </div>
      )}
      
      {/* No Topic Selected Message */}
      {!selectedTopicId && (
        <div className="bg-black/20 border border-white/10 rounded-xl p-8 text-center">
          <File className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">Select a topic to add materials</p>
          <p className="text-sm text-white/40 mt-1">
            Choose subject, grade level, and topic above
          </p>
        </div>
      )}
    </div>
  );
};