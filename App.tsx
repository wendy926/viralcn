import React, { useState, useEffect } from 'react';
import { PenTool, Sparkles, Settings } from 'lucide-react';
import ThoughtTab from './components/ThoughtTab';
import GenerationTab from './components/GenerationTab';
import SettingsTab from './components/SettingsTab';
import { Thought, GlobalSettings, NicheType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'generate' | 'settings'>('capture');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selectedThoughtIds, setSelectedThoughtIds] = useState<string[]>([]);
  
  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    niche: NicheType.OTHER,
    styleDescription: '理性叙述中融入强烈情感表达，使用“我”为主语，多用短句，金句频出。'
  });

  // Load thoughts from local storage
  useEffect(() => {
    const savedThoughts = localStorage.getItem('viralflow_thoughts');
    if (savedThoughts) {
      try {
        setThoughts(JSON.parse(savedThoughts));
      } catch (e) { console.error(e); }
    }
    const savedSettings = localStorage.getItem('viralflow_settings');
    if (savedSettings) {
      try {
        setGlobalSettings(JSON.parse(savedSettings));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('viralflow_thoughts', JSON.stringify(thoughts));
  }, [thoughts]);

  useEffect(() => {
    localStorage.setItem('viralflow_settings', JSON.stringify(globalSettings));
  }, [globalSettings]);

  return (
    <div className="min-h-screen bg-purple-50/30 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-purple-50">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="text-center">
               <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-500">
                 爆款文案生成器
               </h1>
               <p className="text-[10px] text-slate-400">记录灵感，一键生成小红书爆款文</p>
            </div>
            <div className="flex-1 flex justify-end">
               <button className="p-2 text-slate-400 hover:text-slate-600">
                  <div className="w-6 h-6 flex flex-col justify-center gap-1">
                     <span className="w-1 h-1 bg-current rounded-full"></span>
                     <span className="w-1 h-1 bg-current rounded-full"></span>
                     <span className="w-1 h-1 bg-current rounded-full"></span>
                  </div>
               </button>
            </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="max-w-md mx-auto px-4 pb-4">
           <div className="bg-white rounded-xl p-1 flex shadow-sm border border-slate-100">
              <button
                onClick={() => setActiveTab('capture')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'capture' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className="text-base mb-0.5">⚡</span>
                快速记录
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'settings' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4 mb-0.5" />
                账号配置
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'generate' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-0.5" />
                文案生成
              </button>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {activeTab === 'capture' && (
          <ThoughtTab 
            thoughts={thoughts}
            setThoughts={setThoughts}
            selectedIds={selectedThoughtIds}
            setSelectedIds={setSelectedThoughtIds}
            onNavigateToGenerate={() => setActiveTab('generate')}
            globalSettings={globalSettings}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab 
            settings={globalSettings}
            setSettings={setGlobalSettings}
          />
        )}
        {activeTab === 'generate' && (
          <GenerationTab 
            thoughts={thoughts}
            selectedThoughtIds={selectedThoughtIds}
            globalSettings={globalSettings}
          />
        )}
      </main>
    </div>
  );
};

export default App;