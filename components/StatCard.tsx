import { ReactNode } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  color?: 'primary' | 'success' | 'warning';
}

export default function StatCard({ icon, label, value, color = 'primary' }: StatCardProps) {
  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.iconWrapper}>
        {icon}
      </div>
      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}