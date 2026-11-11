import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import PaymentSmsActions from "../components/PaymentSmsActions";
import { db } from "../firebase";
import { getCustomers, getPaymentsForDate, recordPayment } from "../services/customerService";
import "./Collections.css";

const money = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK")}`;
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Collections() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [collectingId, setCollectingId] = useState("");

  const loadCollections = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [customerRows, paymentRows] = await Promise.all([getCustomers(db), getPaymentsForDate(db)]);
      setCustomers(customerRows); setPayments(paymentRows);
    } catch (err) { setError(err.message || "Could not load today’s collections."); }
    finally { setLoading(false); }
  }, []);

  // Load today's roster and collection records when the page opens.
  // Load the route after the page mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCollections(); }, [loadCollections]);

  const todayByCustomer = useMemo(() => payments.reduce((result, payment) => {
    result[payment.customerId] = (result[payment.customerId] || 0) + Number(payment.amount || 0);
    return result;
  }, {}), [payments]);
  const latestPaymentByCustomer = useMemo(() => payments.reduce((result, payment) => {
    const current = result[payment.customerId];
    const paymentTime = payment.createdAt?.toMillis?.() ?? payment.createdAt?.toDate?.().getTime?.() ?? 0;
    const currentTime = current?.createdAt?.toMillis?.() ?? current?.createdAt?.toDate?.().getTime?.() ?? 0;
    if (!current || paymentTime >= currentTime) result[payment.customerId] = payment;
    return result;
  }, {}), [payments]);
  const activeCustomers = customers.filter((customer) => customer.status === "active");
  const collectionCustomers = customers.filter((customer) => customer.status === "active" || todayByCustomer[customer.id] > 0);
  const totalCollected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outstandingToday = activeCustomers.reduce((sum, customer) => {
    const todayAmount = todayByCustomer[customer.id] || 0;
    const balance = Number(customer.remainingBalance ?? customer.totalPayable ?? 0);
    return sum + Math.max(0, Math.min(Number(customer.expectedPayment || 0) - todayAmount, balance));
  }, 0);

  const collectToday = async (customer, amount) => {
    setCollectingId(customer.id); setError(""); setSuccess("");
    try {
      await recordPayment(db, customer, { amount, paymentDate: localDate(), paymentMethod: "Cash" });
      setSuccess(`Collected ${money(amount)} from ${customer.name}.`);
      await loadCollections();
    } catch (err) { setError(err.message || "Could not record this collection."); }
    finally { setCollectingId(""); }
  };

  return <div className="app-layout">
    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="main-content">
      <Topbar title="Collections" subtitle="Today’s customers and expected collections" onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <section className="collections-content">
        <div className="collections-intro"><div><h2>Today’s Collection Route</h2><p>Track daily installments and record collections as you visit customers.</p></div><span className="collection-date">{new Date().toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
        {error && <p className="inline-error" role="alert">{error} <button onClick={loadCollections}>Retry</button></p>}
        {success && <p className="inline-success" role="status">{success}</p>}
        <div className="collection-summary">
          <div><span>Active Customers</span><strong>{loading ? "—" : activeCustomers.length}</strong></div>
          <div><span>Collected Today</span><strong>{loading ? "—" : money(totalCollected)}</strong></div>
          <div><span>Expected Still Due</span><strong>{loading ? "—" : money(outstandingToday)}</strong></div>
        </div>
        <section className="customers-card collection-list-card">
          <div className="table-header"><div><h3>Customers to Collect</h3><span>Daily collection progress for active loans</span></div></div>
          {loading ? <div className="empty-state"><p>Loading today’s route…</p></div> : collectionCustomers.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><h3>No active collections</h3><p>Customers with active loans will appear here.</p></div> :
            <><div className="collection-mobile-cards">{collectionCustomers.map((customer) => {
              const balance = Number(customer.remainingBalance ?? customer.totalPayable ?? 0);
              const expected = Number(customer.expectedPayment || 0);
              const collected = todayByCustomer[customer.id] || 0;
              const due = Math.max(0, Math.min(expected - collected, balance));
              const isPaid = expected > 0 && (due <= 0 || balance <= 0);
              const payment = latestPaymentByCustomer[customer.id];
              return <article className="collection-mobile-card" key={customer.id}>
                <div className="collection-mobile-heading"><Link className="collection-customer-link" to={`/customers/${customer.id}`}>{customer.name}</Link><span className={`status-badge ${isPaid ? "active" : "due"}`}>{expected <= 0 ? "No daily amount" : isPaid ? "Collected" : collected > 0 ? "Partially collected" : "Due"}</span></div>
                <a className="collection-mobile-phone" href={`tel:${customer.phone}`}>{customer.phone || "No phone number"}</a>
                <div className="collection-mobile-values"><div><span>Expected</span><strong>{money(expected)}</strong></div><div><span>Collected</span><strong>{money(collected)}</strong></div><div><span>Balance</span><strong>{money(balance)}</strong></div></div>
                <button className="collect-button collection-mobile-collect" disabled={isPaid || collectingId === customer.id || expected <= 0} onClick={() => collectToday(customer, due)}>{collectingId === customer.id ? "Saving…" : isPaid ? "Collected" : `Collect ${money(due)}`}</button>
                {payment && <PaymentSmsActions db={db} customer={customer} payment={payment} />}
              </article>;
            })}</div>
            <div className="table-wrapper collection-desktop-table"><table><thead><tr><th>Customer</th><th>Phone</th><th>Expected Today</th><th>Collected Today</th><th>Remaining Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {collectionCustomers.map((customer) => {
                const balance = Number(customer.remainingBalance ?? customer.totalPayable ?? 0);
                const expected = Number(customer.expectedPayment || 0);
                const collected = todayByCustomer[customer.id] || 0;
                const due = Math.max(0, Math.min(expected - collected, balance));
                const isPaid = expected > 0 && (due <= 0 || balance <= 0);
                const payment = latestPaymentByCustomer[customer.id];
                return <tr key={customer.id}>
                  <td><div className="customer-name"><div className="customer-avatar">{customer.name?.charAt(0)?.toUpperCase()}</div><Link className="collection-customer-link" to={`/customers/${customer.id}`}>{customer.name}</Link></div></td>
                  <td>{customer.phone || "—"}</td><td>{money(expected)}</td><td>{money(collected)}</td><td>{money(balance)}</td>
                  <td><span className={`status-badge ${isPaid ? "active" : "due"}`}>{expected <= 0 ? "No daily amount" : isPaid ? "Collected" : collected > 0 ? "Partially Collected" : "Due"}</span></td>
                  <td><div className="collection-actions"><button className="collect-button" disabled={isPaid || collectingId === customer.id || expected <= 0} onClick={() => collectToday(customer, due)}>{collectingId === customer.id ? "Saving…" : isPaid ? "Collected" : `Collect ${money(due)}`}</button></div>{payment && <PaymentSmsActions db={db} customer={customer} payment={payment} />}</td>
                </tr>;
              })}
            </tbody></table></div></>}
        </section>
      </section>
    </main>
  </div>;
}

export default Collections;
