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
// import { useAuthStore } from '../../store/authStore'; // AUTH DISABLED
// import apiClient from '../../lib/apiClient'; // AUTH DISABLED
import { cn } from '../../lib/utils';
// import { toast } from 'sonner'; // AUTH DISABLED

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
  // const { user, isAuthenticated, logout } = useAuthStore(); // AUTH DISABLED
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // useEffect(() => { // AUTH DISABLED
  //   if (!isAuthenticated && mounted) {
  //     router.replace('/login');
  //   }
  // }, [isAuthenticated, router, mounted]);

  // if (!mounted || !isAuthenticated || !user) { // AUTH DISABLED
  //   return null; // Avoid hydration mismatch and protected route flashes
  // }

  if (!mounted) {
    return null;
  }

  // Mock user for display when auth is disabled
  const user = { name: 'Admin User', role: 'ADMIN' };
  const navItems = getNavItems(user.role);

  const handleLogout = async () => {
    // try { // AUTH DISABLED
    //   await apiClient.post('/auth/logout');
    // } catch (e) {
    //   // Ignore network errors on logout
    // } finally {
    //   logout();
    //   toast.success('Logged out successfully');
    //   router.replace('/login');
    // }
    console.log('Logout disabled - auth system is disabled');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white transition-transform duration-300 md:relative md:translate-x-0 flex flex-col shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-white/10 justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter">
            <div className="w-9 h-9 bg-white text-blue-900 rounded-xl flex items-center justify-center font-black shadow-lg">M</div>
            IASDS
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} className="text-white/70 hover:text-white" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-1.5 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group",
                  isActive 
                    ? "bg-white text-blue-900 shadow-lg shadow-blue-950/20" 
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon size={18} className={cn("mr-3 transition-colors", isActive ? "text-blue-600" : "text-blue-300 group-hover:text-white")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-4 text-[11px] text-blue-200 font-medium">
            &copy; 2024 Academic Intelligence <br/> All Rights Reserved.
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <button 
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex flex-1 justify-end items-center gap-4">
            <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-slate-900 leading-tight">{user.name}</span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 mt-0.5 rounded-full font-black uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md ring-2 ring-white">
                {user.name.charAt(0)}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 ml-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
