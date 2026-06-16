'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Orphanage } from '@/lib/types';
import { Plus, Copy, Check, Building2 } from 'lucide-react';
import styles from './ManageOrphanages.module.css';

interface ManageOrphanagesProps {
  orphanages: Orphanage[];
  onUpdate: () => void;
}

export default function ManageOrphanages({ orphanages, onUpdate }: ManageOrphanagesProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateToken = (orphanageName: string) => {
    return orphanageName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!token || token === generateToken(name.slice(0, -1))) {
      setToken(generateToken(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('orphanages')
        .insert({
          name: name.trim(),
          qr_code_token: token.trim().toLowerCase()
        });

      if (error) {
        if (error.code === '23505') {
          setError('This QR code token is already in use.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      setName('');
      setToken('');
      setShowForm(false);
      onUpdate();
    } catch (err) {
      setError('Failed to create orphanage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (id: string, token: string) => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Orphanages</h3>
        <button 
          className={styles.addBtn}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} />
          Add Orphanage
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Orphanage Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Sunshine Children's Home"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>QR Code Token</label>
            <div className={styles.tokenWrapper}>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="sunshine-home"
                className={styles.input}
                required
              />
              <span className={styles.tokenPreview}>
                {window.location.origin}/{token || 'token'}
              </span>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name || !token} className={styles.submitBtn}>
              {loading ? <span className={styles.spinner} /> : 'Create Orphanage'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.list}>
        {orphanages.length === 0 ? (
          <p className={styles.empty}>No orphanages registered yet.</p>
        ) : (
          orphanages.map(orphanage => (
            <div key={orphanage.id} className={styles.item}>
              <div className={styles.itemIcon}>
                <Building2 size={18} />
              </div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{orphanage.name}</span>
                <span className={styles.itemToken}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/{orphanage.qr_code_token}
                </span>
              </div>
              <button 
                className={styles.copyBtn}
                onClick={() => copyUrl(orphanage.id, orphanage.qr_code_token)}
                title="Copy URL"
              >
                {copiedId === orphanage.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}