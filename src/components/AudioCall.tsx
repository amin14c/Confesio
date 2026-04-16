import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, PhoneCall, PhoneForwarded, Volume2, Volume, Info, SignalHigh, SignalMedium, SignalLow, SignalZero, User } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError } from '../App';
import { motion, AnimatePresence } from 'motion/react';

enum OperationType {
  LIST = 'list',
}

interface AudioCallProps {
  roomId: string;
  userId: string;
  isRtl: boolean;
  t: any;
}

export const AudioCall: React.FC<AudioCallProps> = ({ roomId, userId, isRtl, t }) => {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle');
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [remoteLeft, setRemoteLeft] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor' | 'disconnected' | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    // Initialize ringtone
    ringtoneRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/phone_ringing.ogg');
    ringtoneRef.current.loop = true;
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (callState === 'calling' || callState === 'incoming') {
      ringtoneRef.current?.play().catch(e => console.log("Audio play prevented", e));
      if (callState === 'incoming' && document.visibilityState === 'hidden' && Notification.permission === 'granted') {
        new Notification(t.incomingCall || 'Incoming Call', {
          body: t.incomingCallBody || 'Someone is calling you.',
          icon: '/vite.svg'
        });
      }
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }
  }, [callState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let statsInterval: NodeJS.Timeout;

    if (callState === 'active') {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      
      statsInterval = setInterval(async () => {
        if (!peerConnectionRef.current) return;
        try {
          const stats = await peerConnectionRef.current.getStats();
          let rtt = 0;
          let foundCandidatePair = false;

          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              foundCandidatePair = true;
              rtt = report.currentRoundTripTime || 0;
            }
          });

          if (!foundCandidatePair) {
            setConnectionQuality('poor');
          } else if (rtt === 0) {
            setConnectionQuality('good');
          } else if (rtt < 0.15) {
            setConnectionQuality('good');
          } else if (rtt < 0.4) {
            setConnectionQuality('fair');
          } else {
            setConnectionQuality('poor');
          }
        } catch (e) {
          console.error("Error getting WebRTC stats", e);
        }
      }, 2000);
    } else {
      setCallDuration(0);
      setConnectionQuality(null);
    }
    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const signalsRef = collection(db, `rooms/${roomId}/signals`);
    const q = query(signalsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.senderId === userId) return;

          if (data.type === 'offer') {
            const offer = JSON.parse(data.data);
            setIncomingOffer(offer);
            setCallState('incoming');
          } else if (data.type === 'end') {
            setRemoteLeft(true);
            setTimeout(() => setRemoteLeft(false), 3000);
            endCall(false);
          } else {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            try {
              if (data.type === 'answer') {
                const answer = JSON.parse(data.data);
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                setCallState('active');
              } else if (data.type === 'candidate') {
                const candidate = JSON.parse(data.data);
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            } catch (error) {
              console.error('Error handling signal:', error);
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/signals`);
    });

    return () => {
      unsubscribe();
      endCall();
    };
  }, [roomId, userId]);

  const initializePeerConnection = async () => {
    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Browser does not support audio calls.');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      setErrorMsg(null);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setErrorMsg('Mic access denied. Please allow permissions.');
      return false;
    }

    remoteStreamRef.current = new MediaStream();
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        setConnectionQuality('disconnected');
      }
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current?.addTrack(track);
      });

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        
        const source = audioCtx.createMediaStreamSource(event.streams[0]);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setIsRemoteSpeaking(average > 15);
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        
        checkVolume();
      } catch (e) {
        console.error("Error setting up audio analyzer", e);
      }
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(collection(db, `rooms/${roomId}/signals`), {
          type: 'candidate',
          senderId: userId,
          data: JSON.stringify(event.candidate.toJSON()),
          timestamp: Date.now()
        });
      }
    };

    return true;
  };

  const startCall = async () => {
    setCallState('calling');
    const initialized = await initializePeerConnection();
    if (!initialized) {
      setCallState('idle');
      return;
    }

    const pc = peerConnectionRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await addDoc(collection(db, `rooms/${roomId}/signals`), {
      type: 'offer',
      senderId: userId,
      data: JSON.stringify(offer),
      timestamp: Date.now()
    });
  };

  const acceptCall = async () => {
    if (!incomingOffer) return;
    
    setCallState('calling');
    const initialized = await initializePeerConnection();
    if (!initialized) {
      setCallState('idle');
      return;
    }

    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await addDoc(collection(db, `rooms/${roomId}/signals`), {
        type: 'answer',
        senderId: userId,
        data: JSON.stringify(answer),
        timestamp: Date.now()
      });
      setCallState('active');
    } catch (error) {
      console.error('Error accepting call:', error);
      setCallState('idle');
    }
  };

  const endCall = async (sendSignal = true) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsRemoteSpeaking(false);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (sendSignal && callState !== 'idle') {
      try {
        await addDoc(collection(db, `rooms/${roomId}/signals`), {
          type: 'end',
          senderId: userId,
          timestamp: Date.now()
        });
        
        await addDoc(collection(db, `rooms/${roomId}/messages`), {
          text: t.callEnded || 'Audio call ended',
          senderId: 'system',
          role: 'system',
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error sending end signal:', error);
      }
    }
    
    setCallState('idle');
    setIncomingOffer(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {callState === 'idle' && (
        <button 
          onClick={startCall}
          className="text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg-primary)] transition-colors flex items-center gap-1.5 bg-[var(--color-accent)]/10 px-3 py-1.5 rounded-full"
        >
          <Phone className="w-3.5 h-3.5" />
          {t.startAudioCall || 'Start Call'}
        </button>
      )}

      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pb-12 pt-20"
          >
            {/* Header / Status */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-widest">
                {callState === 'calling' && (t.calling || 'Calling...')}
                {callState === 'incoming' && (t.incomingCall || 'Incoming Call')}
                {callState === 'active' && (t.ongoingCall || 'Ongoing Call')}
              </div>
              
              {/* Profile Avatar with Ripple Effect */}
              <div className="relative mt-8">
                {isRemoteSpeaking && (
                  <motion.div 
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
                  />
                )}
                <div className="relative z-10 w-32 h-32 rounded-full bg-[var(--color-bg-secondary)] border-4 border-[var(--color-bg-primary)] shadow-2xl flex items-center justify-center overflow-hidden">
                  <User className="w-16 h-16 text-[var(--color-text-secondary)]" />
                </div>
              </div>

              <div className="mt-6 text-3xl font-light">
                {callState === 'active' ? formatDuration(callDuration) : '...'}
              </div>

              {callState === 'active' && connectionQuality && (
                <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-text-secondary)]">
                  {connectionQuality === 'good' && <SignalHigh className="w-4 h-4 text-emerald-500" />}
                  {connectionQuality === 'fair' && <SignalMedium className="w-4 h-4 text-amber-500" />}
                  {connectionQuality === 'poor' && <SignalLow className="w-4 h-4 text-red-500" />}
                  {connectionQuality === 'disconnected' && <SignalZero className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                  <span className="capitalize">{connectionQuality} Connection</span>
                </div>
              )}

              {errorMsg && (
                <div className="mt-4 text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-lg max-w-[80%] text-center">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8 mb-12">
              {callState === 'incoming' ? (
                <>
                  <button 
                    onClick={() => endCall(true)}
                    className="w-16 h-16 rounded-full bg-red-500 text-[var(--color-bg-primary)] flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-105"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={acceptCall}
                    className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-[var(--color-bg-primary)] flex items-center justify-center shadow-lg hover:bg-[var(--color-accent-hover)] transition-transform hover:scale-105 animate-bounce"
                  >
                    <PhoneCall className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${isMuted ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'}`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={() => endCall(true)}
                    className="w-16 h-16 rounded-full bg-red-500 text-[var(--color-bg-primary)] flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-105"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
