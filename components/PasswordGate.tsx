'use client';

import { useState } from 'react';
import styles from './PasswordGate.module.css';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

interface PasswordGateProps {
  onSubmit: (password: string) => boolean;
}

export default function PasswordGate({ onSubmit }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const success = onSubmit(password);
    if (!success) {
      setError(true);
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={`${styles.inputWrapper} ${error ? styles.error : ''}`}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Enter password"
          className={styles.input}
          autoComplete="current-password"
        />
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <p className={styles.errorMessage}>Incorrect password. Please try again.</p>
      )}

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={!password || loading}
      >
        {loading ? (
          <span className={styles.spinner} />
        ) : (
          <>
            <span>Continue</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}