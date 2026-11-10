import React from 'react';
import { ReportStatus } from '../types/uat';
import { Clock, CheckCircle2, HelpCircle, Lightbulb, PauseCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ReportStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true }) => {
  switch (status) {
    case 'Approved as bug':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-emerald-950 bg-emerald-100/90 border border-emerald-300"
          role="status"
          aria-label="Status: Approved as bug"
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />}
          <span>Approved as Bug</span>
        </span>
      );

    case 'Clarification requested':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-indigo-950 bg-indigo-100/90 border border-indigo-300"
          role="status"
          aria-label="Status: Clarification requested"
        >
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-indigo-700 shrink-0" aria-hidden="true" />}
          <span>Clarification Requested</span>
        </span>
      );

    case 'Moved to ideas':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-teal-950 bg-teal-100/90 border border-teal-300"
          role="status"
          aria-label="Status: Moved to ideas"
        >
          {showIcon && <Lightbulb className="w-3.5 h-3.5 text-teal-700 shrink-0" aria-hidden="true" />}
          <span>Moved to Ideas</span>
        </span>
      );

    case 'Deferred':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-slate-800 bg-slate-200/90 border border-slate-300"
          role="status"
          aria-label="Status: Deferred"
        >
          {showIcon && <PauseCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />}
          <span>Deferred</span>
        </span>
      );

    case 'Not a bug':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-stone-800 bg-stone-200/90 border border-stone-300"
          role="status"
          aria-label="Status: Not a bug"
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-stone-600 shrink-0" aria-hidden="true" />}
          <span>Not a Bug</span>
        </span>
      );

    case 'Pending review':
    default:
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-amber-950 bg-amber-100/90 border border-amber-300"
          role="status"
          aria-label="Status: Pending review"
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />}
          <span>Pending Review</span>
        </span>
      );
  }
};
