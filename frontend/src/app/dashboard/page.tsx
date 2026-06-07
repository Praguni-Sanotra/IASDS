"use client";

import React, { useState, useEffect } from 'react';
// import { useAuthStore } from '../../store/authStore'; // AUTH DISABLED
import apiClient from '../../lib/apiClient';
import {
  Users, BookOpen, DoorOpen, Calendar,
  ArrowRight, Clock, ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GenerateAITimetableModal from '../../components/modals/GenerateAITimetableModal';

export default function DashboardPage() {
  // const { user } = useAuthStore(); // AUTH DISABLED
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);

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

  // After successful generation: navigate to timetable page
  const handleGenerationSuccess = (department: string, semester: number) => {
    if (department) sessionStorage.setItem('iasds_timetable_dept', department);
    if (semester) sessionStorage.setItem('iasds_timetable_semester', String(semester));
    router.push('/dashboard/timetable');
  };

  // Mock user for display when auth is disabled
  const user = { name: 'Admin User', role: 'ADMIN' };

  // if (!user) return null; // AUTH DISABLED

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-8 text-white shadow-2xl shadow-blue-500/20">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="mt-2 text-blue-100 max-w-xl text-lg">
            System status is optimal. You have access to{' '}
            {user.role === 'ADMIN' ? 'all administrative' : 'departmental'} scheduling tools.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/dashboard/timetable"
              className="px-6 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              View Timetable <ArrowRight size={18} />
            </Link>

            {/* ── AI Generate button — Admin only ─────────────────────── */}
            {user.role === 'ADMIN' && (
              <button
                id="generate-ai-timetable-btn"
                onClick={() => setShowAIModal(true)}
                className="px-6 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm"
              >
                <Sparkles size={17} className="text-yellow-300" />
                Generate AI Timetable
              </button>
            )}
          </div>
        </div>
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
      </div>

      {/* ── Real-time Metrics ──────────────────────────────────────────── */}
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
          icon={<BookOpen size={20} className="text-blue-600" />}
          subtitle="Curriculum items"
        />
        <MetricCard
          title="Rooms"
          value={isLoading ? '...' : stats?.totalRooms}
          icon={<DoorOpen size={20} className="text-blue-600" />}
          subtitle="Available spaces"
        />
        <MetricCard
          title="Conflicts"
          value={isLoading ? '...' : stats?.activeTimetable?.conflictCount || 0}
          icon={
            <AlertCircle
              size={20}
              className={stats?.activeTimetable?.conflictCount > 0 ? "text-red-500" : "text-emerald-500"}
            />
          }
          subtitle="Current status"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* ── System Status ────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-blue-900 flex items-center gap-3">
              <Clock size={22} className="text-blue-600" /> System Status
            </h3>
          </div>
          <div className="space-y-4">
            <StatusItem
              label="Database"
              status="Connected"
              time="Real-time"
              icon={<ShieldCheck size={18} className="text-emerald-500" />}
            />
            <StatusItem
              label="Last Schedule Generation"
              status={stats?.lastGeneratedAt ? new Date(stats.lastGeneratedAt).toLocaleDateString() : 'N/A'}
              time={stats?.lastGeneratedAt ? new Date(stats.lastGeneratedAt).toLocaleTimeString() : ''}
              icon={<Calendar size={18} className="text-blue-500" />}
            />
            <div className="p-5 rounded-2xl bg-blue-50/50 text-sm text-blue-800 font-medium italic border border-blue-100">
              "The AI scheduler is ready to generate new patterns based on current constraints."
            </div>
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-sm lg:col-span-3">
          <h3 className="text-xl font-black text-blue-900 mb-8">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4">
            <QuickActionLink href="/dashboard/timetable" label="Manage Schedule" />
            <QuickActionLink href="/dashboard/analytics" label="System Analytics" />
            {user.role === 'ADMIN' && (
              <>
                {/* AI Timetable card-style button */}
                <button
                  id="quick-action-ai-timetable"
                  onClick={() => setShowAIModal(true)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-all duration-300 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 group"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-yellow-300" />
                    <span className="text-sm font-black tracking-tight">Generate AI Timetable</span>
                  </div>
                  <ArrowRight size={18} className="text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
                <QuickActionLink href="/dashboard/admin/import" label="Bulk Data Import" />
                <QuickActionLink href="/dashboard/admin/faculty" label="Faculty Directory" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Timetable Generation Modal ───────────────────────────────── */}
      <GenerateAITimetableModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onSuccess={handleGenerationSuccess}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components (unchanged from original)
// ────────────────────────────────────────────────────────────────────────────

function MetricCard({ title, value, icon, subtitle }: any) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {icon}
        </div>
      </div>
      <div className="text-4xl font-black text-slate-900 tracking-tighter">{value}</div>
      <div className="text-sm font-bold text-blue-900 mt-2">{title}</div>
      <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
    </div>
  );
}

function StatusItem({ label, status, time, icon }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-blue-50 bg-white hover:border-blue-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-blue-50/50 rounded-xl">{icon}</div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-black text-blue-900">{status}</div>
        {time && <div className="text-[10px] text-slate-400 font-bold uppercase">{time}</div>}
      </div>
    </div>
  );
}

function QuickActionLink({ href, label }: any) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-600 text-blue-900 hover:text-white transition-all duration-300 group shadow-sm"
    >
      <span className="text-sm font-black tracking-tight">{label}</span>
      <ArrowRight size={18} className="text-blue-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
