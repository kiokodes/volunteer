'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';
import { DashboardStats, OrphanageStats, VolunteerStats, FlaggedSession } from '@/lib/types';
import { formatHours, formatTime } from '@/lib/utils';
import PasswordGate from '@/components/PasswordGate';
import StatCard from '@/components/StatCard';
import ManageOrphanages from '@/components/ManageOrphanages';
import ManageVolunteers from '@/components/ManageVolunteers';
import { Building2, Users, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orphanages, setOrphanages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordSubmit = (password: string): boolean => {
    const validPassword = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || 'nextgem2024';
    if (password === validPassword) {
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const fetchStats = async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch orphanages
      const { data: orphanagesData } = await supabase
        .from('orphanages')
        .select('*')
        .order('name');

      setOrphanages(orphanagesData || []);

      // Fetch volunteers with orphanage names
      const { data: volunteersData } = await supabase
        .from('volunteers')
        .select(`
          id,
          name,
          nysc_code,
          orphanage_id,
          orphanages (name)
        `)
        .order('name');

      // Fetch all sessions
      const { data: allSessions } = await supabase
        .from('sessions')
        .select('*');

      const sessions = allSessions || [];

      // Calculate hours per orphanage
      const orphanageStats: OrphanageStats[] = (orphanagesData || []).map(o => {
        const orphanageSessions = sessions.filter(s => s.orphanage_id === o.id);
        const totalHours = orphanageSessions.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
        return {
          id: o.id,
          name: o.name,
          volunteer_count: volunteersData?.filter(v => v.orphanage_id === o.id).length || 0,
          total_hours: totalHours
        };
      });

      // Calculate volunteer stats
      const volunteerStats: VolunteerStats[] = (volunteersData || []).map(v => {
        const volunteerSessions = sessions.filter(s => s.volunteer_id === v.id);
        const totalHours = volunteerSessions.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
        return {
          id: v.id,
          name: v.name,
          nysc_code: v.nysc_code,
          orphanage_name: (v as any).orphanages?.name || 'Unknown',
          total_sessions: volunteerSessions.length,
          total_hours: totalHours
        };
      }).sort((a, b) => b.total_hours - a.total_hours);

      // Find flagged sessions
      const now = new Date();
      const flaggedSessions: FlaggedSession[] = sessions
        .filter(s => !s.check_out_time)
        .map(s => {
          const checkIn = new Date(s.check_in_time);
          const hoursOpen = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          if (hoursOpen >= 8) {
            const volunteer = volunteersData?.find(v => v.id === s.volunteer_id);
            const orphanage = orphanagesData?.find(o => o.id === s.orphanage_id);
            return {
              id: s.id,
              volunteer_name: volunteer?.name || 'Unknown',
              orphanage_name: orphanage?.name || 'Unknown',
              check_in_time: s.check_in_time,
              hours_open: Math.round(hoursOpen * 10) / 10
            };
          }
          return null;
        })
        .filter((f): f is FlaggedSession => f !== null);

      const totalHours = sessions.reduce((sum, s) => sum + (s.hours_worked || 0), 0);

      setStats({
        total_orphanages: orphanagesData?.length || 0,
        total_volunteers: volunteersData?.length || 0,
        total_hours: totalHours,
        flagged_sessions: flaggedSessions,
        orphanages: orphanageStats,
        volunteers: volunteerStats
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchStats();
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loginCard}>
            <div className={styles.loginLogo}>
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#1d56e8"/>
                <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className={styles.loginTitle}>Dashboard</h1>
            <p className={styles.loginSubtitle}>Enter your password to continue</p>
            <PasswordGate onSubmit={handlePasswordSubmit} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logoLarge}>
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#1d56e8"/>
                <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>NextGem</span>
            </div>
            <h1 className={styles.pageTitle}>Admin Dashboard</h1>
          </div>
          <button 
            className={styles.refreshBtn}
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {stats && (
          <>
            {/* Stats Overview */}
            <section className={styles.statsGrid}>
              <StatCard
                icon={<Building2 size={20} />}
                label="Orphanages"
                value={stats.total_orphanages.toString()}
                color="primary"
              />
              <StatCard
                icon={<Users size={20} />}
                label="Volunteers"
                value={stats.total_volunteers.toString()}
                color="success"
              />
              <StatCard
                icon={<Clock size={20} />}
                label="Total Hours"
                value={formatHours(stats.total_hours)}
                color="warning"
              />
            </section>

            {/* Flagged Sessions */}
            {stats.flagged_sessions.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <AlertTriangle size={18} className={styles.warningIcon} />
                  Flagged Sessions (No check-out after 8+ hours)
                </h2>
                <div className={styles.flaggedList}>
                  {stats.flagged_sessions.map(session => (
                    <div key={session.id} className={styles.flaggedItem}>
                      <div className={styles.flaggedInfo}>
                        <span className={styles.flaggedName}>{session.volunteer_name}</span>
                        <span className={styles.flaggedLocation}>{session.orphanage_name}</span>
                      </div>
                      <div className={styles.flaggedMeta}>
                        <span className={styles.flaggedTime}>
                          Checked in {formatTime(session.check_in_time)}
                        </span>
                        <span className={styles.flaggedDuration}>
                          {session.hours_open}h open
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Manage Orphanages */}
            <section className={styles.section}>
              <ManageOrphanages 
                orphanages={orphanages} 
                onUpdate={fetchStats}
              />
            </section>

            {/* Manage Volunteers */}
            <section className={styles.section}>
              <ManageVolunteers onUpdate={fetchStats} />
            </section>

            {/* Top Volunteers */}
            {stats.volunteers.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Top Volunteers by Hours</h2>
                <div className={styles.volunteerList}>
                  {stats.volunteers.slice(0, 10).map((volunteer, index) => (
                    <div 
                      key={volunteer.id} 
                      className={`${styles.volunteerItem} ${index < 3 ? styles.topRank : ''}`}
                    >
                      <span className={styles.rank}>{index + 1}</span>
                      <div className={styles.volunteerInfo}>
                        <span className={styles.volunteerName}>{volunteer.name}</span>
                        <span className={styles.volunteerMeta}>
                          {volunteer.orphanage_name} • {volunteer.total_sessions} sessions
                        </span>
                      </div>
                      <span className={styles.volunteerHours}>{formatHours(volunteer.total_hours)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}