import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Header } from './components/Layout/Header';
import { Navigation } from './components/Layout/Navigation';
import { Dashboard } from './components/Dashboard/Dashboard';
import { HistoryView } from './components/History/HistoryView';
import { AddTransaction } from './components/Dashboard/AddTransaction';
import { SettingsView } from './components/Settings/SettingsView';
import { PINScreen } from './components/Auth/PINScreen';
import { Loader } from './components/Shared/Loader';
import { ErrorBar } from './components/Shared/ErrorBar';
import './index.css';

function AppContent() {
  const { loading, pin, userId, showAlert } = useApp();
  const [activeView, setActiveView] = useState('dash');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const errorBarRef = useRef();

  useEffect(() => {
    if (!pin) setIsUnlocked(true);
  }, [pin]);

  const handleOpenSettings = () => {
    setActiveView('settings');
  };

  if (loading && !userId) {
    return <Loader loading={true} />;
  }

  if (!isUnlocked) {
    return <PINScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="app-container">
      <Header onOpenSettings={handleOpenSettings} />
      
      <main id="views">
        {activeView === 'dash' && <Dashboard />}
        {activeView === 'hist' && <HistoryView />}
        {activeView === 'add' && (
          <AddTransaction 
            onCancel={() => setActiveView('dash')} 
            onSave={() => setActiveView('dash')} 
          />
        )}
        {activeView === 'settings' && <SettingsView onClose={() => setActiveView('dash')} />}
        {activeView === 'stats' && <div className="view active">Stats View (Work in Progress)</div>}
      </main>

      <Navigation activeView={activeView} onViewChange={setActiveView} />
      
      <Loader loading={loading} />
      <ErrorBar ref={errorBarRef} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
