import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { auth, db } from "../firebase";
import { toDate } from "../services/customerService";
import "./SmsHistory.css";

const money = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const smsDate = (item) => {
  const value = item.timestamp || item.updatedAt;
  return value ? toDate(value).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" }) : "—";
};

export default function SmsHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const ownerId = auth.currentUser?.uid;
      if (!ownerId) throw new Error("Please sign in to view SMS history.");
      const snapshot = await getDocs(query(collection(db, "smsHistory"), where("ownerId", "==", ownerId)));
      setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)));
    } catch (err) { setError(err.message || "Could not load SMS history."); }
    finally { setLoading(false); }
  }, []);
  // Load Firestore history when the page opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  return <div className="app-layout"><Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main className="main-content">
    <Topbar title="SMS History" subtitle="Payment receipts and manually confirmed SMS status" onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
    <section className="sms-history-content"><section className="customers-card"><div className="table-header"><div><h3>Payment receipt history</h3><span>SMS_APP_OPENED means the messaging app was launched; only CONFIRMED_SENT is manually confirmed.</span></div><button className="sms-history-refresh" onClick={load}>Refresh</button></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {loading ? <div className="empty-state"><p>Loading SMS history…</p></div> : items.length === 0 ? <div className="empty-state"><p>No SMS history yet. Each recorded payment will appear here.</p></div> : <div className="table-wrapper"><table><thead><tr><th>Payment date</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Balance after</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{smsDate(item)}</td><td>{item.customerName || "—"}</td><td>{item.phoneNumber || "—"}</td><td>{money(item.amountPaid)}</td><td>{money(item.remainingBalance)}</td><td><span className={`sms-history-status ${(item.status || "NOT_SENT").toLowerCase()}`}>{item.status || "NOT_SENT"}</span></td><td><details><summary>View</summary><p className="sms-history-message">{item.messageContent || "Receipt content will be generated when you open the SMS app."}</p></details></td></tr>)}</tbody></table></div>}
    </section></section>
  </main></div>;
}
