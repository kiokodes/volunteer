import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.logo}>
          <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="#1d56e8"/>
            <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="48" y="28" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="22" fill="#1e293b">NextGem</text>
          </svg>
        </div>
        
        <h1 className={styles.title}>Refiners Volunteer Network</h1>
        <p className={styles.subtitle}>
          As a NextGem Refiner, you join a structured volunteer network that mentors, trains, and nurtures orphaned children.
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <span>Quick QR Check-In</span>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <span>Track Your Hours</span>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span>Make an Impact</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/sunshine-home" className={styles.primaryBtn}>
            Try Demo Check-In
          </Link>
          <Link href="/dashboard" className={styles.secondaryBtn}>
            View Dashboard
          </Link>
        </div>

        <p className={styles.note}>
          Scan a QR code at your assigned orphanage to check in
        </p>
      </div>

      <div className={styles.decoration}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
        <div className={styles.circle3}></div>
      </div>
    </main>
  );
}