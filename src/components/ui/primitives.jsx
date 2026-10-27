export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, children, icon: Icon }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <strong>{title}</strong>
      {children && <p className="muted small">{children}</p>}
    </div>
  );
}

const BAND_LABEL = { safe: "Safe", warning: "At risk", low: "Below target", none: "No data" };

export function BandPill({ band }) {
  return <span className={`pill pill-${band}`}>{BAND_LABEL[band]}</span>;
}

/** Progress bar with an optional target marker. */
export function ProgressBar({ value, target, band = "safe", label }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
    >
      <div className={`progress-fill band-${band}`} style={{ width: `${clamped}%` }} />
      {target != null && <div className="progress-target" style={{ left: `${target}%` }} title={`Target ${target}%`} />}
    </div>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const label = { present: "Present", absent: "Absent", cancelled: "Cancelled" }[status] || status;
  return <span className={`pill pill-${status}`}>{label}</span>;
}
