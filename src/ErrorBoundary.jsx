import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Peekaboo render failure', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="fatal-shell" role="alert">
        <section className="fatal-card">
          <div className="eyebrow">PEEKABOO / RECOVERY MODE</div>
          <h1>Interface render failed</h1>
          <p>
            Peekaboo stopped this render instead of leaving a broken or partially misleading map on screen. Reloading restarts the client; no camera feeds or device sessions exist to lose.
          </p>
          <button onClick={() => window.location.reload()}>RELOAD PEEKABOO</button>
        </section>
      </main>
    )
  }
}
