import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MessageCircle, Send, Star, Flame, Globe2, Languages, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

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
    simulatedGuardianMsg: 'Hello.. are you there? I have something heavy I want to talk about.',
    simulatedConfessorMsg: 'I am listening. Take your time, this is a safe space.',
    startAudioCall: 'Start Audio Call',
    calling: 'Calling...',
    activeCall: 'Audio Call Active',
    endCall: 'End Call',
    callEnded: 'Audio call ended'
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
    simulatedGuardianMsg: 'Bonjour.. êtes-vous là ? J\'ai quelque chose de lourd dont je veux parler.',
    simulatedConfessorMsg: 'Je vous écoute. Prenez votre temps, c\'est un espace sûr.',
    startAudioCall: 'Démarrer l\'appel audio',
    calling: 'Appel en cours...',
    activeCall: 'Appel audio actif',
    endCall: 'Terminer l\'appel',
    callEnded: 'Appel audio terminé'
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
    simulatedGuardianMsg: 'مرحباً.. هل أنت هنا؟ لدي شيء ثقيل أود التحدث عنه.',
    simulatedConfessorMsg: 'أنا أسمعك. خذ وقتك، هذا المكان آمن.',
    startAudioCall: 'بدء مكالمة صوتية',
    calling: 'يتصل...',
    activeCall: 'مكالمة صوتية نشطة',
    endCall: 'إنهاء المكالمة',
    callEnded: 'انتهت المكالمة الصوتية'
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
  const [appLang, setAppLang] = useState<AppLanguage>('en');
  const [step, setStep] = useState<Step>('app-lang');
  const [role, setRole] = useState<Role>(null);
  const [commLang, setCommLang] = useState<string>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [rating, setRating] = useState(0);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'active'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[appLang];
  const isRtl = appLang === 'ar';

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'active') {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const initiateCall = () => {
    setCallState('calling');
    // Simulate other party accepting the call after 3 seconds
    setTimeout(() => {
      setCallState(prev => prev === 'calling' ? 'active' : prev);
    }, 3000);
  };

  const endCall = () => {
    setCallState('idle');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: `${t.callEnded} (${formatTime(callDuration)})`,
      sender: 'other',
      timestamp: new Date(),
      isSystem: true
    }]);
  };

  const handleAppLangSelect = (lang: AppLanguage) => {
    setAppLang(lang);
    setCommLang(lang); // Default comm lang to app lang
    setStep('role-select');
  };

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep('comm-lang');
  };

  const startRitual = () => {
    setStep('ritual');
    
    // Simulate the ritual / matching phase
    setTimeout(() => {
      setStep('chat');
      if (role === 'guardian') {
        setTimeout(() => {
          // Select simulated message based on chosen communication language if possible, fallback to app language
          const simMsg = commLang === 'ar' ? translations.ar.simulatedGuardianMsg 
                       : commLang === 'fr' ? translations.fr.simulatedGuardianMsg 
                       : translations.en.simulatedGuardianMsg;
          
          setMessages([{
            id: '1',
            text: simMsg,
            sender: 'other',
            timestamp: new Date()
          }]);
        }, 1500);
      }
    }, 4000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'me',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate response if user is confessor
    if (role === 'confessor' && messages.length === 0) {
      setTimeout(() => {
        const simMsg = commLang === 'ar' ? translations.ar.simulatedConfessorMsg 
                     : commLang === 'fr' ? translations.fr.simulatedConfessorMsg 
                     : translations.en.simulatedConfessorMsg;

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: simMsg,
          sender: 'other',
          timestamp: new Date()
        }]);
      }, 2000);
    }
  };

  const endSession = () => {
    setStep('rating');
  };

  const resetApp = () => {
    setStep('role-select');
    setRole(null);
    setMessages([]);
    setRating(0);
    setCallState('idle');
    setCallDuration(0);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050505] text-gray-100 flex flex-col font-sans selection:bg-purple-900 selection:text-white">
      <AnimatePresence mode="wait">
        
        {/* STEP 0: APP LANGUAGE SELECTION */}
        {step === 'app-lang' && (
          <motion.div 
            key="app-lang"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full"
          >
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
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full"
          >
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
            <div className="relative flex items-center justify-center w-64 h-64">
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
                {callState === 'idle' && (
                  <button 
                    onClick={initiateCall}
                    title={t.startAudioCall}
                    className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={endSession}
                  className="text-xs font-medium text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1 bg-red-400/10 px-3 py-1.5 rounded-full"
                >
                  <Flame className="w-3 h-3" />
                  {t.endBurn}
                </button>
              </div>
            </header>

            {/* Call Banner */}
            <AnimatePresence>
              {callState !== 'idle' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`overflow-hidden border-b border-zinc-900 ${role === 'confessor' ? 'bg-purple-900/10' : 'bg-emerald-900/10'}`}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${role === 'confessor' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                        <div className={`p-3 rounded-full ${role === 'confessor' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          <Mic className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {callState === 'calling' ? t.calling : t.activeCall}
                        </p>
                        {callState === 'active' && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{formatTime(callDuration)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {callState === 'active' && (
                        <button 
                          onClick={() => setIsMuted(!isMuted)}
                          className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'}`}
                        >
                          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      )}
                      <button 
                        onClick={endCall}
                        className="p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <PhoneOff className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                onClick={resetApp}
                disabled={rating === 0}
                className="w-full py-3 rounded-full bg-white text-black font-medium disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-gray-200"
              >
                {t.returnStart}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
