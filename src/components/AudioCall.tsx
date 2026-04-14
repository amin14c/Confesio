import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
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
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
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

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current?.addTrack(track);
      });
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

      {callState === 'idle' && (
        <button 
          onClick={startCall}
          className="text-xs font-medium text-emerald-400/80 hover:text-emerald-400 transition-colors flex items-center gap-1 bg-emerald-400/10 px-3 py-1.5 rounded-full"
        >
          <Phone className="w-3 h-3" />
          {t.startAudioCall || 'Start Call'}
        </button>
      )}

      {callState === 'incoming' && (
        <button 
          onClick={acceptCall}
          className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-3 py-1.5 rounded-full animate-pulse border border-emerald-500/50"
        >
          <Phone className="w-3 h-3" />
          {t.acceptCall || 'Accept Call'}
        </button>
      )}

      {callState === 'calling' && (
        <div className="text-xs font-medium text-amber-400/80 flex items-center gap-1 bg-amber-400/10 px-3 py-1.5 rounded-full">
          <Phone className="w-3 h-3 animate-pulse" />
          {t.calling || 'Calling...'}
        </div>
      )}

      {callState === 'active' && (
        <>
          <button 
            onClick={toggleMute}
            className={`p-1.5 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'}`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={endCall}
            className="text-xs font-medium text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1 bg-red-400/10 px-3 py-1.5 rounded-full"
          >
            <PhoneOff className="w-3 h-3" />
            {t.endCall || 'End Call'}
          </button>
        </>
      )}
    </div>
  );
};
