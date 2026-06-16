'use client';

import { Hand, Clock } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import styles from './ActionButton.module.css';

interface ActionButtonProps {
  onCheckIn: () => void;
  onCheckOut: () => void;
  loading: boolean;
  hasOpenSession?: boolean;
  disabled: boolean;
  checkInTime?: string;
}

export default function ActionButton({
  onCheckIn,
  onCheckOut,
  loading,
  hasOpenSession,
  disabled,
  checkInTime
}: ActionButtonProps) {
  const handleClick = () => {
    if (hasOpenSession) {
      onCheckOut();
    } else {
      onCheckIn();
    }
  };

  return (
    <button
      className={`${styles.button} ${hasOpenSession ? styles.checkout : styles.checkin}`}
      onClick={handleClick}
      disabled={disabled || loading}
      type="button"
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {hasOpenSession ? <Clock size={20} /> : <Hand size={20} />}
          <span className={styles.text}>
            {hasOpenSession 
              ? `Check Out (in at ${checkInTime ? formatTime(checkInTime) : ''})`
              : 'Check In'
            }
          </span>
        </>
      )}
    </button>
  );
}