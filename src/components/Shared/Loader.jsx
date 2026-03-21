import React, { useState, useEffect } from 'react';

const messages = [
  "Yuklanyapti...",
  "Sozlanyapti...",
  "Ma'lumotlar olinmoqda...",
  "Tayyorlanmoqda...",
  "Deyarli tayyor...",
];

export function Loader({ loading }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setMsgIdx((prev) => (prev + 1) % messages.length);
        setFade(false);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  return (
    <div id="loader" className={!loading ? 'out' : ''}>
      <div className="spin"></div>
      <p className={fade ? 'fade' : ''}>{messages[msgIdx]}</p>
    </div>
  );
}
