import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth } from "../firebase";

const asDate = (value) => value?.toDate ? value.toDate() : new Date(value);
const signedInOwnerId = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in to access your records.");
  return uid;
};

export async function getCustomers(db) {
  const ownerId = signedInOwnerId();
  const snapshot = await getDocs(query(collection(db, "customers"), where("ownerId", "==", ownerId), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createCustomer(db, values) {
  const ownerId = signedInOwnerId();
  const now = Timestamp.now();
  const loanAmount = Number(values.loanAmount);
  const interestRate = Number(values.interestRate);
  const loanMonths = Number(values.loanMonths);
  const interestAmount = Math.round(loanAmount * interestRate * loanMonths) / 100;
  const totalPayable = loanAmount + interestAmount;
  const expectedPayment = Math.round((totalPayable / (loanMonths * 30)) * 100) / 100;
  const ref = await addDoc(collection(db, "customers"), {
    ownerId,
    name: values.name.trim(),
    phone: values.phone.trim(),
    nic: values.nic.trim(),
    address: values.address.trim(),
    loanAmount,
    interestRate,
    loanMonths,
    calculatedInterest: interestAmount,
    interestAmount,
    totalPayable,
    totalPaid: 0,
    remainingBalance: totalPayable,
    expectedPayment,
    loanStartDate: values.loanStartDate ? Timestamp.fromDate(asDate(values.loanStartDate)) : now,
    status: "active",
    notes: values.notes.trim(),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getCustomerAdjustments(db, customerId) {
  const ownerId = signedInOwnerId();
  const snapshot = await getDocs(query(collection(db, "adjustments"), where("ownerId", "==", ownerId), where("customerId", "==", customerId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => asDate(b.createdAt).getTime() - asDate(a.createdAt).getTime());
}

export async function adjustCustomerInterest(db, customer, values) {
  const ownerId = signedInOwnerId();
  const newInterest = Number(values.interestAmount);
  if (!Number.isFinite(newInterest) || newInterest < 0) throw new Error("Interest must be zero or more.");
  const customerRef = doc(db, "customers", customer.id);
  const adjustmentRef = doc(collection(db, "adjustments"));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(customerRef);
    if (!snapshot.exists()) throw new Error("Customer could not be found.");
    const current = snapshot.data();
    const previousInterest = Number(current.interestAmount ?? current.calculatedInterest ?? Math.max(0, Number(current.totalPayable) - Number(current.loanAmount)));
    const totalPayable = Number(current.loanAmount) + newInterest;
    const totalPaid = Number(current.totalPaid || 0);
    if (totalPayable < totalPaid) throw new Error("Adjusted payable cannot be less than the amount already paid.");
    if (current.status === "completed" && totalPayable > totalPaid) throw new Error("A completed loan cannot be reopened by an interest adjustment.");
    const remainingBalance = totalPayable - totalPaid;
    const now = Timestamp.now();
    transaction.set(adjustmentRef, {
      ownerId,
      customerId: customer.id,
      customerName: current.name,
      type: "interest_adjustment",
      previousInterest,
      newInterest,
      difference: newInterest - previousInterest,
      previousTotalPayable: Number(current.totalPayable),
      newTotalPayable: totalPayable,
      balanceAfterAdjustment: remainingBalance,
      reason: values.reason.trim(),
      createdAt: now,
    });
    transaction.update(customerRef, {
      interestAmount: newInterest,
      totalPayable,
      remainingBalance,
      status: remainingBalance === 0 ? "completed" : "active",
      updatedAt: now,
    });
    return { totalPayable, remainingBalance, interestAmount: newInterest };
  });
}

export async function getCustomer(db, customerId) {
  signedInOwnerId();
  const snapshot = await getDoc(doc(db, "customers", customerId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getCustomerPayments(db, customerId) {
  const ownerId = signedInOwnerId();
  const snapshot = await getDocs(query(collection(db, "payments"), where("ownerId", "==", ownerId), where("customerId", "==", customerId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => asDate(b.paymentDate).getTime() - asDate(a.paymentDate).getTime());
}

export async function recordPayment(db, customer, values) {
  const ownerId = signedInOwnerId();
  const amount = Number(values.amount);
  const paymentRef = doc(collection(db, "payments"));
  const smsHistoryRef = doc(db, "smsHistory", paymentRef.id);
  const customerRef = doc(db, "customers", customer.id);
  const paymentDate = asDate(values.paymentDate);
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(customerRef);
    if (!snapshot.exists()) throw new Error("Customer could not be found.");
    const current = snapshot.data();
    const balance = Number(current.remainingBalance ?? (current.totalPayable - (current.totalPaid || 0)));
    if (current.status === "completed" || balance <= 0) throw new Error("This loan is already completed.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a payment amount greater than zero.");
    if (amount > balance) throw new Error("Payment cannot be greater than the remaining balance.");
    const totalPaid = Number(current.totalPaid || 0) + amount;
    const remainingBalance = Math.max(0, Number(current.totalPayable) - totalPaid);
    const now = Timestamp.now();
    transaction.set(paymentRef, {
      ownerId,
      customerId: customer.id,
      customerName: current.name,
      amount,
      paymentDate: Timestamp.fromDate(paymentDate),
      paymentMethod: values.paymentMethod,
      balanceAfterPayment: remainingBalance,
      createdAt: now,
    });
    transaction.update(customerRef, {
      totalPaid,
      remainingBalance,
      status: remainingBalance === 0 ? "completed" : "active",
      updatedAt: now,
    });
    return { totalPaid, remainingBalance };
  });
  // SMS history is best-effort and must never roll back or obscure a recorded payment.
  try {
    await setDoc(smsHistoryRef, {
      ownerId,
      customerId: customer.id,
      customerName: customer.name,
      paymentId: paymentRef.id,
      amountPaid: amount,
      remainingBalance: result.remainingBalance,
      status: "NOT_SENT",
      timestamp: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Payment recorded, but SMS history initialization failed", error);
  }
  return result;
}

export async function getPaymentsForDate(db, date = new Date()) {
  const ownerId = signedInOwnerId();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const snapshot = await getDocs(query(
    collection(db, "payments"),
    where("ownerId", "==", ownerId),
    where("paymentDate", ">=", Timestamp.fromDate(start)),
    where("paymentDate", "<", Timestamp.fromDate(end)),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => asDate(b.paymentDate).getTime() - asDate(a.paymentDate).getTime());
}

export async function getPaymentsForMonth(db, date = new Date()) {
  const ownerId = signedInOwnerId();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const snapshot = await getDocs(query(
    collection(db, "payments"),
    where("ownerId", "==", ownerId),
    where("paymentDate", ">=", Timestamp.fromDate(start)),
    where("paymentDate", "<", Timestamp.fromDate(end)),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export const toDate = asDate;
