'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Volunteer, Orphanage } from '@/lib/types';
import { Plus, User, X } from 'lucide-react';
import styles from './ManageVolunteers.module.css';

interface ManageVolunteersProps {
  onUpdate: () => void;
}

export default function ManageVolunteers({ onUpdate }: ManageVolunteersProps) {
  const [showForm, setShowForm] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [name, setName] = useState('');
  const [nyscCode, setNyscCode] = useState('');
  const [orphanageId, setOrphanageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!supabase) return;
    
    const [volunteersRes, orphanagesRes] = await Promise.all([
      supabase.from('volunteers').select('*').order('name'),
      supabase.from('orphanages').select('*').order('name')
    ]);

    setVolunteers(volunteersRes.data || []);
    setOrphanages(orphanagesRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('volunteers')
        .insert({
          name: name.trim(),
          nysc_code: nyscCode.toUpperCase().trim(),
          orphanage_id: orphanageId
        });

      if (error) {
        if (error.code === '23505') {
          setError('This NYSC code is already registered.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      setName('');
      setNyscCode('');
      setOrphanageId('');
      setShowForm(false);
      onUpdate();
      fetchData();
    } catch (err) {
      setError('Failed to register volunteer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this volunteer?')) return;

    await supabase.from('volunteers').delete().eq('id', id);
    fetchData();
    onUpdate();
  };

  const getOrphanageName = (id: string) => {
    const o = orphanages.find(o => o.id === id);
    return o?.name || 'Unknown';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Volunteers</h3>
        <button 
          className={styles.addBtn}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} />
          Add Volunteer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmad Bello"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>NYSC Code</label>
            <input
              type="text"
              value={nyscCode}
              onChange={(e) => setNyscCode(e.target.value.toUpperCase())}
              placeholder="e.g. NG/2024/001"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Assigned Orphanage</label>
            <select
              value={orphanageId}
              onChange={(e) => setOrphanageId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select orphanage...</option>
              {orphanages.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name || !nyscCode || !orphanageId} className={styles.submitBtn}>
              {loading ? <span className={styles.spinner} /> : 'Register Volunteer'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.list}>
        {volunteers.length === 0 ? (
          <p className={styles.empty}>No volunteers registered yet.</p>
        ) : (
          volunteers.map(volunteer => (
            <div key={volunteer.id} className={styles.item}>
              <div className={styles.itemAvatar}>
                <User size={16} />
              </div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{volunteer.name}</span>
                <span className={styles.itemMeta}>
                  {volunteer.nysc_code} • {getOrphanageName(volunteer.orphanage_id)}
                </span>
              </div>
              <button 
                className={styles.deleteBtn}
                onClick={() => handleDelete(volunteer.id)}
                title="Delete volunteer"
              >
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}