'use client';

/**
 * Orphanage QR page (Matron view).
 *
 * Matrons come here to:
 *   1. See all orphanages and their unique QR codes.
 *   2. Print a QR code to stick at the orphanage entrance.
 *
 * Phase 1 simplification: we just list all orphanages and let the matron
 * pick one. In a future version this would be filtered to "their" orphanage
 * via Supabase Auth + matron role.
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { QRGenerator } from '@/components/QRGenerator';
import type { Orphanage } from '@/lib/types';
import { Printer } from 'lucide-react';

export default function OrphanageQRPage() {
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [selected, setSelected] = useState<Orphanage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('orphanages')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setOrphanages(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Orphanage QR Codes
      </h1>
      <p className="text-gray-600 mb-6">
        Print these QR codes and place them at your orphanage entrance. Volunteers
        scan them to check in and out.
      </p>

      {!selected ? (
        // List of orphanages.
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orphanages.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600">
                No orphanages yet. Add one in the Internal Operations Platform
                first.
              </p>
            </div>
          ) : (
            orphanages.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="text-left bg-white rounded-lg shadow p-5 hover:shadow-lg transition-shadow border-l-4 border-brand-500"
              >
                <p className="font-semibold text-gray-900">{o.name}</p>
                <p className="text-sm text-gray-600 mt-1">{o.state}</p>
                <p className="text-xs text-gray-500 mt-2">
                  QR: <code>{o.qr_code}</code>
                </p>
              </button>
            ))
          )}
        </div>
      ) : (
        // QR detail / print view.
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-brand-600 underline mb-4"
          >
            ← Back to list
          </button>

          <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto print:shadow-none">
            <div className="text-center">
              <p className="text-sm text-gray-600">NextGem Volunteer Check-In</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                {selected.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selected.city ? `${selected.city}, ` : ''}
                {selected.state}
              </p>
            </div>

            <div className="flex justify-center my-6">
              <QRGenerator
                qrCode={selected.qr_code}
                orphanageName={selected.name}
                size={300}
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-700">
                Volunteers: scan this code to check in and out.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Need help? Contact your NextGem coordinator.
              </p>
            </div>
          </div>

          {/* Print button - hidden when printing */}
          <div className="text-center mt-6 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-semibold"
            >
              <Printer size={18} />
              Print this QR code
            </button>
          </div>

          {/* Print-only styles - simple inline approach so it works without
              a separate CSS file. */}
          <style jsx global>{`
            @media print {
              nav,
              .print\\:hidden {
                display: none !important;
              }
              body {
                background: white !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
