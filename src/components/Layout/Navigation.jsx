import React from 'react';
import { Home, History, Plus, BarChart3 } from 'lucide-react';

export function Navigation({ activeView, onViewChange }) {
  return (
    <nav id="nav">
      <button 
        className={`nb ${activeView === 'dash' ? 'active' : ''}`} 
        onClick={() => onViewChange('dash')}
      >
        <Home />
        <span>Asosiy</span>
      </button>
      
      <button 
        className={`nb ${activeView === 'hist' ? 'active' : ''}`} 
        onClick={() => onViewChange('hist')}
      >
        <History />
        <span>Tarix</span>
      </button>

      <button className="nb" onClick={() => onViewChange('add')}>
        <div className="add-ring">
          <Plus />
        </div>
        <span className="add-btn-txt">Qo'shish</span>
      </button>

      <button 
        className={`nb ${activeView === 'stats' ? 'active' : ''}`} 
        onClick={() => onViewChange('stats')}
      >
        <BarChart3 />
        <span>Statistika</span>
      </button>
    </nav>
  );
}
