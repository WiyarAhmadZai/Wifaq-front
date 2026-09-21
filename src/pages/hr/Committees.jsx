import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put, del } from "../../api/axios";
import Select2 from "../../components/hr/Select2";
import { useAuth } from "../../admin/context/AuthContext";
import RichTextField from "../../components/RichTextField";

/**
 * Committees — the parent committee, the cultural committee, and so on.
 *
 * Two things only: who sits on one, and what its meetings were. How a committee
 * RUNS is not rebuilt here — a committee meeting is still a meeting, so its
 * agenda, attendance, minutes and action items live in Meetings, tagged with
 * the committee. This screen links to them rather than keeping a second copy.
 *
 * Membership mixes people the system keeps in different places — a teacher, a
 * parent, a student — and some it does not keep at all, like a community elder.
 * Each is recorded as what it is; nobody is copied into a second people list.
 */

const inp =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500";

const EMPTY = { name: "", mandate: "", meeting_cadence: "", lead_staff_id: "", is_active: true };

const SOURCES = [
  { value: "staff", label: "Staff member" },
  { value: "parent", label: "Parent" },
  { value: "student", label: "Student" },
  { value: "guest", label: "Someone outside the system" },
];

const SOURCE_STYLE = {
  staff: "bg-teal-50 text-teal-700",
  parent: "bg-blue-50 text-blue-700",
  student: "bg-purple-50 text-purple-700",
  guest: "bg-gray-100 text-gray-600",
};

export default function Committees() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission, isSuperAdmin } = useAuth();
  // Emailing members writes to people outside the screen, so it sits behind
  // the same authority as editing the committee. The on/off switch itself is
  // the super-admin's alone — the server refuses anyone else.
  const canEmail = hasPermission("committees.update") || isSuperAdmin;
  const [emailing, setEmailing] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [options, setOptions] = useState({ staff: [], parent: [], student: [] });
  const [newMember, setNewMember] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await get(`/committees${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setRows(res.data?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    get("/committees/member-options")
      .then((r) => setOptions(r.data?.data || { staff: [], parent: [], student: [] }))
      .catch(() => {});
  }, []);

  // The brief's "Open the committee in WEN" button lands here with ?open=ID.
  useEffect(() => {
    const id = Number(searchParams.get("open"));
    if (id && openId !== id) openCommittee(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const refreshDetail = async (id) => {
    const res = await get(`/committees/${id}`);
    setDetail(res.data?.data || null);
  };

  // Super-admin only. The server enforces it too; this just keeps the switch
  // off everyone else's screen.
  const toggleEmails = async (c, on) => {
    try {
      await put(`/committees/${c.id}`, {
        name: c.name, mandate: c.mandate, meeting_cadence: c.meeting_cadence,
        lead_staff_id: c.lead_staff_id || null, is_active: c.is_active, email_enabled: on,
      });
      await load();
      await refreshDetail(c.id);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not change the email setting.", "error");
    }
  };

  // Send every serving member their own brief: the committee, their role, the
  // next meeting and its agenda, THEIR open tasks, and the roll of members
  // with each person's role (so everyone knows who holds what). Members with
  // no address are named up front rather than silently skipped.
  const emailMembers = async (c) => {
    const members = detail?.members || [];
    const reachable = members.filter((m) => m.has_email);
    const missing = members.filter((m) => !m.has_email);
    if (reachable.length === 0) {
      Swal.fire("Nobody to email", "None of the serving members has an email address on record.", "info");
      return;
    }
    const ok = await Swal.fire({
      title: `Email ${reachable.length} member(s)?`,
      html: `<p style="font-size:13px">Each person receives their own brief for <b>${c.name}</b>: their role, the next meeting and its agenda, their own open tasks, and the list of members with everyone's role.</p>`
        + (missing.length
          ? `<p style="font-size:12px;color:#b45309;margin-top:8px">No email address, will be skipped: ${missing.map((m) => m.name).join(", ")}</p>`
          : ""),
      icon: "question", showCancelButton: true,
      confirmButtonText: "Send emails", confirmButtonColor: "#0d9488",
    });
    if (!ok.isConfirmed) return;
    setEmailing(true);
    try {
      const res = await post(`/committees/${c.id}/email`);
      const skipped = res.data?.skipped || [];
      Swal.fire("Sent", `${res.data?.queued ?? 0} email(s) sent.`
        + (skipped.length ? ` Skipped (no address): ${skipped.join(", ")}.` : ""), "success");
    } catch (err) {
      Swal.fire("Not sent", err.response?.data?.message || "Could not send the emails.", "error");
    } finally {
      setEmailing(false);
    }
  };

  const openCommittee = async (id) => {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setNewMember(null);
    try {
      const res = await get(`/committees/${id}`);
      setDetail(res.data?.data || null);
    } catch {
      setDetail(null);
    }
  };

  const saveCommittee = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...editing, lead_staff_id: editing.lead_staff_id || null };
      if (editing.id) await put(`/committees/${editing.id}`, payload);
      else await post("/committees", payload);
      setEditing(null);
      await load();
      // Refresh the open panel in place. Re-toggling it would only close it:
      // openCommittee() is a toggle, and both calls would read the same openId.
      if (openId) {
        const res = await get(`/committees/${openId}`);
        setDetail(res.data?.data || null);
      }
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) setErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
      else Swal.fire("Error", err.response?.data?.message || "Could not save the committee.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeCommittee = async (row) => {
    const ok = await Swal.fire({
      title: "Remove this committee?", text: row.name, icon: "warning",
      showCancelButton: true, confirmButtonColor: "#0d9488", cancelButtonColor: "#ef4444",
      confirmButtonText: "Remove",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/committees/${row.id}`);
      setOpenId(null);
      await load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not remove it.", "error");
    }
  };

  const addMember = async () => {
    setSaving(true);
    try {
      const body = newMember.source === "guest"
        ? { external_name: newMember.external_name, external_contact: newMember.external_contact,
            role_in_committee: newMember.role_in_committee }
        : { source: newMember.source, member_id: newMember.member_id,
            role_in_committee: newMember.role_in_committee };
      await post(`/committees/${openId}/members`, body);
      setNewMember(null);
      const res = await get(`/committees/${openId}`);
      setDetail(res.data?.data || null);
      await load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      Swal.fire("Error", errs ? Object.values(errs).flat()[0] : (err.response?.data?.message || "Could not add the member."), "error");
    } finally {
      setSaving(false);
    }
  };

  const endTerm = async (member) => {
    const ok = await Swal.fire({
      title: "End this member's term?", text: member.name, icon: "question",
      showCancelButton: true, confirmButtonColor: "#0d9488", cancelButtonColor: "#6b7280",
      confirmButtonText: "End term",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/committees/${openId}/members/${member.id}`);
      const res = await get(`/committees/${openId}`);
      setDetail(res.data?.data || null);
      await load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not update the member.", "error");
    }
  };

  const staffOptions = options.staff.map((s) => ({ value: String(s.id), label: s.detail ? `${s.name} — ${s.detail}` : s.name }));
  const pickerOptions = newMember && newMember.source !== "guest"
    ? (options[newMember.source] || []).map((o) => ({ value: String(o.id), label: o.detail ? `${o.name} — ${o.detail}` : o.name }))
    : [];

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Committees</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Who sits on each committee, and the meetings it has held.
          </p>
        </div>
        <button onClick={() => { setEditing({ ...EMPTY }); setErrors({}); }}
          className="px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700">
          New committee
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search committees" className={inp} />
      </div>

      {loading && <p className="text-xs text-gray-400 px-1">Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-600">No committees yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add the parent committee and the cultural committee to begin.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" onClick={() => openCommittee(c.id)}
              className="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-gray-50/60">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  {!c.is_active && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">inactive</span>
                  )}
                </div>
                {c.mandate && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{c.mandate}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                  <span>{c.member_count} <span>members</span></span>
                  <span>{c.meeting_count} <span>meetings</span></span>
                  {c.meeting_cadence && <span>{c.meeting_cadence}</span>}
                  {c.lead_name && <span><span>Led by</span> {c.lead_name}</span>}
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">{openId === c.id ? "−" : "+"}</span>
            </button>

            {openId === c.id && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                {!detail && <p className="text-xs text-gray-400">Loading…</p>}

                {detail && (
                  <div className="space-y-5">
                    {detail.mandate && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Mandate</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.mandate}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Members</p>
                        <button onClick={() => setNewMember({ source: "staff", member_id: "", external_name: "", external_contact: "", role_in_committee: "" })}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800">Add a member</button>
                      </div>

                      {detail.members.length === 0 && (
                        <p className="text-[11px] text-amber-600">Nobody has been seated on this committee yet.</p>
                      )}

                      <div className="space-y-1.5">
                        {detail.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-gray-800">{m.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${SOURCE_STYLE[m.source]}`}>{m.source}</span>
                                {m.role_in_committee && (
                                  <span className="text-[10px] text-gray-500">{m.role_in_committee}</span>
                                )}
                              </div>
                              {(m.joined_on || m.external_contact || !m.has_email) && (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {m.joined_on && <><span>Since</span> {m.joined_on}</>}
                                  {m.external_contact && <> · {m.external_contact}</>}
                                  {!m.has_email && <> · <span className="text-amber-600">No email address</span></>}
                                </p>
                              )}
                            </div>
                            <button onClick={() => endTerm(m)}
                              className="text-[11px] text-gray-500 hover:text-red-600 shrink-0">End term</button>
                          </div>
                        ))}
                      </div>

                      {newMember && (
                        <div className="mt-3 border border-teal-200 bg-teal-50/40 rounded-xl p-3 space-y-2">
                          <select value={newMember.source}
                            onChange={(e) => setNewMember((n) => ({ ...n, source: e.target.value, member_id: "" }))}
                            className={inp}>
                            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>

                          {newMember.source === "guest" ? (
                            <>
                              {/* Somebody the school knows and the system does
                                  not. Recording the name beats refusing them. */}
                              <input value={newMember.external_name}
                                onChange={(e) => setNewMember((n) => ({ ...n, external_name: e.target.value }))}
                                placeholder="Their name" className={inp} />
                              <input value={newMember.external_contact}
                                onChange={(e) => setNewMember((n) => ({ ...n, external_contact: e.target.value }))}
                                placeholder="Phone or email (optional)" className={inp} />
                            </>
                          ) : (
                            <Select2 size="sm" value={newMember.member_id}
                              onChange={(v) => setNewMember((n) => ({ ...n, member_id: v }))}
                              placeholder="Search for the person…" options={pickerOptions} />
                          )}

                          <input value={newMember.role_in_committee}
                            onChange={(e) => setNewMember((n) => ({ ...n, role_in_committee: e.target.value }))}
                            placeholder="Their role — e.g. chair, secretary, member" className={inp} />

                          <div className="flex justify-end gap-2">
                            <button onClick={() => setNewMember(null)}
                              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs">Cancel</button>
                            <button onClick={addMember} disabled={saving}
                              className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50">
                              {saving ? "Saving…" : "Add"}
                            </button>
                          </div>
                        </div>
                      )}

                      {detail.past_members.length > 0 && (
                        <details className="mt-3">
                          <summary className="text-[11px] text-gray-500 cursor-pointer">
                            Former members ({detail.past_members.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                            {detail.past_members.map((m) => (
                              <p key={m.id} className="text-[11px] text-gray-400">
                                {m.name}{m.role_in_committee ? ` · ${m.role_in_committee}` : ""}
                                {m.left_on && <> · <span>left</span> {m.left_on}</>}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Meetings</p>
                        {/* The other half of the link. Arriving from here the
                            meeting form is already tagged with this committee,
                            so its minutes land in the right place without
                            anyone having to remember the step. */}
                        <button onClick={() => navigate(`/hr/meetings-events/create?type=meeting&committee=${detail.id}`)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800">Schedule a meeting</button>
                      </div>
                      {/* No minutes store of its own: a committee meeting is a
                          meeting, so its agenda and decisions are kept where
                          every other meeting's are. */}
                      {detail.meetings.length === 0 ? (
                        <p className="text-[11px] text-gray-500">
                          No meetings tagged with this committee yet. Create one in Meetings and choose this committee there.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {detail.meetings.map((m) => (
                            <button key={m.id} onClick={() => navigate(`/hr/meetings/show/${m.id}`)}
                              className="w-full text-left border border-gray-100 rounded-xl px-3 py-2 hover:border-teal-300">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-gray-800">{m.title}</span>
                                <span className="text-[10px] text-gray-400">{m.start_time}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{m.status}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-50">
                      <div className="flex flex-wrap items-center gap-3">
                        {isSuperAdmin && (
                          <label className="inline-flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={!!detail.email_enabled}
                              onChange={(e) => toggleEmails(c, e.target.checked)}
                              className="w-3.5 h-3.5 accent-teal-600" />
                            <span>Emails to members</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${detail.email_enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {detail.email_enabled ? "On" : "Off"}
                            </span>
                          </label>
                        )}
                        {canEmail && detail.email_enabled && (
                          <button onClick={() => emailMembers(c)} disabled={emailing || detail.members.length === 0}
                            title="Each member gets their own brief: role, next meeting and agenda, their tasks, and everyone's responsibilities"
                            className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-40 disabled:cursor-not-allowed">
                            {emailing ? "Sending…" : "Email members"}
                          </button>
                        )}
                        {canEmail && !detail.email_enabled && (
                          <span className="text-[11px] text-gray-400">Emails to members are switched off.</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                      <button onClick={() => { setEditing({ ...c, lead_staff_id: c.lead_staff_id ? String(c.lead_staff_id) : "" }); setErrors({}); }}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-800">Edit committee</button>
                      <button onClick={() => removeCommittee(c)}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700">Remove</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">{editing.id ? "Edit committee" : "New committee"}</h3>
            </div>

            <form onSubmit={saveCommittee} className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
                <input value={editing.name} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Parent Committee" className={inp} required />
                {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mandate</label>
                <RichTextField rows={4} value={editing.mandate || ""} onChange={(html) => setEditing((f) => ({ ...f, mandate: html }))}
                  placeholder="What this committee is for, and what it may decide." />
                <p className="text-[10px] text-gray-400 mt-1">The most useful thing to write down, and the first one forgotten.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">How often it meets</label>
                  <input value={editing.meeting_cadence || ""} onChange={(e) => setEditing((f) => ({ ...f, meeting_cadence: e.target.value }))}
                    placeholder="Monthly, every second Thursday…" className={inp} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lead</label>
                  <Select2 size="sm" value={editing.lead_staff_id || ""}
                    onChange={(v) => setEditing((f) => ({ ...f, lead_staff_id: v }))}
                    placeholder="Search for the lead…" options={staffOptions} />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={editing.is_active !== false}
                  onChange={(e) => setEditing((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 text-teal-600 rounded border-gray-300" />
                <span className="text-xs text-gray-700">Active</span>
              </label>
            </form>

            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-medium">Cancel</button>
              <button onClick={saveCommittee} disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
