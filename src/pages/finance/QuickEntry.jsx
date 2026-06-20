import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getChartOfAccounts,
  getAccounts,
  createJournalEntry,
} from "../../api/financial";
import { DateField } from "../../components/hr/HrUI";

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Asset & Loan Book — wraps the raw "create a balanced journal entry" UX
 * inside five plain-English wizards so a non-accountant can do balance-sheet
 * events (bought a computer, received a loan, paid down a loan, recorded an
 * advance from the owner, etc.) without ever seeing "debit" or "credit".
 *
 * Each scenario produces a balanced JE — the form picks the right two
 * chart codes for the user. Goes through the existing JournalEntry store
 * endpoint so all the audit + BudgetTrackingService observers fire as
 * normal. Posts as `draft`; the Journal Entries page handles posting.
 *
 * Scenarios (auto-grouped by what the user is trying to model):
 *   ─── Assets ──────────────────────────────────
 *   • Bought a fixed asset    Dr Asset    Cr Cash/Bank
 *   • Recorded an opening balance for an asset    Dr Asset  Cr Owner Contribution
 *   ─── Liabilities ─────────────────────────────
 *   • Received a loan / debt    Dr Cash/Bank   Cr Liability
 *   • Paid down a loan / liability    Dr Liability   Cr Cash/Bank
 *   ─── Equity ──────────────────────────────────
 *   • Owner contributed cash    Dr Cash/Bank   Cr Owner Contribution
 */

const SCENARIOS = [
  {
    key: "buy_asset",
    side: "Asset",
    title: "Bought a fixed asset",
    blurb: "Computer, vehicle, furniture, building, equipment. Money goes out, an asset comes in.",
    icon: "M3 7h18M3 11h18M3 15h18M3 19h18",
    tone: "emerald",
    debitType: "Asset",          // user picks which Asset chart code
    creditSource: "cash",        // and a cash/bank account
    actionLabel: "Record purchase",
  },
  {
    key: "opening_asset",
    side: "Asset",
    title: "Opening balance for an asset",
    blurb: "Telling the books \"we already own this\" — typically used once on go-live for existing equipment.",
    icon: "M12 8v8m-4-4h8",
    tone: "emerald",
    debitType: "Asset",
    creditCode: "3100",          // hard-routed to Owner Contribution
    actionLabel: "Record opening balance",
  },
  {
    key: "receive_loan",
    side: "Liability",
    title: "Received a loan or debt",
    blurb: "Cash comes in, we now owe someone. The liability goes up, cash goes up.",
    icon: "M12 4v16m-8-8h16",
    tone: "amber",
    debitSource: "cash",         // money lands in a cash account
    creditType: "Liability",     // user picks which Liability chart code
    actionLabel: "Record loan received",
  },
  {
    key: "pay_liability",
    side: "Liability",
    title: "Paid down a loan or bill",
    blurb: "Cash goes out, the liability shrinks. Use this for loan repayments or paying a past-due bill.",
    icon: "M12 8v8m-4-4h8M9 4l3 4 3-4",
    tone: "amber",
    debitType: "Liability",
    creditSource: "cash",
    actionLabel: "Record payment",
  },
  {
    key: "owner_contribution",
    side: "Equity",
    title: "Owner contributed cash",
    blurb: "Money comes in from the owner. Cash up, equity up.",
    icon: "M5 13l4 4L19 7",
    tone: "indigo",
    debitSource: "cash",
    creditCode: "3100",
    actionLabel: "Record contribution",
  },
];

export default function QuickEntry() {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(null);
  const [allCharts, setAllCharts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    Promise.all([
      getChartOfAccounts({ per_page: 1000 }).then((r) => setAllCharts(r.data?.data?.data || r.data?.data || [])),
      getAccounts({ per_page: 200 }).then((r) => setCashAccounts(r.data?.data?.data || r.data?.data || [])),
    ]).finally(() => setLoadingCharts(false));
  }, []);

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto space-y-4">
      {/* ───── Hero ───── */}
      <div className="bg-gradient-to-br from-teal-600 via-emerald-700 to-emerald-800 text-white rounded-2xl shadow-lg overflow-hidden">
        <div className="relative px-6 py-5">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-widest text-teal-100 font-bold">Balance-sheet bookkeeping</p>
            <h1 className="text-2xl font-black mt-1">Asset &amp; Loan Book</h1>
            <p className="text-[12px] text-teal-100 mt-2 max-w-xl">
              Record things the school <strong>bought</strong>, <strong>borrowed</strong>, <strong>paid back</strong>,
              or received from the <strong>owner</strong>. Pick what actually happened —
              the system handles the debits and credits for you, and saves it as a
              draft journal entry you can review before posting.
            </p>
          </div>
        </div>
      </div>

      {/* ───── Scenario grid ───── */}
      {!scenario && (
        <div className="space-y-5">
          {/* Group by side for visual structure */}
          {["Asset", "Liability", "Equity"].map((side) => {
            const inSide = SCENARIOS.filter((s) => s.side === side);
            if (inSide.length === 0) return null;
            return (
              <section key={side}>
                <h2 className="text-[11px] uppercase tracking-widest font-black text-gray-500 mb-2 px-1">
                  {side === "Asset"
                    ? "Things the school owns"
                    : side === "Liability"
                    ? "Things the school owes"
                    : "Money from the owner"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inSide.map((s) => (
                    <ScenarioTile key={s.key} scenario={s} onPick={() => setScenario(s)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ───── Active scenario form ───── */}
      {scenario && (
        <ScenarioForm
          scenario={scenario}
          allCharts={allCharts}
          cashAccounts={cashAccounts}
          loadingCharts={loadingCharts}
          onBack={() => setScenario(null)}
          onSaved={(entryId) => {
            Swal.fire({
              icon: "success",
              title: "Draft entry created",
              text: "Open the Journal Entries page to review and post.",
              showCancelButton: true,
              confirmButtonText: "View entry",
              cancelButtonText: "Record another",
              confirmButtonColor: "#0d9488",
            }).then((r) => {
              if (r.isConfirmed && entryId) navigate(`/finance/journal-entries/show/${entryId}`);
              else setScenario(null);
            });
          }}
        />
      )}
    </div>
  );
}

function ScenarioTile({ scenario, onPick }) {
  const toneClass = {
    emerald: "bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-800",
    amber:   "bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-800",
    indigo:  "bg-indigo-50 border-indigo-200 hover:border-indigo-400 text-indigo-800",
  }[scenario.tone];
  const iconBg = {
    emerald: "bg-emerald-600",
    amber:   "bg-amber-600",
    indigo:  "bg-indigo-600",
  }[scenario.tone];
  return (
    <button
      onClick={onPick}
      className={`text-left p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} text-white flex items-center justify-center shrink-0`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={scenario.icon} />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{scenario.title}</p>
          <p className="text-[11px] mt-1 opacity-80 leading-snug">{scenario.blurb}</p>
        </div>
      </div>
    </button>
  );
}

function ScenarioForm({ scenario, allCharts, cashAccounts, loadingCharts, onBack, onSaved }) {
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [debitChartId, setDebitChartId] = useState("");
  const [creditChartId, setCreditChartId] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resolve hard-coded chart codes to ids on mount.
  useEffect(() => {
    if (scenario.debitCode) {
      const c = allCharts.find((x) => x.code === scenario.debitCode);
      if (c) setDebitChartId(c.id);
    }
    if (scenario.creditCode) {
      const c = allCharts.find((x) => x.code === scenario.creditCode);
      if (c) setCreditChartId(c.id);
    }
  }, [scenario, allCharts]);

  // The pickable chart-of-accounts row, filtered to the type the scenario needs.
  // We always show level-3+ leaves (parents aren't booked against).
  const pickableCharts = useMemo(() => {
    const type = scenario.debitType || scenario.creditType;
    if (!type) return [];
    return allCharts
      .filter((c) => c.type === type && c.is_active !== false && (c.level ?? 1) >= 3)
      .sort((a, b) => String(a.code).localeCompare(String(b.code)));
  }, [allCharts, scenario]);

  // Pre-resolve the chart id of the picked cash Account so we can post a line.
  const cashAcc = cashAccounts.find((a) => String(a.id) === String(cashAccountId));
  const cashChartId = cashAcc?.chart_account_id;

  const formValid =
    Number(amount) > 0 &&
    (
      // Either side picked + cash side picked
      ((scenario.debitType ? !!debitChartId : !!debitChartId || !!scenario.debitSource) &&
       (scenario.creditType ? !!creditChartId : !!creditChartId || !!scenario.creditSource))
    ) &&
    (
      (scenario.debitSource || scenario.creditSource) ? !!cashAccountId : true
    );

  const submit = async () => {
    if (!formValid || submitting) return;
    const amt = Number(amount);

    // Resolve the final debit + credit chart accounts based on the scenario.
    let debitId  = scenario.debitType  ? debitChartId  : (scenario.debitSource  === "cash" ? cashChartId : debitChartId);
    let creditId = scenario.creditType ? creditChartId : (scenario.creditSource === "cash" ? cashChartId : creditChartId);

    if (!debitId || !creditId) {
      Swal.fire("Missing details", "Pick the accounts before saving.", "warning");
      return;
    }

    const description = note.trim() || scenario.title;

    setSubmitting(true);
    try {
      const res = await createJournalEntry({
        description,
        transaction_date: date,
        lines: [
          {
            chart_account_id: debitId,
            description,
            debit: amt,
            credit: 0,
            // If the debit side is the cash account, tag the JE line with the
            // account_id so the per-account ledger view shows it too.
            account_id: scenario.debitSource === "cash" ? Number(cashAccountId) : null,
          },
          {
            chart_account_id: creditId,
            description,
            debit: 0,
            credit: amt,
            account_id: scenario.creditSource === "cash" ? Number(cashAccountId) : null,
          },
        ],
      });
      const id = res.data?.data?.id;
      onSaved(id);
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not save the entry.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Back to scenarios"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{scenario.side}</p>
          <h2 className="text-base font-bold text-gray-900">{scenario.title}</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{scenario.blurb}</p>
        </div>
      </header>

      <div className="p-5 space-y-4">
        {/* Pick the account on the non-cash side */}
        {(scenario.debitType || scenario.creditType) && !scenario.debitCode && !scenario.creditCode && (
          <Field label={
            scenario.debitType
              ? `Which ${scenario.debitType.toLowerCase()} did this affect?`
              : `Which ${scenario.creditType.toLowerCase()} did this affect?`
          }>
            <ChartPicker
              charts={pickableCharts}
              value={scenario.debitType ? debitChartId : creditChartId}
              onChange={(id) => (scenario.debitType ? setDebitChartId(id) : setCreditChartId(id))}
              loading={loadingCharts}
              kind={scenario.debitType || scenario.creditType}
            />
          </Field>
        )}

        {/* Cash/Bank source for cash-side scenarios */}
        {(scenario.debitSource === "cash" || scenario.creditSource === "cash") && (
          <Field label={scenario.debitSource === "cash" ? "Money landed in which account?" : "Money was paid from which account?"}>
            <CashAccountPicker
              accounts={cashAccounts}
              value={cashAccountId}
              onChange={setCashAccountId}
            />
          </Field>
        )}

        {/* Amount + date side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (AFN)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-300 focus:border-teal-400 font-mono text-right"
            />
          </Field>
          <Field label="Date">
            <DateField
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-300 focus:border-teal-400"
            />
          </Field>
        </div>

        <Field label="Note (optional)">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`e.g. "${scenario.title} — Dell laptop for the principal's office"`}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-300 focus:border-teal-400"
          />
        </Field>

        {/* Preview — show what JE will be posted, in plain English */}
        {Number(amount) > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
              What gets recorded
            </p>
            <JePreview
              scenario={scenario}
              amount={Number(amount)}
              allCharts={allCharts}
              cashAccounts={cashAccounts}
              debitChartId={debitChartId}
              creditChartId={creditChartId}
              cashAccountId={cashAccountId}
            />
          </div>
        )}
      </div>

      <footer className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!formValid || submitting}
          className="px-5 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : scenario.actionLabel}
        </button>
      </footer>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ChartPicker({ charts, value, onChange, loading, kind }) {
  if (loading) {
    return <div className="px-3 py-2.5 text-xs text-gray-400">Loading…</div>;
  }
  if (charts.length === 0) {
    return (
      <div className="px-3 py-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
        No {kind?.toLowerCase()} chart accounts found. Add one under Setup → Chart of Accounts first.
      </div>
    );
  }
  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
      {charts.map((c) => {
        const selected = String(value) === String(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
              selected ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"
            }`}
          >
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${selected ? "text-teal-800" : "text-gray-800"}`}>{c.name}</p>
              {c.description && (
                <p className="text-[10px] text-gray-500 truncate">{c.description}</p>
              )}
            </div>
            <span className={`text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded ${
              selected ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"
            }`}>{c.code}</span>
          </button>
        );
      })}
    </div>
  );
}

function CashAccountPicker({ accounts, value, onChange }) {
  if (accounts.length === 0) {
    return (
      <div className="px-3 py-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
        No cash/bank accounts found. Add one under Setup → Accounts first.
      </div>
    );
  }
  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
      {accounts.map((a) => {
        const selected = String(value) === String(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
              selected ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"
            }`}
          >
            <div>
              <p className={`text-sm font-semibold ${selected ? "text-teal-800" : "text-gray-800"}`}>{a.account_name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{a.account_type}</p>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">{fmt(a.current_balance)} AFN</p>
          </button>
        );
      })}
    </div>
  );
}

function JePreview({ scenario, amount, allCharts, cashAccounts, debitChartId, creditChartId, cashAccountId }) {
  const dChart = allCharts.find((c) => String(c.id) === String(
    scenario.debitType ? debitChartId : (scenario.debitSource === "cash" ? cashAccounts.find((a) => String(a.id) === String(cashAccountId))?.chart_account_id : debitChartId)
  ));
  const cChart = allCharts.find((c) => String(c.id) === String(
    scenario.creditType ? creditChartId : (scenario.creditSource === "cash" ? cashAccounts.find((a) => String(a.id) === String(cashAccountId))?.chart_account_id : creditChartId)
  ));
  return (
    <div className="space-y-1.5 text-[12px]">
      <div className="flex items-center justify-between">
        <span className="text-emerald-700">↑ <strong>{dChart?.name || "—"}</strong> goes up</span>
        <span className="font-mono font-bold text-emerald-700">+{fmt(amount)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-red-700">↓ <strong>{cChart?.name || "—"}</strong> goes {cChart?.type === "Asset" ? "down" : "up (we owe more)"}</span>
        <span className="font-mono font-bold text-red-700">−{fmt(amount)}</span>
      </div>
    </div>
  );
}
