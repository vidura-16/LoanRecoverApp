import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import PaymentSmsActions from "../components/PaymentSmsActions";
import { db } from "../firebase";
import { adjustCustomerInterest, getCustomer, getCustomerAdjustments, getCustomerPayments, recordPayment, toDate } from "../services/customerService";
import "./CustomerProfile.css";

const money = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK")}`;
const displayDate = (value, options = { day: "2-digit", month: "short", year: "numeric" }) => value ? toDate(value).toLocaleDateString("en-LK", options) : "—";

function CustomerProfile() {
  const { customerId } = useParams();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [payments, setPayments] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [showPayment, setShowPayment] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");
  const [form, setForm] = useState({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "Cash" });
  const [adjustmentForm, setAdjustmentForm] = useState({ interestAmount: "", reason: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextCustomer, nextPayments, nextAdjustments] = await Promise.all([getCustomer(db, customerId), getCustomerPayments(db, customerId), getCustomerAdjustments(db, customerId)]);
      if (!nextCustomer) { setError("Customer not found."); setCustomer(null); return; }
      setCustomer(nextCustomer); setPayments(nextPayments); setAdjustments(nextAdjustments);
    } catch (err) { setError(err.message || "Could not load customer profile."); }
    finally { setLoading(false); }
  }, [customerId]);
  // Loading Firestore data is the synchronization this effect performs.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const submitPayment = async (event) => {
    event.preventDefault(); setPaymentError(""); setSaving(true);
    try {
      await recordPayment(db, customer, form);
      await load(); setShowPayment(false); setForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "Cash" });
      setNotice("Payment recorded successfully.");
    } catch (err) { setPaymentError(err.message || "Could not record payment."); }
    finally { setSaving(false); }
  };

  const submitAdjustment = async (event) => {
    event.preventDefault(); setAdjustmentError(""); setSaving(true);
    try {
      await adjustCustomerInterest(db, customer, adjustmentForm);
      await load(); setShowAdjustment(false); setAdjustmentForm({ interestAmount: "", reason: "" });
      setNotice("Interest adjustment saved to the ledger.");
    } catch (err) { setAdjustmentError(err.message || "Could not adjust interest."); }
    finally { setSaving(false); }
  };

  const balance = Number(customer?.remainingBalance ?? ((customer?.totalPayable || 0) - (customer?.totalPaid || 0)));
  return <div className="app-layout"><Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main className="main-content">
    <Topbar title="Customer Profile" subtitle="Customer and loan details" onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
    <section className="profile-content"><Link className="back-link" to="/customers">← Back to customers</Link>
      {notice && <p className="inline-success" role="status">{notice}</p>}
      {loading ? <div className="profile-message">Loading customer profile…</div> : error ? <div className="profile-message profile-error">{error}<button onClick={load}>Retry</button></div> : customer && <>
        <div className="profile-heading"><div><div className="profile-title"><div className="profile-avatar">{customer.name?.charAt(0)?.toUpperCase()}</div><div><h2>{customer.name}</h2><span>{customer.phone}</span></div></div></div><span className={`status-badge ${customer.status === "completed" ? "completed" : "active"}`}>{customer.status === "completed" ? "Completed" : "Active"}</span></div>
        <div className="profile-panels"><section className="profile-card"><h3>Customer Information</h3><dl><div><dt>Name</dt><dd>{customer.name}</dd></div><div><dt>Phone</dt><dd>{customer.phone || "—"}</dd></div><div><dt>NIC</dt><dd>{customer.nic || "—"}</dd></div><div><dt>Address</dt><dd>{customer.address || "—"}</dd></div><div><dt>Notes</dt><dd>{customer.notes || "—"}</dd></div></dl></section>
          <section className="profile-card loan-card"><div className="loan-card-heading"><h3>Loan Summary</h3><span className={`status-badge ${customer.status === "completed" ? "completed" : "active"}`}>{customer.status === "completed" ? "Completed" : "Active"}</span></div><div className="loan-balance"><span>Remaining Balance</span><strong>{money(balance)}</strong></div><div className="loan-metrics"><div><span>Original Loan</span><strong>{money(customer.loanAmount)}</strong></div><div><span>Total Payable</span><strong>{money(customer.totalPayable)}</strong></div><div><span>Principal</span><strong>{money(customer.loanAmount)}</strong></div><div><span>Interest Charged</span><strong>{money(customer.interestAmount ?? Math.max(0, customer.totalPayable - customer.loanAmount))}</strong></div><div><span>Interest Rate / Term</span><strong>{customer.interestRate == null ? "Legacy loan" : `${customer.interestRate}% monthly · ${customer.loanMonths} months`}</strong></div><div><span>Total Paid</span><strong>{money(customer.totalPaid)}</strong></div><div><span>Expected Daily Payment</span><strong>{money(customer.expectedPayment)}</strong></div><div><span>Loan Start Date</span><strong>{displayDate(customer.loanStartDate)}</strong></div></div><button className="add-customer-button collection-button" disabled={customer.status === "completed" || balance <= 0} onClick={() => { setForm({ amount: String(customer.expectedPayment || ""), paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "Cash" }); setPaymentError(""); setShowPayment(true); }}>{customer.status === "completed" ? "Loan Completed" : "Record Today’s Collection"}</button>{customer.status !== "completed" && <button className="adjustment-button" onClick={() => { setAdjustmentForm({ interestAmount: String(customer.interestAmount ?? Math.max(0, customer.totalPayable - customer.loanAmount)), reason: "" }); setAdjustmentError(""); setShowAdjustment(true); }}>Adjust Interest / Early Settlement</button>}</section></div>
        <section className="profile-card payment-history"><div className="history-heading"><div><h3>Payment History</h3><p>{payments.length} payment{payments.length !== 1 ? "s" : ""} recorded</p></div></div>{payments.length === 0 ? <div className="history-empty">No payments recorded yet.</div> : <>
          <div className="payment-history-cards">{payments.map((payment) => <article className="payment-history-card" key={payment.id}><div className="payment-history-card-heading"><strong>{money(payment.amount)}</strong><span>{displayDate(payment.paymentDate)}</span></div><div className="payment-history-card-meta"><span>{payment.paymentMethod || "—"}</span><span>Balance: {money(payment.balanceAfterPayment)}</span></div><PaymentSmsActions db={db} customer={customer} payment={payment} /></article>)}</div>
          <div className="table-wrapper payment-history-table"><table><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Balance After Payment</th><th>SMS receipt</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{displayDate(payment.paymentDate)}</td><td>{money(payment.amount)}</td><td>{payment.paymentMethod || "—"}</td><td>{money(payment.balanceAfterPayment)}</td><td><PaymentSmsActions db={db} customer={customer} payment={payment} /></td></tr>)}</tbody></table></div>
        </>}</section>
        <section className="profile-card payment-history"><div className="history-heading"><div><h3>Interest Adjustment Ledger</h3><p>Manual changes to the scheduled interest</p></div></div>{adjustments.length === 0 ? <div className="history-empty">No interest adjustments recorded.</div> : <div className="table-wrapper"><table><thead><tr><th>Date</th><th>Previous Interest</th><th>Adjusted Interest</th><th>Balance After</th><th>Reason</th></tr></thead><tbody>{adjustments.map((item) => <tr key={item.id}><td>{displayDate(item.createdAt)}</td><td>{money(item.previousInterest)}</td><td>{money(item.newInterest)}</td><td>{money(item.balanceAfterAdjustment)}</td><td>{item.reason}</td></tr>)}</tbody></table></div>}</section>
      </>}
    </section>
  </main>
  {showPayment && customer && <div className="modal-overlay"><div className="customer-modal payment-modal"><div className="modal-header"><div><h2>Record Collection</h2><p>Record a payment from {customer.name}.</p></div><button className="close-button" onClick={() => setShowPayment(false)} aria-label="Close">×</button></div><div className="payment-context"><div><span>Previous Balance</span><strong>{money(balance)}</strong></div><div><span>Expected Payment</span><strong>{money(customer.expectedPayment)}</strong></div></div><form onSubmit={submitPayment}><div className="form-group"><label htmlFor="payment-amount">Amount Collected (LKR) *</label><input id="payment-amount" type="number" min="0.01" max={balance} step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div><div className="form-group"><label htmlFor="payment-date">Payment Date *</label><input id="payment-date" type="date" required value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} /></div><div className="form-group"><label htmlFor="payment-method">Payment Method</label><select id="payment-method" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option>Cash</option><option>Bank Transfer</option><option>Other</option></select></div>{paymentError && <p className="inline-error" role="alert">{paymentError}</p>}<div className="modal-actions"><button className="cancel-button" type="button" disabled={saving} onClick={() => setShowPayment(false)}>Cancel</button><button className="save-button" type="submit" disabled={saving}>{saving ? "Recording…" : "Record Payment"}</button></div></form></div></div>}
  {showAdjustment && customer && <div className="modal-overlay"><div className="customer-modal payment-modal"><div className="modal-header"><div><h2>Adjust Loan Interest</h2><p>Set the total interest for this loan. The outstanding balance will recalculate immediately.</p></div><button className="close-button" disabled={saving} onClick={() => setShowAdjustment(false)} aria-label="Close">×</button></div><div className="payment-context"><div><span>Scheduled Interest</span><strong>{money(customer.calculatedInterest ?? customer.interestAmount)}</strong></div><div><span>Current Outstanding</span><strong>{money(balance)}</strong></div></div><form onSubmit={submitAdjustment}><div className="form-group"><label htmlFor="adjusted-interest">Adjusted Total Interest (LKR) *</label><input id="adjusted-interest" type="number" min="0" step="0.01" required value={adjustmentForm.interestAmount} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, interestAmount: event.target.value })} /><small className="adjustment-help">For early settlement, enter the reduced interest amount (for example, one month of interest).</small></div><div className="form-group"><label htmlFor="adjustment-reason">Reason for adjustment *</label><textarea id="adjustment-reason" required rows="3" value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, reason: event.target.value })} placeholder="e.g. Early settlement in month one" /></div>{adjustmentError && <p className="inline-error" role="alert">{adjustmentError}</p>}<div className="modal-actions"><button className="cancel-button" type="button" disabled={saving} onClick={() => setShowAdjustment(false)}>Cancel</button><button className="save-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Ledger Adjustment"}</button></div></form></div></div>}
  </div>;
}
export default CustomerProfile;
