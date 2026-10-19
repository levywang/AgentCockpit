import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';

const LockDialog: React.FC = () => {
  const { closeLockModal, unlockWithPasscode, configPasscode } = useDashboard();
  const [passcode, setPasscode] = useState('');
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    const ok = unlockWithPasscode(passcode);
    if (ok) {
      setMsg({ text: 'ACCESS GRANTED // CONTROLS UNLOCKED', type: 'ok' });
      setTimeout(() => {
        closeLockModal();
      }, 400);
    } else {
      setMsg({ text: 'INVALID PASSCODE // ACCESS DENIED', type: 'err' });
      setIsShaking(true);
      inputRef.current?.select();
      setTimeout(() => setIsShaking(false), 300);
    }
  };

  return (
    <div className="lock-modal-mask" id="lockModal" role="dialog" aria-modal="true" aria-labelledby="lockModalTitle">
      <div className={`lock-modal ${isShaking ? 'shake' : ''}`}>
        <div className="lock-modal-hdr">
          <div className="lock-badge">⚠ WARNING // SAFEGUARD ARMED</div>
          <span className="lock-code">SYS-PROT // SEC-LOCK</span>
        </div>
        <div className="lock-modal-body">
          <h3 id="lockModalTitle">ACCIDENTAL TOUCH DETECTED</h3>
          <p>
            Panel interaction is locked to prevent unintended operational commands. Please enter the operational authorization passcode to unlock page controls.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="lock-input-row">
              <input
                ref={inputRef}
                type="password"
                id="lockPassInput"
                placeholder="ENTER PASSCODE"
                maxLength={20}
                autoComplete="off"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
              />
              <button type="submit" className="btn" id="lockSubmitBtn">
                UNLOCK
              </button>
            </div>
            {msg && (
              <div className={`lock-msg ${msg.type}`} id="lockMsg">
                {msg.text}
              </div>
            )}
            <div className="lock-hint">
              DEFAULT AUTHORIZATION PIN: <b>{configPasscode}</b> OR <b>admin</b>
            </div>
          </form>
        </div>
        <div className="lock-modal-ftr">
          <div>
            <span className="lock-status-dot"></span>
            <span>STATUS: RESTRICTED // PASSCODE REQUIRED</span>
          </div>
          <button type="button" className="btn-sm" id="lockDismissBtn" onClick={closeLockModal}>
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};

export const LockModal: React.FC = () => {
  const { isLockModalOpen } = useDashboard();
  if (!isLockModalOpen) return null;
  return <LockDialog key="lock-dialog-open" />;
};
