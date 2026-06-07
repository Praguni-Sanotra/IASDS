"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  BookOpen,
  GraduationCap,
  CalendarDays,
  Zap,
  Clock,
  LayoutGrid,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../lib/apiClient";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface GenerateAITimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (department: string, semester: number) => void;
}

interface GenerationStats {
  totalSlots: number;
  solvingTimeMs: number;
  solverStatus: string;
  conflictCount: number;
  subjectsScheduled: number;
  facultyInvolved: number;
}

type ModalPhase = "form" | "generating" | "success" | "error";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science (CSE)" },
  { value: "ECE", label: "Electronics & Communication (ECE)" },
  { value: "MECH", label: "Mechanical Engineering (MECH)" },
  { value: "CIVIL", label: "Civil Engineering (CIVIL)" },
  { value: "EEE", label: "Electrical Engineering (EEE)" },
  { value: "IT", label: "Information Technology (IT)" },
  { value: "AIDS", label: "AI & Data Science (AIDS)" },
  { value: "AIML", label: "AI & Machine Learning (AIML)" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// Generate academic year options (current + next 3)
function getAcademicYears(): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const start = current - 1 + i;
    return `${start}-${String(start + 1).slice(-2)}`;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Progress steps shown during generation
// ────────────────────────────────────────────────────────────────────────────
const PROGRESS_STEPS = [
  { label: "Loading faculty & subjects", icon: Users, duration: 1200 },
  { label: "Building CSP constraint model", icon: LayoutGrid, duration: 1800 },
  { label: "Running OR-Tools solver", icon: Sparkles, duration: 3000 },
  { label: "Optimizing schedule fairness", icon: Zap, duration: 1000 },
  { label: "Saving to database", icon: BookOpen, duration: 600 },
];

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────
export default function GenerateAITimetableModal({
  isOpen,
  onClose,
  onSuccess,
}: GenerateAITimetableModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("form");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState(getAcademicYears()[1]);
  const [errorMessage, setErrorMessage] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [fixes, setFixes] = useState<string[]>([]);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [allowFallbacks, setAllowFallbacks] = useState(true);

  // animated progress state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("form");
      setDepartment("");
      setSemester("");
      setAcademicYear(getAcademicYears()[1]);
      setErrorMessage("");
      setDiagnostics([]);
      setFixes([]);
      setStats(null);
      setCurrentStep(0);
      setStepProgress(0);
    }
  }, [isOpen]);

  // animated step progress while generating
  useEffect(() => {
    if (phase !== "generating") {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      return;
    }

    let step = 0;
    const advanceStep = () => {
      if (step < PROGRESS_STEPS.length - 1) {
        setCurrentStep(step);
        setStepProgress(0);

        // Animate progress bar within this step
        const totalDuration = PROGRESS_STEPS[step].duration;
        const intervals = 20;
        const increment = 100 / intervals;
        let count = 0;
        const tick = setInterval(() => {
          count++;
          setStepProgress(Math.min(count * increment, 95));
          if (count >= intervals) {
            clearInterval(tick);
            setStepProgress(100);
            step++;
            stepTimerRef.current = setTimeout(advanceStep, 200);
          }
        }, totalDuration / intervals);
      } else {
        // Stay on last step (actual API response will resolve)
        setCurrentStep(PROGRESS_STEPS.length - 1);
      }
    };

    advanceStep();

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [phase]);

  // close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "generating") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, onClose]);

  // ── Form validation ──────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!department) return "Please select a department.";
    if (!semester) return "Please select a semester.";
    if (!academicYear.trim()) return "Please enter an academic year.";
    return null;
  };

  // ── Generate handler ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setPhase("generating");
    setErrorMessage("");

    try {
      const res = await apiClient.post("/admin/generate-timetable", {
        department,
        semester: parseInt(semester),
        academicYear: academicYear.trim(),
        allowFallbacks,
      });

      setStats(res.data.stats);
      setPhase("success");
      toast.success("Timetable generated successfully!");
    } catch (error: any) {
      const data = error?.response?.data;
      // Backend may return detail as string or object
      const detail = data?.detail || data;
      const msg =
        (typeof detail === "string" ? detail : detail?.message) ||
        "Generation failed. Please check configuration.";
      const diags =
        detail?.diagnostics ||
        data?.diagnostics ||
        (typeof detail === "string" ? [detail] : []);
      const fixesList = detail?.fixes || data?.fixes || [];

      setErrorMessage(msg);
      setDiagnostics(diags);
      setFixes(fixesList);
      setPhase("error");
      toast.error(msg, { duration: 6000 });
    }
  };

  // ── Success: trigger refresh + close ────────────────────────────────────
  const handleDone = () => {
    onSuccess(department, parseInt(semester));
    onClose();
  };

  if (!isOpen) return null;

  // Render into portal so it sits above everything
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={phase !== "generating" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-blue-900/20 animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-7 text-white overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />

            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    Generate AI Timetable
                  </h2>
                  <p className="text-blue-100 text-xs mt-0.5 font-medium">
                    Conflict-free • CSP Solver • OR-Tools
                  </p>
                </div>
              </div>

              {phase !== "generating" && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* ── BODY ───────────────────────────────────────────────────── */}
          <div className="p-7">

            {/* ── PHASE: FORM ──────────────────────────────────────────── */}
            {phase === "form" && (
              <div className="space-y-5">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Select the target department, semester, and academic year. The
                  AI scheduler will generate a fully optimised, conflict-free
                  timetable and publish it instantly.
                </p>

                {/* Department */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    <GraduationCap size={13} className="text-blue-500" />
                    Department
                  </label>
                  <div className="relative">
                    <select
                      id="ai-dept-select"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Semester + Academic Year */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      <BookOpen size={13} className="text-blue-500" />
                      Semester
                    </label>
                    <div className="relative">
                      <select
                        id="ai-sem-select"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="">Select</option>
                        {SEMESTERS.map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      <CalendarDays size={13} className="text-blue-500" />
                      Academic Year
                    </label>
                    <div className="relative">
                      <select
                        id="ai-year-select"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        {getAcademicYears().map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Zap size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      The engine enforces <strong>no teacher clashes</strong>,{" "}
                      <strong>no room conflicts</strong>, weekly hour limits per
                      subject, and lab continuity. If a valid schedule cannot be
                      found, a descriptive error is returned.
                    </p>
                  </div>
                </div>

                {/* Mapping info note */}
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Faculty-subject mappings are pre-configured. The AI will use only the mapped teachers for each subject.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    id="ai-cancel-btn"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="ai-generate-btn"
                    onClick={handleGenerate}
                    disabled={!department || !semester}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    Generate
                  </button>
                </div>
              </div>
            )}

            {/* ── PHASE: GENERATING ────────────────────────────────────── */}
            {phase === "generating" && (
              <div className="py-2 space-y-6">
                {/* Spinner */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                    <div
                      className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                      style={{ animationDuration: "1.2s" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={22} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-black text-slate-800 text-base">
                      Solving Constraints…
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {department} · Semester {semester} · {academicYear}
                    </p>
                  </div>
                </div>

                {/* Step list */}
                <div className="space-y-3">
                  {PROGRESS_STEPS.map((step, i) => {
                    const StepIcon = step.icon;
                    const isDone = i < currentStep;
                    const isActive = i === currentStep;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              isDone
                                ? "bg-emerald-500"
                                : isActive
                                ? "bg-blue-600"
                                : "bg-slate-100"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 size={14} className="text-white" />
                            ) : (
                              <StepIcon
                                size={14}
                                className={
                                  isActive ? "text-white" : "text-slate-400"
                                }
                              />
                            )}
                          </div>
                          <span
                            className={`text-xs font-semibold transition-colors duration-300 ${
                              isDone
                                ? "text-emerald-600"
                                : isActive
                                ? "text-blue-700"
                                : "text-slate-400"
                            }`}
                          >
                            {step.label}
                          </span>
                          {isActive && (
                            <Loader2
                              size={13}
                              className="text-blue-500 animate-spin ml-auto flex-shrink-0"
                            />
                          )}
                        </div>
                        {isActive && (
                          <div className="ml-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${stepProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-[11px] text-slate-400">
                  <Clock size={11} className="inline mr-1" />
                  This may take up to 60 seconds for complex schedules.
                </p>
              </div>
            )}

            {/* ── PHASE: SUCCESS ───────────────────────────────────────── */}
            {phase === "success" && stats && (
              <div className="py-2 space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base">
                      Timetable Generated!
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {department} · Semester {semester} · {academicYear}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBadge
                    label="Slots"
                    value={stats.totalSlots}
                    color="blue"
                  />
                  <StatBadge
                    label="Subjects"
                    value={stats.subjectsScheduled}
                    color="indigo"
                  />
                  <StatBadge
                    label="Faculty"
                    value={stats.facultyInvolved}
                    color="violet"
                  />
                  <StatBadge
                    label="Conflicts"
                    value={stats.conflictCount}
                    color={stats.conflictCount === 0 ? "emerald" : "red"}
                  />
                  <StatBadge
                    label="Status"
                    value={stats.solverStatus}
                    color="emerald"
                    small
                  />
                  <StatBadge
                    label="Time (ms)"
                    value={stats.solvingTimeMs}
                    color="amber"
                  />
                </div>

                <button
                  id="ai-done-btn"
                  onClick={handleDone}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  View Timetable
                </button>
              </div>
            )}

            {/* ── PHASE: ERROR ─────────────────────────────────────────── */}
            {phase === "error" && (
              <div className="py-2 space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <AlertTriangle size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base">
                      Generation Failed
                    </h3>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-xs">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                {diagnostics.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2 max-h-40 overflow-y-auto">
                    <p className="text-xs font-bold text-red-800 flex items-center gap-2">
                      <AlertTriangle size={14} /> Diagnostic Issues
                    </p>
                    <ul className="list-disc pl-5 text-xs text-red-700 leading-relaxed space-y-1">
                      {diagnostics.map((diag, idx) => (
                        <li key={idx}>{diag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {fixes.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2 max-h-32 overflow-y-auto">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                      <Zap size={14} /> Auto-Fixes Attempted
                    </p>
                    <ul className="list-disc pl-5 text-xs text-amber-700 leading-relaxed space-y-1">
                      {fixes.map((fix, idx) => (
                        <li key={idx}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnostics.length === 0 && fixes.length === 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                    <p className="text-xs text-red-700 leading-relaxed font-medium">
                      <strong>Common fixes:</strong> Ensure faculty are assigned to
                      subjects, rooms exist for the department, and subject hours
                      don't exceed 36 slots/week.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setPhase("form")}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={15} />
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-component: stat badge for success screen
// ────────────────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-red-50 text-red-700 border-red-100",
};

function StatBadge({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string | number;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      className={`border rounded-2xl p-3 text-center ${COLOR_MAP[color] || COLOR_MAP.blue}`}
    >
      <div className={`font-black ${small ? "text-xs" : "text-lg"}`}>
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mt-0.5">
        {label}
      </div>
    </div>
  );
}
