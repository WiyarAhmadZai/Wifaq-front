import { useEffect, useRef, useState } from 'react';
import { FiX, FiUserPlus, FiLogOut, FiEdit2, FiSearch, FiCheck, FiShield, FiTrash2 } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { useChat } from '../ChatContext';
import { chatApi } from '../chatApi';
import Avatar from './Avatar';
import { roleLabel } from '../utils';

/**
 * The right-hand panel behind the ⓘ button: who is in this thread and, for
 * those allowed, the controls to change it.
 *
 * Direct thread: the two people and the subject (either side may rename it).
 * Group: name, subject, description, every member with their group role, and
 * — for an admin or the creator — add, remove, promote and rename. Anyone may
 * leave a group; the last admin leaving hands admin to the longest-standing
 * member on the server, so a group is never left without one.
 */
export default function GroupInfoPanel({ conversation, onClose }) {
  const { me, isOnline, updateConversation, addMembers, removeMember, setMemberRole, leaveGroup } = useChat();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const isGroup = conversation.type === 'group';
  const canManage = Boolean(conversation.can_manage);
  const members = conversation.participants || [];

  const rename = async () => {
    const { value: form } = await Swal.fire({
      title: isGroup ? 'Group details' : 'Chat subject',
      html:
        (isGroup
          ? `<input id="gname" class="swal2-input" placeholder="Group name" maxlength="100" value="${escapeAttr(conversation.name || '')}">`
          : '')
        + `<input id="gsubject" class="swal2-input" placeholder="Subject" maxlength="150" value="${escapeAttr(conversation.subject || '')}">`
        + (isGroup
          ? `<input id="gdesc" class="swal2-input" placeholder="Description (optional)" maxlength="500" value="${escapeAttr(conversation.description || '')}">`
          : ''),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save',
      confirmButtonColor: '#0d9488',
      preConfirm: () => ({
        name: document.getElementById('gname')?.value?.trim(),
        subject: document.getElementById('gsubject')?.value?.trim() ?? '',
        description: document.getElementById('gdesc')?.value?.trim() ?? '',
      }),
    });
    if (!form) return;
    if (isGroup && (!form.name || form.name.length < 2)) {
      Swal.fire('Name too short', 'Give the group a name of at least two characters.', 'warning');
      return;
    }
    setBusy(true);
    try {
      await updateConversation(conversation.id, isGroup ? form : { subject: form.subject });
    } catch (e) {
      Swal.fire('Could not save', e?.response?.data?.message || 'Please try again.', 'error');
    } finally { setBusy(false); }
  };

  const remove = async (u) => {
    const ok = await Swal.fire({
      title: 'Remove from group?', text: u.name, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Remove',
    });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try { await removeMember(conversation.id, u.id); }
    catch (e) { Swal.fire('Could not remove', e?.response?.data?.message || 'Please try again.', 'error'); }
    finally { setBusy(false); }
  };

  const toggleAdmin = async (u) => {
    const role = u.role_in_group === 'admin' ? 'member' : 'admin';
    setBusy(true);
    try { await setMemberRole(conversation.id, u.id, role); }
    catch (e) { Swal.fire('Could not change role', e?.response?.data?.message || 'Please try again.', 'error'); }
    finally { setBusy(false); }
  };

  const leave = async () => {
    const ok = await Swal.fire({
      title: 'Leave this group?', text: 'You will stop receiving its messages.', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Leave group',
    });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try { await leaveGroup(conversation.id); onClose(); }
    catch (e) { Swal.fire('Could not leave', e?.response?.data?.message || 'Please try again.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-80 bg-white border-l border-gray-100 shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">{isGroup ? 'Group info' : 'Chat info'}</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" title="Close"><FiX /></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Identity */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <Avatar user={isGroup ? { name: conversation.name } : conversation.counterpart} size={48} linkable={!isGroup} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">{conversation.title}</div>
              {conversation.subject && (
                <div className="text-xs text-teal-700 font-medium truncate">{conversation.subject}</div>
              )}
              {isGroup && conversation.description && (
                <p className="text-xs text-gray-500 mt-1">{conversation.description}</p>
              )}
              {isGroup && (
                <div className="text-[11px] text-gray-400 mt-1">
                  <span>{members.length}</span> <span>members</span>
                </div>
              )}
            </div>
            {canManage && (
              <button onClick={rename} disabled={busy} title="Edit" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-teal-600">
                <FiEdit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {isGroup ? 'Members' : 'People'}
            </p>
            {isGroup && canManage && (
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900">
                <FiUserPlus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          <ul className="space-y-1">
            {members.map((u) => {
              const self = u.id === me?.id;
              const admin = u.role_in_group === 'admin';
              return (
                <li key={u.id} className="flex items-center gap-2.5 py-1.5 group">
                  <Avatar user={u} size={34} online={isOnline(u.id)} showDot />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">
                      {u.name}{self && <span className="text-gray-400"> (you)</span>}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{roleLabel(u.role)}</div>
                  </div>
                  {isGroup && admin && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700" title="Group admin">
                      <FiShield className="w-3 h-3" /> Admin
                    </span>
                  )}
                  {isGroup && canManage && !self && (
                    <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleAdmin(u)} disabled={busy} title={admin ? 'Remove admin' : 'Make admin'}
                        className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-gray-100">
                        <FiShield className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(u)} disabled={busy} title="Remove"
                        className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {isGroup && (
        <div className="p-3 border-t border-gray-100">
          <button onClick={leave} disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-50">
            <FiLogOut className="w-4 h-4" /> Leave group
          </button>
        </div>
      )}

      {adding && (
        <AddMembersSheet
          conversation={conversation}
          onClose={() => setAdding(false)}
          onAdd={async (ids) => { await addMembers(conversation.id, ids); setAdding(false); }}
        />
      )}
    </div>
  );
}

/** Searchable staff picker for adding members; people already in are hidden. */
function AddMembersSheet({ conversation, onClose, onAdd }) {
  const { isOnline } = useChat();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setLoading(true);
      chatApi.contacts({ search, per_page: 40, exclude_conversation_id: conversation.id })
        .then((r) => setUsers(r.data?.data || []))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(debounce.current);
  }, [search, conversation.id]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!picked.length) return;
    setBusy(true);
    try { await onAdd(picked); }
    catch (e) { Swal.fire('Could not add', e?.response?.data?.message || 'Please try again.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Add members</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><FiX /></button>
      </div>
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, role or email"
            className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200" />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-4 border-teal-100 border-t-teal-500" /></div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No staff found.</div>
        ) : users.map((u) => {
          const on = picked.includes(u.id);
          return (
            <button key={u.id} onClick={() => toggle(u.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${on ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
              <Avatar user={u} size={36} online={isOnline(u.id)} showDot linkable={false} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{u.name}</div>
                <div className="text-xs text-gray-400">{roleLabel(u.role)}</div>
              </div>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${on ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'}`}>
                {on && <FiCheck className="w-3 h-3" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-gray-100">
        <button onClick={submit} disabled={busy || picked.length === 0}
          className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
          {busy ? 'Adding…' : <>Add{picked.length > 0 && <span className="opacity-80"> ({picked.length})</span>}</>}
        </button>
      </div>
    </div>
  );
}

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
