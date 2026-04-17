import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldAlert, CheckCircle, Trash2, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Report {
  id: string;
  roomId: string;
  reportedBy: string;
  reportedRole: string;
  timestamp: number;
  status: 'pending' | 'reviewed';
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  role: string;
  timestamp: number;
  isSystem: boolean;
}

export const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(fetchedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'reviewed'
      });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'reviewed' } : r));
    } catch (error) {
      console.error("Error updating report:", error);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!window.confirm("Are you sure you want to delete this abusive room and end the session?")) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'ended' });
      await deleteDoc(doc(db, 'rooms', roomId));
      alert('Room deleted successfully.');
      setSelectedRoomId(null);
    } catch (error) {
      console.error("Error deleting room:", error);
      alert('Failed to delete room.');
    }
  };

  const viewRoomContext = async (roomId: string) => {
    setSelectedRoomId(roomId);
    setLoadingMessages(true);
    setRoomMessages([]);
    try {
      const q = query(collection(db, `rooms/${roomId}/messages`), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setRoomMessages(messages);
    } catch (error) {
      console.error("Error fetching room messages:", error);
      alert("Could not fetch messages. The room might have been deleted.");
    } finally {
      setLoadingMessages(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white">Loading admin dashboard...</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 text-[var(--color-text-primary)] relative mt-8">
        <button 
          onClick={onClose}
          className="absolute -top-4 right-6 p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-white">Admin Moderation Dashboard</h1>
          </div>
          <div className="text-sm bg-zinc-800 px-4 py-2 rounded-full border border-white/10">
            {reports.filter(r => r.status === 'pending').length} Pending Reports
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reports List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Reports</h2>
            {reports.length === 0 ? (
              <div className="text-zinc-500 italic">No reports found.</div>
            ) : (
              reports.map(report => (
                <div 
                  key={report.id} 
                  className={`p-4 rounded-xl border transition-colors ${
                    report.status === 'pending' ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-900 border-zinc-800'
                  } ${selectedRoomId === report.roomId ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${report.status === 'pending' ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {report.status}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => viewRoomContext(report.roomId)}
                        className="p-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg transition-colors"
                        title="View Chat Context"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.status === 'pending' && (
                        <button 
                          onClick={() => markAsReviewed(report.id)}
                          className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors"
                          title="Mark as Reviewed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteReport(report.id)}
                        className="p-2 bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm mt-3 space-y-1">
                    <div><span className="text-zinc-500">Room ID:</span> <span className="font-mono text-zinc-300">{report.roomId}</span></div>
                    <div><span className="text-zinc-500">Reported By:</span> <span className="font-mono text-zinc-300">{report.reportedBy}</span></div>
                    <div><span className="text-zinc-500">Reported Role:</span> <span className="text-amber-400 capitalize">{report.reportedRole}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Context Viewer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[80vh] sticky top-6">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center justify-between">
              Chat Context
              {selectedRoomId && (
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={() => deleteRoom(selectedRoomId)}
                    className="text-sm text-red-500 hover:bg-red-500/20 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                    title="Delete Room & End Session for Users"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Room
                  </button>
                  <button 
                    onClick={() => setSelectedRoomId(null)}
                    className="text-sm text-zinc-500 hover:text-white flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>
              )}
            </h2>
            
            {!selectedRoomId ? (
              <div className="flex-1 flex items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl">
                Select a report to view the chat context
              </div>
            ) : loadingMessages ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500">Loading messages...</div>
            ) : roomMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500">No messages found or room was deleted.</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {roomMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-lg ${msg.isSystem ? 'bg-zinc-800/50 text-center mx-12 text-sm text-zinc-400' : 'bg-zinc-800 border border-zinc-700'}`}
                  >
                    {!msg.isSystem && (
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold uppercase ${msg.role === 'guardian' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          {msg.role}
                        </span>
                        <span className="text-[10px] text-zinc-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    <span className={msg.isSystem ? 'italic' : 'text-zinc-200'}>{msg.text}</span>
                    <div className="text-[10px] text-zinc-600 mt-2 font-mono">UID: {msg.senderId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
