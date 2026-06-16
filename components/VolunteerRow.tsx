import { VolunteerStats } from '@/lib/types';
import { formatHours } from '@/lib/utils';
import { Trophy, Star } from 'lucide-react';
import styles from './VolunteerRow.module.css';

interface VolunteerRowProps {
  volunteer: VolunteerStats;
  rank: number;
}

export default function VolunteerRow({ volunteer, rank }: VolunteerRowProps) {
  const isTopThree = rank <= 3;

  return (
    <div className={`${styles.row} ${isTopThree ? styles.topRank : ''}`}>
      <div className={styles.rank}>
        {isTopThree ? (
          <Trophy size={16} className={rank === 1 ? styles.gold : rank === 2 ? styles.silver : styles.bronze} />
        ) : (
          <span className={styles.rankNumber}>{rank}</span>
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{volunteer.name}</span>
          {isTopThree && <Star size={14} className={styles.star} />}
        </div>
        <span className={styles.meta}>
          {volunteer.orphanage_name} • {volunteer.total_sessions} sessions
        </span>
      </div>
      <div className={styles.hours}>
        {formatHours(volunteer.total_hours)}
      </div>
    </div>
  );
}