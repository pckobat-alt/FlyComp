import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Language } from '../../types/domain';

interface Props {
  language: Language;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<Props> = ({ language, compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0c3c66] whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-4 w-4" />
        <span>{language === 'tr' ? 'Uygulamayı Kur' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Smartphone className="h-4 w-4 text-[#0F4C81]" />
          <span>{compact ? 'iOS' : language === 'tr' ? 'iPhone Kurulum' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'tr' ? 'iPhone / iPad Ana Ekrana Ekle' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  1.{' '}
                  {language === 'tr'
                    ? 'Safari alt çubuğundaki Paylaş (yukarı ok) simgesine dokunun.'
                    : 'Tap the Share button in the Safari toolbar.'}
                </li>
                <li>
                  2.{' '}
                  {language === 'tr'
                    ? 'Aşağı kaydırıp "Ana Ekrana Ekle" seçeneğine dokunun.'
                    : 'Scroll down and tap "Add to Home Screen".'}
                </li>
                <li>
                  3.{' '}
                  {language === 'tr'
                    ? 'Çevrimdışı uçuş kaydı ve tam ekran kokpit için sağ üstten Ekle deyin.'
                    : 'Tap Add in the top right for full-screen offline flight logging.'}
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                {language === 'tr' ? 'Anladım' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
