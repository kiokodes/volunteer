'use client';

import { VolunteerWithStatus } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Check, Clock } from 'lucide-react';
import styles from './VolunteerCard.module.css';

interface VolunteerCardProps {
  volunteer: VolunteerWithStatus;
  isSelected: boolean;
  onSelect: () => void;
}

export default function VolunteerCard({ volunteer, isSelected, onSelect }: VolunteerCardProps) {
  return (
    <button
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      type="button"
    >
      <div className={styles.radio}>
        <div className={styles.radioInner}>
          {isSelected && <Check size={14} strokeWidth={3} />}
        </div>
      </div>
      
      <div className={styles.info}>
        <span className={styles.name}>{volunteer.name}</span>
        <span className={styles.code}>NYSC: {volunteer.nysc_code}</span>
      </div>

      {volunteer.has_open_session && volunteer.current_session && (
        <div className={styles.badge}>
          <Clock size={12} />
          <span>Checked in {formatTime(volunteer.current_session.check_in_time)}</span>
        </div>
      )}
    </button>
  );
}