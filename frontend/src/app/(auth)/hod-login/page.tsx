"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import apiClient from '../../../lib/apiClient';
import { useAuthStore } from '../../../store/authStore';
import { cn } from '../../../lib/utils';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function HODLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormValues) => {
    try {
      // For demonstration, since we're focusing on frontend, 
      // we'll assume the backend handles the HOD login at /auth/login
      // and returns the user with role 'HOD'
      const response = await apiClient.post('/auth/login', {
        ...data,
      });
      
      const { accessToken, user } = response.data;
      
      // Safety check for role - normally handled by backend
      const userData = { ...user, role: user.role || 'HOD' };
      
      login(userData, accessToken);
      toast.success('HOD Login successful!');
      router.push('/dashboard/hod');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'HOD Login failed.');
    }
  };

  const handlePortalSwitch = (portal: string) => {
    if (portal === 'hod') {
      router.push('/hod-login');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-10 border border-blue-50 transition-all duration-500 hover:shadow-blue-500/10">
      
      {/* Portal Dropdown Switcher */}
      <div className="mb-8">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Select Portal</label>
        <select 
          onChange={(e) => handlePortalSwitch(e.target.value)}
          value="hod"
          className="w-full h-11 rounded-xl border-2 border-blue-50 bg-blue-50/50 px-4 text-xs font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%232563eb%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_1rem_center] bg-no-repeat"
        >
          <option value="incharge">Timetable In-charge</option>
          <option value="hod">HOD Department</option>
        </select>
      </div>

      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/30">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-blue-950">
          HOD Portal
        </h1>
        <p className="text-sm font-bold text-slate-600 mt-3 text-center max-w-[280px]">
          Head of Department access for Timetable Review & Approval
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-blue-900 ml-1">
            Official Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="hod@miet.ac.in"
            className={cn(
              "flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              errors.email && "border-red-500 focus:ring-red-500"
            )}
          />
          {errors.email && (
            <p className="text-xs font-bold text-red-600 mt-1 ml-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-blue-900 ml-1">
            Security Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={cn(
                "flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-50 pr-12 transition-all",
                errors.password && "border-red-500 focus:ring-red-500"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-slate-400 hover:text-blue-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-bold text-red-600 mt-1 ml-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-black ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-12 px-4 py-2 w-full mt-4 shadow-xl shadow-blue-600/20 active:scale-[0.98]"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          Authenticate Portal
        </button>
      </form>
    </div>
  );
}
