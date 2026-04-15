import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, PhoneCall, PhoneForwarded, Volume2, Volume, Info, SignalHigh, SignalMedium, SignalLow, SignalZero } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError } from '../App';

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
            // Still connecting or no active pair
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
          if (data.senderId === userId) return; // Ignore our own signals

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
      setErrorMsg('Mic access denied. Please allow permissions or open app in a new tab.');
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

      // Setup audio analyzer for speaking indicator
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
          setIsRemoteSpeaking(average > 15); // threshold
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
    <div className="flex items-center gap-2">
      <audio ref={remoteAudioRef} autoPlay />
      
      {errorMsg && (
        <div className="text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded-md max-w-[150px] leading-tight">
          {errorMsg}
        </div>
      )}

      {remoteLeft && (
        <div className="text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1.5 rounded-full leading-tight flex items-center gap-1.5 animate-pulse">
          <Info className="w-3 h-3" />
          {t.partnerLeft || 'Partner left the call'}
        </div>
      )}

      {callState === 'idle' && (
        <button 
          onClick={startCall}
          className="text-xs font-medium text-emerald-400/80 hover:text-emerald-400 transition-colors flex items-center gap-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-full"
        >
          <Phone className="w-3.5 h-3.5" />
          {t.startAudioCall || 'Start Call'}
        </button>
      )}

      {callState === 'incoming' && (
        <button 
          onClick={acceptCall}
          className="text-xs font-medium text-white flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all animate-bounce"
        >
          <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
          {t.acceptCall || 'Accept Call'}
        </button>
      )}

      {callState === 'calling' && (
        <div className="text-xs font-medium text-amber-400 flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-full">
          <PhoneForwarded className="w-3.5 h-3.5 animate-pulse" />
          {t.calling || 'Calling...'}
        </div>
      )}

      {callState === 'active' && (
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700/50 rounded-full p-1 pl-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mr-1" aria-label={isRemoteSpeaking ? "Remote participant is speaking" : "Remote participant is silent"}>
            {isRemoteSpeaking ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <Volume className="w-3.5 h-3.5 text-gray-500" />
            )}
            <span className="text-xs font-mono text-gray-300 w-8 text-center" aria-label={`Call duration: ${formatDuration(callDuration)}`}>
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Connection Quality Indicator */}
          <div className="flex items-center justify-center w-5 mr-1" title={`Connection Quality: ${connectionQuality || 'calculating'}`}>
            {connectionQuality === 'good' && <SignalHigh className="w-3.5 h-3.5 text-emerald-400" />}
            {connectionQuality === 'fair' && <SignalMedium className="w-3.5 h-3.5 text-amber-400" />}
            {connectionQuality === 'poor' && <SignalLow className="w-3.5 h-3.5 text-red-400" />}
            {connectionQuality === 'disconnected' && <SignalZero className="w-3.5 h-3.5 text-gray-500" />}
            {!connectionQuality && <SignalMedium className="w-3.5 h-3.5 text-gray-500 animate-pulse" />}
          </div>

          <button 
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700 border border-transparent'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          
          <button 
            onClick={() => endCall(true)}
            aria-label="End Call"
            className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-transparent"
            title={t.endCall || 'End Call'}
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
