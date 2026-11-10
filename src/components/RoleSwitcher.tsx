import React from 'react';
import { DemoRole } from '../types/uat';
import { FlaskConical, UserCheck, Code2 } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: DemoRole;
  onSelectRole: (role: DemoRole) => void;
  reportCounts: {
    total: number;
    pending: number;
    approved: number;
  };
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  onSelectRole,
  reportCounts,
}) => {
  const roles: Array<{
    id: DemoRole;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    countLabel: string;
  }> = [
    {
      id: 'tester',
      title: 'Tester',
      description: 'Submit feedback & monitor status',
      icon: FlaskConical,
      countLabel: `${reportCounts.total} submitted`,
    },
    {
      id: 'manager',
      title: 'Manager',
      description: 'Refine structured fields & approve bugs',
      icon: UserCheck,
      countLabel: `${reportCounts.pending} pending triage`,
    },
    {
      id: 'developer',
      title: 'Developer',
      description: 'View only manager-approved bugs',
      icon: Code2,
      countLabel: `${reportCounts.approved} approved bugs`,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              DEMO ROLE:
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">
              Switch perspective to test each stage of the workflow
            </span>
          </div>

          <div
            className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 max-w-xl w-full sm:w-auto"
            role="tablist"
            aria-label="Demo role selector"
          >
            {roles.map((role) => {
              const Icon = role.icon;
              const isActive = currentRole === role.id;
              return (
                <button
                  key={role.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectRole(role.id)}
                  className={`flex flex-col items-start px-3 py-2 rounded-md text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-semibold ring-1 ring-slate-900/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-sm font-semibold tracking-tight">
                      {role.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5 truncate w-full">
                    {role.countLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
