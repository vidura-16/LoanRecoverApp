import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <>
    {isOpen && <button className="sidebar-scrim" type="button" aria-label="Close navigation menu" onClick={onClose} />}
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="logo">LR</div>

        <div>
          <h2>LoanRecover</h2>
          <span>Management System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span>⌂</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span>👥</span>
          Customers
        </NavLink>

        <NavLink
          to="/collections"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span>🧾</span>
          Collections
        </NavLink>

        <NavLink
          to="/payments"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span>💰</span>
          Payments
        </NavLink>

        <NavLink
          to="/sms"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span>💬</span>
          SMS
        </NavLink>

      </nav>

      <div className="sidebar-bottom">
        <button
          className="nav-item logout-button"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;
