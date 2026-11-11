import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import Collections from "./pages/Collections";
import Payments from "./pages/Payments";
import SmsHistory from "./pages/SmsHistory";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/collections"
        element={<ProtectedRoute><Collections /></ProtectedRoute>}
      />

      <Route
        path="/payments"
        element={<ProtectedRoute><Payments /></ProtectedRoute>}
      />

      <Route
        path="/sms"
        element={<ProtectedRoute><SmsHistory /></ProtectedRoute>}
      />

      <Route
        path="/customers/:customerId"
        element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>}
      />

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}

export default App;
