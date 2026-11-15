import { useEffect, useMemo, useRef, useState } from 'react';
import { FiX, FiSearch, FiUsers, FiUser, FiCheck, FiArrowLeft } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import { chatApi } from '../chatApi';
import Avatar from './Avatar';
import { roleLabel } from '../utils';

/**
 * Start a thread.
 *
 * Direct: pick a person, then give the thread a subject. Two colleagues may
 * hold several threads ("Exam timetable", "Grade 7 trip"), and the subject is
 * what tells them apart — so it is asked for every time. Leaving it blank
 * reopens the pair's untitled thread.
 *
 * Group: a name, an optional subject, and the members. Only accounts that can
 * use the chat are offered — the directory is filtered on the server.
 */
export default function NewChatModal({ onClose, onStarted }) {
  const { startChatWith, createGroup, isOnline, canCreateGroups } = useChat();
  const [mode, setMode] = useState('direct'); // direct | group
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Direct: the person chosen, waiting for a subject.
  const [picked, setPicked] = useState(null);
  const [subject, setSubject] = useState('');

  // Group.
  const [groupName, setGroupName] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [members, setMembers] = useState([]); // user objects
  // A failed request used to be indistinguishable from "nobody matched".
  const [loadError, setLoadError] = useState(false);

  const load = (term) => {
    setLoading(true);
    setLoadError(false);
    chatApi.contacts({ search: term, per_page: 40 })
      .then((r) => setUsers(r.data?.data || []))
      .catch(() => { setUsers([]); setLoadError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 250);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const toggleMember = (u) =>
    setMembers((prev) => (memberIds.has(u.id) ? prev.filter((m) => m.id !== u.id) : [...prev, u]));

  const startDirect = async () => {
    if (!picked) return;
    setBusy(true); setError(null);
    try {
      await startChatWith(picked, subject.trim());
      onStarted?.();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not start the chat.');
    } finally {
      setBusy(false);
    }
  };

  const startGroup = async () => {
    if (groupName.trim().length < 2 || members.length === 0) return;
    setBusy(true); setError(null);
    try {
      await createGroup({
        name: groupName.trim(),
        subject: groupSubject.trim(),
        memberIds: members.map((m) => m.id),
      });
      onStarted?.();
      onClose();
    } catch (e) {
      const errs = e?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat()[0] : (e?.response?.data?.message || 'Could not create the group.'));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'group' ? 'New group' : picked ? 'Chat subject' : 'New chat';

  // The backdrop does not close the dialog: a stray click outside, half-way
  // through picking people, would throw the selection away. The ✕ is the only
  // way out — the rule every form modal in the app follows.
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90%]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {picked && mode === 'direct' && (
              <button onClick={() => setPicked(null)} className="p-1 text-gray-400 hover:text-gray-600" title="Back">
                <FiArrowLeft />
              </button>
            )}
            <h3 className="font-semibold text-gray-800">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><FiX /></button>
        </div>

        {/* Direct / Group switch — groups only for those allowed to create them. */}
        {!picked && canCreateGroups && (
          <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50">
            {[
              { key: 'direct', label: 'Direct', icon: <FiUser className="w-3.5 h-3.5" /> },
              { key: 'group', label: 'Group', icon: <FiUsers className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setMode(t.key)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === t.key ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-white'}`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Direct: subject step ─────────────────────────────────────────── */}
        {mode === 'direct' && picked && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar user={picked} size={40} linkable={false} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{picked.name}</div>
                <div className="text-xs text-gray-400">{roleLabel(picked.role)}</div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Subject</label>
              <input
                autoFocus
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startDirect()}
                maxLength={150}
                placeholder="What is this chat about? e.g. Exam timetable"
                className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                You can have several chats with the same person — the subject keeps them apart. Leave it blank to open your general chat.
              </p>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              onClick={startDirect}
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {busy ? 'Starting…' : 'Start chat'}
            </button>
          </div>
        )}

        {/* ── Group: details ───────────────────────────────────────────────── */}
        {mode === 'group' && (
          <div className="p-3 space-y-2 border-b border-gray-100">
            <input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={100}
              placeholder="Group name"
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200"
            />
            <input
              value={groupSubject}
              onChange={(e) => setGroupSubject(e.target.value)}
              maxLength={150}
              placeholder="Subject (optional) — e.g. Term 2 planning"
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200"
            />
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 text-[11px] font-semibold">
                    {m.name}
                    <button onClick={() => toggleMember(m)} className="opacity-60 hover:opacity-100" title="Remove">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── People picker (direct step 1, or group members) ──────────────── */}
        {!(mode === 'direct' && picked) && (
          <>
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff by name, role or email"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 max-h-72 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-teal-100 border-t-teal-500" />
                </div>
              ) : loadError ? (
                <div className="p-8 text-center text-sm text-red-500">Could not load the staff list. Please try again.</div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">No staff found.</div>
              ) : (
                users.map((u) => {
                  const on = memberIds.has(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => (mode === 'group' ? toggleMember(u) : setPicked(u))}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${on ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                    >
                      <Avatar user={u} size={40} online={isOnline(u.id)} showDot linkable={false} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {u.name}
                          {u.is_self && <span className="ms-1.5 text-xs font-normal text-teal-600">(You)</span>}
                        </div>
                        <div className="text-xs text-gray-400">{u.is_self ? 'Message yourself' : roleLabel(u.role)}</div>
                      </div>
                      {mode === 'group' && (
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${on ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'}`}>
                          {on && <FiCheck className="w-3 h-3" />}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {mode === 'group' && (
          <div className="p-3 border-t border-gray-100 space-y-2">
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              onClick={startGroup}
              disabled={busy || groupName.trim().length < 2 || members.length === 0}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {busy ? 'Creating…' : <>Create group{members.length > 0 && <span className="opacity-80"> ({members.length})</span>}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
