import { useEffect, useRef, useState } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import { chatApi } from '../chatApi';
import Avatar from './Avatar';
import { roleLabel } from '../utils';

// Searchable directory to start a new conversation with any user in the system.
export default function NewChatModal({ onClose, onStarted }) {
  const { startChatWith, isOnline } = useChat();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const debounceRef = useRef(null);

  const load = (term) => {
    setLoading(true);
    chatApi.contacts({ search: term, per_page: 30 })
      .then((r) => setUsers(r.data?.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 250);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const pick = async (u) => {
    setBusyId(u.id);
    try {
      await startChatWith(u);
      onStarted?.();
      onClose();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">New chat</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><FiX /></button>
        </div>
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name, role or email"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-teal-100 border-t-teal-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No users found.</div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => pick(u)}
                disabled={busyId === u.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left disabled:opacity-50"
              >
                <Avatar user={u} size={40} online={isOnline(u.id)} showDot />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{u.name}</div>
                  <div className="text-xs text-gray-400">{roleLabel(u.role)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
