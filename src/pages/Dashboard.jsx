import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { toDate } from "../services/customerService";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

const money = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK")}`;
function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [monthlyPayments, setMonthlyPayments] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const loadDashboard = useCallback(() => setRefreshKey((key) => key + 1), []);
  useEffect(() => {
    setCustomersLoading(true);
    setTodayLoading(true);
    setMonthLoading(true);
    setError("");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const ownerId = auth.currentUser?.uid;
    if (!ownerId) {
      setError("Please sign in to load your dashboard.");
      setCustomersLoading(false);
      setTodayLoading(false);
      setMonthLoading(false);
      return undefined;
    }
    const markReady = (key) => {
      if (key === "customers") setCustomersLoading(false);
      if (key === "today") setTodayLoading(false);
      if (key === "month") setMonthLoading(false);
    };
    const fail = (snapshotKey, err) => {
      setError(err.message || "Could not load dashboard data.");
      markReady(snapshotKey);
    };
    const unsubscribers = [
      onSnapshot(query(collection(db, "customers"), where("ownerId", "==", ownerId)), (snapshot) => {
        setCustomers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        markReady("customers");
      }, (err) => fail("customers", err)),
      onSnapshot(query(collection(db, "payments"), where("ownerId", "==", ownerId), where("paymentDate", ">=", Timestamp.fromDate(todayStart)), where("paymentDate", "<", Timestamp.fromDate(tomorrowStart))), (snapshot) => {
        setPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => toDate(b.paymentDate) - toDate(a.paymentDate)));
        markReady("today");
      }, (err) => fail("today", err)),
      onSnapshot(query(collection(db, "payments"), where("ownerId", "==", ownerId), where("paymentDate", ">=", Timestamp.fromDate(monthStart)), where("paymentDate", "<", Timestamp.fromDate(nextMonthStart))), (snapshot) => {
        setMonthlyPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        markReady("month");
      }, (err) => fail("month", err)),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [refreshKey]);
  const activeCustomers = customers.filter((customer) => customer.status === "active");
  const recovery = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const monthlyRecovery = monthlyPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outstanding = activeCustomers.reduce((sum, customer) => sum + Number(customer.remainingBalance ?? customer.totalPayable ?? 0), 0);
  const principalDisbursed = customers.reduce((sum, customer) => sum + Number(customer.loanAmount || 0), 0);

  return <div className="app-layout"><Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main className="main-content">
    <Topbar title="Dashboard" subtitle="Here's what's happening with your loans today." onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
    <section className="dashboard-content">
      {error && <p className="dashboard-error" role="alert">{error}<button onClick={loadDashboard}>Retry</button></p>}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue">👥</div><div><span>Total Customers</span><h2>{customersLoading ? "—" : customers.length}</h2><small>Registered customers</small></div></div>
        <div className="stat-card"><div className="stat-icon purple">💳</div><div><span>Active Loans</span><h2>{customersLoading ? "—" : activeCustomers.length}</h2><small>Currently active</small></div></div>
        <div className="stat-card"><div className="stat-icon green">💰</div><div><span>Today’s Recovery</span><h2 className="stat-money">{todayLoading ? "—" : money(recovery)}</h2><small>Payments recorded today</small></div></div>
        <div className="stat-card"><div className="stat-icon green">▦</div><div><span>This Month’s Collections</span><h2 className="stat-money">{monthLoading ? "—" : money(monthlyRecovery)}</h2><small>Payments recorded this month</small></div></div>
        <div className="stat-card"><div className="stat-icon blue">↗</div><div><span>Principal Disbursed</span><h2 className="stat-money">{customersLoading ? "—" : money(principalDisbursed)}</h2><small>Total original loan principal</small></div></div>
        <div className="stat-card"><div className="stat-icon red">◉</div><div><span>Outstanding with Interest</span><h2 className="stat-money">{customersLoading ? "—" : money(outstanding)}</h2><small>Remaining active loan balances</small></div></div>
      </div>
      <section className="dashboard-card collections-card"><div className="card-header"><div><h3>Today’s Collections</h3><p>Payments recorded today</p></div><button className="view-button" onClick={loadDashboard}>Refresh</button></div>
        {todayLoading ? <div className="empty-state"><p>Loading today’s collections…</p></div> : payments.length === 0 ? <div className="empty-state"><div className="empty-icon">💰</div><h4>No collections today</h4><p>Payments recorded today will appear here.</p></div> : <>
          <div className="dashboard-mobile-payments">{payments.map((payment) => <article className="dashboard-mobile-payment" key={payment.id}><Link className="dashboard-customer-link" to={`/customers/${payment.customerId}`}>{payment.customerName || "Customer"}</Link><span>{toDate(payment.createdAt || payment.paymentDate).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })}</span><strong>{money(payment.amount)}</strong></article>)}<div className="dashboard-mobile-total"><span>Today’s total recovery</span><strong>{money(recovery)}</strong></div></div>
          <div className="table-wrapper dashboard-desktop-payments"><table><thead><tr><th>Customer</th><th>Amount</th><th>Time</th><th>Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><Link className="dashboard-customer-link" to={`/customers/${payment.customerId}`}>{payment.customerName || "Customer"}</Link></td><td>{money(payment.amount)}</td><td>{toDate(payment.createdAt || payment.paymentDate).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })}</td><td><span className="status-badge active">Paid</span></td></tr>)}</tbody><tfoot><tr><th colSpan="1">Today’s Total Recovery</th><th colSpan="3">{money(recovery)}</th></tr></tfoot></table></div>
        </>}
      </section>
      <div className="dashboard-shortcut"><span>Need to manage a customer?</span><Link to="/customers">View customers →</Link></div>
    </section>
  </main></div>;
}
export default Dashboard;
