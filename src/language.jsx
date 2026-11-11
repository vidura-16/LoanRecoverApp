import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext({ language: "en", toggleLanguage: () => {} });

// Interface copy used across the app. Customer supplied content is intentionally untouched.
const si = {
  Dashboard: "පාලක පුවරුව", Customers: "පාරිභෝගිකයින්", Collections: "එකතු කිරීම්", Payments: "ගෙවීම්", SMS: "SMS",
  Logout: "ඉවත් වන්න", "Management System": "කළමනාකරණ පද්ධතිය", Administrator: "පරිපාලක", Admin: "පරිපාලක",
  "Here's what's happening with your loans today.": "අද ඔබේ ණය සම්බන්ධ තොරතුරු මෙන්න.", "Total Customers": "මුළු පාරිභෝගිකයින්", "Registered customers": "ලියාපදිංචි පාරිභෝගිකයින්", "Active Loans": "සක්‍රීය ණය", "Currently active": "දැනට සක්‍රීයයි", "Today’s Recovery": "අද අයකරගැනීම්", "Payments recorded today": "අද සටහන් කළ ගෙවීම්", "This Month’s Collections": "මෙම මාසයේ එකතු කිරීම්", "Payments recorded this month": "මෙම මාසයේ සටහන් කළ ගෙවීම්", "Principal Disbursed": "ලබාදුන් මූලික ණය මුදල", "Total original loan principal": "මුළු මුල් ණය මුදල", "Outstanding with Interest": "පොලිය සහිත ඉතිරි මුදල", "Remaining active loan balances": "සක්‍රීය ණයවල ඉතිරි ශේෂය", "Today’s Collections": "අද එකතු කිරීම්", Refresh: "යාවත්කාලීන කරන්න", "Loading today’s collections…": "අද එකතු කිරීම් පූරණය වෙමින්…", "No collections today": "අද එකතු කිරීම් නැත", "Payments recorded today will appear here.": "අද සටහන් කළ ගෙවීම් මෙහි පෙන්වනු ඇත.", Customer: "පාරිභෝගිකයා", Amount: "මුදල", Time: "වේලාව", Status: "තත්ත්වය", Paid: "ගෙවා ඇත", "Today’s total recovery": "අද මුළු අයකරගැනීම", "Today’s Total Recovery": "අද මුළු අයකරගැනීම", "Need to manage a customer?": "පාරිභෝගිකයෙකු කළමනාකරණය කළ යුතුද?", "View customers →": "පාරිභෝගිකයින් බලන්න →",
  "Manage your loan customers": "ඔබේ ණය පාරිභෝගිකයින් කළමනාකරණය කරන්න", "View and manage all your registered customers.": "ඔබගේ සියලු ලියාපදිංචි පාරිභෝගිකයින් බලන්න සහ කළමනාකරණය කරන්න.", "+ Add Customer": "+ පාරිභෝගිකයෙකු එක් කරන්න", "Customer List": "පාරිභෝගික ලැයිස්තුව", "Loading customers…": "පාරිභෝගිකයින් පූරණය වෙමින්…", "No customers found": "පාරිභෝගිකයින් හමු නොවීය", "No customers added yet.": "තවම පාරිභෝගිකයින් එක් කර නැත.", "Try another name or phone number.": "වෙනත් නමක් හෝ දුරකථන අංකයක් උත්සාහ කරන්න.", "Add your first customer to get started.": "ආරම්භ කිරීමට පළමු පාරිභෝගිකයා එක් කරන්න.", "Search by name or phone...": "නම හෝ දුරකථන අංකය අනුව සොයන්න...", "Search customers": "පාරිභෝගිකයින් සොයන්න", "Filter customers by status": "තත්ත්වය අනුව පෙරහන් කරන්න", All: "සියල්ල", Active: "සක්‍රීය", Completed: "සම්පූර්ණයි", "View Profile": "පැතිකඩ බලන්න", "View customer profile": "පාරිභෝගික පැතිකඩ බලන්න", Phone: "දුරකථනය", "Total Payable": "ගෙවිය යුතු මුළු මුදල", "Amount Paid": "ගෙවූ මුදල", Remaining: "ඉතිරි", Profile: "පැතිකඩ", "Add Customer": "පාරිභෝගිකයෙකු එක් කරන්න", "Enter customer and loan details.": "පාරිභෝගික සහ ණය විස්තර ඇතුළත් කරන්න.", "Customer Name *": "පාරිභෝගික නම *", "Phone Number *": "දුරකථන අංකය *", Address: "ලිපිනය", "Loan Principal (LKR) *": "මූලික ණය මුදල (LKR) *", "Monthly Interest Rate (%) *": "මාසික පොලී අනුපාතය (%) *", "Loan Term (Months) *": "ණය කාලය (මාස) *", "Loan Start Date": "ණය ආරම්භක දිනය", "Calculated Interest": "ගණනය කළ පොලිය", "Expected Daily Payment": "අපේක්ෂිත දෛනික ගෙවීම", Notes: "සටහන්", Cancel: "අවලංගු කරන්න", "Save Customer": "පාරිභෝගිකයා සුරකින්න", "Saving…": "සුරකිමින්…", Retry: "නැවත උත්සාහ කරන්න",
  "Customer Profile": "පාරිභෝගික පැතිකඩ", "Customer and loan details": "පාරිභෝගික සහ ණය විස්තර", "← Back to customers": "← පාරිභෝගිකයින් වෙත ආපසු", Name: "නම", NIC: "ජාතික හැඳුනුම්පත", "Customer Information": "පාරිභෝගික තොරතුරු", "Loan Summary": "ණය සාරාංශය", "Remaining Balance": "ඉතිරි ශේෂය", "Original Loan": "මුල් ණය", Principal: "මූලික මුදල", "Interest Charged": "අය කළ පොලිය", "Interest Rate / Term": "පොලී අනුපාතය / කාලය", "Legacy loan": "පැරණි ණය", "Total Paid": "ගෙවූ මුළු මුදල", "Loan Completed": "ණය සම්පූර්ණයි", "Record Today’s Collection": "අද ගෙවීම සටහන් කරන්න", "Adjust Interest / Early Settlement": "පොලිය / කලින් පියවීම සකස් කරන්න", "Payment History": "ගෙවීම් ඉතිහාසය", "No payments recorded yet.": "තවම ගෙවීම් සටහන් කර නැත.", Date: "දිනය", Method: "ක්‍රමය", "Balance After Payment": "ගෙවීමෙන් පසු ශේෂය", "SMS receipt": "SMS රිසිට්පත", "Record Collection": "ගෙවීම සටහන් කරන්න", "Previous Balance": "පෙර ශේෂය", "Expected Payment": "අපේක්ෂිත ගෙවීම", "Amount Collected (LKR) *": "එකතු කළ මුදල (LKR) *", "Payment Date *": "ගෙවූ දිනය *", "Payment Method": "ගෙවීමේ ක්‍රමය", "Record Payment": "ගෙවීම සටහන් කරන්න", "Recording…": "සටහන් කරමින්…", "Adjust Loan Interest": "ණය පොලිය සකස් කරන්න", "Scheduled Interest": "නියමිත පොලිය", "Current Outstanding": "දැනට ඉතිරි මුදල", "Adjusted Total Interest (LKR) *": "සකස් කළ මුළු පොලිය (LKR) *", "Reason for adjustment *": "සකස් කිරීමට හේතුව *", "Save Ledger Adjustment": "සකස් කිරීම සුරකින්න", "Saving…": "සුරකිමින්…",
  "Browse recorded payments by date": "දිනය අනුව සටහන් කළ ගෙවීම් බලන්න", "Collected this month": "මෙම මාසයේ එකතු කළ මුදල", "Payments this month": "මෙම මාසයේ ගෙවීම්", "Selected day": "තෝරාගත් දිනය", "Select a day to view its recorded payments.": "සටහන් කළ ගෙවීම් බැලීමට දිනයක් තෝරන්න.", Today: "අද", "Loading calendar…": "දිනදර්ශනය පූරණය වෙමින්…", "Loading payments…": "ගෙවීම් පූරණය වෙමින්…", "No payments recorded for this day.": "මෙම දිනයේ ගෙවීම් සටහන් කර නැත.", "SMS History": "SMS ඉතිහාසය", "Payment receipts and manually confirmed SMS status": "ගෙවීම් රිසිට්පත් සහ තහවුරු කළ SMS තත්ත්වය", "Payment receipt history": "ගෙවීම් රිසිට්පත් ඉතිහාසය", "Payment date": "ගෙවූ දිනය", "Balance after": "පසු ශේෂය", Receipt: "රිසිට්පත", "Loading SMS history…": "SMS ඉතිහාසය පූරණය වෙමින්…", "No SMS history yet. Each recorded payment will appear here.": "තවම SMS ඉතිහාසයක් නැත. සටහන් කළ ගෙවීම් මෙහි පෙන්වනු ඇත.", View: "බලන්න",
  "Loan Recovery Management System": "ණය අයකරගැනීමේ කළමනාකරණ පද්ධතිය", "Create your LoanRecover account": "ඔබගේ LoanRecover ගිණුම සාදන්න", "Create Account": "ගිණුම සාදන්න", "Full Name": "සම්පූර්ණ නම", "Enter your full name": "ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න", "Phone Number": "දුරකථන අංකය", "Enter your phone number": "ඔබගේ දුරකථන අංකය ඇතුළත් කරන්න", Email: "විද්‍යුත් තැපෑල", Password: "මුරපදය", "Enter your email": "ඔබගේ විද්‍යුත් තැපෑල ඇතුළත් කරන්න", "Enter your password": "ඔබගේ මුරපදය ඇතුළත් කරන්න", "Signing in...": "පුරනය වෙමින්...", "Sign In": "පුරනය වන්න", "Back to Sign In": "පුරනය වීමට ආපසු යන්න", "Need an account? Sign Up": "ගිණුමක් අවශ්‍යද? ලියාපදිංචි වන්න", "Already have an account? Sign In": "දැනටමත් ගිණුමක් තිබේද? පුරනය වන්න", "Sign Up": "ලියාපදිංචි වන්න", "Creating account...": "ගිණුම සාදමින්...", "Retry Save Profile": "පැතිකඩ සුරැකීම නැවත උත්සාහ කරන්න", "An account already exists for this email. Sign in, then retry saving the profile if needed.": "මෙම විද්‍යුත් තැපෑල සඳහා ගිණුමක් තිබේ. පුරනය වී අවශ්‍ය නම් පැතිකඩ සුරැකීම නැවත උත්සාහ කරන්න.", "Password must be at least 6 characters.": "මුරපදය අවම වශයෙන් අක්ෂර 6ක් විය යුතුය.", "Email and password sign-up is disabled in Firebase Authentication.": "Firebase Authentication තුළ විද්‍යුත් තැපෑල සහ මුරපද ලියාපදිංචිය අක්‍රිය කර ඇත.", "Account created, but profile details were blocked by Firestore rules. Add the users/{uid} permission, then retry below.": "ගිණුම සාදන ලද නමුත් Firestore නීති මඟින් පැතිකඩ විස්තර අවහිර කර ඇත. users/{uid} අවසරය එක් කර පහළින් නැවත උත්සාහ කරන්න.", "Profile save is still blocked. Allow the signed-in user to create their own users/{uid} document in Firestore rules, then retry.": "පැතිකඩ සුරැකීම තවමත් අවහිරයි. පුරනය වූ පරිශීලකයාට තම users/{uid} ලේඛනය සෑදීමට Firestore නීතිවල අවසර දෙන්න, ඉන්පසු නැවත උත්සාහ කරන්න.", "Could not create your account. Check your details and try again.": "ගිණුම සෑදිය නොහැක. විස්තර පරීක්ෂා කර නැවත උත්සාහ කරන්න.", "Invalid email or password.": "විද්‍යුත් තැපෑල හෝ මුරපදය වැරදියි.", "Loading...": "පූරණය වෙමින්...",
  "Today’s customers and expected collections": "අද පාරිභෝගිකයින් සහ අපේක්ෂිත එකතු කිරීම්", "Active Customers": "සක්‍රීය පාරිභෝගිකයින්", "Customers to Collect": "ගෙවීම් එකතු කළ යුතු පාරිභෝගිකයින්", "Daily collection progress for active loans": "සක්‍රීය ණය සඳහා දෛනික එකතු කිරීමේ ප්‍රගතිය", "Loading today’s route…": "අද ලැයිස්තුව පූරණය වෙමින්…", "No active collections": "සක්‍රීය එකතු කිරීම් නැත", "Customers with active loans will appear here.": "සක්‍රීය ණය ඇති පාරිභෝගිකයින් මෙහි පෙන්වනු ඇත.", "Today's collection": "අද එකතු කිරීම", Collect: "එකතු කරන්න", Cash: "මුදල්", "Bank Transfer": "බැංකු හුවමාරුව",
  "Expected Today": "අද අපේක්ෂිත", "Collected Today": "අද එකතු කළ", Actions: "ක්‍රියා", "No daily amount": "දෛනික මුදලක් නැත", Collected: "එකතු කර ඇත", "Partially collected": "කොටසක් එකතු කර ඇත", "Partially Collected": "කොටසක් එකතු කර ඇත", Due: "ගෙවිය යුතුයි", "Saving…": "සුරකිමින්…", "SMS_APP_OPENED means the messaging app was launched; only CONFIRMED_SENT is manually confirmed.": "SMS යෙදුම විවෘත වූ විට SMS_APP_OPENED ලෙසත්, අතින් තහවුරු කළ විට CONFIRMED_SENT ලෙසත් දැක්වේ.", "SMS sending requires Chrome on an Android phone.": "SMS යැවීමට Android දුරකථනයක Chrome අවශ්‍යයි.", "Send Receipt SMS": "රිසිට්පත SMS කරන්න", "Open SMS again": "SMS නැවත විවෘත කරන්න", "Confirm sent": "යැවූ බව තහවුරු කරන්න", "Confirmed sent": "යැවූ බව තහවුරු කර ඇත", "SMS app opened · awaiting confirmation": "SMS යෙදුම විවෘතයි · තහවුරු කිරීම බලාපොරොත්තුවෙන්", "Not sent": "යවා නැත", "Opening…": "විවෘත වෙමින්…", "Interest Adjustment Ledger": "පොලී සකස් කිරීම් ලේඛනය", "Manual changes to the scheduled interest": "නියමිත පොලියට අතින් කළ වෙනස්කම්", "No interest adjustments recorded.": "පොලී සකස් කිරීම් සටහන් කර නැත.", "Previous Interest": "පෙර පොලිය", "Adjusted Interest": "සකස් කළ පොලිය", "Balance After": "පසු ශේෂය", Reason: "හේතුව", "Interest adjustment saved to the ledger.": "පොලී සකස් කිරීම ලේඛනයට සුරකින ලදී.", "Payment recorded successfully.": "ගෙවීම සාර්ථකව සටහන් විය.", "Customer and loan added successfully.": "පාරිභෝගිකයා සහ ණය සාර්ථකව එක් කරන ලදී.", "Your loans today.": "අද ඔබේ ණය.", "Payment History": "ගෙවීම් ඉතිහාසය",
};

const attributes = ["placeholder", "aria-label", "title"];

function applyTranslation(root, language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    let original = node.__loanRecoverOriginal;
    const previousRendered = node.__loanRecoverLastRendered;
    if (original === undefined || (node.nodeValue !== previousRendered && node.nodeValue !== original)) {
      original = node.nodeValue;
      node.__loanRecoverOriginal = original;
    }
    const trimmed = original.trim();
    if (!trimmed || node.parentElement?.closest("script,style,input,textarea,[data-no-translate]")) continue;
    const translated = language === "si" ? si[trimmed] : null;
    if (translated) {
      const next = original.replace(trimmed, translated);
      if (node.nodeValue !== next) node.nodeValue = next;
      node.__loanRecoverLastRendered = next;
    } else {
      if (language === "en" && node.nodeValue !== original) node.nodeValue = original;
      node.__loanRecoverLastRendered = original;
    }
  }
  root.querySelectorAll("*").forEach((element) => attributes.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const original = element.dataset[`original${attribute}`] ?? element.getAttribute(attribute);
    element.dataset[`original${attribute}`] = original;
    if (language === "si" && si[original] && element.getAttribute(attribute) !== si[original]) element.setAttribute(attribute, si[original]);
    else if (language === "en" && element.getAttribute(attribute) !== original) element.setAttribute(attribute, original);
  }));
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("loanrecover-language") || "en");
  useEffect(() => {
    document.documentElement.lang = language === "si" ? "si" : "en";
    applyTranslation(document.body, language);
    const observer = new MutationObserver(() => applyTranslation(document.body, language));
    observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: attributes });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, toggleLanguage: () => {
    const next = language === "si" ? "en" : "si";
    localStorage.setItem("loanrecover-language", next);
    window.location.reload();
  } }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
