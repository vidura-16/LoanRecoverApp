import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import "./Login.css";
import { useLanguage } from "../language";

const STORAGE_KEY = "loanrecover-login-form";

function Login() {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).email || "" : "";
  });
  const [password, setPassword] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).password || "" : "";
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);

  const savePendingProfile = async () => {
    if (!pendingProfile) return;
    setLoading(true);
    setError("");
    try {
      await setDoc(doc(db, "users", pendingProfile.uid), {
        ownerId: pendingProfile.uid,
        name: pendingProfile.name,
        phone: pendingProfile.phone,
        email: pendingProfile.email,
        createdAt: serverTimestamp(),
      });
      setPendingProfile(null);
      navigate("/dashboard");
    } catch (saveError) {
      console.error(saveError);
      setError("Profile save is still blocked. Allow the signed-in user to create their own users/{uid} document in Firestore rules, then retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ email, password })
    );
  }, [email, password]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name.trim() });
        const profile = { uid: credential.user.uid, name: name.trim(), phone: phone.trim(), email: credential.user.email };
        try {
          await setDoc(doc(db, "users", credential.user.uid), {
            ownerId: credential.user.uid,
            name: profile.name, phone: profile.phone, email: profile.email, createdAt: serverTimestamp(),
          });
        } catch (profileError) {
          if (profileError.code === "permission-denied") setPendingProfile(profile);
          throw profileError;
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      sessionStorage.removeItem(STORAGE_KEY);
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      setError(isSignUp
        ? error.code === "auth/email-already-in-use" ? "An account already exists for this email. Sign in, then retry saving the profile if needed." : error.code === "auth/weak-password" ? "Password must be at least 6 characters." : error.code === "auth/operation-not-allowed" ? "Email and password sign-up is disabled in Firebase Authentication." : error.code === "permission-denied" ? "Account created, but profile details were blocked by Firestore rules. Add the users/{uid} permission, then retry below." : "Could not create your account. Check your details and try again."
        : error.code === "permission-denied" ? "Account created, but profile details could not be saved. Check Firestore permissions." : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button className="language-toggle login-language-toggle" type="button" onClick={toggleLanguage}>{language === "si" ? "English" : "සිංහල"}</button>
      <div className="login-card">
        <h1>LoanRecover</h1>
        <h2 className="auth-form-title" data-no-translate>{isSignUp ? (language === "si" ? "ලියාපදිංචි වන්න" : "Sign Up") : (language === "si" ? "පුරනය වන්න" : "Sign In")}</h2>
        <p className="login-subtitle" data-no-translate>{isSignUp ? (language === "si" ? "ඔබගේ LoanRecover ගිණුම සාදන්න" : "Create your LoanRecover account") : (language === "si" ? "ණය අයකරගැනීමේ කළමනාකරණ පද්ධතිය" : "Loan Recovery Management System")}</p>

        <form onSubmit={handleLogin}>
          {isSignUp && <>
            <div className="form-group">
              <label htmlFor="signup-name">Full Name</label>
              <input id="signup-name" type="text" autoComplete="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="signup-phone">Phone Number</label>
              <input id="signup-phone" type="tel" autoComplete="tel" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </>}
          <div className="form-group">
            <label htmlFor="login-email">Email</label>

            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isSignUp ? 6 : undefined}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading} data-no-translate>
          {loading ? (isSignUp ? (language === "si" ? "ගිණුම සාදමින්..." : "Creating account...") : (language === "si" ? "පුරනය වෙමින්..." : "Signing in...")) : (isSignUp ? (language === "si" ? "ලියාපදිංචි වන්න" : "Sign Up") : (language === "si" ? "පුරනය වන්න" : "Sign In"))}
          </button>
        </form>
        {pendingProfile && <button className="profile-retry-button" type="button" disabled={loading} onClick={savePendingProfile}>Retry Save Profile</button>}
        <button className="auth-mode-toggle" type="button" disabled={loading} data-no-translate onClick={() => { setError(""); setIsSignUp((value) => !value); }}>
          {isSignUp
            ? (language === "si" ? "← පුරනය වීමට ආපසු යන්න" : "← Back to Sign In")
            : (language === "si" ? "ගිණුමක් අවශ්‍යද? ලියාපදිංචි වන්න" : "Need an account? Sign Up")}
        </button>
      </div>
    </div>
  );
}

export default Login;
