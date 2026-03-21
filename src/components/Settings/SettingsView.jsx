import React, { useState } from 'react';
import { Shield, Key, RefreshCw, Trash2, Globe, Sun, Moon, LogOut } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { fmt } from '../../utils/formatters';

export function SettingsView({ onClose }) {
  const { exchangeRate, setExchangeRate, pin, setPin, showAlert } = useApp();
  const [rateIn, setRateIn] = useState(exchangeRate.toString());

  const handleSaveRate = () => {
    const val = parseFloat(rateIn);
    if (val > 0) {
      setExchangeRate(val);
      showAlert("Kurs saqlandi ✅");
    }
  };

  return (
    <div className="view active">
      <div className="view-hist-hdr">
        <div className="vh-top">
          <h2>Sozlamalar</h2>
          <button className="header-btn" onClick={onClose}><LogOut size={18}/></button>
        </div>
      </div>

      <div className="panel">
        <div className="si">
          <div className="si-l">
            <div>Valyuta kursi</div>
            <div className="si-s">1 USD = {fmt(exchangeRate)} UZS</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="si-i" 
              type="number" 
              value={rateIn} 
              onChange={(e) => setRateIn(e.target.value)}
            />
            <button className="si-a" onClick={handleSaveRate}>OK</button>
          </div>
        </div>

        <div className="si">
          <div className="si-l">
            <div>PIN-kod</div>
            <div className="si-s">{pin ? 'Faol ✅' : "O'rnatilmagan"}</div>
          </div>
          <button className="si-a" onClick={() => showAlert("Tez kunda...")}>
             {pin ? "O'zgartirish" : "O'rnatish"}
          </button>
        </div>

        <div className="si">
          <div className="si-l">
            <div>Mavzu</div>
            <div className="si-s">To'q rangli (Dark)</div>
          </div>
          <div className="tgl on"><Moon size={14} style={{ margin: '4px' }}/></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '12px' }}>
        <button className="dbtn" onClick={() => showAlert("Eksport qilinmoqda...")}>
          <Globe size={16}/> JSON bo'lib eksport qilish
        </button>
        <button className="dbtn red" onClick={() => showAlert("Barcha ma'lumotlar o'chib ketadi!")}>
          <Trash2 size={16}/> Ma'lumotlarni tozalash
        </button>
      </div>
    </div>
  );
}
