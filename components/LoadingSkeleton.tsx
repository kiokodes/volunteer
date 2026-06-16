import styles from './LoadingSkeleton.module.css';

export default function LoadingSkeleton() {
  return (
    <div className={styles.container}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div className={styles.logoSkeleton}></div>
      </div>

      {/* Orphanage info skeleton */}
      <div className={styles.orphanageSkeleton}>
        <div className={styles.iconSkeleton}></div>
        <div className={styles.textSkeleton}>
          <div className={styles.titleSkeleton}></div>
          <div className={styles.metaSkeleton}></div>
        </div>
      </div>

      {/* Section title skeleton */}
      <div className={styles.sectionTitleSkeleton}></div>

      {/* Volunteer cards skeleton */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.radioSkeleton}></div>
          <div className={styles.infoSkeleton}>
            <div className={styles.nameSkeleton}></div>
            <div className={styles.codeSkeleton}></div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.radioSkeleton}></div>
          <div className={styles.infoSkeleton}>
            <div className={styles.nameSkeleton}></div>
            <div className={styles.codeSkeleton}></div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.radioSkeleton}></div>
          <div className={styles.infoSkeleton}>
            <div className={styles.nameSkeleton}></div>
            <div className={styles.codeSkeleton}></div>
          </div>
        </div>
      </div>

      {/* Button skeleton */}
      <div className={styles.buttonSkeleton}></div>
    </div>
  );
}