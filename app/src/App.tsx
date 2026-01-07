import { StreamProvider } from './contexts/StreamContext';
import { Router } from './Router';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <StreamProvider>
        <Router />
      </StreamProvider>
    </ErrorBoundary>
  );
}

export default App;
