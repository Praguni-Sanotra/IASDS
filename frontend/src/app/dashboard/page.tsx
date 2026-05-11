"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/apiClient';
import { 
  Users, BookOpen, DoorOpen, Calendar, 
  ArrowRight, Clock, ShieldCheck, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/analytics/overview');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch stats');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-8 text-white shadow-2xl shadow-blue-500/20">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="mt-2 text-blue-100 max-w-xl text-lg">
            System status is optimal. You have access to {user.role === 'ADMIN' ? 'all administrative' : 'departmental'} scheduling tools.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link 
              href="/dashboard/timetable"
              className="px-6 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              View Timetable <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
      </div>
      
      {/* Real-time Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Faculty" 
          value={isLoading ? '...' : stats?.totalFaculty} 
          icon={<Users size={20} className="text-blue-600" />} 
          subtitle="Active members"
        />
        <MetricCard 
          title="Subjects" 
          value={isLoading ? '...' : stats?.totalSubjects} 
          icon={<BookOpen size={20} className="text-purple-600" />} 
          subtitle="Curriculum items"
        />
        <MetricCard 
          title="Rooms" 
          value={isLoading ? '...' : stats?.totalRooms} 
          icon={<DoorOpen size={20} className="text-teal-600" />} 
          subtitle="Available spaces"
        />
        <MetricCard 
          title="Conflicts" 
          value={isLoading ? '...' : stats?.activeTimetable?.conflictCount || 0} 
          icon={<AlertCircle size={20} className={stats?.activeTimetable?.conflictCount > 0 ? "text-red-500" : "text-green-500"} />} 
          subtitle="Current status"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Latest Activity */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock size={18} className="text-zinc-400" /> System Status
            </h3>
          </div>
          <div className="space-y-4">
            <StatusItem 
              label="Database" 
              status="Connected" 
              time="Real-time" 
              icon={<ShieldCheck size={16} className="text-green-500" />} 
            />
            <StatusItem 
              label="Last Schedule Generation" 
              status={stats?.lastGeneratedAt ? new Date(stats.lastGeneratedAt).toLocaleDateString() : 'N/A'} 
              time={stats?.lastGeneratedAt ? new Date(stats.lastGeneratedAt).toLocaleTimeString() : ''}
              icon={<Calendar size={16} className="text-blue-500" />} 
            />
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-500 italic">
              "The AI scheduler is ready to generate new patterns based on current constraints."
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm lg:col-span-3">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickActionLink href="/dashboard/timetable" label="Manage Schedule" />
            <QuickActionLink href="/dashboard/analytics" label="System Analytics" />
            {user.role === 'ADMIN' && (
              <>
                <QuickActionLink href="/dashboard/admin/import" label="Bulk Data Import" />
                <QuickActionLink href="/dashboard/admin/faculty" label="Faculty Directory" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, subtitle }: any) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">{title}</div>
      <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function StatusItem({ label, status, time, icon }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{status}</div>
        {time && <div className="text-[10px] text-zinc-400">{time}</div>}
      </div>
    </div>
  );
}

function QuickActionLink({ href, label }: any) {
  return (
    <Link 
      href={href}
      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-700 dark:text-zinc-300 transition-colors group"
    >
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight size={16} className="text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
