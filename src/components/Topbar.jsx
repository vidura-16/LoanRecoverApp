import "./Topbar.css";
import { useLanguage } from "../language";

function Topbar({ onMenuClick, title, subtitle }) {
  const { language, toggleLanguage } = useLanguage();
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu"
          onClick={onMenuClick}
          type="button"
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="user-area">
        <button className="language-toggle" type="button" onClick={toggleLanguage} aria-label={language === "si" ? "Switch to English" : "Switch to Sinhala"}>
          {language === "si" ? "English" : "සිංහල"}
        </button>
        <button className="notification">
          🔔
        </button>

        <div className="user-avatar">
          A
        </div>

        <div className="user-info">
          <strong>Administrator</strong>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
