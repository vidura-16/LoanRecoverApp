import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { createSmsUri, isAndroidDevice, preparePaymentSms, updatePaymentSmsStatus } from "../services/smsService";
import "./PaymentSmsActions.css";
import { useLanguage } from "../language";

export default function PaymentSmsActions({ db, customer, payment }) {
  const [status, setStatus] = useState("NOT_SENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { language } = useLanguage();
  const android = isAndroidDevice();

  useEffect(() => {
    let active = true;
    getDoc(doc(db, "smsHistory", payment.id)).then((snapshot) => {
      if (active && snapshot.exists()) setStatus(snapshot.data().status || "NOT_SENT");
    }).catch(() => {});
    return () => { active = false; };
  }, [db, payment.id]);

  const openSms = async () => {
    setBusy(true); setError("");
    try {
      const { recipient, message } = await preparePaymentSms(db, customer.id, payment.id, language);
      await updatePaymentSmsStatus(db, payment.id, "SMS_APP_OPENED");
      setStatus("SMS_APP_OPENED");
      window.location.href = createSmsUri(recipient, message);
    } catch (err) {
      setError(err.message || "Could not open the SMS application.");
    } finally { setBusy(false); }
  };

  const confirmSent = async () => {
    setBusy(true); setError("");
    try {
      await updatePaymentSmsStatus(db, payment.id, "CONFIRMED_SENT");
      setStatus("CONFIRMED_SENT");
    } catch (err) { setError(err.message || "Could not update SMS history."); }
    finally { setBusy(false); }
  };

  return <div className="payment-sms-actions">
    {android ? <>
      {status !== "CONFIRMED_SENT" && <button type="button" className="message-button" disabled={busy} onClick={openSms}>{busy ? "Opening…" : status === "SMS_APP_OPENED" ? "Open SMS again" : "Send Receipt SMS"}</button>}
      {status === "SMS_APP_OPENED" && <button type="button" className="confirm-sms-button" disabled={busy} onClick={confirmSent}>Confirm sent</button>}
      <span className="sms-status">{status === "CONFIRMED_SENT" ? "Confirmed sent" : status === "SMS_APP_OPENED" ? "SMS app opened · awaiting confirmation" : "Not sent"}</span>
    </> : <span className="sms-desktop-note">SMS sending requires Chrome on an Android phone.</span>}
    {error && <span className="sms-feedback sms-error" role="alert">{error}</span>}
  </div>;
}
