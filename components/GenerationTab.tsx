import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, Sparkles, Save, Copy, ChevronLeft, Link as LinkIcon, Lightbulb, TrendingUp, Zap, ThumbsUp, RefreshCw, ImageIcon
} from 'lucide-react';
import { Thought, PlatformType, GenerationConfig, GeneratedCopy, GlobalSettings } from '../types';
import { generateViralCopy, auditCopyContent, smartOrganizeThoughts, generateImageForCopy, extractContentFromUrl } from '../services/geminiService';

interface GenerationTabProps {
  thoughts: Thought[];
  selectedThoughtIds: string[];
  globalSettings: GlobalSettings;
}

const GenerationTab: React.FC<GenerationTabProps> = ({ thoughts, selectedThoughtIds, globalSettings }) => {
  // State: 'config' | 'result'
  const [viewState, setViewState] = useState<'config' | 'result'>('config');

  // Config State (Local only)
  const [platform, setPlatform] = useState<PlatformType>(PlatformType.XIAOHONGSHU);
  const [refUrl, setRefUrl] = useState('');
  const [withImage, setWithImage] = useState(false);
  
  // Generation State
  const [isSmartOrganizing, setIsSmartOrganizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentCopy, setCurrentCopy] = useState<GeneratedCopy | null>(null);
  
  // Preview Content State
  const [previewContent, setPreviewContent] = useState('');

  // Editing State
  const [editedResult, setEditedResult] = useState('');

  // Scroll ref for result
  const resultRef = useRef<HTMLDivElement>(null);

  const handleSmartOrganize = async () => {
    setIsSmartOrganizing(true);
    try {
      const organizedText = await smartOrganizeThoughts(thoughts, globalSettings.customApiKey);
      setPreviewContent(organizedText);
    } catch (error) {
      alert("智能整理失败，请重试");
    } finally {
      setIsSmartOrganizing(false);
    }
  };

  const handleExtractUrl = async () => {
    if (!refUrl) return;
    setIsExtracting(true);
    try {
        const extracted = await extractContentFromUrl(refUrl);
        if (extracted) {
            setPreviewContent(prev => {
                const prefix = prev ? prev + "\n\n" : "";
                return prefix + `[参考内容] (${refUrl}):\n` + extracted.substring(0, 1000) + (extracted.length > 1000 ? "..." : "");
            });
            alert("提取成功，内容已加入预览");
        } else {
            alert("提取失败，请检查链接是否公开可见");
        }
    } catch (e) {
        alert("提取过程中出错");
    } finally {
        setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Construct Full Config
      const fullConfig: GenerationConfig = {
        ...globalSettings,
        platform,
        refUrl,
        selectedThoughtIds,
        styleMode: 'manual',
        withImage
      };

      // 1. Generate Copy
      const content = await generateViralCopy(fullConfig, thoughts, previewContent);
      
      // 2. Generate Image (Parallel if needed, but sequential for simplicity)
      let imageUrl = undefined;
      if (withImage) {
        try {
          imageUrl = await generateImageForCopy(content, globalSettings.niche, globalSettings.customApiKey);
        } catch (e) {
          console.error("Image generation failed", e);
        }
      }

      // 3. Audit Copy
      const audit = await auditCopyContent(content, platform, globalSettings.customApiKey);
      
      const newCopy: GeneratedCopy = {
        id: crypto.randomUUID(),
        config: fullConfig,
        content,
        audit,
        imageUrl,
        createdAt: Date.now()
      };
      
      setCurrentCopy(newCopy);
      setEditedResult(content);
      setViewState('result');
      
      // Auto-scroll to top of result
      setTimeout(() => window.scrollTo(0,0), 100);

    } catch (error) {
      alert("生成失败，请检查网络或API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReAudit = async () => {
    if (!currentCopy) return;
    setIsAuditing(true);
    try {
        const newAudit = await auditCopyContent(editedResult, platform, globalSettings.customApiKey);
        setCurrentCopy({
            ...currentCopy,
            content: editedResult,
            audit: newAudit
        });
        alert("评分已更新");
    } catch (error) {
        alert("评分失败");
    } finally {
        setIsAuditing(false);
    }
  };

  // Helper to render platform card
  const PlatformCard = ({ type, title, desc, color }: { type: PlatformType, title: string, desc: string, color: string }) => (
    <div 
      onClick={() => setPlatform(type)}
      className={`
        relative p-2 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-1 min-h-[80px] justify-center
        ${platform === type ? `border-${color}-500 bg-${color}-50` : 'border-slate-100 bg-white hover:border-slate-200'}
      `}
    >
       <div className={`font-bold text-xs ${platform === type ? `text-${color}-600` : 'text-slate-700'}`}>{title}</div>
       <div className="text-[10px] text-slate-400 scale-90 leading-tight">{desc}</div>
       {platform === type && (
         <div className={`absolute top-1 right-1 w-2 h-2 rounded-full bg-${color}-500`}></div>
       )}
    </div>
  );

  // Helper for score items
  const ScoreItem = ({ label, score, colorClass }: { label: string, score: number, colorClass: string }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-end">
         <span className="text-xs text-slate-500">{label}</span>
         <span className={`text-sm font-bold ${colorClass}`}>{score}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
         <div className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${score}%` }}></div>
      </div>
    </div>
  );

  if (viewState === 'result' && currentCopy) {
    return (
      <div className="max-w-md mx-auto space-y-4 pb-20" ref={resultRef}>
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-2">
           <button onClick={() => setViewState('config')} className="text-sm text-slate-500 flex items-center gap-1 hover:text-slate-800">
             <ChevronLeft className="w-4 h-4" /> 返回编辑
           </button>
           <div className="flex gap-2">
              <button 
                onClick={() => { navigator.clipboard.writeText(editedResult); alert("已复制"); }}
                className="flex items-center gap-1 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full text-slate-600"
              >
                 <Copy className="w-3 h-3" /> 复制
              </button>
              <button className="flex items-center gap-1 text-xs bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full text-purple-600 font-medium">
                 <Save className="w-3 h-3" /> 保存
              </button>
           </div>
        </div>

        {/* Content Card (Editable) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
               <div className="flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-purple-600" />
                 <h3 className="font-bold text-slate-800">生成结果</h3>
               </div>
               
               {/* Re-Score Button */}
               <button 
                 onClick={handleReAudit}
                 disabled={isAuditing}
                 className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
               >
                 {isAuditing ? (
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                    <RefreshCw className="w-3 h-3" />
                 )}
                 更新评分
               </button>
            </div>

            {/* Image Preview if available */}
            {currentCopy.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm relative group">
                    <img src={currentCopy.imageUrl} alt="Generated" className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button className="text-white text-xs bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full hover:bg-white/30">
                            下载图片
                        </button>
                    </div>
                </div>
            )}
            
            {/* Editable Text Area */}
            <textarea
                className="w-full min-h-[400px] text-slate-700 leading-relaxed whitespace-pre-wrap outline-none resize-none focus:bg-slate-50/50 rounded-lg p-2 transition-colors border border-transparent focus:border-purple-100"
                value={editedResult}
                onChange={(e) => setEditedResult(e.target.value)}
                placeholder="在此处编辑生成的文案..."
            />
        </div>

        {/* Audit/Score Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
           
           <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-2">
                 <div className="bg-blue-600 text-white p-1.5 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
                 <span className="font-bold text-slate-800 text-base">文案评分分析</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-3xl font-black text-blue-600">{currentCopy.audit.overall}</span>
                 <span className="text-xs text-slate-400 font-medium">{currentCopy.audit.overall > 80 ? '优秀' : '良好'}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
              <ScoreItem label="标题吸引力" score={currentCopy.audit.headline} colorClass="text-green-500" />
              <ScoreItem label="内容质量" score={currentCopy.audit.quality} colorClass="text-green-500" />
              <ScoreItem label="情感共鸣" score={currentCopy.audit.emotion} colorClass="text-blue-500" />
              <ScoreItem label="话题标签" score={currentCopy.audit.trending} colorClass="text-blue-500" />
              <ScoreItem label="爆款潜力" score={currentCopy.audit.viralPotential} colorClass="text-purple-600" />
           </div>

           {/* Pros Section */}
           <div className="mb-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-green-700 mb-2">
                 <ThumbsUp className="w-4 h-4" /> 文案优点
              </h4>
              <ul className="space-y-2">
                 {(currentCopy.audit.pros || ["结构清晰，逻辑通顺", "情感表达真挚"]).map((pro, i) => (
                    <li key={i} className="text-xs text-green-800 bg-green-50 px-3 py-2 rounded-lg flex gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></span>
                       {pro}
                    </li>
                 ))}
              </ul>
           </div>

           {/* Suggestions Section */}
           <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-amber-600 mb-2">
                 <Zap className="w-4 h-4" /> 优化建议
              </h4>
              <ul className="space-y-2">
                 {currentCopy.audit.suggestions.map((sug, i) => (
                    <li key={i} className="text-xs text-amber-900 bg-amber-50 px-3 py-2 rounded-lg flex gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>
                       {sug}
                    </li>
                 ))}
              </ul>
           </div>
           
           <button 
             onClick={() => setViewState('config')} 
             className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-sm font-bold transition-colors"
           >
             调整配置重新生成
           </button>
        </div>
      </div>
    );
  }

  // CONFIG VIEW
  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      
      {/* Platform Style (Step 1 in flow) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
         <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="w-4 h-4 bg-purple-500 rounded-sm transform rotate-45"></span>
            选择文案风格
         </h3>
         <div className="grid grid-cols-3 gap-2">
            <PlatformCard type={PlatformType.XIAOHONGSHU} title="小红书" desc="多emoji" color="red" />
            <PlatformCard type={PlatformType.WECHAT_MOMENTS} title="朋友圈" desc="真诚分享" color="emerald" />
            <PlatformCard type={PlatformType.DOUYIN} title="抖音" desc="节奏感强" color="slate" />
            <PlatformCard type={PlatformType.TIKTOK} title="TikTok" desc="Global" color="teal" />
            <PlatformCard type={PlatformType.INSTAGRAM} title="Instagram" desc="Aesthetic" color="pink" />
            <PlatformCard type={PlatformType.X} title="X" desc="Concise" color="gray" />
         </div>
      </div>

      {/* URL Input (Step 2) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
         <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <LinkIcon className="w-4 h-4 text-purple-500" />
            URL内容识别
         </h3>
         <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="粘贴热门文章链接，自动提取内容作为参考"
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-300"
              value={refUrl}
              onChange={(e) => setRefUrl(e.target.value)}
            />
            <button 
                onClick={handleExtractUrl}
                disabled={isExtracting || !refUrl}
                className="bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-50 flex items-center gap-1"
            >
                {isExtracting ? '提取中...' : '提取内容'}
            </button>
         </div>
      </div>

      {/* Smart Fragments (Step 3) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
         <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Lightbulb className="w-4 h-4 text-purple-500" />
               智能整理碎片文字
            </h3>
            <button 
              onClick={handleSmartOrganize}
              disabled={isSmartOrganizing || thoughts.length === 0}
              className="text-xs bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
            >
               {isSmartOrganizing ? (
                 <>
                   <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   整理中...
                 </>
               ) : "自动整理相关碎片"}
            </button>
         </div>
         <p className="text-xs text-slate-400 mb-2">发现 {thoughts.length} 条碎片文字，将自动提取相关内容</p>
         <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
            {thoughts.length > 0 ? (
               <ul className="space-y-1">
                  {thoughts.slice(0,3).map(t => (
                     <li key={t.id} className="text-xs text-slate-600 truncate">• {t.content}</li>
                  ))}
                  {thoughts.length > 3 && <li className="text-[10px] text-slate-400 pl-2">... 以及更多</li>}
               </ul>
            ) : (
               <span className="text-xs text-slate-400">暂无碎片想法，请在Tab 1添加</span>
            )}
         </div>
      </div>

      {/* Editor Preview (Read Only) & Generate */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 pb-20">
         <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-purple-600">≡</span> 文案内容
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">仅预览</span>
         </div>
         
         <div className="bg-slate-50 rounded-xl min-h-[140px] border border-slate-200 relative overflow-hidden">
             {previewContent ? (
               <textarea 
                  className="w-full h-full min-h-[140px] bg-transparent p-4 text-xs text-slate-700 resize-none outline-none leading-relaxed"
                  value={previewContent}
                  readOnly
                  placeholder="等待整理..."
               />
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs gap-2 pointer-events-none">
                  <span className="bg-white/50 p-2 rounded-lg">点击上方「自动整理相关碎片」生成初稿</span>
               </div>
             )}
         </div>
         
         <div className="flex justify-between items-center mt-2 mb-4">
            <span className="text-[10px] text-slate-400">{previewContent.length}/800字</span>
         </div>
         
         {/* Generate Button Group */}
         <div className="bg-purple-50 p-1.5 rounded-xl border border-purple-100 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 py-1">
               <div className="flex items-center gap-1.5">
                  <ImageIcon className={`w-4 h-4 ${withImage ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className="text-xs text-slate-600 font-medium">同时生成配图</span>
               </div>
               <button 
                  onClick={() => setWithImage(!withImage)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${withImage ? 'bg-purple-600' : 'bg-slate-300'}`}
               >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${withImage ? 'left-[22px]' : 'left-1'}`}></div>
               </button>
            </div>
            
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-bold shadow-lg shadow-purple-200 transition-all flex justify-center items-center gap-2"
            >
              {isGenerating ? (
                  <>
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     {withImage ? '正在生成文案与图片...' : '正在生成文案...'}
                  </>
              ) : "生成文案"}
            </button>
         </div>
      </div>

    </div>
  );
};

export default GenerationTab;