import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Infinity as InfinityIcon } from 'lucide-react';
import { ComplianceState } from '../../utils/compliance';
import { Language } from '../../types/domain';
import { useT } from '../../i18n/translations';

interface Props {
  state: ComplianceState;
  daysRemaining: number | null;
  language: Language;
  expiryDate?: string;
}

export const ComplianceStatusLabel: React.FC<Props> = ({
  state,
  daysRemaining,
  language,
  expiryDate,
}) => {
  const t = useT(language);

  if (state === 'unlimited') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <InfinityIcon className="h-3.5 w-3.5 text-slate-400" />
        <span>{t('statusUnlimited')}</span>
      </span>
    );
  }

  if (state === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
        <span>{t('statusExpired')}</span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="font-mono">
          {Math.abs(daysRemaining ?? 0)} {t('daysOverdue')}
        </span>
        {expiryDate && (
          <>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-mono text-slate-500 font-normal">{expiryDate}</span>
          </>
        )}
      </span>
    );
  }

  if (state === 'approaching') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span>{t('statusApproaching')}</span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="font-mono">
          {daysRemaining} {t('daysLeft')}
        </span>
        {expiryDate && (
          <>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-mono text-slate-500 font-normal">{expiryDate}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      <span>{t('statusValid')}</span>
      <span className="text-slate-300" aria-hidden="true">·</span>
      <span className="font-mono">
        {daysRemaining} {t('daysLeft')}
      </span>
      {expiryDate && (
        <>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-mono text-slate-500 font-normal">{expiryDate}</span>
        </>
      )}
    </span>
  );
};
