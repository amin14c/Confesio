import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Copy, Download, X, LogOut, AlertTriangle } from 'lucide-react';

export const AccountDashboard = ({ onClose }: { onClose: () => void }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const daysSince = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
  const totalSessions = user.confessions + user.guardian_sessions;
  const confessorRatio = totalSessions > 0 ? (user.confessions / totalSessions) * 100 : 50;

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "confesio_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
            <span className="font-mono text-sm text-gray-400 truncate mr-4">{user.uid}</span>
            <button onClick={() => navigator.clipboard.writeText(user.uid)} className="text-amber-500 hover:text-amber-400 p-2">
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
              <div className="text-xl font-medium text-white">{user.confessions}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <div className="text-gray-400 text-sm mb-1">جلسات الحراسة</div>
              <div className="text-xl font-medium text-white">{user.guardian_sessions}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-gray-400 text-sm mb-1">تقييمي</div>
              <div className="text-xl font-medium text-white">{user.avg_rating.toFixed(1)} / 5</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-gray-400 text-sm mb-1">جلسات مكتملة</div>
              <div className="text-xl font-medium text-white">{user.completed_sessions}</div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-4">
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

          <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">النقاط اليومية (الحد الأقصى 50)</span>
              <span className="text-amber-500/80 text-xs">{user.dailyPoints || 0} / 50</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${Math.min(((user.dailyPoints || 0) / 50) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">نضع حداً أقصى للنقاط اليومية للحفاظ على توازنك النفسي ومنع الإرهاق العاطفي.</p>
          </div>
        </section>

        {/* القسم ٣: الشارات والمكافآت */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            🏆 شاراتي
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges && user.badges.map((badge, idx) => (
              <div key={idx} className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                {badge === 'Trusted Guardian' ? '🌟' : badge === 'Empath Listener' ? '💖' : '🌱'}
                {badge}
              </div>
            ))}
            {(!user.badges || user.badges.length === 0) && (
              <div className="text-gray-500 text-sm">لم تحصل على شارات بعد. ابدأ الاستماع كحارس لكسبها!</div>
            )}
          </div>
        </section>

        {/* القسم ٤: الإعدادات والأمان */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-white mb-1">تسجيل الخروج</div>
              <div className="text-xs text-gray-500">الخروج من هذا الجهاز</div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" /> خروج
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
