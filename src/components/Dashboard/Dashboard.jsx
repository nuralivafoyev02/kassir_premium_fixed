import React from 'react';
import { BalanceCard } from './BalanceCard';
import { useApp } from '../../store/AppContext';

export function Dashboard() {
  return (
    <div className="view active">
      <BalanceCard />
      
      {/* Chart and Trends placeholder */}
      <div className="panel">
        <div className="panel-ttl">STATISTIKA (Tez kunda)</div>
        <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          Grafik ishlanmoqda...
        </div>
      </div>
    </div>
  );
}
