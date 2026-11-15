import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, peekCache } from '../../api/axios';
import ListExportActions from '../../components/ListExportActions';

/**
 * Salary overview — the salaries payroll has actually produced.
 *
 * Every row is a PAYSLIP: what a staff member earned in one month, what was
 * taken off it, and what they were finally paid. There is no separate
 * "snapshot" record to maintain — committing a payroll run writes the history,
 * and paying it stamps the row `paid`.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n) => `AFN ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const periodLabel = (r) => `${MONTHS[(r.period_month || 1) - 1]} ${r.period_year}`;

const EXPORT_COLUMNS = [
  { key: 'staff_code', label: 'Employee ID' },
  { key: 'staff_name', label: 'Staff' },
  { key: 'department', label: 'Department' },
  { key: 'period', label: 'Period' },
  { key: 'base_salary', label: 'Base salary', exportValue: (r) => Number(r.base_salary || 0) },
  { key: 'allowances_total', label: 'Allowances', exportValue: (r) => Number(r.allowances_total || 0) },
  { key: 'deductions_total', label: 'Deductions', exportValue: (r) => Number(r.deductions_total || 0) },
  { key: 'advance_offset', label: 'Advance recovered', exportValue: (r) => Number(r.advance_offset || 0) },
  { key: 'net_pay', label: 'Net paid', exportValue: (r) => Number(r.net_pay || 0) },
  { key: 'status', label: 'Status' },
  { key: 'paid_at', label: 'Paid at', exportValue: (r) => r.paid_at || '' },
  { key: 'paid_from', label: 'Paid from', exportValue: (r) => r.paid_from || '' },
];

const now = new Date();

export default function SalarySnapshot() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | paid | pending
  // Opens on the current month — the salaries you are working on right now.
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // '' = whole year

  useEffect(() => { fetchItems(); }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    const url = `/hr/salary-snapshot${params.toString() ? `?${params}` : ''}`;

    const apply = (payload) => {
      if (!payload) return;
      setItems(Array.isArray(payload.data) ? payload.data : []);
      setSummary(payload.summary || null);
      // The period list is unfiltered, so it keeps offering the other months.
      if (Array.isArray(payload.periods)) setPeriods(payload.periods);
    };
    try {
      apply(peekCache(url));
      const res = await get(url);
      apply(res.data);
    } catch (e) {
      console.error('Failed to load salary overview', e);
      setError(e.response?.data?.message || 'Could not load the salary overview.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Years offered: every year that has payslips, plus the current one.
  const years = useMemo(() => {
    const set = new Set(periods.map((p) => p.year));
    set.add(now.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [periods]);

  // Months that actually hold payslips in the chosen year, so the picker
  // cannot lead somewhere empty.
  const monthsWithData = useMemo(
    () => new Set(periods.filter((p) => p.year === Number(year)).map((p) => p.month)),
    [periods, year],
  );

  const periodLabelText = month ? `${MONTHS[month - 1]} ${year}` : `all of ${year}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (item.staff_name || '').toLowerCase().includes(q) ||
        (item.staff_code || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q) ||
        (item.period || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Salary Overview</h1>
            <p className="text-xs text-teal-100 mt-0.5">
              {summary
                ? `${periodLabelText} · ${summary.payslip_count} payslip(s) across ${summary.staff_count} staff`
                : 'Salaries produced by payroll'}
            </p>
          </div>
          <button
            onClick={() => navigate('/finance/payroll')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Go to Payroll
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        {/* Stat cards — straight off the payslips. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total paid', value: money(summary?.total_paid), tone: 'text-emerald-700' },
            { label: 'Awaiting payment', value: money(summary?.total_pending), tone: 'text-amber-700' },
            { label: 'Total deductions', value: money(summary?.total_deductions), tone: 'text-red-700' },
            { label: 'Average net', value: money(summary?.average_net), tone: 'text-gray-800' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-lg font-black ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Period + search + status filter + export */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            >
              <option value="">Whole year</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}{monthsWithData.has(i + 1) ? '' : ' —'}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {(month !== now.getMonth() + 1 || year !== now.getFullYear()) && (
              <button
                type="button"
                onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
                className="px-3 py-2.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-xl"
              >
                This month
              </button>
            )}
          </div>

          <div className="relative flex-1 min-w-[220px]">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff, employee ID, department or period…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-gray-400"
            />
          </div>
          {[
            { key: 'all', label: `All ${summary?.payslip_count ?? 0}` },
            { key: 'paid', label: `Paid ${summary?.paid_count ?? 0}` },
            { key: 'pending', label: `Pending ${summary?.pending_count ?? 0}` },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                statusFilter === f.key
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
              }`}
            >
              {f.label}
            </button>
          ))}
          <ListExportActions getRows={() => filtered} columns={EXPORT_COLUMNS} title="Salary overview" />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
            <p className="text-sm font-semibold text-gray-700">{error}</p>
            <button onClick={fetchItems} className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700">
              Try again
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-teal-50 border-b border-teal-100">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Base</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Allowances</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Deductions</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Net paid</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((item, i) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/finance/payroll?run=${item.payroll_run_id}`)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                      title="Open the payroll run this salary came from"
                    >
                      <td className="px-4 py-3 text-xs font-medium text-teal-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{item.staff_name}</p>
                        <p className="text-[11px] text-gray-400">
                          {item.staff_code}{item.department ? ` · ${item.department}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{periodLabel(item)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">{money(item.base_salary)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono hidden lg:table-cell">
                        {Number(item.allowances_total) > 0 ? money(item.allowances_total) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-600"
                          title={Number(item.advance_offset) > 0 ? `Includes ${money(item.advance_offset)} advance recovered` : ''}>
                        {Number(item.deductions_total) > 0 ? `− ${money(item.deductions_total)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-teal-700">{money(item.net_pay)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                        title={item.paid_at ? `Paid ${item.paid_at}${item.paid_from ? ` from ${item.paid_from}` : ''}` : 'Not paid yet'}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-400 font-medium">
                  {items.length === 0
                    ? `No salaries were run for ${periodLabelText}`
                    : 'No payslips match this filter'}
                </p>
                {items.length === 0 && periods.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[11px] text-gray-400">Periods with payslips:</span>
                    {periods.slice(0, 6).map((p) => (
                      <button
                        key={`${p.year}-${p.month}`}
                        onClick={() => { setYear(p.year); setMonth(p.month); }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg"
                      >
                        {MONTHS[p.month - 1]} {p.year} ({p.payslips})
                      </button>
                    ))}
                  </div>
                )}
                {items.length === 0 && periods.length === 0 && (
                  <button onClick={() => navigate('/finance/payroll')} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">
                    Run payroll to produce salaries
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
