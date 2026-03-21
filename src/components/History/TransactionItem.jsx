import React from 'react';
import { TrendingUp, TrendingDown, Receipt, Calendar } from 'lucide-react';
import { fmt } from '../../utils/formatters';

export function TransactionItem({ transaction, onClick }) {
  const isIncome = transaction.type === 'income';
  const date = new Date(transaction.date);
  const dateStr = date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="txi" onClick={onClick}>
      <div className="txi-l">
        <div className={`txi-ico ${isIncome ? 'i' : 'e'}`}>
          {isIncome ? '📈' : '📉'}
        </div>
        <div>
          <div className="txi-cat">{transaction.category}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            {dateStr}, {timeStr}
          </div>
        </div>
      </div>
      <div className={`txi-amt ${isIncome ? 'i' : 'e'}`}>
        {isIncome ? '+' : '-'}{fmt(transaction.amount)}
      </div>
    </div>
  );
}
