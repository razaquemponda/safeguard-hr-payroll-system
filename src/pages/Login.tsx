import { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
// ===== NEW: Import rate limiter =====
import { checkRateLimit } from '../utils/rateLimiter';

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!username.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    // ===== NEW: Check rate limit before attempting login =====
    // Use the email as the user identifier for rate limiting
    const rateLimitResult = checkRateLimit(username.trim().toLowerCase());
    
    if (!rateLimitResult.allowed) {
      // Calculate remaining block time in seconds
      const remainingSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      
      let timeMessage = '';
      if (minutes > 0) {
        timeMessage = `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds > 1 ? 's' : ''}`;
      } else {
        timeMessage = `${seconds} second${seconds > 1 ? 's' : ''}`;
      }
      
      setError(`Too many login attempts. Please try again in ${timeMessage}.`);
      setLoading(false);
      return;
    }

    try {
      // Try to sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password
      });

      if (signInError) {
        // Handle different error types with user-friendly messages
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before logging in.');
        } else if (signInError.message.includes('rate limit')) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Fetch user profile to verify access
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role_level, full_name, is_super_admin, region_id")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        console.log("Login successful:", {
          email: data.user.email,
          role: profile?.role_level,
          isSuperAdmin: profile?.is_super_admin,
        });

        onLogin();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#081C3A] via-[#0c2a56] to-[#081C3A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-0 -right-40 w-96 h-96 bg-[#D4A017]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#D4A017]/5 rounded-full blur-3xl" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(212,160,23,0.08) 0, transparent 50%)',
      }} />

      <div className="relative grid lg:grid-cols-2 gap-8 max-w-5xl w-full z-10">
        {/* Left: Brand / Description */}
        <div className="hidden lg:flex flex-col justify-between text-white p-10 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-[#D4A017] flex items-center justify-center shadow-xl">
                <Shield size={28} className="text-[#081C3A]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Safeguard</h1>
                <p className="text-sm text-white/70">Security Services Ltd.</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              HR & Payroll<br />
              <span className="text-[#D4A017]">Management System</span>
            </h2>
            <p className="text-white/70 leading-relaxed max-w-md">
              Enterprise-grade platform designed to manage security personnel, process payroll, and streamline human resources operations for 200+ employees.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { n: '245', l: 'Employees' },
              { n: 'MK 72.5M', l: 'Monthly Payroll' },
              { n: '96.8%', l: 'Attendance Rate' }
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-2xl font-bold text-[#D4A017]">{s.n}</p>
                <p className="text-xs text-white/70 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#081C3A] flex items-center justify-center">
              <Shield size={24} className="text-[#D4A017]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Safeguard</h1>
              <p className="text-xs text-slate-500">HR & Payroll</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-500 mt-1">Sign in to your secure enterprise account</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin@safeguard.mw"
                  className="w-full pl-10 pr-3 py-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] focus:border-transparent outline-none"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-[#081C3A] focus:ring-[#081C3A]" defaultChecked />
                Remember me
              </label>
              <button type="button" className="text-[#081C3A] hover:text-[#D4A017] font-medium">Forgot password?</button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#081C3A] hover:bg-[#1a2f5c] text-white py-3 rounded-lg font-semibold text-sm shadow-lg shadow-[#081C3A]/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-[#FFF9E5] border border-[#D4A017]/20 text-sm">
            <p className="text-[#8B6F0F] font-semibold">🔐 Secure Access</p>
            <p className="text-slate-600 text-xs mt-1">This portal uses 256-bit encryption. Unauthorized access is prohibited and monitored.</p>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            © 2025 Safeguard Security Services Ltd. · v2.1.0
          </div>
        </div>
      </div>
    </div>
  );
}