import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { db } from "../firebase";
import { createCustomer, getCustomers } from "../services/customerService";
import "./Customers.css";

const initialForm = { name: "", phone: "", nic: "", address: "", loanAmount: "", interestRate: "", loanMonths: "", loanStartDate: new Date().toISOString().slice(0, 10), notes: "" };
const money = (value) => `LKR ${Number(value || 0).toLocaleString("en-LK")}`;
const calculateLoan = (principal, rate, months) => {
  const amount = Number(principal || 0);
  const interest = amount * Number(rate || 0) * Number(months || 0) / 100;
  return { interest: Math.round(interest * 100) / 100, total: Math.round((amount + interest) * 100) / 100 };
};

function Customers() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  const loadCustomers = async () => {
    setLoading(true); setError("");
    try { setCustomers(await getCustomers(db)); }
    catch (err) { setError(err.message || "Could not load customers."); }
    finally { setLoading(false); }
  };
  // Load the customer collection when this page mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCustomers(); }, []);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const term = searchTerm.trim().toLowerCase();
    return (!term || customer.name?.toLowerCase().includes(term) || customer.phone?.toLowerCase().includes(term)) &&
      (statusFilter === "All" || customer.status === statusFilter.toLowerCase());
  }), [customers, searchTerm, statusFilter]);
  const calculatedLoan = calculateLoan(formData.loanAmount, formData.interestRate, formData.loanMonths);
  const termDays = Number(formData.loanMonths || 0) * 30;
  const expectedDailyPayment = termDays > 0 ? Math.round((calculatedLoan.total / termDays) * 100) / 100 : 0;

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleAddCustomer = async (event) => {
    event.preventDefault(); setError("");
    if (!Number.isFinite(Number(formData.interestRate)) || Number(formData.interestRate) < 0 || !Number.isInteger(Number(formData.loanMonths)) || Number(formData.loanMonths) <= 0) { setError("Enter a valid monthly interest rate and loan term."); return; }
    setSaving(true);
    try {
      const id = await createCustomer(db, formData);
      setShowAddCustomer(false); setFormData(initialForm); setNotice("Customer and loan added successfully.");
      navigate(`/customers/${id}`, { state: { notice: "Customer and loan added successfully." } });
    } catch (err) { setError(err.message || "Could not save customer."); }
    finally { setSaving(false); }
  };

  return <div className="app-layout">
    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="main-content">
      <Topbar title="Customers" subtitle="Manage your loan customers" onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <section className="customers-content">
        <div className="page-header"><div><h2>Customers</h2><p>View and manage all your registered customers.</p></div>
          <button className="add-customer-button" onClick={() => { setError(""); setShowAddCustomer(true); }}>+ Add Customer</button>
        </div>
        {notice && <p className="inline-success" role="status">{notice}</p>}
        {error && !showAddCustomer && <p className="inline-error" role="alert">{error} <button onClick={loadCustomers}>Retry</button></p>}
        <div className="customer-tools"><div className="search-box"><span>⌕</span><input aria-label="Search customers" placeholder="Search by name or phone..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
          <select aria-label="Filter customers by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Active</option><option>Completed</option></select>
        </div>
        <div className="customers-card"><div className="table-header"><div><h3>Customer List</h3><span>{loading ? "Loading customers…" : `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? "s" : ""}`}</span></div></div>
          {loading ? <div className="empty-state"><p>Loading customers…</p></div> : filteredCustomers.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><h3>{customers.length ? "No customers found" : "No customers added yet."}</h3><p>{customers.length ? "Try another name or phone number." : "Add your first customer to get started."}</p></div> :
            <><div className="customer-mobile-cards">{filteredCustomers.map((customer) => <article className="customer-mobile-card" key={customer.id}>
              <div className="customer-mobile-heading"><div className="customer-name"><div className="customer-avatar">{customer.name?.charAt(0)?.toUpperCase()}</div><strong>{customer.name}</strong></div><span className={`status-badge ${customer.status === "completed" ? "completed" : "active"}`}>{customer.status === "completed" ? "Completed" : "Active"}</span></div>
              <a className="customer-mobile-phone" href={`tel:${customer.phone}`}>{customer.phone || "No phone number"}</a>
              <div className="customer-mobile-finances"><div><span>Total payable</span><strong>{money(customer.totalPayable)}</strong></div><div><span>Paid</span><strong>{money(customer.totalPaid)}</strong></div><div><span>Remaining</span><strong>{money(customer.remainingBalance ?? customer.totalPayable)}</strong></div></div>
              <Link className="customer-mobile-profile" to={`/customers/${customer.id}`}>View customer profile <span aria-hidden="true">→</span></Link>
            </article>)}</div>
            <div className="table-wrapper customer-desktop-table"><table><thead><tr><th>Customer</th><th>Phone</th><th>Total Payable</th><th>Amount Paid</th><th>Remaining</th><th>Status</th><th>Profile</th></tr></thead><tbody>
              {filteredCustomers.map((customer) => <tr key={customer.id}><td><div className="customer-name"><div className="customer-avatar">{customer.name?.charAt(0)?.toUpperCase()}</div><strong>{customer.name}</strong></div></td><td>{customer.phone}</td><td>{money(customer.totalPayable)}</td><td>{money(customer.totalPaid)}</td><td>{money(customer.remainingBalance ?? customer.totalPayable)}</td><td><span className={`status-badge ${customer.status === "completed" ? "completed" : "active"}`}>{customer.status === "completed" ? "Completed" : "Active"}</span></td><td><Link className="profile-link" to={`/customers/${customer.id}`}>View Profile</Link></td></tr>)}
            </tbody></table></div></>}
        </div>
      </section>
    </main>
    {showAddCustomer && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowAddCustomer(false); }}><div className="customer-modal customer-form-modal">
      <div className="modal-header"><div><h2>Add Customer</h2><p>Enter customer and loan details.</p></div><button className="close-button" disabled={saving} onClick={() => setShowAddCustomer(false)} aria-label="Close">×</button></div>
      <form onSubmit={handleAddCustomer}><div className="form-grid">
        {[ ["name","Customer Name *","text",true], ["phone","Phone Number *","tel",true], ["nic","NIC","text",false], ["address","Address","text",false], ["loanAmount","Loan Principal (LKR) *","number",true], ["interestRate","Monthly Interest Rate (%) *","number",true], ["loanMonths","Loan Term (Months) *","number",true], ["loanStartDate","Loan Start Date","date",false] ].map(([name,label,type,required]) => <div className="form-group" key={name}><label htmlFor={`customer-${name}`}>{label}</label><input id={`customer-${name}`} type={type} name={name} value={formData[name]} onChange={handleFormChange} required={required} min={type === "number" ? (name === "interestRate" ? "0" : "1") : undefined} step={type === "number" ? (name === "loanMonths" ? "1" : "0.01") : undefined} /></div>)}
        <div className="loan-calculation form-wide"><div><span>Calculated Interest</span><strong>{money(calculatedLoan.interest)}</strong></div><div><span>Total Payable</span><strong>{money(calculatedLoan.total)}</strong></div><div className="daily-estimate"><span>Expected Daily Payment</span><strong>{money(expectedDailyPayment)}</strong></div><small>Flat interest: principal × monthly rate × term. Daily estimate divides total payable across 30 days per loan month.</small></div>
        <div className="form-group form-wide"><label htmlFor="customer-notes">Notes</label><textarea id="customer-notes" name="notes" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows="3" /></div>
      </div>{error && <p className="inline-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="cancel-button" disabled={saving} onClick={() => setShowAddCustomer(false)}>Cancel</button><button type="submit" className="save-button" disabled={saving}>{saving ? "Saving…" : "Save Customer"}</button></div></form>
    </div></div>}
  </div>;
}
export default Customers;
