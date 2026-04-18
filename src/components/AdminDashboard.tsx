import React, { useState, useEffect } from 'react';
import { collection, query, updateDoc, doc, deleteDoc, orderBy, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldAlert, CheckCircle, Trash2, Eye, X, UserX, Activity, Users, FileWarning, BarChart, Unlock, Calendar, Award, Star, Flag, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Report {
  id: string;
  roomId: string;
  reportedBy: string;
  reportedRole: string;
  timestamp: number;
  status: 'pending' | 'reviewed';
  reason?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  role: string;
  timestamp: number;
  isSystem: boolean;
}

interface UserData {
  uid: string;
  createdAt: number;
  credits: number;
  badges: string[];
  completed_sessions: number;
  avg_rating: number;
  lastSeen: number;
}

export const AdminDashboard: React.FC<{ onClose: () => void; adminUid: string }> = ({ onClose, adminUid }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'users'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeRoomsCount, setActiveRoomsCount] = useState<number>(0);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [bannedUids, setBannedUids] = useState<Set<string>>(new Set());
  const [totalSessions, setTotalSessions] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Main real-time listeners for Reports, Bans, and Rooms
  useEffect(() => {
    const qReports = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Report[]);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to reports:", error);
      setLoading(false);
    });

    const qRooms = query(collection(db, 'rooms'));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        if (doc.data().status === 'active') count++;
      });
      setActiveRoomsCount(count);
    });

    const qBans = query(collection(db, 'banned_users'));
    const unsubBans = onSnapshot(qBans, (snapshot) => {
      const bans = new Set<string>();
      snapshot.forEach(doc => bans.add(doc.id));
      setBannedUids(bans);
    });

    return () => {
      unsubReports();
      unsubRooms();
      unsubBans();
    };
  }, []);

  // Fetch users only once on mount
  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        setLoadingUsers(true);
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(doc => doc.data() as UserData);
        setUsersList(usersData);
        
        let sessions = 0;
        usersData.forEach(u => sessions += (u.completed_sessions || 0));
        setTotalSessions(Math.floor(sessions / 2)); // Divide by 2 as two users share a session
        
        setLoadingUsers(false);
      } catch (err) {
        console.error("Error fetching users:", err);
        setLoadingUsers(false);
      }
    };
    fetchUsersData();
  }, []);

  const markAsReviewed = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed' });
    } catch (error) {
      console.error("Error updating report:", error);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const generateMockReport = async () => {
    if (!window.confirm("Generate a mock abusive session and report for testing?")) return;
    
    try {
      const mockRoomId = 'mock_room_' + Date.now();
      const mockGuardianId = 'mock_abusive_guardian_' + Math.floor(Math.random() * 1000);
      
      // 1. Create Mock Room
      await setDoc(doc(db, 'rooms', mockRoomId), {
        confessorId: adminUid,
        guardianId: mockGuardianId,
        status: 'active',
        createdAt: Date.now(),
        language: 'ar'
      });

      // 2. Insert mock messages
      const msgsRef = collection(db, 'rooms', mockRoomId, 'messages');
      await setDoc(doc(msgsRef, 'msg1'), {
        senderId: adminUid,
        text: 'أشعر بالحزن الشديد هذه الأيام ولا أعرف السبب...',
        timestamp: Date.now() - 120000,
        status: 'read'
      });
      await setDoc(doc(msgsRef, 'msg2'), {
        senderId: mockGuardianId,
        text: 'بصراحة أنت تبالغ ومشاكلك تافهة جداً، توقف عن النحيب!',
        timestamp: Date.now() - 60000,
        status: 'read'
      });
      await setDoc(doc(msgsRef, 'msg3'), {
        senderId: mockGuardianId,
        text: 'أنت شخص ضعيف جداً.',
        timestamp: Date.now() - 30000,
        status: 'sent'
      });

      // 3. Create the report
      await setDoc(doc(collection(db, 'reports')), {
        roomId: mockRoomId,
        reportedBy: adminUid,
        reportedRole: 'guardian',
        reason: 'تهجم لفظي وتقليل من شأن المشكلة بشكل عدواني',
        timestamp: Date.now(),
        status: 'pending'
      });

      alert("Mock report generated! It should appear in the queue instantly.");
    } catch (error) {
      console.error("Error generating mock report:", error);
      alert("Failed to generate mock report.");
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!window.confirm("Delete this room and forcibly end session?")) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'ended' });
      await deleteDoc(doc(db, 'rooms', roomId));
      alert('Room successfully terminated.');
      setSelectedRoomId(null);
    } catch (error) {
      console.error("Error deleting room:", error);
      alert('Failed to delete room.');
    }
  };

  const viewRoomContext = (roomId: string) => {
    setSelectedRoomId(roomId);
    setLoadingMessages(true);
    setRoomMessages([]);
    
    const q = query(collection(db, `rooms/${roomId}/messages`), orderBy('timestamp', 'asc'));
    onSnapshot(q, (snapshot) => {
      setRoomMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[]);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching room messages:", error);
      setLoadingMessages(false);
    });
  };

  const toggleBanUser = async (userId: string, currentlyBanned: boolean) => {
    if (currentlyBanned) {
      if (!window.confirm("Unban this user? They will be able to access the platform again.")) return;
      try {
        await deleteDoc(doc(db, 'banned_users', userId));
      } catch (error) {
        console.error("Error unbanning:", error);
      }
    } else {
      if (!window.confirm("PERMANENTLY BAN this user? They will be blocked from matching.")) return;
      try {
        await setDoc(doc(db, 'banned_users', userId), {
          bannedAt: Date.now(),
          reason: 'Dashboard Admin Action',
          bannedBy: adminUid
        });
      } catch (error) {
        console.error("Error banning:", error);
      }
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsCards = [
    { label: 'Total Users', value: usersList.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Live Rooms', value: activeRoomsCount, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Sessions', value: totalSessions, icon: CheckCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Pending Reports', value: reports.filter(r => r.status === 'pending').length, icon: FileWarning, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  if (loading) return <div className="fixed inset-0 z-50 bg-[#09090b] flex items-center justify-center text-zinc-500">Loading Command Center...</div>;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-zinc-200 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-950 border-b border-white/5 relative z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">Command Center</h1>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white bg-white/5 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-white/5 flex flex-col shadow-2xl transform transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between mt-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 md:flex hidden">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">Confessio</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-1">Command Center <Award className="w-3 h-3 text-amber-500"/></p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-zinc-500 hover:text-white bg-white/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'overview' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
          >
            <BarChart className="w-5 h-5" /> Overview
          </button>
          <button 
            onClick={() => { setActiveTab('moderation'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'moderation' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
          >
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5" /> Moderation
            </div>
            {reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center min-w-[20px]">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'users' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" /> Users
            </div>
            {bannedUids.size > 0 && (
              <span className="text-zinc-500 text-xs">{bannedUids.size} Banned</span>
            )}
          </button>
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 text-zinc-400 rounded-xl transition-all font-medium shadow-sm transition-colors"
          >
            <X className="w-4 h-4" /> Exit Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#09090b] relative w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-rose-500/5 pointer-events-none" />
        
        <div className="relative z-10 p-4 md:p-10 max-w-7xl mx-auto min-h-full flex flex-col">
          
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <header className="mb-10">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Platform Overview</h2>
                  <p className="text-zinc-400 mt-1">Real-time statistics and platform health.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  {statsCards.map((stat, idx) => (
                    <div key={idx} className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors shadow-2xl">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div className="text-4xl font-black text-white tracking-tighter mb-1 relative z-10">{stat.value}</div>
                      <div className="text-sm text-zinc-400 font-medium relative z-10">{stat.label}</div>
                      <div className={`absolute -bottom-6 -right-6 w-24 h-24 ${stat.bg} rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-500`} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'moderation' && (
              <motion.div key="moderation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0 lg:h-[calc(100vh-160px)]">
                <header className="mb-6 lg:mb-8 shrink-0 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Safety & Moderation</h2>
                    <p className="text-zinc-400 mt-1 text-sm lg:text-base">Review user reports and intervene in active sessions.</p>
                  </div>
                  <button 
                    onClick={generateMockReport} 
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-colors text-sm font-semibold w-full lg:w-auto"
                  >
                    + Auto-Generate Mock Report
                  </button>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-0 overflow-y-auto lg:overflow-hidden pb-10 lg:pb-0">
                  {/* Reports List Pane */}
                  <div className="lg:col-span-4 xl:col-span-5 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl h-[400px] lg:h-auto">
                    <div className="p-4 border-b border-white/5 bg-zinc-900/80">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Flag className="w-4 h-4 text-zinc-400" /> Report Queue
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {reports.length === 0 ? (
                        <div className="text-center text-zinc-500 italic py-10">Inbox zero! No active reports.</div>
                      ) : (
                        reports.map(report => (
                          <div 
                            key={report.id} 
                            onClick={() => viewRoomContext(report.roomId)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                              selectedRoomId === report.roomId ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg' : 
                              report.status === 'pending' ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40' : 
                              'bg-zinc-900/50 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${report.status === 'pending' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {report.status}
                              </span>
                              <span className="text-xs text-zinc-500 font-medium">
                                {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm mb-4 bg-black/20 p-2 rounded-lg">
                              <div className="flex justify-between"><span className="text-zinc-500">Target Role:</span> <span className="text-amber-400 capitalize font-medium">{report.reportedRole}</span></div>
                              <div className="flex justify-between"><span className="text-zinc-500">Room:</span> <span className="font-mono text-xs text-zinc-400 truncate max-w-[100px]">{report.roomId}</span></div>
                              {report.reason && (
                                <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
                                  <span className="text-zinc-500 text-xs text-left">Reason:</span>
                                  <span className="text-rose-400 text-sm">{report.reason}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 pt-3 border-t border-white/5">
                              {report.status === 'pending' && (
                                <button onClick={(e) => { e.stopPropagation(); markAsReviewed(report.id); }} className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors text-xs font-semibold flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Resolve
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }} className="w-8 flex items-center justify-center bg-zinc-800 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 rounded-md transition-colors shadow-sm">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Room Context Pane */}
                  <div className="lg:col-span-8 xl:col-span-7 bg-zinc-950/50 backdrop-blur-xl border border-white/5 rounded-2xl flex flex-col overflow-hidden relative shadow-2xl h-[500px] lg:h-auto mb-10 lg:mb-0">
                    <div className="p-4 border-b border-white/5 bg-zinc-900/80 flex items-center justify-between shrink-0">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-indigo-400" /> Evidence Viewer
                      </h3>
                      {selectedRoomId && (
                        <button onClick={() => deleteRoom(selectedRoomId)} className="text-xs font-semibold text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
                          <Trash2 className="w-3 h-3" /> Force Terminate Session
                        </button>
                      )}
                    </div>
                    
                    {!selectedRoomId ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-black/20">
                        <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a report from the queue<br/>to review chat logs and take action.</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
                        {loadingMessages ? (
                          <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse">Decrypting logs...</div>
                        ) : roomMessages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-zinc-500">Room terminated or no evidence found.</div>
                        ) : (
                          roomMessages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-xl shadow-sm ${msg.isSystem ? 'bg-zinc-900/50 text-center mx-12 text-sm text-zinc-400 border border-white/5' : 'bg-zinc-900 border border-white/10 relative overflow-hidden'}`}>
                              {!msg.isSystem && (
                                <div className="flex justify-between items-center mb-2 relative z-10">
                                  <span className={`text-xs font-bold uppercase tracking-wider ${msg.role === 'guardian' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    {msg.role}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-medium">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                              )}
                              <p className={`text-sm relative z-10 ${msg.isSystem ? 'italic' : 'text-zinc-200'}`}>{msg.text}</p>
                              {!msg.isSystem && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 relative z-10">
                                  <div className="text-[10px] text-zinc-600 font-mono truncate mr-2 bg-black/50 px-2 py-1 rounded">UID: {msg.senderId}</div>
                                  <button onClick={() => toggleBanUser(msg.senderId, bannedUids.has(msg.senderId))} className={`text-xs font-bold px-3 py-1 rounded-md transition-colors flex items-center gap-1 shadow-sm ${bannedUids.has(msg.senderId) ? 'bg-zinc-800 text-emerald-400 hover:text-emerald-300' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'}`}>
                                    {bannedUids.has(msg.senderId) ? <CheckCircle className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                    {bannedUids.has(msg.senderId) ? 'Unban' : 'Ban'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">User Management</h2>
                    <p className="text-zinc-400 mt-1">Search, examine, and enforce policies on registered accounts.</p>
                  </div>
                  <div className="relative">
                    <Search className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search by UID..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-zinc-900 shadow-inner border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full sm:w-64"
                    />
                  </div>
                </header>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  {loadingUsers ? (
                    <div className="p-12 text-center text-zinc-500 animate-pulse font-medium">Loading massive user database...</div>
                  ) : (
                    <div className="overflow-x-auto min-h-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/80 border-b border-white/5 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                            <th className="p-4 pl-6">User Identity</th>
                            <th className="p-4">Standing</th>
                            <th className="p-4">Platform Stats</th>
                            <th className="p-4">Registration</th>
                            <th className="p-4 text-right pr-6">Enforcement Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-zinc-500 italic">No users found matching query.</td>
                            </tr>
                          ) : (
                            filteredUsers.map(u => {
                              const isBanned = bannedUids.has(u.uid);
                              return (
                                <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-4 pl-6">
                                    <div className="font-mono text-sm text-zinc-300 font-medium">{u.uid}</div>
                                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> Last online: {new Date(u.lastSeen || u.createdAt).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm ${isBanned ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'}`}>
                                      {isBanned ? 'Permanently Banned' : 'In Good Standing'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-4 text-sm text-zinc-400">
                                      <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded border border-white/5" title="Completed Sessions">
                                        <Activity className="w-3.5 h-3.5 text-emerald-500" /> <span className="font-medium text-zinc-300">{u.completed_sessions || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded border border-white/5" title="Total Credits">
                                        <Award className="w-3.5 h-3.5 text-amber-500" /> <span className="font-medium text-zinc-300">{u.credits || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded border border-white/5" title="Average Rating">
                                        <Star className="w-3.5 h-3.5 text-indigo-400" /> <span className="font-medium text-zinc-300">{(u.avg_rating || 0).toFixed(1)}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-sm text-zinc-400 font-medium whitespace-nowrap">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                    <button 
                                      onClick={() => toggleBanUser(u.uid, isBanned)}
                                      className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors border shadow-sm ${isBanned ? 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white'}`}
                                    >
                                      {isBanned ? 'Revoke Ban' : 'Enforce Ban'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
