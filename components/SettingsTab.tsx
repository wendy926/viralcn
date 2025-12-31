import React, { useState } from 'react';
import { Settings, Edit3, Save, Sparkles, Key, Cpu } from 'lucide-react';
import { NicheType, GlobalSettings } from '../types';
import { analyzeStyleFromText } from '../services/geminiService';

interface SettingsTabProps {
  settings: GlobalSettings;
  setSettings: (settings: GlobalSettings) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, setSettings }) => {
  const [styleExample, setStyleExample] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tempDescription, setTempDescription] = useState(settings.styleDescription);
  const [tempApiKey, setTempApiKey] = useState(settings.customApiKey || '');

  const handleAnalyzeStyle = async () => {
    if (!styleExample) return;
    setIsAnalyzing(true);
    try {
      const styleDesc = await analyzeStyleFromText(styleExample, settings.customApiKey);
      setTempDescription(styleDesc);
    } catch (e) {
      alert("分析失败，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveDescription = () => {
    setSettings({ ...settings, styleDescription: tempDescription });
    alert("风格描述已保存");
  };

  const handleSaveAiConfig = () => {
    setSettings({ 
      ...settings, 
      customApiKey: tempApiKey,
      aiProvider: settings.aiProvider || 'gemini'
    });
    alert("AI配置已保存");
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      {/* 1. Niche Selection */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 mb-4">
            <div className="bg-purple-100 text-purple-600 p-1.5 rounded-full"><Settings className="w-4 h-4" /></div>
            <h3 className="font-bold text-slate-800">选择账号类型</h3>
            <span className="ml-auto text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">个人风格</span>
         </div>
         <div className="grid grid-cols-2 gap-3">
            {Object.values(NicheType).map(niche => (
               <button
                 key={niche}
                 onClick={() => setSettings({...settings, niche: niche as NicheType})}
                 className={`
                   text-xs py-3 px-2 rounded-xl border font-medium transition-all
                   ${settings.niche === niche 
                     ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200' 
                     : 'bg-white text-slate-600 border-slate-100 hover:border-purple-200'}
                 `}
               >
                 {niche}
               </button>
            ))}
         </div>
      </div>

      {/* 2. Style Config */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
         <div className="flex items-center justify-between mb-3">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-500" />
                个人风格配置
             </h3>
             <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md">已配置</span>
         </div>
         
         <div className="space-y-5">
             {/* Example Input First */}
             <div>
                <label className="text-xs text-slate-500 mb-1.5 block">文案例子 (用于自动分析风格)</label>
                <div className="relative">
                   <textarea 
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 resize-none outline-none focus:border-purple-300 transition-colors"
                     rows={4}
                     value={styleExample}
                     onChange={(e) => setStyleExample(e.target.value)}
                     placeholder="粘贴一段你喜欢的文案，AI将自动提取其风格特征..."
                   />
                   <button 
                     onClick={handleAnalyzeStyle}
                     disabled={!styleExample || isAnalyzing}
                     className="absolute bottom-2 right-2 bg-indigo-500 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1"
                   >
                     {isAnalyzing ? (
                        <>
                           <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           分析中...
                        </>
                     ) : (
                        <>
                           <Sparkles className="w-3 h-3" />
                           自动分析
                        </>
                     )}
                   </button>
                </div>
             </div>

             {/* Description Input Second */}
             <div>
                <label className="text-xs text-slate-500 mb-1.5 block">风格描述 (可手动修改)</label>
                <div className="relative">
                   <textarea 
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 resize-none outline-none focus:border-purple-300 transition-colors"
                     rows={3}
                     value={tempDescription}
                     onChange={(e) => setTempDescription(e.target.value)}
                     placeholder="例如：专业严谨、幽默风趣..."
                   />
                   <button 
                     onClick={handleSaveDescription}
                     className="absolute bottom-2 right-2 bg-purple-600 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                   >
                     <Save className="w-3 h-3" />
                     保存描述
                   </button>
                </div>
             </div>
         </div>
      </div>

      {/* 3. AI Config (New) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full"><Cpu className="w-4 h-4" /></div>
            <h3 className="font-bold text-slate-800">AI 模型配置</h3>
         </div>
         
         <div className="space-y-4">
             <div>
                <label className="text-xs text-slate-500 mb-1.5 block">模型提供商 (目前仅支持 Gemini)</label>
                <div className="flex gap-2">
                   {['Gemini', 'DeepSeek', 'Qwen'].map((provider) => (
                      <button
                        key={provider}
                        onClick={() => setSettings({...settings, aiProvider: provider.toLowerCase() as any})}
                        className={`
                          flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                          ${(settings.aiProvider || 'gemini') === provider.toLowerCase()
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}
                        `}
                      >
                        {provider}
                      </button>
                   ))}
                </div>
             </div>

             <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Custom API Key (Optional)</label>
                <div className="relative">
                   <div className="absolute left-3 top-2.5 text-slate-400">
                      <Key className="w-4 h-4" />
                   </div>
                   <input 
                     type="password"
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300 transition-colors"
                     placeholder="sk-..."
                     value={tempApiKey}
                     onChange={(e) => setTempApiKey(e.target.value)}
                   />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                   留空则使用系统默认 Key。DeepSeek/Qwen 需配置对应 Key。
                </p>
             </div>

             <button 
                onClick={handleSaveAiConfig}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition-colors"
             >
                保存 AI 配置
             </button>
         </div>
      </div>
    </div>
  );
};

export default SettingsTab;