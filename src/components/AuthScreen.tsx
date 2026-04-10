import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

export const AuthScreen = () => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [password, setPassword] = useState('');
  const [anonymousId, setAnonymousId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newIdentity, setNewIdentity] = useState<{ id: string, token: string } | null>(null);
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNewIdentity({ id: data.anonymousId, token: data.token });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousId, password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      login(data.token, { anonymousId, ...data.user_stats });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!newIdentity) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${newIdentity.token}` }
      });
      const data = await res.json();
      login(newIdentity.token, data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Candle Animation Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-amber-500/90 mb-3">Confessio</h1>
          <p className="text-gray-500 text-lg">مكان لما لا يُقال</p>
        </div>

        {newIdentity ? (
          <div className="bg-[#0a0a0a] border border-amber-900/30 p-8 rounded-2xl text-center shadow-2xl">
            <h2 className="text-xl text-amber-500 mb-4">هويتك المجهولة الجديدة</h2>
            <div className="bg-black p-4 rounded-lg mb-6 select-all font-mono text-sm text-gray-400 break-all border border-gray-800">
              {newIdentity.id}
            </div>
            <p className="text-red-400/80 text-sm mb-8 font-medium">
              هذا المعرف هو هويتك الوحيدة — احتفظ به في مكان آمن. لا يمكن استرجاعه أبداً إذا فقدته.
            </p>
            <div className="flex gap-3 mb-6">
              <button 
                onClick={() => navigator.clipboard.writeText(newIdentity.id)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                نسخ المعرف
              </button>
            </div>
            <button 
              onClick={completeRegistration}
              className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 rounded-xl transition-colors font-medium border border-amber-500/20"
            >
              حفظت معرفي في مكان آمن ← دخول
            </button>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-gray-800/50 p-8 rounded-2xl shadow-2xl">
            <div className="flex mb-8 border-b border-gray-800">
              <button 
                className={`flex-1 pb-3 transition-colors ${tab === 'login' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-400'}`}
                onClick={() => { setTab('login'); setError(''); }}
              >
                دخول
              </button>
              <button 
                className={`flex-1 pb-3 transition-colors ${tab === 'register' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-400'}`}
                onClick={() => { setTab('register'); setError(''); }}
              >
                انتساب
              </button>
            </div>

            {error && <div className="mb-6 p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg text-sm text-center">{error}</div>}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <input 
                    type="text" 
                    placeholder="المعرف المجهول (anonymousId)" 
                    value={anonymousId}
                    onChange={e => setAnonymousId(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    placeholder="كلمة المرور" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors"
                    required
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'جاري الدخول...' : 'دخول'}
                </button>
                <p className="text-center text-xs text-gray-600 mt-4">لا بريد إلكتروني. لا اسم. أنت فقط.</p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <input 
                    type="password" 
                    placeholder="كلمة المرور (8 أحرف على الأقل)" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-gray-600 mt-2">كلمة المرور تُستخدم فقط لحماية حسابك من السرقة.</p>
                </div>
                <button 
                  disabled={loading}
                  className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-500/20 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'جاري الإنشاء...' : 'أنشئ هويتي المجهولة'}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
