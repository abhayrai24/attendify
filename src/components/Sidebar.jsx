import { X } from "lucide-react";
import { BOTTOM_ITEMS, LOGO_ICON as Logo, NAV_SECTIONS } from "../config/navigation.js";
import { SEMESTER_LABEL } from "../config/academic.js";

function NavButton({ item, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <a
      href={`#/${item.id}`}
      className={`nav-item ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate?.()}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{item.label}</span>
    </a>
  );
}

export function Sidebar({ active, open, onClose, badges = {} }) {
  return (
    <>
      {open && <div className="scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Primary">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Logo size={20} aria-hidden="true" />
          </div>
          <div>
            <strong>Attendify</strong>
            <span>{SEMESTER_LABEL}</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" aria-label="Close menu" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <div key={item.id} className="nav-row">
                  <NavButton item={item} active={active === item.id} onNavigate={onClose} />
                  {badges[item.id] > 0 && <span className="nav-badge">{badges[item.id]}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {BOTTOM_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} active={active === item.id} onNavigate={onClose} />
          ))}
          <div className="sidebar-credit">
            <span className="credit-author">Built by <strong>Abhay Rai</strong></span>
            <span className="credit-dept">B.Tech CSE 3rd Year</span>
          </div>
        </div>
      </aside>
    </>
  );
}
