"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, Calendar, Users, BookOpen, 
  DoorOpen, Sliders, BarChart3, Bot, FileClock,
  Menu, X, Sun, Moon, LogOut, UploadCloud
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../lib/apiClient';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const getNavItems = (role: string) => {
  const common = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Timetable', href: '/dashboard/timetable', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Assistant', href: '/dashboard/assistant', icon: Bot },
  ];

  if (role === 'ADMIN') {
    return [
      ...common.slice(0, 2),
      { name: 'Faculty', href: '/dashboard/admin/faculty', icon: Users },
      { name: 'Subjects', href: '/dashboard/admin/subjects', icon: BookOpen },
      { name: 'Rooms', href: '/dashboard/admin/rooms', icon: DoorOpen },
      { name: 'Constraints', href: '/dashboard/admin/constraints', icon: Sliders },
      ...common.slice(2),
      { name: 'Bulk Import', href: '/dashboard/admin/import', icon: UploadCloud },
      { name: 'Audit Log', href: '/dashboard/admin/audit-log', icon: FileClock },
    ];
  }
  
  if (role === 'STUDENT') {
    return [
      common[0],
      common[1],
      common[3],
    ];
  }

  return common; // FACULTY
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && mounted) {
      router.replace('/login');
    }
  }, [isAuthenticated, router, mounted]);

  if (!mounted || !isAuthenticated || !user) {
    return null; // Avoid hydration mismatch and protected route flashes
  }

  const navItems = getNavItems(user.role);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      logout();
      toast.success('Logged out successfully');
      router.replace('/login');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 md:relative md:translate-x-0 flex flex-col shadow-xl md:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 justify-between md:justify-center">
          <div className="flex items-center gap-3 font-bold text-xl text-zinc-900 dark:text-white">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-lg shadow-sm">M</div>
            IASDS
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm shadow-blue-500/5" 
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                )}
              >
                <item.icon size={18} className={cn("mr-3", isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <button 
            className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex flex-1 justify-end items-center gap-2 sm:gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="flex items-center gap-3 border-l pl-4 border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{user.name}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 mt-0.5 rounded-full font-medium">
                  {user.role}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
                {user.name.charAt(0)}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 ml-1 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
