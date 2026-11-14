import React from 'react';
import { Download, X } from 'lucide-react';
import { Language } from '../../types/domain';

interface Props {
  title: string;
  fileName: string;
  fileMime: string;
  dataUrl: string;
  language: Language;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<Props> = ({
  title,
  fileName,
  fileMime,
  dataUrl,
  language,
  onClose,
}) => {
  const isPdf = fileMime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isDataPdf = dataUrl.startsWith('data:application/pdf');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-900">{title}</h3>
            <p className="truncate font-mono text-xs text-slate-500">{fileName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{language === 'tr' ? 'İndir' : 'Download'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
          {isPdf && isDataPdf ? (
            <iframe
              src={dataUrl}
              title={fileName}
              className="h-[68vh] w-full rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <img
              src={dataUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-h-[68vh] w-auto rounded-lg border border-slate-200 bg-white object-contain shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};
