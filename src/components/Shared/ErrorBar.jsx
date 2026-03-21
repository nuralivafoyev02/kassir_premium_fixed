import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export const ErrorBar = forwardRef((props, ref) => {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    show(message, duration = 3000) {
      setMsg(message);
      setVisible(true);
      setTimeout(() => setVisible(false), duration);
    }
  }));

  if (!visible) return null;

  return (
    <div id="err-bar" style={{ display: 'block' }}>
      {msg}
    </div>
  );
});
