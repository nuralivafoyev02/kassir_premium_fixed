import React from 'react';
import { Settings, Plus } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export function Header({ onOpenSettings }) {
  const { tgUser } = useApp();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">💰</div>
        <div>
          <div className="header-title">Kassa</div>
          <div className="header-sub">{tgUser?.first_name || 'Salom'}</div>
        </div>
      </div>
      <div className="header-actions">
        <button className="header-btn settings-btn" onClick={onOpenSettings}>
          <Settings />
        </button>
      </div>
    </header>
  );
}
