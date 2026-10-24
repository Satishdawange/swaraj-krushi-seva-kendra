import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../CSS/changePassword.css';

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('नवीन पासवर्ड आणि पुष्टी केलेला पासवर्ड जुळत नाही.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('नवीन पासवर्ड सध्याच्या पासवर्डपेक्षा वेगळा असावा.');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('पासवर्ड यशस्वीरीत्या बदलला.');
    } catch (changeError) {
      setError(changeError.message || 'पासवर्ड बदलता आला नाही.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="change-password-page">
      <section className="change-password-panel">
        <div className="change-password-heading">
          <span className="change-password-mark" aria-hidden="true">🔐</span>
          <div>
            <h1>पासवर्ड बदला</h1>
            <p>{user?.fullName || user?.username}</p>
          </div>
        </div>
        {error && <div className="change-password-message error" role="alert">{error}</div>}
        {success && <div className="change-password-message success" role="status">{success}</div>}
        <form onSubmit={submit} className="change-password-form">
          <label>
            <span>सध्याचा पासवर्ड</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </label>
          <label>
            <span>नवीन पासवर्ड</span>
            <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </label>
          <label>
            <span>नवीन पासवर्ड पुन्हा टाका</span>
            <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </label>
          <button type="submit" disabled={saving}>{saving ? 'बदलत आहे…' : 'पासवर्ड अपडेट करा'}</button>
        </form>
      </section>
    </section>
  );
}