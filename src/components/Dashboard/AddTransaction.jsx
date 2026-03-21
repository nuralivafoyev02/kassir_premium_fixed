import React, { useState } from 'react';
import { TrendingUp, TrendingDown, X, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../services/supabase';

export function AddTransaction({ onCancel, onSave }) {
  const { categories, userId, fetchAll } = useApp();
  const [step, setStep] = useState('type'); // type, cat, input
  const [type, setType] = useState('expense');
  const [cat, setCat] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(amount)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        amount: parseFloat(amount),
        category: cat.name,
        type: type,
        date: new Date().toISOString()
      });
      if (error) throw error;
      await fetchAll();
      onSave();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view active" id="view-add">
      <div className="add-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Yangi tranzaksiya</h2>
            <p>{step === 'type' ? 'Turini tanlang' : step === 'cat' ? 'Kategoriyani tanlang' : 'Summani kiriting'}</p>
          </div>
          <button className="header-btn" onClick={onCancel}><X size={18}/></button>
        </div>
      </div>

      <div id="chat-area">
        {type && <div className="msg u">{type === 'income' ? 'Kirim' : 'Chiqim'}</div>}
        {cat && <div className="msg u">{cat.name}</div>}
      </div>

      <div className="add-ctrl">
        {step === 'type' && (
          <div id="flow-start">
            <button className="fbtn i" onClick={() => { setType('income'); setStep('cat'); }}>
              <TrendingUp /> Kirim
            </button>
            <button className="fbtn e" onClick={() => { setType('expense'); setStep('cat'); }}>
              <TrendingDown /> Chiqim
            </button>
          </div>
        )}

        {step === 'cat' && (
          <div id="flow-cats" style={{ display: 'flex' }}>
             <div className="cats-hdr">
               <span>Kategoriyalar</span>
               <button className="add-cat-b"><Plus size={12}/> Yangi</button>
             </div>
             <div id="cat-grid">
               {categories[type].map(c => (
                 <div key={c.id} className={`ci ci-${type === 'income' ? 'i' : 'e'}`} onClick={() => { setCat(c); setStep('input'); }}>
                   <span>{c.name}</span>
                 </div>
               ))}
             </div>
             <button className="cflow-cancel" onClick={() => setStep('type')}>Orqaga</button>
          </div>
        )}

        {step === 'input' && (
          <div id="flow-input" style={{ display: 'flex' }}>
            <div className="in-row">
              <input 
                id="amt-in" 
                type="number" 
                placeholder="Summa..." 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="act-row">
              <button className="cancel-x" onClick={() => setStep('cat')}><X /></button>
              <button 
                className="save-b" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
