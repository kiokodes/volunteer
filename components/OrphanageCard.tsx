import { OrphanageStats } from '@/lib/types';
import { formatHours } from '@/lib/utils';
import { Building2, Users, Clock } from 'lucide-react';
import styles from './OrphanageCard.module.css';

interface OrphanageCardProps {
  orphanage: OrphanageStats;
}

export default function OrphanageCard({ orphanage }: OrphanageCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <Building2 size={18} />
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{orphanage.name}</span>
        <span className={styles.meta}>
          <Users size={14} />
          {orphanage.volunteer_count} volunteers
        </span>
      </div>
      <div className={styles.hours}>
        <Clock size={14} />
        <span>{formatHours(orphanage.total_hours)}</span>
      </div>
    </div>
  );
}