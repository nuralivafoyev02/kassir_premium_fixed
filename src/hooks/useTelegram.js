import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (telegram) {
      telegram.expand();
      telegram.ready();
      setTg(telegram);
    }
  }, []);

  const showAlert = (msg) => tg?.showAlert(msg);
  const showConfirm = (msg, cb) => tg?.showConfirm(msg, cb);
  const haptic = (style = 'light') => tg?.HapticFeedback?.impactOccurred(style);

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    userId: tg?.initDataUnsafe?.user?.id,
    showAlert,
    showConfirm,
    haptic,
  };
}
