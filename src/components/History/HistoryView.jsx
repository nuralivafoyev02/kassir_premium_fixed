import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { TransactionItem } from './TransactionItem';

export function HistoryView() {
  const { transactions } = useApp();
  const [filter, setFilter] = useState('all');

  const filtered = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <div className="view active">
      <div className="view-hist-hdr">
        <div className="vh-top">
          <h2>Tarix</h2>
          <div className="hist-filter-row">
            <button 
              className={`fp ${filter === 'all' ? 'on' : ''}`}
              onClick={() => setFilter('all')}
            >Barchasi</button>
            <button 
              className={`fp ${filter === 'income' ? 'on' : ''}`}
              onClick={() => setFilter('income')}
            >Kirim</button>
            <button 
              className={`fp ${filter === 'expense' ? 'on' : ''}`}
              onClick={() => setFilter('expense')}
            >Chiqim</button>
          </div>
        </div>
      </div>

      <div id="tx-list">
        {filtered.map(t => (
          <TransactionItem 
            key={t.id} 
            transaction={t} 
            onClick={(tx) => console.log('Transaction clicked:', tx)} 
          />
        ))}
        {filtered.length === 0 && (
          <div id="empty-s" style={{ display: 'flex' }}>
            <p>Ma'lumot topilmadi</p>
          </div>
        )}
      </div>
    </div>
  );
}
