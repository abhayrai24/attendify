import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null, prevResetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.prevResetKey) {
      return { error: null, prevResetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error, info) {
    console.error("Attendify crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="card error-card" role="alert">
        <h2>Something went wrong on this page</h2>
        <p className="muted">
          Your data is safe. Try another page or reload. If it keeps happening, export a backup from Settings.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </section>
    );
  }
}
