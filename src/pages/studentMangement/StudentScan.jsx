import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowRight, FiLock, FiLogIn, FiUser } from "react-icons/fi";
import { get } from "../../api/axios";

/**
 * Where a scanned student card lands: /s/<token>.
 *
 * The card in someone's hand proves nothing about who is holding it, so this
 * page grants nothing. It asks the server who the signed-in user is relative
 * to this student, and the server answers with one of four doors:
 *
 *   profile — the full student profile (leadership, and the class's own
 *             teachers who hold student-profiles.view)
 *   record  — the student record (staff who may see students, but not the
 *             deeper profile)
 *   family  — the family portal, where a parent already sees exactly the
 *             sections they are entitled to for their own children
 *   none    — a refusal, with the student's name and nothing else
 *
 * Not signed in is not a failure: the card is meant to be scanned by staff and
 * parents who have accounts, so we send them to sign in and come straight back
 * here afterwards.
 */

const TEAL = "#0D5C63";

export default function StudentScan() {
  const { token } = useParams();
  const navigate = useNavigate();
  /* Whether anyone is signed in is knowable before the first render, so it is
     the starting state rather than something an effect discovers. */
  const [state, setState] = useState(() =>
    localStorage.getItem("token") ? { loading: true } : { loading: false, needsLogin: true });

  useEffect(() => {
    // Nobody signed in: the sign-in prompt is already on screen.
    if (!localStorage.getItem("token")) return undefined;

    let alive = true;
    get(`/student-card/scan/${token}`, { cache: false })
      .then((res) => alive && setState({ loading: false, data: res.data?.data }))
      .catch((e) => alive && setState({
        loading: false,
        error: e.response?.status === 404
          ? "This card is not recognised."
          : (e.response?.data?.message || "This card could not be read."),
      }));
    return () => { alive = false; };
  }, [token]);

  /* One door, and it is theirs — go straight through it. Someone who scanned a
   * card wants the student, not a page telling them they may see the student. */
  useEffect(() => {
    const d = state.data;
    if (d?.can_open && d.path) navigate(d.path, { replace: true });
  }, [state.data, navigate]);

  if (state.loading) {
    return (
      <Shell>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-500" />
        <p className="text-sm text-gray-500">Reading the card…</p>
      </Shell>
    );
  }

  if (state.needsLogin) {
    return (
      <Shell>
        <FiLogIn className="w-9 h-9" style={{ color: TEAL }} />
        <p className="text-sm text-gray-600 text-center max-w-xs">
          Sign in to open this student. You will come back here straight away.
        </p>
        <Link
          to={`/login?redirect=${encodeURIComponent(`/s/${token}`)}`}
          className="px-5 py-2 rounded-xl text-white text-sm font-bold"
          style={{ background: TEAL }}>
          Sign in
        </Link>
      </Shell>
    );
  }

  if (state.error) {
    return (
      <Shell>
        <FiLock className="w-9 h-9 text-gray-300" />
        <p className="text-sm text-gray-600">{state.error}</p>
        <Link to="/" className="text-sm font-semibold hover:underline" style={{ color: TEAL }}>
          Go to WEN
        </Link>
      </Shell>
    );
  }

  const { student, viewer, can_open: canOpen } = state.data || {};

  // Only reached when the door was "none" — the redirect above handles the rest.
  return (
    <Shell>
      <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#E0F2F1" }}>
        {student?.photo_url
          ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
          : <FiUser className="w-7 h-7" style={{ color: TEAL }} />}
      </div>

      <div className="text-center">
        <h1 className="text-lg font-extrabold" style={{ color: "#0A3A3E" }} dir="auto">
          {student?.full_name || "—"}
        </h1>
        {student?.class && <p className="text-xs text-gray-500 mt-0.5" dir="auto">{student.class}</p>}
      </div>

      {canOpen ? (
        <div className="animate-spin rounded-full h-6 w-6 border-4 border-teal-100 border-t-teal-500" />
      ) : (
        <>
          <p className="text-sm text-gray-600 text-center max-w-xs">
            {viewer
              ? "Your account does not have access to this student."
              : "Sign in with an account that has access to this student."}
          </p>
          {viewer && (
            <p className="text-[11px] text-gray-400 text-center">
              Signed in as {viewer.name}. Ask the administration if this is wrong.
            </p>
          )}
          <Link to="/" className="text-sm font-semibold hover:underline" style={{ color: TEAL }}>
            Go to WEN
          </Link>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border p-8 flex flex-col items-center gap-4"
        style={{ borderColor: "#E3EDED" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ color: TEAL, fontWeight: 800, letterSpacing: "0.5px" }}>WIFAQ</span>
          <FiArrowRight className="w-3 h-3 text-gray-300" />
          <span className="text-xs text-gray-400">Student card</span>
        </div>
        {children}
      </div>
    </div>
  );
}
