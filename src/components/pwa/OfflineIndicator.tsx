import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Language } from '../../types/domain';
import { useT } from '../../i18n/translations';

interface Props {
  language: Language;
  pendingCount: number;
  onSyncNow: () => void;
}

export const OfflineIndicator: React.FC<Props> = ({ language, pendingCount, onSyncNow }) => {
  const isOnline = useOnlineStatus();
  const t = useT(language);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:bottom-5 md:left-auto md:right-6 md:max-w-md">
      {!isOnline ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-950 shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-700" />
            <span>{t('offlineBanner')}</span>
          </div>
          {pendingCount > 0 && (
            <span className="font-mono font-semibold text-amber-800 whitespace-nowrap">
              {pendingCount}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 shadow-md">
          <span className="font-mono">
            {pendingCount} {t('syncPending')}
          </span>
          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C81] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#0c3c66] whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('syncNow')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
