import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { db } from "../firebase";
import { getPaymentsForMonth, toDate } from "../services/customerService";
import "./Payments.css";

const money = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localToday = () => dateKey(new Date());
const monthLabel = (date) => date.toLocaleDateString("en-LK", { month: "long", year: "numeric" });

function Payments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(localToday());
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true); setError("");
    try { setPayments(await getPaymentsForMonth(db, month)); }
    catch (err) { setError(err.message || "Could not load payments for this month."); }
    finally { setLoading(false); }
  }, [month]);

  // Reload the selected month when navigating the calendar.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPayments(); }, [loadPayments]);

  const paymentsByDay = useMemo(() => payments.reduce((result, payment) => {
    const key = dateKey(toDate(payment.paymentDate));
    (result[key] ||= []).push(payment);
    return result;
  }, {}), [payments]);
  const monthTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const selectedPayments = paymentsByDay[selectedDate] || [];
  const selectedTotal = selectedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const calendarCells = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  const changeMonth = (offset) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(nextMonth);
    setSelectedDate(dateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)));
  };
  const showToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  return <div className="app-layout">
    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="main-content">
      <Topbar title="Payments" subtitle="Browse recorded payments by date" onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <section className="payments-content">
        <div className="payments-summary">
          <div><span>Collected this month</span><strong>{loading ? "—" : money(monthTotal)}</strong></div>
          <div><span>Payments this month</span><strong>{loading ? "—" : payments.length}</strong></div>
          <div><span>Selected day</span><strong>{loading ? "—" : money(selectedTotal)}</strong></div>
        </div>
        {error && <p className="payments-error" role="alert">{error}<button type="button" onClick={loadPayments}>Retry</button></p>}
        <section className="payments-calendar-card">
          <div className="payments-calendar-heading">
            <div><h2>{monthLabel(month)}</h2><p>Select a day to view its recorded payments.</p></div>
            <div className="calendar-navigation"><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button><button type="button" className="calendar-today" onClick={showToday}>Today</button><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>›</button></div>
          </div>
          {loading ? <div className="payments-calendar-loading">Loading calendar…</div> : <div className="payments-calendar" role="grid" aria-label={`Payments for ${monthLabel(month)}`}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>)}
            {calendarCells.map((day, index) => day ? (() => {
              const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
              const dayPayments = paymentsByDay[key] || [];
              const dayTotal = dayPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
              return <button type="button" role="gridcell" aria-selected={selectedDate === key} aria-label={`${key}: ${dayPayments.length} payments, ${money(dayTotal)}`} className={`calendar-day ${selectedDate === key ? "selected" : ""} ${dayPayments.length ? "has-payments" : ""} ${key === localToday() ? "today" : ""}`} key={key} onClick={() => setSelectedDate(key)}>
                <span className="calendar-day-number">{day}</span>
                {dayPayments.length > 0 && <><span className="calendar-day-amount">{money(dayTotal)}</span><span className="calendar-day-count">{dayPayments.length} payment{dayPayments.length === 1 ? "" : "s"}</span></>}
              </button>;
            })() : <div className="calendar-empty-cell" key={`empty-${index}`} aria-hidden="true" />)}
          </div>}
        </section>

        <section className="payments-day-card">
          <div className="payments-day-heading"><div><h2>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p>{selectedPayments.length} payment{selectedPayments.length === 1 ? "" : "s"} · {money(selectedTotal)}</p></div></div>
          {loading ? <div className="payments-day-empty">Loading payments…</div> : selectedPayments.length === 0 ? <div className="payments-day-empty">No payments recorded for this day.</div> : <>
            <div className="payment-day-cards">{selectedPayments.map((payment) => <article className="payment-day-card" key={payment.id}><div><Link to={`/customers/${payment.customerId}`}>{payment.customerName || "Customer"}</Link><span>{payment.paymentMethod || "Payment"} · {toDate(payment.createdAt || payment.paymentDate).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })}</span></div><strong>{money(payment.amount)}</strong></article>)}</div>
            <div className="table-wrapper payment-day-table"><table><thead><tr><th>Customer</th><th>Time</th><th>Method</th><th>Amount</th><th>Balance after</th></tr></thead><tbody>{selectedPayments.map((payment) => <tr key={payment.id}><td><Link to={`/customers/${payment.customerId}`}>{payment.customerName || "Customer"}</Link></td><td>{toDate(payment.createdAt || payment.paymentDate).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })}</td><td>{payment.paymentMethod || "—"}</td><td>{money(payment.amount)}</td><td>{money(payment.balanceAfterPayment)}</td></tr>)}</tbody></table></div>
          </>}
        </section>
      </section>
    </main>
  </div>;
}

export default Payments;
