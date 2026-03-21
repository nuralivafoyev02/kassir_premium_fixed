import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useTelegram } from '../hooks/useTelegram';

const AppContext = createContext();

export function AppProvider({ children }) {
  const { user: tgUser, userId } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [userProfile, setUserProfile] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(12850);
  const [pin, setPin] = useState(localStorage.getItem('kassa_pin'));
  
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch User Profile (exchange rate, etc.)
      const { data: uData } = await supabase.from('users').select('*').eq('user_id', userId).single();
      if (uData) {
        setUserProfile(uData);
        setExchangeRate(uData.exchange_rate || 12850);
      } else {
        // Create user if not exists
        const { data: newUser } = await supabase.from('users').insert({ 
          user_id: userId, 
          full_name: tgUser?.first_name || 'User' 
        }).select().single();
        setUserProfile(newUser);
      }

      // 2. Fetch Categories
      const { data: cData } = await supabase.from('categories').select('*').eq('user_id', userId);
      const cats = { income: [], expense: [] };
      (cData || []).forEach(c => cats[c.type].push(c));
      setCategories(cats);

      // 3. Fetch Transactions
      const { data: tData } = await supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false });
      setTransactions(tData || []);
    } catch (err) {
      console.error('[AppContext:fetchAll]', err);
    } finally {
      setLoading(false);
    }
  }, [userId, tgUser]);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId, fetchAll]);

  const value = {
    loading,
    setLoading,
    transactions,
    setTransactions,
    categories,
    setCategories,
    userProfile,
    exchangeRate,
    setExchangeRate,
    pin,
    setPin,
    fetchAll,
    userId,
    tgUser
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
