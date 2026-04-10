'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import { useSocket } from '../../lib/useSocket';
import { authApi } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Shield, Users, User, LogOut, Bell, BellOff, Menu, X, Wifi, WifiOff
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, clearAuth, setAuth, isAuthenticated } = useAuthStore();
  const { notifications, connected, clearNotifications } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }
    if (savedUser && !isAuthenticated) {
      const parsed = JSON.parse(savedUser);
      const refreshToken = localStorage.getItem('refreshToken') || '';
      setAuth(parsed, token, refreshToken);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || '';
      await authApi.logout(refreshToken);
    } catch {}
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const unreadCount = notifications.length;

  if (!hydrated) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-200
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex lg:flex-col`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Secure UMS</span>
          <button onClick={() => setMobileMenuOpen(false)} className="ml-auto lg:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <a href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="w-5 h-5" /> <span>Users</span>
          </a>
          <a href="/dashboard/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <User className="w-5 h-5" /> <span>My Profile</span>
          </a>
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            {/* WebSocket status */}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full
              ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? 'Live' : 'Offline'}
            </div>

            {/* Notifications bell */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                {unreadCount > 0 ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                    <button onClick={clearNotifications} className="text-xs text-blue-600 hover:underline">
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">No notifications</div>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0
                              ${n.type === 'USER_CREATED' ? 'bg-green-500' :
                                n.type === 'USER_DELETED' ? 'bg-red-500' :
                                n.type === 'LOGIN_SUCCESS' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                            <div>
                              <p className="text-sm text-slate-700">{n.message}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(n.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}