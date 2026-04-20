import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MessageCircle, Send, Star, Flame, Globe2, Languages, Phone, PhoneOff, Mic, MicOff, UserCircle, Flag, AlertTriangle, Smile, Check, CheckCheck, Reply, Edit2, Trash2, X } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { AccountDashboard } from './components/AccountDashboard';
import { AudioCall } from './components/AudioCall';
import { AdminDashboard } from './components/AdminDashboard';
import { FloatingCandles } from './components/FloatingCandles';
import { db, auth, messaging } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, addDoc, orderBy, updateDoc, limit } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type AppLanguage = 'en' | 'fr' | 'ar';
type Step = 'app-lang' | 'role-select' | 'comm-lang' | 'ritual' | 'chat' | 'rating' | 'reward';
type Role = 'confessor' | 'guardian' | null;

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  role?: Role;
  timestamp: Date;
  isSystem?: boolean;
  reaction?: string;
  replyToId?: string;
  replyToText?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  status?: 'sent' | 'read';
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
    acceptCall: 'Accept Call',
    calling: 'Calling...',
    activeCall: 'Audio Call Active',
    endCall: 'End Call',
    callEnded: 'Audio call ended',
    partnerLeft: 'Partner has disconnected or left the session',
    cancel: 'Cancel',
    queueTimeout: 'Wait time exceeded. Please try again.',
    crisisAlert: '⚠️ Your partner seems to be in a crisis — please be fully present and listen carefully.',
    supportResources: 'If you need immediate help, please reach out to: Algeria 3548, International befrienders.org',
    submitRating: 'Submit Rating & Return',
    rewardTitle: 'Points Earned!',
    rewardDesc: 'Thank you for being a compassionate guardian. You earned',
    points: 'points',
    report: 'Report',
    reportConfirm: 'Are you sure you want to report this user for abusive behavior?',
    reportSubmitted: 'Report submitted successfully. Our automated systems will review this session.',
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
    acceptCall: 'Accepter l\'appel',
    calling: 'Appel en cours...',
    activeCall: 'Appel audio actif',
    endCall: 'Terminer l\'appel',
    callEnded: 'Appel audio terminé',
    partnerLeft: 'Le partenaire s\'est déconnecté ou a quitté la session',
    cancel: 'Annuler',
    queueTimeout: 'Temps d\'attente dépassé. Veuillez réessayer.',
    crisisAlert: '⚠️ Votre partenaire semble traverser une crise — soyez pleinement présent et écoutez attentivement.',
    supportResources: 'Si vous avez besoin d\'aide immédiate, contactez : Algérie 3548, International befrienders.org',
    submitRating: 'Soumettre la note et retourner',
    rewardTitle: 'Points Gagnés !',
    rewardDesc: 'Merci d\'être un gardien compatissant. Vous avez gagné',
    points: 'points',
    report: 'Signaler',
    reportConfirm: 'Êtes-vous sûr de vouloir signaler cet utilisateur pour comportement abusif ?',
    reportSubmitted: 'Signalement envoyé. Nos systèmes automatisés examineront cette session.',
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
    acceptCall: 'قبول المكالمة',
    calling: 'يتصل...',
    activeCall: 'مكالمة صوتية نشطة',
    endCall: 'إنهاء المكالمة',
    callEnded: 'انتهت المكالمة الصوتية',
    partnerLeft: 'الطرف الآخر انقطع اتصاله أو غادر الجلسة',
    cancel: 'إلغاء',
    queueTimeout: 'انتهى وقت الانتظار. يرجى المحاولة مرة أخرى.',
    crisisAlert: '⚠️ يبدو أن شريكك يمر بأزمة — كن حاضراً بشكل كامل واستمع بعناية.',
    supportResources: 'إذا كنت بحاجة لمساعدة فورية، يرجى التواصل مع: الجزائر 3548، دولي befrienders.org',
    submitRating: 'إرسال التقييم والعودة',
    rewardTitle: 'لقد كسبت نقاطاً!',
    rewardDesc: 'شكراً لكونك حارساً متعاطفاً. لقد كسبت',
    points: 'نقطة',
    report: 'إبلاغ',
    reportConfirm: 'هل أنت متأكد من الإبلاغ عن هذا المستخدم بسبب سلوك مسيء؟',
    reportSubmitted: 'تم إرسال البلاغ. ستقوم أنظمتنا الآلية بمراجعة هذه الجلسة.',
  }
};

const communicationLanguages = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'fr', name: 'French', native: 'Français' },
  { id: 'ar', name: 'Arabic', native: 'العربية' },
  { id: 'es', name: 'Spanish', native: 'Español' },
  { id: 'de', name: 'German', native: 'Deutsch' },
];

let audioCtx: AudioContext | null = null;

const initAudio = () => {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {
    console.error("Audio init failed", e);
  }
};

const playNotificationSound = () => {
  const audio = new Audio('https://actions.google.com/sounds/v1/water/glass_water_pour.ogg');
  audio.volume = 0.5;
  audio.play().catch(e => {
    // Autoplay policy prevented the sound. Normally happens if user hasn't interacted with the page yet.
    console.log("Audio notification prevented by browser policy", e);
  });
};

export default function App() {
  const { user, loading, isBanned } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [appLang, setAppLang] = useState<AppLanguage>('en');
  const [theme, setTheme] = useState<'dark' | 'light' | 'midnight' | 'forest'>('dark');
  const [step, setStep] = useState<Step>('app-lang');
  const [role, setRole] = useState<Role>(null);
  const [commLang, setCommLang] = useState<string>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [rating, setRating] = useState(0);
  const [waitingTime, setWaitingTime] = useState(0);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const emojis = ['❤️', '👍', '😢', '🙏', '✨'];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);

  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  const [roomCreatedAt, setRoomCreatedAt] = useState<number | null>(null);

  const t = translations[appLang];
  const isRtl = appLang === 'ar';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkAdminStatus = () => {
      // Check the underlying Firebase Auth user to see if it's the exact admin email
      if (auth.currentUser && auth.currentUser.email === 'amin14c@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              // Using default vapidKey or omitting it.
            });
            if (token) {
              console.log('FCM Token:', token);
              await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
            }
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      };
      requestPermission();

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        if (document.visibilityState === 'hidden') {
          new Notification(payload.notification?.title || 'New Notification', {
            body: payload.notification?.body,
            icon: '/vite.svg'
          });
        }
      });

      return () => unsubscribe();
    } else if (user && 'Notification' in window) {
      // Fallback for local notifications if FCM is not fully supported
      Notification.requestPermission();
    }
  }, [user]);

  useEffect(() => {
    if (user && localStorage.getItem('quick_confess') === 'true') {
        localStorage.removeItem('quick_confess');
        setAppLang('ar');
        setCommLang('ar');
        setRole('confessor');
        setStep('ritual');
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'ritual') {
      setWaitingTime(0);
      interval = setInterval(() => setWaitingTime(w => w + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeReactionMsgId) {
        setActiveReactionMsgId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeReactionMsgId]);

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
          // Wait for backend acknowledgment to prevent permission-denied race conditions
          // on subcollections (messages, signals) that rely on the room document existing on the server.
          if (roomDoc.metadata.hasPendingWrites) return; 
          
          setRoomId(roomDoc.id);
          setRoomCreatedAt(roomDoc.data().createdAt);
          setStep('chat');
          // Clean up my queue entry
          deleteDoc(doc(db, 'queues', newQueueId)).catch(() => {});
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rooms');
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
            const now = Date.now();
            await setDoc(newRoomRef, {
              confessorId: user.uid,
              guardianId: guardianId,
              lang: commLang,
              status: 'active',
              createdAt: now,
              typing: {}
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

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (step === 'chat' && roomId) {
        // Use navigator.sendBeacon or a simple fetch to update the room status
        // Since we can't easily use Firestore SDK in beforeunload reliably,
        // we'll try to do a fast updateDoc.
        updateDoc(doc(db, 'rooms', roomId), { status: 'ended' }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step, roomId]);

  // Chat Logic
  useEffect(() => {
    if (step !== 'chat' || !roomId || !user) return;

    let isInitialLoad = true;

    const messagesQuery = query(
      collection(db, `rooms/${roomId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      let hasNewOtherMessage = false;
      const unreadIds: string[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (!isInitialLoad && data.senderId !== user.uid && data.senderId !== 'system') {
            hasNewOtherMessage = true;
          }
        }
      });

      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const sender = data.senderId === 'system' ? 'other' : (data.senderId === user.uid ? 'me' : 'other');
        
        if (sender === 'other' && !data.isSystem && data.status !== 'read') {
          unreadIds.push(doc.id);
        }

        newMessages.push({
          id: doc.id,
          text: data.text,
          sender: sender as 'me' | 'other',
          role: data.role,
          timestamp: new Date(data.timestamp),
          isSystem: data.senderId === 'system',
          reaction: data.reaction,
          replyToId: data.replyToId,
          replyToText: data.replyToText,
          isDeleted: data.isDeleted,
          isEdited: data.isEdited,
          status: data.status || 'sent'
        });
      });
      setMessages(newMessages);

      if (unreadIds.length > 0) {
        unreadIds.forEach(id => {
          updateDoc(doc(db, `rooms/${roomId}/messages`, id), { status: 'read' }).catch(() => {});
        });
      }

      if (hasNewOtherMessage) {
        playNotificationSound();
        if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
          new Notification(t.newMsg || 'New Message', {
            body: t.newMsgBody || 'You have received a new message.',
            icon: '/vite.svg'
          });
        }
      }

      isInitialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/messages`);
    });

    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'ended') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: t.partnerLeft,
            sender: 'other',
            timestamp: new Date(),
            isSystem: true
          }]);
          setTimeout(() => setStep('rating'), 3000);
        }
        
        const otherUserId = user.uid === data.confessorId ? data.guardianId : data.confessorId;
        if (data.typing && data.typing[otherUserId]) {
          setIsOtherTyping(true);
        } else {
          setIsOtherTyping(false);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
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
    initAudio();
    setRole(selectedRole);
    setStep('comm-lang');
  };

  const startRitual = () => {
    initAudio();
    setStep('ritual');
  };

  const cancelQueue = async () => {
    if (queueId) {
      await deleteDoc(doc(db, 'queues', queueId)).catch(() => {});
      setQueueId(null);
    }
    setStep('role-select');
  };

  const toggleRecording = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(isRtl ? 'الإملاء الصوتي غير مدعوم في متصفحك' : 'Speech recognition is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = commLang === 'ar' ? 'ar-SA' : commLang === 'fr' ? 'fr-FR' : commLang === 'es' ? 'es-ES' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    // Capture the text that was there before recording started
    let initialText = inputText;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        initialText = (initialText + ' ' + finalTranscript).trim();
      }

      const currentText = (initialText + ' ' + interimTranscript).trim();
      setInputText(currentText);

      // Trigger typing indicator while speaking
      if (!typingTimeoutRef.current && roomId && user) {
        setDoc(doc(db, 'rooms', roomId), {
          typing: { [user.uid]: true }
        }, { merge: true }).catch(console.error);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error("Speech recognition error:", event.error);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (roomId && user) {
        setDoc(doc(db, 'rooms', roomId), {
          typing: { [user.uid]: false }
        }, { merge: true }).catch(console.error);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Could not start speech recognition:", e);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!roomId || !user) return;
    
    if (!typingTimeoutRef.current) {
      setDoc(doc(db, 'rooms', roomId), {
        typing: { [user.uid]: true }
      }, { merge: true }).catch(console.error);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      setDoc(doc(db, 'rooms', roomId), {
        typing: { [user.uid]: false }
      }, { merge: true }).catch(console.error);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || !user) return;

    const text = inputText;
    setInputText('');
    
    setDoc(doc(db, 'rooms', roomId), { 
      typing: { [user.uid]: false } 
    }, { merge: true }).catch(console.error);

    if (editingMessage) {
      if (Date.now() - editingMessage.timestamp.getTime() > 5 * 60 * 1000) {
        alert(isRtl ? 'انتهى وقت التعديل المسموح به (5 دقائق)' : 'Edit time limit exceeded (5 minutes)');
        setEditingMessage(null);
        setInputText('');
        return;
      }
      await updateDoc(doc(db, `rooms/${roomId}/messages`, editingMessage.id), {
        text,
        isEdited: true
      });
      setEditingMessage(null);
      return;
    }

    await addDoc(collection(db, `rooms/${roomId}/messages`), {
      text,
      senderId: user.uid,
      role: role,
      timestamp: Date.now(),
      reaction: null,
      replyToId: replyingTo?.id || null,
      replyToText: replyingTo?.text || null,
      isDeleted: false,
      isEdited: false,
      status: 'sent'
    });
    setReplyingTo(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!roomId) return;
    await updateDoc(doc(db, `rooms/${roomId}/messages`, messageId), {
      isDeleted: true,
      text: isRtl ? 'تم حذف هذه الرسالة' : 'This message was deleted'
    });
  };

  const handleReact = async (message: Message, emoji: string) => {
    if (!roomId) return;
    setActiveReactionMsgId(null);
    await updateDoc(doc(db, `rooms/${roomId}/messages`, message.id), {
      reaction: message.reaction === emoji ? null : emoji
    });
  };

  const endSession = async () => {
    if (roomId) {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'ended' });
    }
    setStep('rating');
  };

  const submitReport = async () => {
    if (!roomId || !user) return;
    
    await addDoc(collection(db, 'reports'), {
      roomId,
      reportedBy: user.uid,
      reportedRole: role === 'confessor' ? 'guardian' : 'confessor',
      timestamp: Date.now(),
      status: 'pending'
    });
    
    setShowReportModal(false);
    alert(t.reportSubmitted);
    endSession();
  };

  const submitRatingAndReset = async () => {
    let points = 0;
    if (rating > 0 && user) {
      const isGuardian = role === 'guardian';
      
      if (isGuardian) {
        // Gamification Rules:
        // 1. X points per 10 minutes (X = 5)
        // 2. Y points bonus for 4-5 stars (Y = 10)
        // 3. Daily Cap = 50 points
        
        const durationMinutes = Math.floor((Date.now() - (roomCreatedAt || Date.now())) / 60000);
        // Base points: 5 points per 10 minutes (minimum 2 points for joining)
        const durationPoints = 2 + Math.floor(durationMinutes / 10) * 5;
        const ratingBonus = rating >= 4 ? 10 : 0;
        let calculatedPoints = durationPoints + ratingBonus;

        let newDailyPoints = user.dailyPoints || 0;
        const today = new Date().toISOString().split('T')[0];
        
        if (user.lastPointDate !== today) {
          newDailyPoints = 0;
        }

        const DAILY_CAP = 50;
        if (newDailyPoints + calculatedPoints > DAILY_CAP) {
          calculatedPoints = Math.max(0, DAILY_CAP - newDailyPoints);
        }

        points = calculatedPoints;
        newDailyPoints += points;
        const totalCredits = (user.credits || 0) + points;

        // Badges update
        let earnedBadges = user.badges ? [...user.badges] : ['Listener Basic'];
        if (totalCredits >= 500 && !earnedBadges.includes('Trusted Guardian')) {
          earnedBadges.push('Trusted Guardian');
        } else if (totalCredits >= 100 && !earnedBadges.includes('Empath Listener')) {
          earnedBadges.push('Empath Listener');
        }

        await updateDoc(doc(db, 'users', user.uid), {
          completed_sessions: user.completed_sessions + 1,
          guardian_sessions: user.guardian_sessions + 1,
          credits: totalCredits,
          dailyPoints: newDailyPoints,
          lastPointDate: today,
          badges: earnedBadges
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          completed_sessions: user.completed_sessions + 1,
          confessions: user.confessions + 1
        });
      }
    }
    
    if (points > 0) {
      setEarnedPoints(points);
      setStep('reward');
    } else {
      resetToStart();
    }
  };

  const resetToStart = () => {
    setStep('role-select');
    setRole(null);
    setMessages([]);
    setRating(0);
    setRoomId(null);
    setRoomCreatedAt(null);
    setEarnedPoints(0);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (isBanned && user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col items-center justify-center p-6 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <Shield className="w-16 h-16 text-red-500 mb-6 mx-auto" />
        <h1 className="text-3xl font-bold text-white mb-4">
          {isRtl ? 'تم حظر حسابك' : 'Account Banned'}
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          {isRtl 
            ? 'لقد تم حظرك بشكل دائم بسبب انتهاك شروط وسياسات التطبيق.' 
            : 'You have been permanently banned for violating the terms of service.'}
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={`min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col font-sans selection:bg-[var(--color-accent)] selection:text-white relative transition-colors duration-500`}>
      <FloatingCandles />
      {showDashboard && <AccountDashboard onClose={() => setShowDashboard(false)} appLang={appLang} setAppLang={setAppLang} />}
      {showAdminDashboard && <AdminDashboard />}
      
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
            <div className="absolute top-6 right-6 flex items-center gap-4">
              <select 
                aria-label="Select Theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-bg-primary)] rounded-lg px-3 py-1.5 text-sm outline-none"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="midnight">Midnight</option>
                <option value="forest">Forest</option>
              </select>
              {isAdmin && user && (
                <button aria-label="Open Admin Dashboard" onClick={() => setShowAdminDashboard(true)} className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors" title="Admin Dashboard">
                  <Shield className="w-6 h-6" />
                </button>
              )}
              <button aria-label="Open User Dashboard" onClick={() => setShowDashboard(true)} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
                <UserCircle className="w-8 h-8" />
              </button>
            </div>
            <Globe2 className="w-12 h-12 text-[var(--color-text-secondary)] mb-8" strokeWidth={1} />
            <h1 className="text-2xl font-light mb-8 text-[var(--color-text-primary)]">Confessio</h1>
            
            <div className="w-full space-y-4">
              <button 
                onClick={() => {
                  setAppLang('ar');
                  setCommLang('ar');
                  setRole('confessor');
                  setStep('ritual');
                }} 
                className="w-full relative group overflow-hidden p-4 rounded-xl bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex justify-center items-center gap-2 text-emerald-500 mb-6"
              >
                <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium text-lg relative z-10 font-sans">التسجيل السريع كمعترف</span>
              </button>

              <button onClick={() => handleAppLangSelect('en')} className="w-full p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] hover:opacity-80 transition-opacity flex justify-between items-center">
                <span className="font-medium">English</span>
              </button>
              <button onClick={() => handleAppLangSelect('fr')} className="w-full p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] hover:opacity-80 transition-opacity flex justify-between items-center">
                <span className="font-medium">Français</span>
              </button>
              <button onClick={() => handleAppLangSelect('ar')} className="w-full p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] hover:opacity-80 transition-opacity flex justify-between items-center">
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
              <button aria-label="Open User Dashboard" onClick={() => setShowDashboard(true)} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
                <UserCircle className="w-8 h-8" />
              </button>
            </div>
            <div className="text-center mb-16">
              <h1 className="text-4xl font-light tracking-widest mb-4 text-[var(--color-text-primary)]">Confessio</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">{t.subtitle}</p>
            </div>

            <div className="w-full space-y-6">
              <button 
                onClick={() => handleRoleSelect('confessor')}
                className="w-full group relative overflow-hidden rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] p-8 transition-all hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-secondary)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <MessageCircle className="w-8 h-8 text-[var(--color-accent)] mb-4 mx-auto" strokeWidth={1.5} />
                <h2 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">{t.confessor}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{t.confessorDesc}</p>
              </button>

              <button 
                onClick={() => handleRoleSelect('guardian')}
                className="w-full group relative overflow-hidden rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] p-8 transition-all hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-secondary)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Shield className="w-8 h-8 text-[var(--color-accent)] mb-4 mx-auto" strokeWidth={1.5} />
                <h2 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">{t.guardian}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{t.guardianDesc}</p>
                {user.avg_rating > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-bg-primary)] flex items-center justify-center gap-2">
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
              <Languages className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto mb-4" strokeWidth={1.5} />
              <h2 className="text-2xl font-light mb-2 text-[var(--color-text-primary)]">{t.commLangTitle}</h2>
              <p className="text-[var(--color-text-secondary)] text-sm">{t.commLangDesc}</p>
            </div>

            <div className="w-full space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {communicationLanguages.map((lang) => (
                <button 
                  key={lang.id}
                  onClick={() => setCommLang(lang.id)}
                  className={`w-full p-4 rounded-xl border transition-all flex justify-between items-center ${
                    commLang === lang.id 
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' 
                      : 'bg-[var(--color-bg-secondary)] border-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:opacity-80'
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
                className={`absolute inset-0 rounded-full blur-3xl bg-[var(--color-accent)]`}
              />
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 text-center"
              >
                <p className="text-2xl font-light text-[var(--color-text-primary)] mb-2">{t.breathe}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {role === 'confessor' ? t.waitConfessor : t.waitGuardian}
                </p>
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="font-mono text-xl text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] px-5 py-2.5 rounded-xl border border-[var(--color-bg-primary)] shadow-lg">
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
            <header className="flex items-center justify-between p-4 border-b border-[var(--color-bg-primary)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-md sticky top-0 z-10 transition-colors duration-500">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full animate-pulse bg-[var(--color-accent)]`} />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {role === 'confessor' ? t.anonGuardian : t.anonConfessor}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-red-400 transition-colors flex items-center gap-1 bg-[var(--color-bg-primary)] px-3 py-1.5 rounded-full"
                >
                  <Flag className="w-3 h-3" />
                  {t.report}
                </button>
                <AudioCall roomId={roomId} userId={user.uid} isRtl={isRtl} t={t} />
                <button 
                  onClick={endSession}
                  className="text-xs font-medium text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1 bg-red-400/10 px-3 py-1.5 rounded-full"
                >
                  <Flame className="w-3 h-3" />
                  {t.endBurn}
                </button>
              </div>
            </header>

            {/* Report Modal */}
            {showReportModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">{t.report}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-6">{t.reportConfirm}</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] hover:opacity-80 transition-colors"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      onClick={submitReport}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      {t.confirm}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="text-center my-8">
                <p className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] border border-[var(--color-bg-primary)] inline-block px-4 py-2 rounded-full">
                  {t.systemMsg}
                </p>
              </div>

              {messages.map((msg, index) => {
                const isGrouped = index > 0 && messages[index - 1].sender === msg.sender && !messages[index - 1].isSystem && !msg.isSystem;
                
                return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.isSystem ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}
                >
                  {msg.isSystem ? (
                    <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] border border-[var(--color-bg-primary)] px-4 py-2 rounded-full">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="relative group flex flex-col gap-1 max-w-[85%] md:max-w-[75%]">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.innerWidth < 768) {
                            setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                          }
                        }}
                        className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm flex flex-col gap-1 ${
                        msg.sender === 'me' 
                          ? 'bg-[var(--color-chat-me)] text-[var(--color-text-primary)]'
                          : 'bg-[var(--color-chat-other)] text-[var(--color-text-primary)]'
                      } ${
                        msg.sender === 'me' 
                          ? (isGrouped ? 'rounded-2xl rounded-tr-sm rounded-br-sm' : 'rounded-2xl rounded-br-sm') 
                          : (isGrouped ? 'rounded-2xl rounded-tl-sm rounded-bl-sm' : 'rounded-2xl rounded-bl-sm')
                      } cursor-pointer md:cursor-default`}
                      dir="auto"
                      >
                        {msg.replyToText && !msg.isDeleted && (
                          <div className={`text-xs p-2 rounded-lg mb-1 border-l-2 ${
                            msg.sender === 'me' 
                              ? 'bg-black/20 border-[var(--color-text-primary)]/50 text-[var(--color-text-primary)]/80' 
                              : 'bg-[var(--color-bg-primary)] border-[var(--color-accent)] text-[var(--color-text-secondary)]'
                          }`}>
                            {msg.replyToText}
                          </div>
                        )}
                        
                        <span className={msg.isDeleted ? 'italic opacity-60' : ''}>
                          {msg.isDeleted ? '🚫 ' + msg.text : msg.text}
                        </span>
                        
                        <div className={`flex items-center gap-1 text-[10px] self-end ${msg.sender === 'me' ? 'text-[var(--color-text-primary)]/70' : 'text-[var(--color-text-secondary)]'}`} dir="ltr">
                          {msg.isEdited && <span>(edited)</span>}
                          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.sender === 'me' && !msg.isDeleted && (
                            msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-blue-300" /> : <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                      
                      {/* Reaction Display */}
                      {msg.reaction && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReact(msg, msg.reaction!);
                          }}
                          className={`absolute -bottom-3 ${msg.sender === 'me' ? 'left-2' : 'right-2'} bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] hover:opacity-80 rounded-full px-1.5 py-0.5 text-sm shadow-md z-10 transition-colors cursor-pointer`}
                        >
                          {msg.reaction}
                        </button>
                      )}

                      {/* Action Buttons */}
                      {!msg.isDeleted && (
                        <div className={`absolute top-1/2 -translate-y-1/2 transition-all duration-200 flex items-center gap-1 bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border border-[var(--color-bg-primary)] rounded-full shadow-sm p-1 z-10 
                        ${msg.sender === 'me' ? '-left-28' : '-right-28'} 
                        ${activeReactionMsgId === msg.id ? 'opacity-100 flex pointer-events-auto' : 'opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 pointer-events-none md:pointer-events-auto group-hover:pointer-events-auto focus-within:pointer-events-auto'} 
                        `}>
                          <button aria-label="Reply to message" onClick={() => setReplyingTo(msg)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-bg-primary)] transition-colors"><Reply className="w-3.5 h-3.5" /></button>
                          {msg.sender === 'me' && (
                            <>
                              {Date.now() - msg.timestamp.getTime() <= 5 * 60 * 1000 && (
                                <button aria-label="Edit message" onClick={() => { setEditingMessage(msg); setInputText(msg.text); }} className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-bg-primary)] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              )}
                              <button aria-label="Delete message" onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-400 rounded-full hover:bg-[var(--color-bg-primary)] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                          <button 
                            aria-label="React to message"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                            }} 
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                            }}
                            className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-bg-primary)] transition-colors"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>

                          {/* Emoji Picker */}
                          <AnimatePresence>
                            {activeReactionMsgId === msg.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                onClick={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                className="absolute -top-14 right-0 flex gap-1 bg-[var(--color-bg-secondary)]/95 backdrop-blur-md border border-[var(--color-bg-primary)] p-1.5 rounded-full shadow-xl z-20"
                              >
                                {emojis.map(emoji => (
                                  <button
                                    key={emoji}
                                    aria-label={`React with ${emoji}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReact(msg, emoji);
                                    }}
                                    onTouchEnd={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleReact(msg, emoji);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-bg-primary)] rounded-full transition-all text-lg hover:scale-110 cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
                );
              })}
              
              {isOtherTyping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start mt-4">
                  <div className="bg-[var(--color-bg-primary)] border border-[var(--color-bg-primary)] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-bg-primary)] flex flex-col gap-2">
              {(replyingTo || editingMessage) && (
                <div className="flex items-center justify-between bg-[var(--color-bg-primary)] border border-[var(--color-bg-primary)] rounded-xl px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 text-[var(--color-text-secondary)] truncate">
                    {replyingTo ? <Reply className="w-4 h-4 text-[var(--color-accent)]" /> : <Edit2 className="w-4 h-4 text-blue-400" />}
                    <div className="flex flex-col truncate">
                      <span className="text-xs text-[var(--color-accent)] font-medium">{replyingTo ? 'Replying to' : 'Editing message'}</span>
                      <span className="truncate max-w-[200px] text-[var(--color-text-secondary)]">{replyingTo ? replyingTo.text : editingMessage?.text}</span>
                    </div>
                  </div>
                  <button aria-label="Cancel reply or edit" onClick={() => { setReplyingTo(null); setEditingMessage(null); setInputText(''); }} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text"
                  aria-label="Message input"
                  value={inputText}
                  onChange={handleTyping}
                  placeholder={t.placeholder}
                  dir="auto"
                  className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-bg-primary)] rounded-full py-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all px-12"
                />
                <button 
                  type="submit"
                  aria-label="Send message"
                  disabled={!inputText.trim()}
                  className={`absolute p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-50 disabled:hover:text-[var(--color-text-secondary)] transition-colors ${isRtl ? 'right-2' : 'left-2'}`}
                >
                  <Send className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
                <button
                  type="button"
                  aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                  onClick={toggleRecording}
                  className={`absolute p-2 transition-colors ${isRtl ? 'left-2' : 'right-2'} ${isRecording ? 'text-red-500 bg-red-500/10 rounded-full animate-pulse' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] rounded-full hover:bg-[var(--color-bg-primary)]'}`}
                >
                  <Mic className="w-5 h-5" />
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
              <h2 className="text-2xl font-light mb-2 text-[var(--color-text-primary)]">{t.burnedTitle}</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">{t.burnedDesc}</p>
            </motion.div>

            <div className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-6 text-[var(--color-text-primary)]">
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
                      className={`w-8 h-8 ${rating >= star ? 'fill-yellow-500 text-yellow-500' : 'text-[var(--color-bg-primary)]'}`} 
                      strokeWidth={1}
                    />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={submitRatingAndReset}
                disabled={rating === 0}
                className="w-full py-3 rounded-full bg-[var(--color-accent)] text-white font-medium disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-[var(--color-accent-hover)]"
              >
                {t.submitRating}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 6: REWARD */}
        {step === 'reward' && (
          <motion.div 
            key="reward"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center"
          >
            <div className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-bg-primary)] rounded-3xl p-10 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent pointer-events-none" />
              <Shield className="w-20 h-20 text-[var(--color-accent)] mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">{t.rewardTitle}</h2>
              <p className="text-[var(--color-text-secondary)] mb-6 text-lg">{t.rewardDesc}</p>
              <div className="text-5xl font-black text-[var(--color-accent)] mb-10 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                +{earnedPoints} <span className="text-2xl text-[var(--color-accent)]/80">{t.points}</span>
              </div>
              
              <button 
                onClick={resetToStart}
                className="w-full py-4 rounded-full bg-[var(--color-accent)] text-white font-bold text-lg transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
              >
                {t.continue}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showAdminDashboard && isAdmin && user && (
          <AdminDashboard onClose={() => setShowAdminDashboard(false)} adminUid={user.uid} />
        )}
      </AnimatePresence>
    </div>
  );
}
