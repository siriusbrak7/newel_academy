import React from 'react';
import { X, Sun, Moon, Settings, Download, Upload, Star, Cpu, Palette, Sparkles, Zap, Globe } from 'lucide-react';
import { Theme } from '../types';
// ✅ Import with correct path - add file extension for Vite
import { exportAllData, importAllData } from '../services/storageService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentTheme, setTheme }) => {
  
  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newel-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Data exported successfully');
      alert('Data exported successfully!');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const jsonString = event.target.result;
            const success = await importAllData(jsonString);
            
            if (success) {
              console.log('✅ Data imported successfully');
              alert('Data imported successfully! Please refresh the page.');
            } else {
              console.error('❌ Import failed');
              alert('Import failed. Please check the file format.');
            }
          } catch (error) {
            console.error('❌ Import error:', error);
            alert('Import error. Check console for details.');
          }
        };
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error('❌ Import initialization failed:', error);
    }
  };

  if (!isOpen) return null;

  const themes = [
    {
      id: 'Cosmic',
      name: 'Cosmic Explorer',
      description: 'Stars, planets & interstellar journey',
      icon: Star,
      color: 'bg-gradient-to-r from-cyan-500 to-purple-600',
      textColor: 'text-cyan-300',
      features: ['Animated Stars', 'Rocket Flight', 'Constellations', 'Floating Planets']
    },
    {
      id: 'Cyber-Dystopian',
      name: 'Cyber-Dystopian',
      description: 'Neon grids & matrix rain',
      icon: Cpu,
      color: 'bg-gradient-to-r from-green-500 to-emerald-700',
      textColor: 'text-green-400',
      features: ['Matrix Rain', 'Neon Grid', 'Glitch Effects', 'Scanlines'],
      font: 'font-mono'
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-md shadow-2xl z-50 transform transition-transform duration-300">
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="text-cyan-400" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="text-white" />
            </button>
          </div>

          {/* Theme Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="text-cyan-400" size={20} />
              <h3 className="text-white font-semibold text-lg">Theme Selection</h3>
            </div>
            
            <div className="space-y-3">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id as Theme)}
                  className={`w-full p-4 rounded-xl border transition-all duration-300 ${
                    currentTheme === themeOption.id
                      ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/5'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${themeOption.color}`}>
                      <themeOption.icon className="text-white" size={20} />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${themeOption.textColor} ${themeOption.font || ''}`}>
                          {themeOption.name}
                        </span>
                        {currentTheme === themeOption.id && (
                          <Sparkles className="text-yellow-400" size={14} />
                        )}
                      </div>
                      <p className="text-white/60 text-sm mt-1">
                        {themeOption.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {themeOption.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-1 rounded-full ${
                              currentTheme === themeOption.id
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-white/5 text-white/50'
                            }`}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="text-yellow-400" size={16} />
                <span className="text-white/70">
                  Active: <span className={`font-bold ${currentTheme === 'Cosmic' ? 'text-cyan-300' : 'text-green-400'}`}>
                    {currentTheme === 'Cosmic' ? 'Cosmic Explorer' : 'Cyber-Dystopian'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="text-cyan-400" size={20} />
              <h3 className="text-white font-semibold text-lg">Data Management</h3>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full p-3 rounded-lg flex items-center justify-between bg-white/5 text-white/70 hover:bg-white/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <Download size={20} className="group-hover:text-cyan-400 transition-colors" />
                  <span>Export All Data</span>
                </div>
                <span className="text-xs text-white/30">JSON Backup</span>
              </button>
              
              <button
                onClick={handleImport}
                className="w-full p-3 rounded-lg flex items-center justify-between bg-white/5 text-white/70 hover:bg-white/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <Upload size={20} className="group-hover:text-cyan-400 transition-colors" />
                  <span>Import Data</span>
                </div>
                <span className="text-xs text-white/30">Restore Backup</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span style={{ fontFamily: "'Pacifico', cursive" }} className="text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Newel Academy
                </span>
              </div>
              <p className="text-white/40 text-sm">v1.0 • Learn Effectively</p>
              <p className="text-white/30 text-xs mt-1">© 2025 Powered by Brak</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;