import { doc, getDoc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth } from "../firebase";

const signedInOwnerId = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in to access your records.");
  return uid;
};

export function normalizeSriLankanMobile(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 24 || !/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (/^0(7\d{8})$/.test(digits)) return `94${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits)) return `94${digits}`;
  if (/^947\d{8}$/.test(digits)) return digits;
  return null;
}

const asDate = (value) => value?.toDate ? value.toDate() : new Date(value);
const money = (value) => `LKR ${Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function preparePaymentSms(db, customerId, paymentId, language = "en") {
  const ownerId = signedInOwnerId();
  const customerRef = doc(db, "customers", customerId);
  const paymentRef = doc(db, "payments", paymentId);
  const historyRef = doc(db, "smsHistory", paymentId);
  const receipt = await runTransaction(db, async (transaction) => {
    const [customerSnapshot, paymentSnapshot, historySnapshot] = await Promise.all([
      transaction.get(customerRef), transaction.get(paymentRef), transaction.get(historyRef),
    ]);
    if (!customerSnapshot.exists()) throw new Error("Customer information could not be found.");
    if (!paymentSnapshot.exists()) throw new Error("Payment information could not be found.");
    const customer = customerSnapshot.data();
    const payment = paymentSnapshot.data();
    if (payment.customerId !== customerId) throw new Error("This payment does not belong to the selected customer.");
    if (customer.ownerId !== ownerId || payment.ownerId !== ownerId) throw new Error("This record does not belong to your account.");
    const recipient = normalizeSriLankanMobile(customer.phone);
    if (!recipient) throw new Error("The customer does not have a valid Sri Lankan mobile number.");
    if (!customer.name?.trim()) throw new Error("Customer name is missing.");
    const amountPaid = Number(payment.amount);
    const remainingBalance = Number(payment.balanceAfterPayment);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0 || !Number.isFinite(remainingBalance) || remainingBalance < 0) {
      throw new Error("This payment is missing valid receipt information.");
    }
    const paymentDate = asDate(payment.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) throw new Error("This payment has an invalid payment date.");
    const paymentDateLabel = paymentDate.toLocaleDateString(language === "si" ? "si-LK" : "en-LK", { day: "2-digit", month: "short", year: "numeric" });
    const message = language === "si"
      ? `ආයුබෝවන් ${customer.name.trim()},\n\nඔබගේ ${money(amountPaid)} ක ගෙවීම අපට ලැබී ඇත.\n\nඔබගේ ණය මුදලේ ඉතිරි ශේෂය ${money(remainingBalance)} කි.\n\nගෙවූ දිනය: ${paymentDateLabel}.\n\nඔබගේ ගෙවීමට ස්තූතියි.`
      : `Dear ${customer.name.trim()},\n\nWe have received your payment of ${money(amountPaid)}.\n\nYour remaining loan balance is ${money(remainingBalance)}.\n\nPayment date: ${paymentDateLabel}.\n\nThank you for your payment.`;
    if (!message.trim()) throw new Error("Could not generate the payment receipt.");
    if (!historySnapshot.exists()) {
      transaction.set(historyRef, {
        ownerId,
        customerId, customerName: customer.name.trim(), phoneNumber: recipient, paymentId,
        amountPaid, remainingBalance, messageContent: message, status: "NOT_SENT",
        timestamp: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(historyRef, {
        ownerId,
        customerId, customerName: customer.name.trim(), phoneNumber: recipient,
        amountPaid, remainingBalance, messageContent: message, updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    return { recipient, message };
  });
  return receipt;
}

export async function updatePaymentSmsStatus(db, paymentId, status) {
  const ownerId = signedInOwnerId();
  const historyRef = doc(db, "smsHistory", paymentId);
  const snapshot = await getDoc(historyRef);
  if (!snapshot.exists()) throw new Error("SMS history could not be found. Open the receipt again and retry.");
  if (snapshot.data().ownerId !== ownerId) throw new Error("This SMS receipt does not belong to your account.");
  await updateDoc(historyRef, { status, updatedAt: serverTimestamp() });
}

export function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || "");
}

export function createSmsUri(recipient, message) {
  return `sms:${recipient}?body=${encodeURIComponent(message)}`;
}
