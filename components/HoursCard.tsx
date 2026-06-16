'use client';

/**
 * Card showing a volunteer's hours, points, badges, and progress toward
 * the next milestone.
 *
 * Critical component - shown prominently on the volunteer dashboard.
 */

import { getNextMilestone, getProgressTowards } from '@/lib/gamification';
import { Award, Clock, Star, TrendingUp } from 'lucide-react';

interface HoursCardProps {
  totalHours: number;
  totalPoints: number;
  badges: { milestone: number; badge_name: string }[];
}

export function HoursCard({ totalHours, totalPoints, badges }: HoursCardProps) {
  const next = getNextMilestone(totalHours);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total hours card */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-brand-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 uppercase tracking-wide">
              Total Hours
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalHours.toFixed(1)}
            </p>
          </div>
          <Clock className="text-brand-600" size={36} />
        </div>
      </div>

      {/* Total points card */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 uppercase tracking-wide">
              Total Points
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalPoints.toLocaleString()}
            </p>
          </div>
          <Star className="text-yellow-500" size={36} />
        </div>
      </div>

      {/* Progress to next milestone */}
      {next && (
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-600 uppercase tracking-wide">
                Next Milestone
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {next.milestone} Hours
              </p>
            </div>
            <TrendingUp className="text-brand-600" size={28} />
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-brand-500 h-full transition-all"
              style={{ width: `${next.progress * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {next.hoursToGo.toFixed(1)} hours to go!
          </p>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Award className="text-brand-600" size={24} />
            <p className="text-lg font-semibold text-gray-900">Your Badges</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div
                key={b.milestone}
                className="flex flex-col items-center bg-brand-50 rounded-lg p-3 border border-brand-200"
              >
                <span className="text-3xl">
                  {b.milestone === 10 ? '🥉' : b.milestone === 100 ? '🥈' : '🥇'}
                </span>
                <span className="text-xs font-semibold mt-1 text-brand-800">
                  {b.milestone} hrs
                </span>
                <span className="text-xs text-gray-600">{b.badge_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
