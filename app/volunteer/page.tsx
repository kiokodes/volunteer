'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';
import { Volunteer, Session } from '@/lib/types';
import { formatTime, formatDate, formatHours } from '@/lib/utils';
import { LogIn, Clock, Calendar, TrendingUp, LogOut } from 'lucide-react';

export default function VolunteerLoginPage() {
  const [step, setStep] = useState<'login' | 'dashboard'>('login');
  const [nyscCode, setNyscCode] = useState('');
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Database not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find volunteer by NYSC code
      const { data: volunteerData, error: volunteerError } = await supabase
        .from('volunteers')
        .select('*')
        .eq('nysc_code', nyscCode.toUpperCase())
        .single();

      if (volunteerError || !volunteerData) {
        setError('NYSC code not found. Please check your code.');
        setLoading(false);
        return;
      }

      setVolunteer(volunteerData);

      // Fetch all sessions for this volunteer
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('volunteer_id', volunteerData.id)
        .order('date', { ascending: false });

      setSessions(sessionsData || []);
      setStep('dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setVolunteer(null);
    setSessions([]);
    setNyscCode('');
    setStep('login');
  };

  // Calculate stats
  const totalHours = sessions.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
  const completedSessions = sessions.filter(s => s.hours_worked).length;
  const thisMonthSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    const now = new Date();
    return sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
  });
  const thisMonthHours = thisMonthSessions.reduce((sum, s) => sum + (s.hours_worked || 0), 0);

  if (step === 'dashboard' && volunteer) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.logoSmall}>
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#1d56e8"/>
                <path d="M9 16L14 21L23 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>NextGem</span>
            </div>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <LogOut size={18} />
              Logout
            </button>
          </header>

          {/* Volunteer Info */}
          <div className={styles.volunteerCard}>
            <div className={styles.avatar}>
              {volunteer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className={styles.volunteerInfo}>
              <h1 className={styles.volunteerName}>{volunteer.name}</h1>
              <p className={styles.volunteerCode}>{volunteer.nysc_code}</p>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Clock size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{formatHours(totalHours)}</span>
                <span className={styles.statLabel}>Total Hours</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Calendar size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{completedSessions}</span>
                <span className={styles.statLabel}>Sessions</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.highlight}`}>
              <div className={styles.statIcon}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{formatHours(thisMonthHours)}</span>
                <span className={styles.statLabel}>This Month</span>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <section className={styles.sessionsSection}>
            <h2 className={styles.sectionTitle}>Recent Sessions</h2>
            {sessions.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No sessions yet. Start by checking in at your assigned orphanage!</p>
              </div>
            ) : (
              <div className={styles.sessionList}>
                {sessions.slice(0, 10).map((session, index) => (
                  <div key={session.id} className={styles.sessionItem} style={{ animationDelay: `${index * 50}ms` }}>
                    <div className={styles.sessionDate}>
                      <span className={styles.sessionDay}>{new Date(session.date).getDate()}</span>
                      <span className={styles.sessionMonth}>
                        {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div className={styles.sessionDetails}>
                      <span className={styles.sessionTime}>
                        {formatTime(session.check_in_time)}
                        {session.check_out_time && ` - ${formatTime(session.check_out_time)}`}
                      </span>
                      {session.hours_worked ? (
                        <span className={styles.sessionHours}>{formatHours(session.hours_worked)}</span>
                      ) : (
                        <span className={styles.sessionOpen}>In progress</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <div className={styles.loginLogo}>
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="#1d56e8"/>
              <path d="M14 24L21 31L34 16" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.loginTitle}>Volunteer Login</h1>
          <p className={styles.loginSubtitle}>Enter your NYSC code to view your hours</p>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={nyscCode}
                onChange={(e) => setNyscCode(e.target.value.toUpperCase())}
                placeholder="e.g. NG/2024/001"
                className={styles.input}
                autoComplete="off"
              />
            </div>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button type="submit" className={styles.loginBtn} disabled={!nyscCode || loading}>
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>View My Hours</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className={styles.footer}>
          Don't know your code? Contact your coordinator.
        </p>
      </div>
    </main>
  );
}