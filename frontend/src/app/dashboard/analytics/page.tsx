"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import { 
  Users, Home, AlertCircle, Zap, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import apiClient from '../../../lib/apiClient';
import { cn } from '../../../lib/utils';

const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [workload, setWorkload] = useState<any[]>([]);
  const [workloadStats, setWorkloadStats] = useState<any>({});
  const [utilization, setUtilization] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ovRes, wkRes, utRes, cfRes, dsRes] = await Promise.all([
          apiClient.get('/analytics/overview'),
          apiClient.get('/analytics/workload'),
          apiClient.get('/analytics/room-utilization'),
          apiClient.get('/analytics/conflicts'),
          apiClient.get('/analytics/subject-distribution')
        ]);
        setOverview(ovRes.data);
        setWorkload(wkRes.data.data);
        setWorkloadStats(wkRes.data.stats);
        setUtilization(utRes.data.data);
        setConflicts(cfRes.data.data);
        setDistribution(dsRes.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getUtilColor = (pct: number) => {
    if (pct > 80) return 'bg-blue-900 dark:bg-blue-600';
    if (pct > 60) return 'bg-blue-700 dark:bg-blue-500';
    if (pct > 40) return 'bg-blue-500 dark:bg-blue-400';
    if (pct > 20) return 'bg-blue-300 dark:bg-blue-300';
    return 'bg-blue-100 dark:bg-blue-900/30';
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Institutional Analytics</h1>
          <p className="text-sm text-zinc-500 font-medium">Real-time optimization metrics and workload intelligence.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold">
            <Calendar size={14} className="text-zinc-400" />
            Active Session
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Faculty" value={overview?.totalFaculty || 0} icon={<Users className="text-blue-600" />} subtitle="Active staff" />
        <StatCard title="Total Rooms" value={overview?.totalRooms || 0} icon={<Home className="text-teal-600" />} subtitle="Physical spaces" />
        <StatCard title="Active Conflicts" value={overview?.activeTimetable?.conflictCount || 0} icon={<AlertCircle className={overview?.activeTimetable?.conflictCount > 0 ? "text-red-500" : "text-green-500"} />} subtitle="In last generation" />
        <StatCard title="Fairness Score" value={Math.round(overview?.avgFairnessScore * 100) / 100 || 0} icon={<Zap className="text-amber-500" />} subtitle="Distribution quality" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Workload Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Faculty Workload (Hrs/Week)</h3>
            <div className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase tracking-widest">
              Gini: {workloadStats.giniCoefficient}
            </div>
          </div>
          <div className="h-[300px] w-full">
            {workload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="assignedHours" radius={[4, 4, 0, 0]}>
                    {workload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.utilizationPct > 90 ? '#ef4444' : (entry.utilizationPct < 50 ? '#10b981' : '#3b82f6')} />
                    ))}
                  </Bar>
                  <ReferenceLine y={18} stroke="#71717a" strokeDasharray="5 5" label={{ position: 'right', value: 'Max', fill: '#71717a', fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">No workload data available</div>
            )}
          </div>
        </div>

        {/* Conflict History */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Conflict Resolution History</h3>
          <div className="h-[300px] w-full">
            {conflicts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conflicts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="generatedAt" tickFormatter={(t) => new Date(t).toLocaleDateString()} axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="conflictCount" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">No history data available</div>
            )}
          </div>
        </div>

        {/* Heatmap / Grid Utilization */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Room Utilization Matrix</h3>
            <div className="flex gap-4">
              {['Low', 'Medium', 'High', 'Critical'].map((level, i) => (
                <div key={level} className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                  <div className={cn("w-3 h-3 rounded-sm", getUtilColor((i + 1) * 25))} />
                  {level}
                </div>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {utilization.length > 0 ? (
              <div className="min-w-[800px] grid grid-cols-7 gap-2">
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Room</div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-zinc-400 uppercase text-center">{d}</div>
                ))}
                
                {utilization.map(room => (
                  <React.Fragment key={room.roomId}>
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {room.roomNumber}
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn("h-10 rounded-lg border border-white/10 transition-all hover:scale-105 cursor-pointer flex items-center justify-center text-[10px] font-bold text-white shadow-sm", getUtilColor(room.utilizationPct))}
                        title={`${room.roomNumber}: ${room.utilizationPct}% utilized`}
                      >
                        {room.utilizationPct}%
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 text-sm italic">No utilization data found. Publish a timetable first.</div>
            )}
          </div>
        </div>

        {/* Subject Distribution */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Subject Type Distribution</h3>
          <div className="h-[300px] w-full">
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribution.map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">No distribution data</div>
            )}
          </div>
        </div>

        {/* System Summary */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="p-3 bg-white/20 rounded-xl w-fit mb-4 backdrop-blur-md">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-2">System Performance</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Total resources: {overview?.totalFaculty + overview?.totalSubjects + overview?.totalRooms} items tracked.
              Current Fairness Score is {Math.round(overview?.avgFairnessScore * 100) / 100}.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-200 bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
             Data accurate as of {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-blue-500/50 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter mb-1">{title}</p>
      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="text-[10px] text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}
