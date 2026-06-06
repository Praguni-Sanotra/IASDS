import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Zap, 
  Settings2, 
  BarChart, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  ChevronDown,
  History
} from 'lucide-react';
import { cn } from '../../lib/utils';
// import { useAuthStore } from '../../store/authStore'; // AUTH DISABLED
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';

interface GenerationPanelProps {
  onScheduleReady: () => void;
}

export function GenerationPanel({ onScheduleReady }: GenerationPanelProps) {
  // const { accessToken } = useAuthStore(); // AUTH DISABLED
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Context
  const [context, setContext] = useState({
    department: '',
    semester: '',
    academicYear: '2024-25'
  });

  const [config, setConfig] = useState({
    populationSize: 50,
    generations: 100
  });

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001', {
    });

    socket.on('connect', () => console.log('Connected to progress socket'));

    socket.on('schedule:progress', (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress);
        setStage(data.stage);
      }
    });

    socket.on('schedule:complete', (data) => {
      if (data.jobId === jobId) {
        setProgress(100);
        setStage('DONE');
        setIsGenerating(false);
        toast.success('Schedule generated successfully!');
        onScheduleReady();
      }
    });

    socket.on('schedule:error', (data) => {
      if (data.jobId === jobId) {
        setIsGenerating(false);
        toast.error(`Generation failed: ${data.error}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [jobId, onScheduleReady]);

  const handleGenerate = async () => {
    if (!context.department || !context.semester) {
      toast.error('Please select Department and Semester');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStage('QUEUING...');
    
    try {
      const res = await apiClient.post('/schedule/generate', {
        semesterId: context.semester,
        academicYear: context.academicYear,
        department: context.department,
        config
      });
      setJobId(res.data.jobId);
    } catch (error) {
      setIsGenerating(false);
      toast.error('Failed to start generation');
    }
  };

  return (
    <div className={cn(
      "fixed right-0 top-16 bottom-0 z-40 flex transition-transform duration-300",
      isOpen ? "translate-x-0" : "translate-x-[calc(100%-40px)]"
    )}>
      {/* Trigger Tab */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-32 bg-blue-600 text-white rounded-l-xl mt-10 flex items-center justify-center hover:bg-blue-700 transition-colors shadow-2xl"
      >
        <div className="rotate-90 flex items-center gap-2 whitespace-nowrap font-bold text-xs">
          {isOpen ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          AI SCHEDULER
        </div>
      </button>

      {/* Main Panel */}
      <div className="w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Zap size={18} fill="currentColor" />
            <h2 className="font-bold">Intelligence Engine</h2>
          </div>
          <p className="text-xs text-zinc-500">Generate clash-free optimized schedules using OR-Tools & GA.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isGenerating ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-100 dark:border-blue-900/30" />
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" 
                    style={{ animationDuration: '3s' }}
                  />
                  <span className="absolute text-sm font-bold text-blue-600">{progress}%</span>
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Optimizing Schedule...</h3>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">{stage}</p>
              </div>

              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500" 
                  style={{ width: `${progress}%` }} 
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <div className={cn("w-2 h-2 rounded-full", progress >= 10 ? "bg-green-500" : "bg-zinc-300")} />
                  <span className={progress >= 10 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>Data Ingestion</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className={cn("w-2 h-2 rounded-full", progress >= 40 ? "bg-green-500" : "bg-zinc-300")} />
                  <span className={progress >= 40 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>CSP Constraint Solving</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className={cn("w-2 h-2 rounded-full", progress >= 80 ? "bg-green-500" : "bg-zinc-300")} />
                  <span className={progress >= 80 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>Genetic Optimization</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Generation Context */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <History size={16} /> Schedule Context
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Department</label>
                    <select 
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs"
                      value={context.department}
                      onChange={(e) => setContext({...context, department: e.target.value})}
                    >
                      <option value="">Select Department</option>
                      <option value="CSE">Computer Science</option>
                      <option value="ECE">Electronics</option>
                      <option value="MECH">Mechanical</option>
                      <option value="CIVIL">Civil</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Semester</label>
                      <select 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs"
                        value={context.semester}
                        onChange={(e) => setContext({...context, semester: e.target.value})}
                      >
                        <option value="">Select</option>
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Year</label>
                      <input 
                        type="text"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs"
                        value={context.academicYear}
                        onChange={(e) => setContext({...context, academicYear: e.target.value})}
                        placeholder="2024-25"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Settings2 size={16} /> Hyperparameters
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Population Size</span>
                    <span className="font-bold">{config.populationSize}</span>
                  </div>
                  <input 
                    type="range" min="10" max="200" step="10"
                    value={config.populationSize}
                    onChange={(e) => setConfig({...config, populationSize: parseInt(e.target.value)})}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">GA Generations</span>
                    <span className="font-bold">{config.generations}</span>
                  </div>
                  <input 
                    type="range" min="20" max="500" step="20"
                    value={config.generations}
                    onChange={(e) => setConfig({...config, generations: parseInt(e.target.value)})}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-tighter mb-3">
                  <BarChart size={14} /> Complexity Stats
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">Variables</span>
                    <span className="font-medium dark:text-zinc-300">~12,400</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">Hard Constraints</span>
                    <span className="font-medium dark:text-zinc-300">42 active</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
          <button 
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="white" />}
            {isGenerating ? 'GENEVOLVING...' : 'START GENERATION'}
          </button>
        </div>
      </div>
    </div>
  );
}
