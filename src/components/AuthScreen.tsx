import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Shield } from 'lucide-react';

export const AuthScreen = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    setLoading(true);
    await login();
    // The auth state listener in useAuth will update the user and unmount this component
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

        <div className="bg-[#0a0a0a] border border-gray-800/50 p-8 rounded-2xl shadow-2xl text-center">
          <p className="text-gray-400 mb-6 leading-relaxed">
            ستدخل الآن بهوية مجهولة تماماً. لا نطلب بريداً إلكترونياً، ولا اسماً، ولا أي معلومات شخصية.
          </p>
          
          <div className="mb-8 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl text-emerald-400/90 text-sm text-right flex items-start gap-3">
            <Shield className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-emerald-500 block mb-1">تنبيه للحراس (المستمعين):</strong>
              إذا أردت التطوع كحارس، ستكسب نقاطاً ومكافآت في رصيدك عن كل جلسة استماع تدخلها وتكتمل بنجاح!
            </p>
          </div>
          
          <button 
            onClick={handleEnter}
            disabled={loading}
            className="w-full py-4 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-500/20 rounded-xl transition-colors font-medium disabled:opacity-50 text-lg"
          >
            {loading ? 'جاري الدخول...' : 'ادخل بهوية مجهولة'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
