import { WindowManagerProvider } from './context/WindowManagerContext';
import { Desktop } from './components/windowmanager/Desktop';

function App() {
  return (
    <WindowManagerProvider>
      <Desktop />
    </WindowManagerProvider>
  );
}

export default App;
