import { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { verifyPasscode } from '../../lib/api';
import avatarImage from '../../assets/reference-crops/avatar_luffy.png';
import './visitor-auth-popup.css';

export function VisitorAuthPopup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGuest = () => {
    localStorage.setItem('isGuest', 'true');
    window.location.href = '/nutrition';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    setLoading(true);
    setError(false);
    try {
      const res = await verifyPasscode(passcode);
      if (res?.data?.token) {
        localStorage.setItem('authToken', res.data.token);
        window.location.reload();
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="visitor-auth-overlay">
      <div className="visitor-auth-modal">
        <div className="visitor-auth-modal-bg-decor"></div>
        <div className={`visitor-auth-slider step-${step}`}>
          {/* Step 1 */}
          <div className="visitor-auth-pane">
            <div className="visitor-auth-avatar-wrap">
              <img src={avatarImage} alt="Harry" className="visitor-auth-avatar" />
              <div className="visitor-auth-badge"><ShieldCheck size={16} /></div>
            </div>
            <h2 className="visitor-auth-title">Welcome to my space</h2>
            <p className="visitor-auth-subtitle">Are you Harry accessing this dashboard, or a guest exploring?</p>
            <div className="visitor-auth-buttons">
              <button className="visitor-auth-btn primary" onClick={() => setStep(2)}>
                <User size={18} />
                I am Harry
              </button>
              <button className="visitor-auth-btn secondary" onClick={handleGuest}>
                I'm a Guest
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="visitor-auth-pane">
            <div className="visitor-auth-icon-wrap">
              <Lock size={32} className="visitor-auth-lock-icon" />
            </div>
            <h2 className="visitor-auth-title">Verify Identity</h2>
            <p className="visitor-auth-subtitle">Enter your secure passcode to unlock full access.</p>
            <form onSubmit={handleAuthSubmit} className="visitor-auth-form">
              <div className="visitor-auth-input-group">
                <input
                  type="password"
                  className={`visitor-auth-input ${error ? 'error' : ''}`}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Passcode"
                  autoFocus={step === 2}
                />
              </div>
              <div className="visitor-auth-buttons">
                <button type="button" className="visitor-auth-btn secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="visitor-auth-btn primary" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Unlock</span> <ArrowRight size={18} /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
