import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Copy, Download, X, LogOut, AlertTriangle, Globe2, ChevronDown, ChevronUp, BookOpen, Heart, Hand, AlertOctagon } from 'lucide-react';
import { AppLanguage } from '../App';

const dashboardTranslations = {
  en: {
    title: 'Account Management',
    identity: 'My Identity',
    memberSince: 'Member for',
    days: 'days',
    exportData: 'Export My Data',
    identityWarning: 'This ID is your only identity — keep it safe',
    stats: 'My Statistics',
    confessions: 'Confessions',
    guardianSessions: 'Guardian Sessions',
    rating: 'My Rating',
    completed: 'Completed Sessions',
    roleMirror: 'Role Mirror',
    listenMore: 'Try to listen more',
    confessor: 'Confessor',
    guardian: 'Guardian',
    dailyPoints: 'Daily Points (Max 50)',
    pointsWarning: 'We cap daily points to maintain your mental balance and prevent emotional burnout.',
    badges: 'My Badges',
    noBadges: 'No badges yet. Start listening as a guardian to earn them!',
    settings: 'Settings & Security',
    appLang: 'App Language',
    changeLang: 'Change user interface language',
    logout: 'Logout',
    logoutDesc: 'Sign out from this device',
    exit: 'Exit',
    guardianGuideTitle: 'Guardian Guide & Best Practices',
    guideEmpathetic: 'Empathetic Listening',
    guideEmpatheticDesc: 'Focus entirely on the speaker. Acknowledge their feelings without immediately offering solutions. Use phrases like "I hear you" or "That sounds really difficult."',
    guideBoundaries: 'Setting Boundaries',
    guideBoundariesDesc: 'Remember you are a listener, not a professional therapist. It is okay to gently end the session if you feel overwhelmed or if the topic crosses your personal boundaries.',
    guideCrisis: 'Recognizing Signs of Crisis',
    guideCrisisDesc: 'If the confessor mentions self-harm, suicide, or severe abuse, gently encourage them to seek professional help. Remember the crisis resources available in the chat.',
  },
  ar: {
    title: 'إدارة الحساب',
    identity: 'هويتي',
    memberSince: 'عضو منذ',
    days: 'أيام',
    exportData: 'تصدير بياناتي',
    identityWarning: 'هذا المعرف هو هويتك الوحيدة — احتفظ به في مكان آمن',
    stats: 'إحصاءاتي الشخصية',
    confessions: 'اعترافاتي',
    guardianSessions: 'جلسات الحراسة',
    rating: 'تقييمي',
    completed: 'جلسات مكتملة',
    roleMirror: 'مرآة الأدوار',
    listenMore: 'حاول الاستماع أكثر',
    confessor: 'معترف',
    guardian: 'حارس',
    dailyPoints: 'النقاط اليومية (الحد الأقصى 50)',
    pointsWarning: 'نضع حداً أقصى للنقاط اليومية للحفاظ على توازنك النفسي ومنع الإرهاق العاطفي.',
    badges: 'شاراتي',
    noBadges: 'لم تحصل على شارات بعد. ابدأ الاستماع كحارس لكسبها!',
    settings: 'الإعدادات والأمان',
    appLang: 'لغة التطبيق',
    changeLang: 'تغيير لغة واجهة المستخدم',
    logout: 'تسجيل الخروج',
    logoutDesc: 'الخروج من هذا الجهاز',
    exit: 'خروج',
    guardianGuideTitle: 'دليل الحارس وأفضل الممارسات',
    guideEmpathetic: 'الاستماع بتعاطف',
    guideEmpatheticDesc: 'ركز تماماً مع المتحدث. اعترف بمشاعره دون تقديم حلول فورية. استخدم عبارات مثل "أنا أسمعك" أو "يبدو هذا صعباً جداً".',
    guideBoundaries: 'وضع الحدود',
    guideBoundariesDesc: 'تذكر أنك مستمع ولست معالجاً نفسياً. لا بأس بإنهاء الجلسة بلطف إذا شعرت بالإرهاق أو إذا تجاوز الموضوع حدودك الشخصية.',
    guideCrisis: 'التعرف على علامات الأزمة',
    guideCrisisDesc: 'إذا ذكر المعترف إيذاء النفس أو الانتحار أو الإساءة الشديدة، شجعه بلطف على طلب المساعدة المتخصصة. تذكر الموارد المتاحة للأزمات في المحادثة.',
  },
  fr: {
    title: 'Gestion du Compte',
    identity: 'Mon Identité',
    memberSince: 'Membre depuis',
    days: 'jours',
    exportData: 'Exporter mes données',
    identityWarning: 'Cet identifiant est votre seule identité — gardez-le en sécurité',
    stats: 'Mes Statistiques',
    confessions: 'Confessions',
    guardianSessions: 'Sessions de Gardien',
    rating: 'Mon Évaluation',
    completed: 'Sessions Terminées',
    roleMirror: 'Miroir des Rôles',
    listenMore: 'Essayez d\'écouter plus',
    confessor: 'Confesseur',
    guardian: 'Gardien',
    dailyPoints: 'Points Quotidiens (Max 50)',
    pointsWarning: 'Nous plafonnons les points quotidiens pour maintenir votre équilibre mental et prévenir l\'épuisement émotionnel.',
    badges: 'Mes Badges',
    noBadges: 'Aucun badge pour le moment. Commencez à écouter en tant que gardien pour les gagner !',
    settings: 'Paramètres et Sécurité',
    appLang: 'Langue de l\'application',
    changeLang: 'Changer la langue de l\'interface utilisateur',
    logout: 'Se déconnecter',
    logoutDesc: 'Se déconnecter de cet appareil',
    exit: 'Quitter',
    guardianGuideTitle: 'Guide du Gardien et Bonnes Pratiques',
    guideEmpathetic: 'Écoute Empathique',
    guideEmpatheticDesc: 'Concentrez-vous entièrement sur l\'orateur. Reconnaissez leurs sentiments sans offrir immédiatement de solutions. Utilisez des phrases comme "Je vous écoute" ou "Cela semble vraiment difficile."',
    guideBoundaries: 'Fixer des Limites',
    guideBoundariesDesc: 'N\'oubliez pas que vous êtes un auditeur, pas un thérapeute professionnel. Il est normal de terminer doucement la session si vous vous sentez dépassé ou si le sujet dépasse vos limites personnelles.',
    guideCrisis: 'Reconnaître les Signes de Crise',
    guideCrisisDesc: 'Si le confesseur mentionne l\'automutilation, le suicide ou des abus graves, encouragez-le doucement à demander l\'aide d\'un professionnel. N\'oubliez pas les ressources de crise disponibles dans le chat.',
  }
};

interface AccountDashboardProps {
  onClose: () => void;
  appLang: AppLanguage;
  setAppLang: (lang: AppLanguage) => void;
}

export const AccountDashboard = ({ onClose, appLang, setAppLang }: AccountDashboardProps) => {
  const { user, logout } = useAuth();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (!user) return null;

  const t = dashboardTranslations[appLang];
  const isRtl = appLang === 'ar';

  const daysSince = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
  const totalSessions = user.confessions + user.guardian_sessions;
  const confessorRatio = totalSessions > 0 ? (user.confessions / totalSessions) * 100 : 50;

  const handleExport = () => {
    const dataStr = JSON.stringify(user, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", "confesio_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    document.body.removeChild(downloadAnchorNode);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-gray-300 z-50 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto p-6 pb-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-serif text-amber-500/90">{t.title}</h1>
          <button onClick={onClose} className="p-2 bg-gray-800/50 hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* القسم ١: هويتي */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> {t.identity}
          </h2>
          <div className="bg-black border border-gray-800 rounded-xl p-4 flex items-center justify-between mb-4">
            <span className="font-mono text-sm text-gray-400 truncate mr-4">{user.uid}</span>
            <button onClick={() => navigator.clipboard.writeText(user.uid)} className="text-amber-500 hover:text-amber-400 p-2">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">{t.memberSince} {daysSince} {t.days}</span>
            <button onClick={handleExport} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" /> {t.exportData}
            </button>
          </div>
          <p className="text-red-400/80 text-xs mt-4 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {t.identityWarning}
          </p>
        </section>

        {/* Guardian Guide Section */}
        <section className="bg-gradient-to-br from-emerald-900/20 to-[#0a0a0a] border border-emerald-800/30 rounded-2xl mb-6 overflow-hidden transition-all">
          <button 
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full p-6 flex items-center justify-between text-left focus:outline-none"
          >
            <h2 className="text-lg font-medium text-emerald-400 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> {t.guardianGuideTitle}
            </h2>
            {isGuideOpen ? <ChevronUp className="w-5 h-5 text-emerald-500" /> : <ChevronDown className="w-5 h-5 text-emerald-500" />}
          </button>
          
          {isGuideOpen && (
            <div className="px-6 pb-6 space-y-6">
              <div className="flex gap-4">
                <div className="mt-1 bg-emerald-500/10 p-2 rounded-lg h-fit">
                  <Heart className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">{t.guideEmpathetic}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{t.guideEmpatheticDesc}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="mt-1 bg-blue-500/10 p-2 rounded-lg h-fit">
                  <Hand className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">{t.guideBoundaries}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{t.guideBoundariesDesc}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 bg-red-500/10 p-2 rounded-lg h-fit">
                  <AlertOctagon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">{t.guideCrisis}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{t.guideCrisisDesc}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* القسم ٢: إحصاءاتي الشخصية */}
        <section className="mb-6">
          <h2 className="text-lg font-medium text-white mb-4">{t.stats}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🕯️</div>
              <div className="text-gray-400 text-sm mb-1">{t.confessions}</div>
              <div className="text-xl font-medium text-white">{user.confessions}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <div className="text-gray-400 text-sm mb-1">{t.guardianSessions}</div>
              <div className="text-xl font-medium text-white">{user.guardian_sessions}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-gray-400 text-sm mb-1">{t.rating}</div>
              <div className="text-xl font-medium text-white">{user.avg_rating.toFixed(1)} / 5</div>
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-gray-400 text-sm mb-1">{t.completed}</div>
              <div className="text-xl font-medium text-white">{user.completed_sessions}</div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{t.roleMirror}</span>
              {confessorRatio > 80 && <span className="text-amber-500/80 text-xs">{t.listenMore}</span>}
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-600/50 h-full transition-all" style={{ width: `${confessorRatio}%` }} />
              <div className="bg-emerald-600/50 h-full transition-all" style={{ width: `${100 - confessorRatio}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{t.confessor} ({Math.round(confessorRatio)}%)</span>
              <span>{t.guardian} ({Math.round(100 - confessorRatio)}%)</span>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{t.dailyPoints}</span>
              <span className="text-amber-500/80 text-xs">{user.dailyPoints || 0} / 50</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${Math.min(((user.dailyPoints || 0) / 50) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t.pointsWarning}</p>
          </div>
        </section>

        {/* القسم ٣: الشارات والمكافآت */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            🏆 {t.badges}
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges && user.badges.map((badge, idx) => (
              <div key={idx} className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                {badge === 'Trusted Guardian' ? '🌟' : badge === 'Empath Listener' ? '💖' : '🌱'}
                {badge}
              </div>
            ))}
            {(!user.badges || user.badges.length === 0) && (
              <div className="text-gray-500 text-sm">{t.noBadges}</div>
            )}
          </div>
        </section>

        {/* القسم ٤: الإعدادات والأمان */}
        <section className="bg-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            {t.settings}
          </h2>
          
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-800/50">
            <div>
              <div className="text-white mb-1 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-500" />
                {t.appLang}
              </div>
              <div className="text-xs text-gray-500">{t.changeLang}</div>
            </div>
            <select
              value={appLang}
              onChange={(e) => setAppLang(e.target.value as AppLanguage)}
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 outline-none"
              dir="ltr"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="text-white mb-1">{t.logout}</div>
              <div className="text-xs text-gray-500">{t.logoutDesc}</div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" /> {t.exit}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
