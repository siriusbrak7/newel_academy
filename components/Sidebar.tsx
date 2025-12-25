import React, { useEffect, useState } from 'react';
import {
  X,
  Settings,
  Download,
  Upload,
  Star,
  Cpu,
  Palette,
  Sparkles,
  Zap,
  Globe,
  Check
} from 'lucide-react';
import { Theme } from '../types';
import { exportAllData, importAllData } from '../services/storageService';
import { THEMES, THEME_CONFIGS } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTheme,
  setTheme
}) => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    // Prevent body scroll when sidebar is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Apply theme classes to sidebar backdrop
      if (typeof window !== 'undefined' && window.ThemeManager) {
        const themeClass = window.ThemeManager.getCurrentCssClass();
        document.body.classList.add(themeClass);
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newel-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success feedback
      setTimeout(() => setExporting(false), 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';

      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          setImporting(false);
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const jsonString = event.target.result;
            const success = await importAllData(jsonString);
            if (success) {
              alert('Data imported successfully! Page will refresh.');
              setTimeout(() => window.location.reload(), 1000);
            } else {
              alert('Import failed. Invalid file format.');
            }
          } catch (error) {
            console.error('Import error:', error);
            alert('Import error occurred.');
          } finally {
            setImporting(false);
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      console.error('Import init failed:', error);
      setImporting(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;
    
    // If swiped right by 50px, close sidebar
    if (diff > 50) {
      onClose();
      setTouchStartX(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
  };

  // Aligned with index.html capabilities and constants
  const themeOptions = [
    {
      id: THEMES.COSMIC,
      name: THEME_CONFIGS[THEMES.COSMIC].name,
      description: 'Stars, planets & interstellar journey',
      icon: Star,
      color: 'from-cyan-500 to-purple-600',
      bgColor: 'bg-gradient-to-r from-cyan-500 to-purple-600',
      textColor: 'text-cyan-300',
      features: ['Sagittarius Constellation', 'Drifting Spacecraft', 'Nebula Background', 'Floating Asteroids'],
      cssClass: 'cosmic-theme'
    },
    {
      id: THEMES.CYBER_DYSTOPIAN,
      name: THEME_CONFIGS[THEMES.CYBER_DYSTOPIAN].name,
      description: 'High-tech neon grids & matrix rain',
      icon: Cpu,
      color: 'from-green-500 to-emerald-700',
      bgColor: 'bg-gradient-to-r from-green-500 to-emerald-700',
      textColor: 'text-green-400',
      features: ['Matrix Rain Code', 'Holographic Grid', 'Glitch UI Effects', 'CRT Scanlines'],
      cssClass: 'cyber-theme'
    }
  ];

  if (!isOpen) return null;

  const isCosmic = currentTheme === THEMES.COSMIC;
  const isCyber = currentTheme === THEMES.CYBER_DYSTOPIAN;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99] transition-opacity"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />

      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 h-full w-80 max-w-[85vw] z-[100] transform transition-transform duration-300"
        style={{ 
          animation: 'fadeInRight 0.3s ease-out',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={`h-full backdrop-blur-xl shadow-2xl border-l ${
            isCosmic 
              ? 'cosmic-box-glow border-white/10 bg-slate-900/95' 
              : 'cyber-box-glow border-green-500/20 bg-black/95'
          }`}
        >
          <div className="p-6 flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className={isCosmic ? 'text-cyan-400' : 'text-green-400'} />
                Settings
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition ${
                  isCosmic 
                    ? 'hover:bg-white/10 text-white' 
                    : 'hover:bg-green-500/20 text-green-400'
                }`}
                aria-label="Close sidebar"
              >
                <X size={24} />
              </button>
            </div>

            {/* Theme Selection */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Palette className={isCosmic ? 'text-cyan-400' : 'text-green-400'} size={20} />
                <h3 className={`text-white font-semibold text-lg ${isCyber ? 'font-mono' : ''}`}>
                  Theme Selection
                </h3>
              </div>

              <div className="space-y-4">
                {themeOptions.map((themeOption) => {
                  const isActive = currentTheme === themeOption.id;
                  return (
                    <button
                      key={themeOption.id}
                      onClick={() => {
                        setTheme(themeOption.id as Theme);
                        // Update HTML theme manager
                        if (typeof window !== 'undefined' && window.ThemeManager) {
                          window.ThemeManager.setTheme(themeOption.id);
                        }
                      }}
                      className={`w-full p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                        isActive
                          ? isCosmic
                            ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 shadow-lg shadow-cyan-900/20'
                            : 'border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10 shadow-lg shadow-green-900/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex gap-3 relative z-10">
                        <div className={`p-2 rounded-lg h-fit ${themeOption.bgColor} shadow-lg`}>
                          <themeOption.icon className="text-white" size={20} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${themeOption.textColor} ${
                                themeOption.id === THEMES.CYBER_DYSTOPIAN ? 'font-mono' : ''
                              }`}
                            >
                              {themeOption.name}
                            </span>
                            {isActive && (
                              <div className="flex items-center gap-1">
                                <Sparkles className="text-yellow-400 animate-pulse" size={14} />
                                <Check className="text-green-400" size={14} />
                              </div>
                            )}
                          </div>

                          <p className="text-white/60 text-xs mt-1 mb-2">
                            {themeOption.description}
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {themeOption.features.map((feature, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  isActive
                                    ? isCosmic
                                      ? 'bg-black/40 border-cyan-500/30 text-cyan-200'
                                      : 'bg-black/40 border-green-500/30 text-green-200'
                                    : 'bg-black/20 border-white/5 text-white/40'
                                }`}
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 ${
                isCosmic
                  ? 'bg-white/5 border-white/10'
                  : 'bg-green-500/5 border-green-500/20'
              }`}>
                <div className={`p-1.5 rounded-full ${
                  isCosmic ? 'bg-yellow-500/20' : 'bg-green-500/20'
                }`}>
                  <Zap className={isCosmic ? 'text-yellow-400' : 'text-green-400'} size={16} />
                </div>
                <span className="text-white/70 text-sm">
                  Active Theme: <span className={`text-white font-bold ${
                    isCyber ? 'font-mono' : ''
                  }`}>
                    {currentTheme}
                  </span>
                </span>
              </div>
            </div>

            {/* Data Management */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className={isCosmic ? 'text-cyan-400' : 'text-green-400'} size={20} />
                <h3 className={`text-white font-semibold text-lg ${isCyber ? 'font-mono' : ''}`}>
                  Data Management
                </h3>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className={`w-full p-3 rounded-xl flex justify-between items-center border transition group ${
                    isCosmic
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-cyan-300'
                      : 'bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-300/80 hover:text-green-300'
                  } ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="flex items-center gap-3 transition-colors">
                    {exporting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Download size={20} />
                    )}
                    {exporting ? 'Exporting...' : 'Backup Data'}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                    isCosmic ? 'bg-white/10 text-white/40' : 'bg-green-500/10 text-green-400/40'
                  }`}>
                    JSON
                  </span>
                </button>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={`w-full p-3 rounded-xl flex justify-between items-center border transition group ${
                    isCosmic
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-green-300'
                      : 'bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-300/80 hover:text-green-300'
                  } ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="flex items-center gap-3 transition-colors">
                    {importing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Upload size={20} />
                    )}
                    {importing ? 'Importing...' : 'Restore Data'}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                    isCosmic ? 'bg-white/10 text-white/40' : 'bg-green-500/10 text-green-400/40'
                  }`}>
                    JSON
                  </span>
                </button>
              </div>

              <p className="text-white/40 text-xs mt-3 text-center">
                Your data is stored locally in your browser
              </p>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-white/10 text-center">
              <span
                style={{ fontFamily: "'Pacifico', cursive" }}
                className={`text-xl bg-clip-text text-transparent ${
                  isCosmic
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-400'
                    : 'bg-gradient-to-r from-green-400 to-emerald-400'
                }`}
              >
                The Newel
              </span>
              <p className="text-white/30 text-xs mt-2">
                v1.2.0 • Cosmic Update
              </p>
              <p className={`text-[10px] mt-1 ${
                isCosmic ? 'text-white/20' : 'text-green-400/20'
              }`}>
                © 2025 Powered by Brak
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default Sidebar;