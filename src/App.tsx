import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MessageCircle, Send, Star, Flame, Globe2, Languages, Phone, PhoneOff, Mic, MicOff, UserCircle } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { AccountDashboard } from './components/AccountDashboard';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where, onSnapshot, deleteDoc, addDoc, orderBy, updateDoc, limit } from 'firebase/firestore';

type AppLanguage = 'en' | 'fr' | 'ar';
type Step = 'app-lang' | 'role-select' | 'comm-lang' | 'ritual' | 'chat' | 'rating';
type Role = 'confessor' | 'guardian' | null;

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  isSystem?: boolean;
}

const translations = {
  en: {
    appLangTitle: 'Choose App Language',
    subtitle: 'A safe space to confess and listen, without judgment.',
    confessor: 'The Confessor',
    confessorDesc: 'I have something to confess and release its weight.',
    guardian: 'The Guardian',
    guardianDesc: 'I am here to listen with empathy, without judgment.',
    commLangTitle: 'Communication Language',
    commLangDesc: 'Which language do you prefer to use in this session?',
    continue: 'Continue',
    breathe: 'Breathe slowly...',
    waitConfessor: 'Looking for a guardian to listen to you',
    waitGuardian: 'Waiting for someone who needs to be heard',
    anonGuardian: 'Anonymous Guardian',
    anonConfessor: 'Anonymous Confessor',
    endBurn: 'End & Burn',
    systemMsg: 'A safe session has started. The chat is encrypted and will be completely erased upon completion.',
    placeholder: 'Type your message here...',
    burnedTitle: 'The conversation is burned',
    burnedDesc: 'No trace remains of what was said here.',
    rateGuardian: "How do you rate the guardian's empathy?",
    rateConfessor: 'How do you rate your experience as a guardian?',
    returnStart: 'Return to start',
    startAudioCall: 'Start Audio Call',
    calling: 'Calling...',
    activeCall: 'Audio Call Active',
    endCall: 'End Call',
    callEnded: 'Audio call ended',
    partnerLeft: 'Partner has disconnected or left the session',
    cancel: 'Cancel',
    queueTimeout: 'Wait time exceeded. Please try again.',
    crisisAlert: '⚠️ Your partner seems to be in a crisis — please be fully present and listen carefully.',
    supportResources: 'If you need immediate help, please reach out to: Algeria 3548, International befrienders.org',
    submitRating: 'Submit Rating & Return'
  },
  fr: {
    appLangTitle: "Langue de l'application",
    subtitle: 'Un espace sûr pour se confesser et écouter, sans jugement.',
    confessor: 'Le Confesseur',
    confessorDesc: "J'ai quelque chose à avouer et à libérer de son poids.",
    guardian: 'Le Gardien',
    guardianDesc: 'Je suis ici pour écouter avec empathie, sans jugement.',
    commLangTitle: 'Langue de communication',
    commLangDesc: 'Quelle langue préférez-vous utiliser pour cette session ?',
    continue: 'Continuer',
    breathe: 'Respirez lentement...',
    waitConfessor: 'À la recherche d\'un gardien pour vous écouter',
    waitGuardian: 'En attente de quelqu\'un qui a besoin d\'être entendu',
    anonGuardian: 'Gardien Anonyme',
    anonConfessor: 'Confesseur Anonyme',
    endBurn: 'Terminer et Brûler',
    systemMsg: 'Une session sécurisée a commencé. Le chat est crypté et sera complètement effacé à la fin.',
    placeholder: 'Tapez votre message ici...',
    burnedTitle: 'La conversation est brûlée',
    burnedDesc: 'Aucune trace ne reste de ce qui a été dit ici.',
    rateGuardian: "Comment évaluez-vous l'empathie du gardien ?",
    rateConfessor: 'Comment évaluez-vous votre expérience en tant que gardien ?',
    returnStart: 'Retour au début',
    startAudioCall: 'Démarrer l\'appel audio',
    calling: 'Appel en cours...',
    activeCall: 'Appel audio actif',
    endCall: 'Terminer l\'appel',
    callEnded: 'Appel audio terminé',
    partnerLeft: 'Le partenaire s\'est déconnecté ou a quitté la session',
    cancel: 'Annuler',
    queueTimeout: 'Temps d\'attente dépassé. Veuillez réessayer.',
    crisisAlert: '⚠️ Votre partenaire semble traverser une crise — soyez pleinement présent et écoutez attentivement.',
    supportResources: 'Si vous avez besoin d\'aide immédiate, contactez : Algérie 3548, International befrienders.org',
    submitRating: 'Soumettre la note et retourner'
  },
  ar: {
    appLangTitle: 'اختر لغة التطبيق',
    subtitle: 'مساحة آمنة للبوح والاستماع، دون أحكام.',
    confessor: 'المُعترِف',
    confessorDesc: 'لدي شيء أود البوح به والتخلص من ثقله.',
    guardian: 'الحارس',
    guardianDesc: 'أنا هنا لأستمع بتعاطف، دون إصدار أحكام.',
    commLangTitle: 'لغة التواصل',
    commLangDesc: 'بأي لغة تفضل التواصل في هذه الجلسة؟',
    continue: 'متابعة',
    breathe: 'تنفس ببطء...',
    waitConfessor: 'نبحث عن حارس يستمع إليك',
    waitGuardian: 'ننتظر شخصاً يحتاج لمن يسمعه',
    anonGuardian: 'الحارس المجهول',
    anonConfessor: 'المعترف المجهول',
    endBurn: 'إنهاء وحرق',
    systemMsg: 'تم بدء جلسة آمنة. المحادثة مشفرة وستُمحى بالكامل عند الانتهاء.',
    placeholder: 'اكتب رسالتك هنا...',
    burnedTitle: 'تم حرق المحادثة',
    burnedDesc: 'لم يتبقَ أي أثر لما قيل هنا.',
    rateGuardian: 'كيف تقيم تعاطف الحارس؟',
    rateConfessor: 'كيف تقيم تجربتك كحارس؟',
    returnStart: 'العودة للبداية',
    startAudioCall: 'بدء مكالمة صوتية',
    calling: 'يتصل...',
    activeCall: 'مكالمة صوتية نشطة',
    endCall: 'إنهاء المكالمة',
    callEnded: 'انتهت المكالمة الصوتية',
    partnerLeft: 'الطرف الآخر انقطع اتصاله أو غادر الجلسة',
    cancel: 'إلغاء',
    queueTimeout: 'انتهى وقت الانتظار. يرجى المحاولة مرة أخرى.',
    crisisAlert: '⚠️ يبدو أن شريكك يمر بأزمة — كن حاضراً بشكل كامل واستمع بعناية.',
    supportResources: 'إذا كنت بحاجة لمساعدة فورية، يرجى التواصل مع: الجزائر 3548، دولي befrienders.org',
    submitRating: 'إرسال التقييم والعودة'
  }
};

const communicationLanguages = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'fr', name: 'French', native: 'Français' },
  { id: 'ar', name: 'Arabic', native: 'العربية' },
  { id: 'es', name: 'Spanish', native: 'Español' },
  { id: 'de', name: 'German', native: 'Deutsch' },
];

export default function App() {
  const { user, loading } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [appLang, setAppLang] = useState<AppLanguage>('en');
  const [step, setStep] = useState<Step>('app-lang');
  const [role, setRole] = useState<Role>(null);
  const [commLang, setCommLang] = useState<string>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [rating, setRating] = useState(0);
  const [waitingTime, setWaitingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);

  const t = translations[appLang];
  const isRtl = appLang === 'ar';

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'ritual') {
      setWaitingTime(0);
      interval = setInterval(() => setWaitingTime(w => w + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Matchmaking Logic
  useEffect(() => {
    if (step !== 'ritual' || !user || !role) return;

    let unsubRooms: () => void;
    let matchInterval: NodeJS.Timeout;

    const startMatchmaking = async () => {
      // 1. Create a queue entry
      const newQueueId = user.uid;
      setQueueId(newQueueId);
      await setDoc(doc(db, 'queues', newQueueId), {
        uid: user.uid,
        role,
        lang: commLang,
        joinedAt: Date.now()
      });

      // 2. Listen for rooms where I am a participant
      const roomsQuery = query(
        collection(db, 'rooms'),
        where(role === 'confessor' ? 'confessorId' : 'guardianId', '==', user.uid),
        where('status', '==', 'active')
      );

      unsubRooms = onSnapshot(roomsQuery, (snapshot) => {
        if (!snapshot.empty) {
          const roomDoc = snapshot.docs[0];
          setRoomId(roomDoc.id);
          setStep('chat');
          // Clean up my queue entry
          deleteDoc(doc(db, 'queues', newQueueId)).catch(() => {});
        }
      });

      // 3. If I am a confessor, actively look for a guardian
      if (role === 'confessor') {
        matchInterval = setInterval(async () => {
          const q = query(
            collection(db, 'queues'),
            where('role', '==', 'guardian'),
            where('lang', '==', commLang),
            orderBy('joinedAt', 'asc'),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const guardianDoc = snap.docs[0];
            const guardianId = guardianDoc.data().uid;
            
            // Create a room
            const newRoomRef = doc(collection(db, 'rooms'));
            await setDoc(newRoomRef, {
              confessorId: user.uid,
              guardianId: guardianId,
              lang: commLang,
              status: 'active',
              createdAt: Date.now()
            });
            
            // Delete the guardian's queue entry
            deleteDoc(doc(db, 'queues', guardianId)).catch(() => {});
          }
        }, 3000);
      }
    };

    startMatchmaking();

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      cancelQueue();
      alert(t.queueTimeout);
    }, 5 * 60 * 1000);

    return () => {
      if (unsubRooms) unsubRooms();
      if (matchInterval) clearInterval(matchInterval);
      clearTimeout(timeout);
    };
  }, [step, user, role, commLang]);

  // Chat Logic
  useEffect(() => {
    if (step !== 'chat' || !roomId || !user) return;

    const messagesQuery = query(
      collection(db, `rooms/${roomId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          text: data.text,
          sender: data.senderId === user.uid ? 'me' : 'other',
          timestamp: new Date(data.timestamp)
        });
      });
      setMessages(newMessages);
    });

    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().status === 'ended') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: t.partnerLeft,
          sender: 'other',
          timestamp: new Date(),
          isSystem: true
        }]);
        setTimeout(() => setStep('rating'), 3000);
      }
    });

    return () => {
      unsubMessages();
      unsubRoom();
    };
  }, [step, roomId, user]);

  const handleAppLangSelect = (lang: AppLanguage) => {
    setAppLang(lang);
    setCommLang(lang);
    setStep('role-select');
  };

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep('comm-lang');
  };

  const startRitual = () => {
    setStep('ritual');
  };

  const cancelQueue = async () => {
    if (queueId) {
      await deleteDoc(doc(db, 'queues', queueId)).catch(() => {});
      setQueueId(null);
    }
    setStep('role-select');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || !user) return;

    const text = inputText;
    setInputText('');

    await addDoc(collection(db, `rooms/${roomId}/messages`), {
      text,
      senderId: user.uid,
      role: role,
      timestamp: Date.now()
    });
  };

  const endSession = async () => {
    if (roomId) {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'ended' });
    }
    setStep('rating');
  };

  const submitRatingAndReset = async () => {
    if (rating > 0 && user) {
      // In a real app, we'd update the partner's rating here via a secure Cloud Function.
      // For now, we'll just update our own completed sessions count.
      await updateDoc(doc(db, 'users', user.uid), {
        completed_sessions: user.completed_sessions + 1,
        [role === 'confessor' ? 'confessions' : 'guardian_sessions']: user[role === 'confessor' ? 'confessions' : 'guardian_sessions'] + 1
      });
    }
    setStep('role-select');
    setRole(null);
    setMessages([]);
    setRating(0);
    setRoomId(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050505] text-gray-100 flex flex-col font-sans selection:bg-purple-900 selection:text-white relative">
      {showDashboard && <AccountDashboard onClose={() => setShowDashboard(false)} />}
      
      <AnimatePresence mode="wait">
        
        {/* STEP 0: APP LANGUAGE SELECTION */}
        {step === 'app-lang' && (
          <motion.div 
            key="app-lang"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full relative"
          >
            <div className="absolute top-6 right-6">
              <button onClick={() => setShowDashboard(true)} className="p-2 text-gray-500 hover:text-amber-500 transition-colors">
                <UserCircle className="w-8 h-8" />
              </button>
            </div>
            <Globe2 className="w-12 h-12 text-zinc-500 mb-8" strokeWidth={1} />
            <h1 className="text-2xl font-light mb-8 text-white">Confessio</h1>
            
            <div className="w-full space-y-4">
              <button onClick={() => handleAppLangSelect('en')} className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors flex justify-between items-center">
                <span className="font-medium">English</span>
              </button>
              <button onClick={() => handleAppLangSelect('fr')} className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors flex justify-between items-center">
                <span className="font-medium">Français</span>
              </button>
              <button onClick={() => handleAppLangSelect('ar')} className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors flex justify-between items-center">
                <span className="font-medium font-sans">العربية</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 1: ROLE SELECTION */}
        {step === 'role-select' && (
          <motion.div 
            key="role-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full relative"
          >
            <div className="absolute top-6 right-6">
              <button onClick={() => setShowDashboard(true)} className="p-2 text-gray-500 hover:text-amber-500 transition-colors">
                <UserCircle className="w-8 h-8" />
              </button>
            </div>
            <div className="text-center mb-16">
              <h1 className="text-4xl font-light tracking-widest mb-4 text-white">Confessio</h1>
              <p className="text-gray-400 text-sm">{t.subtitle}</p>
            </div>

            <div className="w-full space-y-6">
              <button 
                onClick={() => handleRoleSelect('confessor')}
                className="w-full group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-8 transition-all hover:border-purple-500/50 hover:bg-zinc-900"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <MessageCircle className="w-8 h-8 text-purple-400 mb-4 mx-auto" strokeWidth={1.5} />
                <h2 className="text-xl font-semibold mb-2">{t.confessor}</h2>
                <p className="text-sm text-gray-500">{t.confessorDesc}</p>
              </button>

              <button 
                onClick={() => handleRoleSelect('guardian')}
                className="w-full group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-8 transition-all hover:border-emerald-500/50 hover:bg-zinc-900"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Shield className="w-8 h-8 text-emerald-400 mb-4 mx-auto" strokeWidth={1.5} />
                <h2 className="text-xl font-semibold mb-2">{t.guardian}</h2>
                <p className="text-sm text-gray-500">{t.guardianDesc}</p>
                {user.avg_rating > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-yellow-500">{user.avg_rating.toFixed(1)}</span>
                  </div>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: COMMUNICATION LANGUAGE SELECTION */}
        {step === 'comm-lang' && (
          <motion.div 
            key="comm-lang"
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full"
          >
            <div className="text-center mb-10">
              <Languages className="w-10 h-10 text-zinc-500 mx-auto mb-4" strokeWidth={1.5} />
              <h2 className="text-2xl font-light mb-2">{t.commLangTitle}</h2>
              <p className="text-gray-400 text-sm">{t.commLangDesc}</p>
            </div>

            <div className="w-full space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {communicationLanguages.map((lang) => (
                <button 
                  key={lang.id}
                  onClick={() => setCommLang(lang.id)}
                  className={`w-full p-4 rounded-xl border transition-all flex justify-between items-center ${
                    commLang === lang.id 
                      ? 'bg-zinc-800 border-white text-white' 
                      : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:bg-zinc-800 hover:text-gray-200'
                  }`}
                >
                  <span className="font-medium">{lang.native}</span>
                  <span className="text-xs opacity-50">{lang.name}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={startRitual}
              className="w-full py-4 rounded-xl bg-white text-black font-medium transition-all hover:bg-gray-200"
            >
              {t.continue}
            </button>
          </motion.div>
        )}

        {/* STEP 3: THE RITUAL (MATCHING) */}
        {step === 'ritual' && (
          <motion.div 
            key="ritual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="relative flex items-center justify-center w-64 h-64 mb-12">
              <motion.div 
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.1, 0.3]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className={`absolute inset-0 rounded-full blur-3xl ${role === 'confessor' ? 'bg-purple-600' : 'bg-emerald-600'}`}
              />
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 text-center"
              >
                <p className="text-2xl font-light text-white/90 mb-2">{t.breathe}</p>
                <p className="text-sm text-gray-500">
                  {role === 'confessor' ? t.waitConfessor : t.waitGuardian}
                </p>
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="font-mono text-xl text-gray-300 bg-zinc-900/80 px-5 py-2.5 rounded-xl border border-zinc-800 shadow-lg">
                ⏱ {formatTime(waitingTime)}
              </div>
              <button 
                onClick={cancelQueue}
                className="text-sm text-red-400/80 hover:text-red-400 transition-colors px-8 py-2.5 rounded-full border border-red-900/30 hover:bg-red-900/20"
              >
                {t.cancel}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: CHAT SESSION */}
        {step === 'chat' && (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col max-w-2xl mx-auto w-full h-screen"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-zinc-900 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${role === 'confessor' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                <span className="text-sm font-medium text-gray-300">
                  {role === 'confessor' ? t.anonGuardian : t.anonConfessor}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={endSession}
                  className="text-xs font-medium text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1 bg-red-400/10 px-3 py-1.5 rounded-full"
                >
                  <Flame className="w-3 h-3" />
                  {t.endBurn}
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="text-center my-8">
                <p className="text-xs text-gray-600 bg-zinc-900/50 inline-block px-4 py-2 rounded-full">
                  {t.systemMsg}
                </p>
              </div>

              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.isSystem ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.isSystem ? (
                    <div className="text-xs text-gray-500 bg-zinc-900/50 px-4 py-2 rounded-full">
                      {msg.text}
                    </div>
                  ) : (
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                      msg.sender === 'me' 
                        ? 'bg-zinc-800 text-gray-100 rounded-br-sm' 
                        : 'bg-zinc-900 text-gray-300 rounded-bl-sm border border-zinc-800/50'
                    }`}
                    dir="auto"
                    >
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-gradient-to-t from-[#050505] to-transparent">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.placeholder}
                  dir="auto"
                  className={`w-full bg-zinc-900/80 border border-zinc-800 rounded-full py-4 text-sm text-gray-200 focus:outline-none focus:border-zinc-700 focus:bg-zinc-900 transition-all ${isRtl ? 'pr-12 pl-6' : 'pl-12 pr-6'}`}
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`absolute p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:hover:text-gray-400 transition-colors ${isRtl ? 'right-2' : 'left-2'}`}
                >
                  <Send className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* STEP 5: RATING & BURN */}
        {step === 'rating' && (
          <motion.div 
            key="rating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <Flame className="w-16 h-16 text-orange-500/80 mx-auto mb-6 animate-pulse" />
              <h2 className="text-2xl font-light mb-2">{t.burnedTitle}</h2>
              <p className="text-sm text-gray-500">{t.burnedDesc}</p>
            </motion.div>

            <div className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-6">
                {role === 'confessor' ? t.rateGuardian : t.rateConfessor}
              </h3>
              <div className={`flex justify-center gap-2 mb-8 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star 
                      className={`w-8 h-8 ${rating >= star ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-700'}`} 
                      strokeWidth={1}
                    />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={submitRatingAndReset}
                disabled={rating === 0}
                className="w-full py-3 rounded-full bg-white text-black font-medium disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-gray-200"
              >
                {t.submitRating}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
