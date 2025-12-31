import React, { useState, useRef } from 'react';
import { Plus, Tag, Trash2, CheckCircle2, Circle, PenLine, Sparkles, X, Mic, MicOff, ChevronDown } from 'lucide-react';
import { Thought, GlobalSettings } from '../types';
import { generateTagsForThought } from '../services/geminiService';

interface ThoughtTabProps {
  thoughts: Thought[];
  setThoughts: (thoughts: Thought[]) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onNavigateToGenerate: () => void;
  globalSettings: GlobalSettings;
}

const ThoughtTab: React.FC<ThoughtTabProps> = ({ 
  thoughts, 
  setThoughts, 
  selectedIds, 
  setSelectedIds,
  onNavigateToGenerate,
  globalSettings
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleStartRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.start();
    } else {
      alert("您的浏览器不支持语音输入");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAddThought = async () => {
    if (!inputValue.trim()) return;
    
    const tempId = crypto.randomUUID();
    const newThought: Thought = {
      id: tempId,
      content: inputValue,
      tags: ['处理中...'], // Placeholder while AI generates tags
      createdAt: Date.now()
    };
    
    // Optimistic update
    setThoughts([newThought, ...thoughts]);
    setInputValue('');

    try {
      // Async generate tags
      const tags = await generateTagsForThought(
        newThought.content, 
        globalSettings.customApiKey,
        globalSettings.aiProvider
      );
      
      // Update the specific thought with generated tags
      setThoughts(prevThoughts => prevThoughts.map(t => 
        t.id === tempId ? { ...t, tags: tags } : t
      ));
    } catch (error) {
      console.error("Tag generation failed", error);
      // Fallback tag if error
      setThoughts(prevThoughts => prevThoughts.map(t => 
        t.id === tempId ? { ...t, tags: ['通用'] } : t
      ));
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const deleteThought = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThoughts(thoughts.filter(t => t.id !== id));
    setSelectedIds(selectedIds.filter(sid => sid !== id));
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      
      {/* Input Section - Styled like "快速记录想法" card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-50">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-purple-600">
             <PenLine className="w-5 h-5" />
          </span>
          快速记录想法
        </h2>
        
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100 relative">
          <textarea
            className="w-full bg-transparent border-none outline-none resize-none text-slate-700 placeholder:text-slate-400 text-sm leading-relaxed"
            rows={5}
            placeholder="随时记录你的灵感和想法... (支持语音输入)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          {isRecording && (
             <div className="absolute bottom-2 right-2 flex items-center gap-2 animate-pulse bg-red-50 text-red-500 px-2 py-1 rounded-full text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                正在录音...
             </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <button className="flex items-center gap-1 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-200">
                通用 <ChevronDown className="w-3 h-3 text-slate-400" />
             </button>
             <button 
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                   isRecording 
                   ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                   : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
             >
               {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
               {isRecording ? '停止' : '语音'}
             </button>
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => setInputValue('')}
               className="text-slate-400 text-xs hover:text-slate-600 font-medium px-2"
             >
               清空
             </button>
             <button 
               onClick={handleAddThought}
               disabled={!inputValue.trim()}
               className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-purple-200 transition-all"
             >
               保存
             </button>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
               <span className="text-purple-600"><div className="w-1 h-4 bg-purple-600 rounded-full"></div></span>
               我的想法碎片
            </h3>
            <span className="text-slate-400 text-xs">{thoughts.length} 条</span>
        </div>

        <div className="space-y-3">
          {thoughts.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
              暂无记录，快去上方输入吧
            </div>
          )}
          
          {thoughts.map(thought => (
            <div 
              key={thought.id}
              onClick={() => toggleSelection(thought.id)}
              className={`
                relative p-4 rounded-2xl border transition-all duration-200 bg-white
                ${selectedIds.includes(thought.id) 
                  ? 'border-purple-500 ring-1 ring-purple-100' 
                  : 'border-slate-100 hover:border-purple-200'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                 <p className="text-slate-700 text-sm leading-relaxed line-clamp-3 pr-6">
                  {thought.content}
                 </p>
                 <button 
                    onClick={(e) => deleteThought(thought.id, e)}
                    className="text-slate-300 hover:text-red-400 transition-colors p-1 -mr-2 -mt-2"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-50">
                 <div className="flex gap-1">
                    {thought.tags.map((tag, i) => (
                       <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                         {tag}
                       </span>
                    ))}
                 </div>
                 <span className="text-xs text-slate-300 ml-auto">{formatDate(thought.createdAt)}</span>
                 {/* Selection Indicator */}
                 <div className="pl-2">
                    {selectedIds.includes(thought.id) ? (
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    ) : (
                        <Circle className="w-5 h-5 text-slate-200" />
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Button */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-0 right-0 px-4 md:px-0 flex justify-center z-20 pointer-events-none">
             <button 
               onClick={onNavigateToGenerate}
               className="pointer-events-auto w-full max-w-md bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl text-base font-bold shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
             >
               生成文案 ({selectedIds.length})
             </button>
          </div>
      )}
    </div>
  );
};

export default ThoughtTab;