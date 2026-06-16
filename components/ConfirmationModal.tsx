'use client';

import { useEffect, useState } from 'react';
import { Session } from '@/lib/types';
import { formatTime, formatDate, formatHours } from '@/lib/utils';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  type: 'checkin' | 'checkout';
  session: Session | null;
  volunteerName: string;
  onClose: () => void;
}

export default function ConfirmationModal({
  isOpen,
  type,
  session,
  volunteerName,
  onClose
}: ConfirmationModalProps) {
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    if (isOpen && type === 'checkin') {
      // Generate confetti
      const colors = ['#1d56e8', '#059669', '#f59e0b', '#ec4899'];
      const newConfetti = Array.from({ length: 12 }, () => ({
        x: Math.random() * 100 - 50,
        y: Math.random() * 30,
        color: colors[Math.floor(Math.random() * colors.length)]
      }));
      setConfetti(newConfetti);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${type === 'checkin' ? styles.checkin : styles.checkout}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Confetti particles */}
        {type === 'checkin' && confetti.map((particle, i) => (
          <div
            key={i}
            className={styles.confetti}
            style={{
              left: `calc(50% + ${particle.x}px)`,
              backgroundColor: particle.color,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}

        <div className={styles.iconWrapper}>
          {type === 'checkin' ? (
            <CheckCircle2 size={64} strokeWidth={1.5} />
          ) : (
            <Clock size={64} strokeWidth={1.5} />
          )}
        </div>

        <h2 className={styles.title}>
          {type === 'checkin' ? 'Checked In!' : 'Checked Out!'}
        </h2>

        <p className={styles.timestamp}>
          {type === 'checkin' ? formatTime(session.check_in_time) : formatTime(session.check_out_time!)}
          {' • '}
          {formatDate(session.check_in_time)}
        </p>

        <p className={styles.message}>
          {type === 'checkin' ? (
            <>
              See you later, <strong>{volunteerName}</strong>!
              <br />
              You're making a difference today.
            </>
          ) : (
            <>
              Great session, <strong>{volunteerName}</strong>!
              <br />
              You contributed <strong>{formatHours(session.hours_worked || 0)}</strong> today.
            </>
          )}
        </p>

        {type === 'checkin' && (
          <div className={styles.sparkle}>
            <Sparkles size={20} />
            <span>Thank you for your service</span>
          </div>
        )}

        <button className={styles.doneButton} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}