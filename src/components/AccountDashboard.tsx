import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { Shield, Flame, Star, Coins, Settings, LogOut, AlertTriangle, Copy, Download, X } from 'lucide-react';

const BADGES_INFO: Record<string, { icon: string, title: string, desc: string }> = {
  'first_confession': { icon: '🕯️', title: 'أول اعتراف', desc: 'أكمل جلسته الأولى' },
  'trusted_guardian': { icon: '🛡️', title: 'حارس موثوق', desc: '5 جلسات حراسة بتقييم ≥ 4' },
  'silent_eloquent': { icon: '🌙', title: 'صامت بليغ', desc: '3 جلسات في الوضع الصامت' },
  'balanced': { icon: '⚖️', title: 'متوازن', desc: 'نسبة confessor/guardian بين 40-60%' },
  'multilingual': { icon: '🌍', title: 'متعدد اللغات', desc: 'جلسات بلغتين مختلفتين' },
  'heavy_session': { icon: '💫', title: 'جلسة ثقيلة', desc: 'أكمل جلسة بوزن crisis بنجاح' },
  'echo_universe': { icon: '🌊', title: 'صدى الكون', desc: 'شارك اقتباساً في echo pool' },
  'patient': { icon: '⏰', title: 'صبور', desc: 'انتظر في الطابور أكثر من 3 دقائق ودخل جلسة ناجحة' },
};

export const AccountDashboard = ({ onClose }: { onClose: () => void }) => {
  const { user, token, logout } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!user) return null;

  const daysSince = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
  const totalSessions = user.role_stats.confessions + user.role_stats.guardian_sessions;
  const confessorRatio = totalSessions > 0 ? (user.role_stats.confessions / totalSessions) * 100 : 50;

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "confesio_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE' || !password) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password })
      });
      if (res.ok) logout();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-gray-300 z-50 overflow-y-auto" dir="rtl">
      <div className="max-w-3xl mx-auto p-6 pb-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-serif text-amber-500/90">إدارة الحساب</h1>
          <button onClick={onClose} className="p-2 bg-gray-800/50 hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* القسم ١: هويتي */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> هويتي
          </h2>
          <div className="bg-black border border-gray-800 rounded-xl p-4 flex items-center justify-between mb-4">
            <span className="font-mono text-sm text-gray-400 truncate mr-4">{user.anonymousId}</span>
            <button onClick={() => navigator.clipboard.writeText(user.anonymousId)} className="text-amber-500 hover:text-amber-400 p-2">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">عضو منذ {daysSince} أيام</span>
            <button onClick={handleExport} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" /> تصدير بياناتي
            </button>
          </div>
          <p className="text-red-400/80 text-xs mt-4 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> هذا المعرف هو هويتك الوحيدة — احتفظ به في مكان آمن
          </p>
        </section>

        {/* القسم ٢: إحصاءاتي الشخصية */}
        <section className="mb-6">
          <h2 className="text-lg font-medium text-white mb-4">إحصاءاتي الشخصية</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🕯️</div>
              <div className="text-gray-400 text-sm mb-1">اعترافاتي</div>
              <div className="text-xl font-medium text-white">{user.role_stats.confessions}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <div className="text-gray-400 text-sm mb-1">جلسات الحراسة</div>
              <div className="text-xl font-medium text-white">{user.role_stats.guardian_sessions}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-gray-400 text-sm mb-1">تقييمي</div>
              <div className="text-xl font-medium text-white">{user.role_stats.avg_rating.toFixed(1)} / 5</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🪙</div>
              <div className="text-gray-400 text-sm mb-1">رصيدي</div>
              <div className="text-xl font-medium text-white">{user.credits}</div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">مرآة الأدوار</span>
              {confessorRatio > 80 && <span className="text-amber-500/80 text-xs">حاول الاستماع أكثر</span>}
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-600/50 h-full transition-all" style={{ width: `${confessorRatio}%` }} />
              <div className="bg-emerald-600/50 h-full transition-all" style={{ width: `${100 - confessorRatio}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>معترف ({Math.round(confessorRatio)}%)</span>
              <span>حارس ({Math.round(100 - confessorRatio)}%)</span>
            </div>
          </div>
        </section>

        {/* القسم ٣: شاراتي السرية */}
        <section className="mb-6">
          <h2 className="text-lg font-medium text-white mb-4">شاراتي السرية</h2>
          {user.badges.length === 0 ? (
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-8 text-center text-gray-500 text-sm">
              لم تكتسب أي شارات بعد. استمر في استخدام التطبيق لاكتشافها.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.badges.map(badgeId => {
                const info = BADGES_INFO[badgeId];
                if (!info) return null;
                return (
                  <div key={badgeId} className="bg-[#0a0a0a] border border-amber-900/20 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-3xl">{info.icon}</div>
                    <div>
                      <div className="font-medium text-amber-500/90">{info.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{info.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* القسم ٤: الإعدادات والأمان */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" /> الإعدادات والأمان
          </h2>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-gray-800/50">
              <div>
                <div className="text-white mb-1">تسجيل الخروج</div>
                <div className="text-xs text-gray-500">الخروج من هذا الجهاز</div>
              </div>
              <button onClick={logout} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4" /> خروج
              </button>
            </div>

            <div className="flex justify-between items-center pb-6 border-b border-gray-800/50">
              <div>
                <div className="text-white mb-1">تغيير كلمة المرور</div>
                <div className="text-xs text-gray-500">تحديث كلمة المرور الخاصة بحسابك</div>
              </div>
              <button onClick={() => setShowPasswordModal(true)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
                تغيير
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-red-400 mb-1">حذف الحساب نهائياً</div>
                <div className="text-xs text-gray-500">حذف جميع بياناتك وسجلاتك للأبد</div>
              </div>
              <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg text-sm transition-colors">
                حذف الحساب
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
          <div className="bg-[#0a0a0a] border border-red-900/50 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl text-red-500 mb-2 font-medium">تحذير خطير</h3>
            <p className="text-gray-400 text-sm mb-6">هذا الإجراء لا يمكن التراجع عنه. كل بياناتك ستُحذف نهائياً.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-2">اكتب "DELETE" للتأكيد</label>
                <input 
                  type="text" 
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">كلمة المرور</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500/50 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-gray-800 rounded-lg text-white">إلغاء</button>
              <button 
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || !password}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-red-900/50 rounded-lg text-white transition-colors"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
