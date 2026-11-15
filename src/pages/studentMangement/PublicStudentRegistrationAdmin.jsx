import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { del, get, post, put } from "../../api/axios";
import { useAuth } from "../../admin/context/AuthContext";
import { CHILD_DETAIL_SECTIONS, FAMILY_DETAIL_SECTIONS, displayValue } from "../public/publicRegistrationFields";

const BASE_URL = import.meta.env.BASE_URL || "/";

function absoluteUrl(path) {
  return new URL(`${BASE_URL}${String(path).replace(/^\/+/, "")}`, window.location.origin).toString();
}

const errorText = (error, fallback) => {
  const errors = error.response?.data?.errors;
  return error.response?.data?.message || (errors ? Object.values(errors).flat().join("\n") : fallback);
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** The answers a parent gave, grouped by section; empty sections are hidden. */
function DetailGrid({ sections, details }) {
  const groups = sections
    .map((section) => ({
      title: section.title,
      rows: section.fields
        .map((field) => ({ label: field.label, value: displayValue(field, details?.[field.key]) }))
        .filter((row) => row.value !== null),
    }))
    .filter((group) => group.rows.length);
  if (!groups.length) return <p className="text-xs text-slate-400">No additional details given.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.title} className="rounded-lg bg-white p-3 ring-1 ring-slate-100">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
          <dl className="space-y-1 text-sm">
            {group.rows.map((row) => (
              <div key={row.label} className="flex gap-2">
                <dt className="w-40 shrink-0 text-slate-500">{row.label}</dt>
                <dd className="min-w-0 break-words text-slate-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export default function PublicStudentRegistrationAdmin() {
  const { user, hasPermission } = useAuth();
  const [links, setLinks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionMeta, setSubmissionMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(null); // id of the row being worked on
  const [openDetails, setOpenDetails] = useState({});

  // One permission per button, granted to a role in Users & Access.
  const can = (action) => hasPermission(`public-registration.${action}`);
  const canCreate = can("create-link");
  const canCopy = can("copy-link");
  const canUpdate = can("toggle-link");
  const canRegister = can("register");
  const canDelete = can("delete");

  const loadSubmissions = useCallback(async () => {
    const response = await get("/student-management/public-student-registration/submissions", { params: { page: submissionPage } });
    setSubmissions(response.data?.data || []);
    setSubmissionMeta(response.data?.meta || { current_page: 1, last_page: 1, total: 0 });
  }, [submissionPage]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [linkResponse, branchResponse] = await Promise.all([
        get("/student-management/public-student-registration/links"),
        get("/student-management/public-student-registration/branches"),
        loadSubmissions(),
      ]);
      setLinks(linkResponse.data?.data || []);
      const availableBranches = branchResponse.data?.data || [];
      setBranches(availableBranches);
      setBranchId((current) => current || String(availableBranches[0]?.id || ""));
    } catch (error) {
      Swal.fire("Unable to load registrations", errorText(error, "Please try again."), "error");
    } finally {
      setLoading(false);
    }
  }, [loadSubmissions]);

  useEffect(() => { refresh(); }, [refresh]);

  const createLink = async () => {
    setCreating(true);
    try {
      await post("/student-management/public-student-registration/links", user?.branch_id ? {} : { branch_id: branchId });
      await refresh();
      Swal.fire("Link created", "An active public student registration link is ready to share.", "success");
    } catch (error) {
      Swal.fire("Unable to create link", errorText(error, "Please try again."), "error");
    } finally {
      setCreating(false);
    }
  };

  const toggleLink = async (link) => {
    try {
      await put(`/student-management/public-student-registration/links/${link.id}`, { is_active: !link.is_active });
      setLinks((current) => current.map((item) => (item.id === link.id ? { ...item, is_active: !link.is_active } : item)));
    } catch (error) {
      Swal.fire("Unable to update link", errorText(error, "Please try again."), "error");
    }
  };

  const copyLink = async (path) => {
    try {
      await navigator.clipboard.writeText(absoluteUrl(path));
      Swal.fire({ title: "Copied", text: "The registration link is copied.", icon: "success", timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire("Copy unavailable", "Please copy the link from the address field.", "info");
    }
  };

  /** Ask once for the admission fee (and a birth date for older entries without one). */
  const askRegisterOptions = async (family, children) => {
    const missingDob = children.filter((c) => !c.date_of_birth);
    const familyNote = family.family
      ? `Children will be added to the existing family <b>${escapeHtml(family.family.family_id)}</b>.`
      : family.matched_family
        ? `A family with the same phone already exists: <b>${escapeHtml(family.matched_family.family_id)}</b> (${escapeHtml(family.matched_family.father_name)}). The children will be added to it — no new family is created.`
        : "A new family record (with a parent login) will be created.";
    const dobInputs = missingDob.map((c) => `
      <label style="display:block;text-align:left;margin-top:10px;font-size:13px">Date of birth — ${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}
        <input type="date" id="dob-${c.id}" class="swal2-input" style="margin:4px 0 0;width:100%">
      </label>`).join("");
    const result = await Swal.fire({
      title: children.length > 1 ? `Register ${children.length} children?` : `Register ${escapeHtml(children[0].first_name)}?`,
      html: `
        <p style="font-size:14px;color:#475569">${familyNote}</p>
        <p style="font-size:13px;color:#64748b;margin-top:6px">Each child becomes an officially enrolled student (Phase 1 + Phase 2) with all the answers the parents gave. You can edit them later from Enrolled Students.</p>
        <label style="display:block;text-align:left;margin-top:12px;font-size:13px">Admission fee per child (AFN, 0 = waive)
          <input type="number" min="0" id="admission-fee" class="swal2-input" style="margin:4px 0 0;width:100%" value="${submissionMeta.admission_fee_default ?? 0}">
        </label>${dobInputs}`,
      showCancelButton: true,
      confirmButtonText: "Register",
      confirmButtonColor: "#0f766e",
      preConfirm: () => {
        const fee = document.getElementById("admission-fee").value;
        const dobs = {};
        for (const c of missingDob) {
          const value = document.getElementById(`dob-${c.id}`).value;
          if (!value) { Swal.showValidationMessage(`Enter the date of birth for ${c.first_name}.`); return false; }
          dobs[c.id] = value;
        }
        return { admission_fee: fee === "" ? 0 : Number(fee), dobs };
      },
    });
    return result.isConfirmed ? result.value : null;
  };

  const register = async (family, children) => {
    const options = await askRegisterOptions(family, children);
    if (!options) return;
    setBusy(`f${family.id}`);
    const done = [];
    const failed = [];
    // One at a time: the first registration settles the family, the rest join it.
    for (const child of children) {
      try {
        const payload = { admission_fee: options.admission_fee };
        if (options.dobs[child.id]) payload.date_of_birth = options.dobs[child.id];
        const r = await post(`/student-management/public-student-registration/children/${child.id}/register`, payload);
        done.push(r.data?.message);
      } catch (error) {
        failed.push(`${child.first_name}: ${errorText(error, "failed")}`);
      }
    }
    setBusy(null);
    await loadSubmissions().catch(() => {});
    Swal.fire({
      icon: failed.length ? (done.length ? "warning" : "error") : "success",
      title: failed.length ? "Some children were not registered" : "Registered",
      html: [...done, ...failed].map((line) => `<p style="font-size:14px;margin:4px 0">${escapeHtml(line)}</p>`).join(""),
    });
  };

  const confirmDelete = async (text) => (await Swal.fire({
    title: "Remove?", text, icon: "warning", showCancelButton: true, confirmButtonText: "Remove", confirmButtonColor: "#e11d48",
  })).isConfirmed;

  const deleteChild = async (child) => {
    if (!(await confirmDelete(`Remove ${child.first_name} ${child.last_name} from this submission? Official student records are not affected.`))) return;
    setBusy(`c${child.id}`);
    try {
      await del(`/student-management/public-student-registration/children/${child.id}`);
      await loadSubmissions();
    } catch (error) {
      Swal.fire("Unable to remove", errorText(error, "Please try again."), "error");
    } finally {
      setBusy(null);
    }
  };

  const deleteSubmission = async (family) => {
    if (!(await confirmDelete(`Remove the whole submission from ${family.father_name}? Official student records are not affected.`))) return;
    setBusy(`f${family.id}`);
    try {
      await del(`/student-management/public-student-registration/submissions/${family.id}`);
      await loadSubmissions();
    } catch (error) {
      Swal.fire("Unable to remove", errorText(error, "Please try again."), "error");
    } finally {
      setBusy(null);
    }
  };

  const toggle = (key) => setOpenDetails((current) => ({ ...current, [key]: !current[key] }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-700 p-6 text-white shadow">
        <div>
          <p className="text-sm font-medium text-teal-100">Student Management</p>
          <h1 className="mt-1 text-2xl font-bold">Public Student Registration</h1>
          <p className="mt-2 text-sm text-teal-50">Share a link with families, review what they submitted, and register them in one click.</p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            {!user?.branch_id && (
              <select aria-label="Branch for registration link" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-xl border border-white/40 bg-white/10 px-3 py-3 text-white outline-none [&>option]:text-slate-800">
                <option value="">Select branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            )}
            <button type="button" onClick={createLink} disabled={creating || (!user?.branch_id && !branchId)} className="rounded-xl bg-white px-5 py-3 font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 disabled:opacity-60">
              {creating ? "Creating…" : "Create registration link"}
            </button>
          </div>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Registration links</h2>
          <button type="button" onClick={refresh} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">Refresh</button>
        </div>
        {loading ? <p className="py-8 text-center text-slate-500">Loading…</p> : links.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">No public registration links yet.</p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <article key={link.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${link.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {link.is_active ? "Active" : "Disabled"}
                    </span>
                    <span className="text-sm text-slate-500">{link.branch || "School branch"}</span>
                  </div>
                  <p className="mt-2 break-all text-sm text-slate-700">{absoluteUrl(link.url)}</p>
                  <p className="mt-1 text-xs text-slate-500">{link.submissions_count} families · {link.children_count} children</p>
                </div>
                <div className="flex gap-2">
                  {canCopy && link.is_active && <button type="button" onClick={() => copyLink(link.url)} className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100">Copy link</button>}
                  {canUpdate && <button type="button" onClick={() => toggleLink(link)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{link.is_active ? "Disable" : "Enable"}</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Family submissions <span className="text-sm font-normal text-slate-500">({submissionMeta.total})</span></h2>
          {submissionMeta.last_page > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button type="button" disabled={submissionPage <= 1 || loading} onClick={() => setSubmissionPage((page) => page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50">Previous</button>
              <span className="text-slate-500">{submissionMeta.current_page} / {submissionMeta.last_page}</span>
              <button type="button" disabled={submissionPage >= submissionMeta.last_page || loading} onClick={() => setSubmissionPage((page) => page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
        {loading ? <p className="py-8 text-center text-slate-500">Loading…</p> : submissions.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">No families have submitted a registration yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((family) => {
              const pending = family.children.filter((c) => c.status !== "registered");
              const linkedFamily = family.family || family.matched_family;
              const familyBusy = busy === `f${family.id}`;
              return (
                <article key={family.id} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800">{family.father_name}{family.mother_name ? ` & ${family.mother_name}` : ""}</h3>
                      <p className="mt-1 text-sm text-slate-600" dir="auto">Father: <span dir="ltr">{family.father_phone}</span>{family.mother_phone ? <> · Mother: <span dir="ltr">{family.mother_phone}</span></> : null}{family.whatsapp_number ? <> · WhatsApp: <span dir="ltr">{family.whatsapp_number}</span></> : null}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {family.branch || "Branch"} · {family.created_at ? new Date(family.created_at).toLocaleDateString() : ""}
                        {linkedFamily && (
                          <span className={`ml-2 rounded-full px-2 py-0.5 font-semibold ${family.family ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                            {family.family ? "Family" : "Existing family found"}: {linkedFamily.family_id}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => toggle(`f${family.id}`)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                        {openDetails[`f${family.id}`] ? "Hide family details" : "Family details"}
                      </button>
                      {canRegister && pending.length > 0 && (
                        <button type="button" disabled={familyBusy} onClick={() => register(family, pending)} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                          {familyBusy ? "Working…" : pending.length > 1 ? `Register all (${pending.length})` : "Register"}
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" disabled={familyBusy} onClick={() => deleteSubmission(family)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60">Remove</button>
                      )}
                    </div>
                  </div>
                  {openDetails[`f${family.id}`] && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                      <DetailGrid sections={FAMILY_DETAIL_SECTIONS} details={family.details} />
                    </div>
                  )}
                  <div className="divide-y divide-slate-100">
                    {family.children.map((child) => {
                      const registered = child.status === "registered";
                      return (
                        <div key={child.id} className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800">{child.first_name} {child.last_name}</p>
                              <p className="text-sm text-slate-500">
                                {child.class || "Class unavailable"}{child.grade ? ` · ${child.grade}` : ""}
                                {child.gender ? ` · ${child.gender === "male" ? "Male" : "Female"}` : ""}
                                {child.date_of_birth ? ` · Born ${child.date_of_birth}` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${registered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                                {registered ? `Registered${child.student?.student_id ? ` · ${child.student.student_id}` : ""}` : "Not registered"}
                              </span>
                              <button type="button" onClick={() => toggle(`c${child.id}`)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">
                                {openDetails[`c${child.id}`] ? "Hide" : "Details"}
                              </button>
                              {registered && child.student?.id && (
                                <Link to={`/student-management/students/show/${child.student.id}`} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100">Open student</Link>
                              )}
                              {canRegister && !registered && (
                                <button type="button" disabled={familyBusy} onClick={() => register(family, [child])} className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60">Register</button>
                              )}
                              {canDelete && (
                                <button type="button" disabled={busy === `c${child.id}` || familyBusy} onClick={() => deleteChild(child)} className="rounded-lg px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60">Remove</button>
                              )}
                            </div>
                          </div>
                          {openDetails[`c${child.id}`] && (
                            <div className="mt-3">
                              <DetailGrid sections={CHILD_DETAIL_SECTIONS} details={child.details} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
