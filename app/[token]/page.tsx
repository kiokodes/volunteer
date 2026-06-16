'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';
import { Orphanage, VolunteerWithStatus, Session } from '@/lib/types';
import { formatTime, formatDate, getTodayDateString } from '@/lib/utils';
import VolunteerCard from '@/components/VolunteerCard';
import ActionButton from '@/components/ActionButton';
import ConfirmationModal from '@/components/ConfirmationModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AlertCircle, MapPin, Users } from 'lucide-react';

export default function CheckInPage() {
  const params = useParams();
  const token = params.token as string;

  const [orphanage, setOrphanage] = useState<Orphanage | null>(null);
  const [volunteers, setVolunteers] = useState<VolunteerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    show: boolean;
    type: 'checkin' | 'checkout';
    data: Session | null;
  }>({ show: false, type: 'checkin', data: null });

  const fetchOrphanageData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch orphanage by token
      const { data: orphanageData, error: orphanageError } = await supabase
        .from('orphanages')
        .select('*')
        .eq('qr_code_token', token)
        .single();

      if (orphanageError || !orphanageData) {
        setError('This QR code is not recognized. Please check with your coordinator.');
        setLoading(false);
        return;
      }

      setOrphanage(orphanageData);

      // Fetch volunteers for this orphanage
      const { data: volunteersData, error: volunteersError } = await supabase
        .from('volunteers')
        .select('*')
        .eq('orphanage_id', orphanageData.id);

      if (volunteersError) throw volunteersError;

      // Fetch today's sessions for these volunteers
      const today = getTodayDateString();
      const volunteerIds = volunteersData.map(v => v.id);

      let sessionsData: Session[] = [];
      if (volunteerIds.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('*')
          .eq('date', today)
          .in('volunteer_id', volunteerIds);

        sessionsData = sessions || [];
      }

      // Combine volunteers with their session status
      const volunteersWithStatus: VolunteerWithStatus[] = volunteersData.map(volunteer => {
        const openSession = sessionsData.find(
          s => s.volunteer_id === volunteer.id && !s.check_out_time
        );
        return {
          ...volunteer,
          has_open_session: !!openSession,
          current_session: openSession || undefined
        };
      });

      setVolunteers(volunteersWithStatus);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrphanageData();
  }, [fetchOrphanageData]);

  const handleCheckIn = async () => {
    if (!selectedId || !orphanage) return;

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const today = getTodayDateString();

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          volunteer_id: selectedId,
          orphanage_id: orphanage.id,
          date: today,
          check_in_time: now
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setError('You already have a check-in today.');
        } else {
          throw error;
        }
        setActionLoading(false);
        return;
      }

      // Update local state
      setVolunteers(prev => prev.map(v => 
        v.id === selectedId 
          ? { ...v, has_open_session: true, current_session: data }
          : v
      ));

      setModalState({ show: true, type: 'checkin', data });
    } catch (err) {
      console.error('Check-in error:', err);
      setError('Failed to check in. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedId) return;

    const volunteer = volunteers.find(v => v.id === selectedId);
    if (!volunteer?.current_session) return;

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const checkInTime = new Date(volunteer.current_session.check_in_time);
      const checkOutTime = new Date(now);
      const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const { data, error } = await supabase
        .from('sessions')
        .update({
          check_out_time: now,
          hours_worked: Math.round(hoursWorked * 100) / 100
        })
        .eq('id', volunteer.current_session.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setVolunteers(prev => prev.map(v => 
        v.id === selectedId 
          ? { ...v, has_open_session: false, current_session: undefined }
          : v
      ));

      setModalState({ show: true, type: 'checkout', data });
    } catch (err) {
      console.error('Check-out error:', err);
      setError('Failed to check out. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setModalState({ show: false, type: 'checkin', data: null });
    setSelectedId(null);
  };

  const selectedVolunteer = volunteers.find(v => v.id === selectedId);
  const hasOpenSession = selectedVolunteer?.has_open_session;

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <LoadingSkeleton />
        </div>
      </main>
    );
  }

  if (error && !orphanage) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>
              <AlertCircle size={48} />
            </div>
            <h1 className={styles.errorTitle}>QR Code Not Found</h1>
            <p className={styles.errorMessage}>{error}</p>
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
          <div className={styles.logoSmall}>
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="#1d56e8"/>
              <path d="M9 16L14 21L23 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>NextGem</span>
          </div>
        </header>

        {/* Orphanage Info */}
        {orphanage && (
          <div className={styles.orphanageInfo}>
            <div className={styles.orphanageIcon}>
              <MapPin size={20} />
            </div>
            <div>
              <h1 className={styles.orphanageName}>{orphanage.name}</h1>
              <p className={styles.orphanageMeta}>
                <Users size={14} />
                {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Volunteer Selection */}
        <section className={styles.volunteerSection}>
          <h2 className={styles.sectionTitle}>Select Your Name</h2>
          <div className={styles.volunteerList}>
            {volunteers.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No volunteers assigned to this location yet.</p>
              </div>
            ) : (
              volunteers.map((volunteer, index) => (
                <div 
                  key={volunteer.id} 
                  className={styles.volunteerItem}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <VolunteerCard
                    volunteer={volunteer}
                    isSelected={selectedId === volunteer.id}
                    onSelect={() => setSelectedId(volunteer.id)}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Action Button */}
        <div className={styles.actionArea}>
          <ActionButton
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            loading={actionLoading}
            hasOpenSession={hasOpenSession}
            disabled={!selectedId || volunteers.length === 0}
            checkInTime={selectedVolunteer?.current_session?.check_in_time}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalState.show}
        type={modalState.type}
        session={modalState.data}
        volunteerName={selectedVolunteer?.name || ''}
        onClose={closeModal}
      />
    </main>
  );
}