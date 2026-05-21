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
    if (pct > 80) return 'bg-blue-800';
    if (pct > 60) return 'bg-blue-600';
    if (pct > 40) return 'bg-blue-400';
    if (pct > 20) return 'bg-blue-200';
    return 'bg-blue-50';
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-900">Institutional Analytics</h1>
          <p className="text-sm font-medium text-slate-500">Real-time optimization metrics and workload intelligence.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-900 shadow-sm">
            <Calendar size={14} className="text-blue-500" />
            Active Session
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Faculty" value={overview?.totalFaculty || 0} icon={<Users className="text-blue-600" />} subtitle="Active staff" />
        <StatCard title="Total Rooms" value={overview?.totalRooms || 0} icon={<Home className="text-blue-600" />} subtitle="Physical spaces" />
        <StatCard title="Active Conflicts" value={overview?.activeTimetable?.conflictCount || 0} icon={<AlertCircle className={overview?.activeTimetable?.conflictCount > 0 ? "text-red-500" : "text-emerald-500"} />} subtitle="In last generation" />
        <StatCard title="Fairness Score" value={Math.round(overview?.avgFairnessScore * 100) / 100 || 0} icon={<Zap className="text-blue-600" />} subtitle="Distribution quality" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Workload Chart */}
        <div className="bg-white p-8 rounded-3xl border border-blue-50 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-blue-900">Faculty Workload (Hrs/Week)</h3>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
              Gini: {workloadStats.giniCoefficient}
            </div>
          </div>
          <div className="h-[300px] w-full">
            {workload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e40af', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="assignedHours" radius={[6, 6, 0, 0]}>
                    {workload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.utilizationPct > 90 ? '#ef4444' : (entry.utilizationPct < 50 ? '#10b981' : '#3b82f6')} />
                    ))}
                  </Bar>
                  <ReferenceLine y={18} stroke="#cbd5e1" strokeDasharray="5 5" label={{ position: 'right', value: 'Max', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic">No workload data available</div>
            )}
          </div>
        </div>

        {/* Conflict History */}
        <div className="bg-white p-8 rounded-3xl border border-blue-50 shadow-sm">
          <h3 className="text-lg font-black text-blue-900 mb-8">Conflict Resolution History</h3>
          <div className="h-[300px] w-full">
            {conflicts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conflicts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="generatedAt" tickFormatter={(t) => new Date(t).toLocaleDateString()} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="conflictCount" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic">No history data available</div>
            )}
          </div>
        </div>

        {/* Heatmap / Grid Utilization */}
        <div className="bg-white p-8 rounded-3xl border border-blue-50 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-blue-900">Room Utilization Matrix</h3>
            <div className="flex gap-4">
              {['Low', 'Medium', 'High', 'Critical'].map((level, i) => (
                <div key={level} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                  <div className={cn("w-3.5 h-3.5 rounded-md shadow-sm", getUtilColor((i + 1) * 25))} />
                  {level}
                </div>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {utilization.length > 0 ? (
              <div className="min-w-[800px] grid grid-cols-7 gap-3">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{d}</div>
                ))}
                
                {utilization.map(room => (
                  <React.Fragment key={room.roomId}>
                    <div className="text-xs font-black text-blue-900 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-500/40" />
                      {room.roomNumber}
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn("h-12 rounded-xl border border-white/40 transition-all hover:scale-[1.03] hover:shadow-lg cursor-pointer flex items-center justify-center text-[11px] font-black text-white shadow-sm", getUtilColor(room.utilizationPct))}
                        title={`${room.roomNumber}: ${room.utilizationPct}% utilized`}
                      >
                        {room.utilizationPct}%
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm font-medium italic">No utilization data found. Publish a timetable first.</div>
            )}
          </div>
        </div>

        {/* Subject Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-blue-50 shadow-sm">
          <h3 className="text-lg font-black text-blue-900 mb-8">Subject Type Distribution</h3>
          <div className="h-[300px] w-full">
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {distribution.map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic">No distribution data</div>
            )}
          </div>
        </div>

        {/* System Summary */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-10 rounded-3xl text-white shadow-2xl shadow-blue-900/20 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="p-4 bg-white/10 rounded-2xl w-fit mb-6 backdrop-blur-xl border border-white/10">
              <TrendingUp size={28} />
            </div>
            <h2 className="text-3xl font-black mb-3 tracking-tight">System Performance</h2>
            <p className="text-blue-100/80 text-base font-medium leading-relaxed max-w-md">
              Total resources: <span className="text-white font-black">{overview?.totalFaculty + overview?.totalSubjects + overview?.totalRooms}</span> items tracked.
              Current Fairness Score is <span className="text-white font-black">{Math.round(overview?.avgFairnessScore * 100) / 100}</span>.
            </p>
          </div>
          <div className="mt-12 flex items-center gap-3 text-[11px] font-black text-blue-100 bg-white/10 w-fit px-5 py-2 rounded-full backdrop-blur-xl border border-white/5 uppercase tracking-widest relative z-10">
             Live Intelligence • {new Date().toLocaleTimeString()}
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 translate-y-12 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle }: any) {
  return (
    <div className="bg-white p-7 rounded-3xl border border-blue-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-5">
        <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-4xl font-black text-blue-900 tracking-tighter">{value}</p>
      <p className="text-xs font-bold text-slate-400 mt-1.5">{subtitle}</p>
    </div>
  );
}
