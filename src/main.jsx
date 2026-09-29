import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return {error: true}; }
  render() { return this.state.error ? <main className="fatal"><h1>Unable to open the workspace</h1><p>Your saved data has not been deleted. Reload the page to try again.</p><button onClick={() => location.reload()}>Reload</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);
