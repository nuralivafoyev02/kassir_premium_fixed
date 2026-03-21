import React from 'react';
import { TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { fmt } from '../../utils/formatters';

export function TransactionItem({ transaction, onClick }) {
  const isIncome = transaction.type === 'income';
  const date = new Date(transaction.date);

  return (
    <div className="txi" onClick={() => onClick(transaction)}>
      <div className="txi-l">
        <div className={`txi-ico ${isIncome ? 'i' : 'e'}`}>
          {isIncome ? <TrendingUp /> : <TrendingDown />}
        </div>
        <div>
          <div className="txi-cat">
            {transaction.category}
            {transaction.receipt_url && <span className="chek-b"><Receipt size={12} /> Chek</span>}
          </div>
          <div className="txi-dt">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      <div className={`txi-amt ${isIncome ? 'i' : 'e'}`}>
        {isIncome ? '+' : '-'}{fmt(transaction.amount)}
      </div>
    </div>
  );
}
