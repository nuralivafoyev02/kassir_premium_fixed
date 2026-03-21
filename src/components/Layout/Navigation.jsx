import React from 'react';
import { Home, History, Plus } from 'lucide-react';

export function Navigation({ activeView, onViewChange }) {
  return (
    <nav id="nav">
      <button 
        className={`nb ${activeView === 'dash' ? 'active' : ''}`} 
        onClick={() => onViewChange('dash')}
      >
        <Home size={22}/>
        <span>Bosh</span>
      </button>

      <button className={`nb ${activeView === 'add' ? 'active' : ''}`} onClick={() => onViewChange('add')}>
        <div className="add-ring">
          <Plus size={28}/>
        </div>
        <span className="add-btn-txt">Qo'shish</span>
      </button>
      
      <button 
        className={`nb ${activeView === 'hist' ? 'active' : ''}`} 
        onClick={() => onViewChange('hist')}
      >
        <History size={22}/>
        <span>Tarix</span>
      </button>
    </nav>
  );
}
