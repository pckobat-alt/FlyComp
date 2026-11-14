import React, { useState } from 'react';
import { BookOpenCheck, Eye, FileSignature, Plus, Users, X } from 'lucide-react';
import {
  Language,
  Personnel,
  TrainingRecord,
  TrainingTemplate,
  UserRole,
} from '../../types/domain';
import { readFileAsDataUrl } from '../../utils/compliance';
import { useT } from '../../i18n/translations';
import { DocumentPreviewModal } from '../../components/shared/DocumentPreviewModal';

interface Props {
  companyId: string;
  trainings: TrainingRecord[];
  trainingTemplates: TrainingTemplate[];
  personnel: Personnel[];
  activeRole: UserRole;
  activePersonnelId: string;
  language: Language;
  onAddTraining: (record: TrainingRecord) => void;
}

export const TrainingsView: React.FC<Props> = ({
  companyId,
  trainings,
  trainingTemplates,
  personnel,
  activeRole,
  activePersonnelId,
  language,
  onAddTraining,
}) => {
  const t = useT(language);
  const [showCreate, setShowCreate] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<TrainingRecord | null>(null);

  const [selectedTplId, setSelectedTplId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [signedFile, setSignedFile] = useState<File | null>(null);

  const canCreate = activeRole === 'admin' || activeRole === 'responsible';

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTplId(tplId);
    const tpl = trainingTemplates.find((x) => x.id === tplId);
    if (tpl) {
      setTitle(language === 'tr' ? tpl.titleTr : tpl.titleEn);
      setContent(tpl.defaultContent);
    }
  };

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let signedSheetDataUrl: string | undefined;
    let signedSheetFileName: string | undefined;

    if (signedFile) {
      signedSheetDataUrl = await readFileAsDataUrl(signedFile);
      signedSheetFileName = signedFile.name;
    }

    const record: TrainingRecord = {
      id: `trn-${Date.now()}`,
      companyId,
      templateId: selectedTplId || undefined,
      title: title.trim(),
      content: content.trim(),
      trainingDate,
      instructorPersonnelId: activePersonnelId || personnel[0]?.id || 'admin',
      participantIds,
      signedSheetFileName,
      signedSheetDataUrl,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddTraining(record);
    setSelectedTplId('');
    setTitle('');
    setContent('');
    setParticipantIds([]);
    setSignedFile(null);
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {language === 'tr'
              ? 'Şirket İçi Eğitimler & İmza Tutanakları'
              : 'Internal Company Trainings & Signed Attendance'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'tr'
              ? 'Sorumlu personelin verdiği şirket içi eğitim içerikleri, katılımcı listeleri ve ıslak imzalı tutanak arşivleri.'
              : 'Training sessions delivered by responsible managers with participant lists and signed attendance sheets.'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66] min-h-[42px]"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addTraining')}</span>
          </button>
        )}
      </div>

      {trainings.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {t('noData')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {trainings.map((trn) => {
            const instructor = personnel.find((p) => p.id === trn.instructorPersonnelId);
            const attendees = personnel.filter((p) => trn.participantIds.includes(p.id));

            return (
              <div
                key={trn.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <BookOpenCheck className="h-4 w-4 text-[#0F4C81]" />
                      <span className="font-mono">{trn.trainingDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{instructor?.fullName || t('roleAdmin')}</span>
                    </div>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">{trn.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{trn.content}</p>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        {language === 'tr' ? 'İmzalı Katılımcılar' : 'Signed Participants'} ({attendees.length})
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-slate-600">
                      {attendees.length > 0
                        ? attendees.map((a) => a.fullName).join(' · ')
                        : language === 'tr'
                        ? 'Katılımcı seçilmedi'
                        : 'No participants selected'}
                    </div>
                  </div>
                </div>

                {trn.signedSheetDataUrl && (
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 truncate">
                      <FileSignature className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{trn.signedSheetFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewRecord(trn)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t('preview')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">{t('addTraining')}</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Hazır Eğitim Şablonu (Modüler)' : 'Training Template'}
                </label>
                <select
                  value={selectedTplId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    {language === 'tr' ? '-- Özel Eğitim Oluştur --' : '-- Custom Training --'}
                  </option>
                  {trainingTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {language === 'tr' ? tpl.titleTr : tpl.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Eğitim Başlığı' : 'Training Title'}
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Eğitim İçeriği & Konular' : 'Syllabus & Content'}
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'Eğitim Tarihi' : 'Training Date'}
                </label>
                <input
                  required
                  type="date"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {language === 'tr' ? 'İmza Atan Katılımcılar' : 'Signed Participants'}
                </label>
                <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
                  {personnel.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={participantIds.includes(p.id)}
                          onChange={() => toggleParticipant(p.id)}
                          className="accent-[#0F4C81]"
                        />
                        <span className="font-medium text-slate-800">{p.fullName}</span>
                      </span>
                      <span className="font-mono text-slate-400">{p.licenseNumber}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'tr'
                    ? 'İmzalı Eğitim Tutanağı (PDF veya Fotoğraf)'
                    : 'Signed Attendance Sheet (PDF or Photo)'}
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c66]"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {previewRecord?.signedSheetDataUrl && (
        <DocumentPreviewModal
          title={previewRecord.title}
          fileName={previewRecord.signedSheetFileName || 'tutanak.pdf'}
          fileMime={
            previewRecord.signedSheetDataUrl.startsWith('data:application/pdf')
              ? 'application/pdf'
              : 'image/png'
          }
          dataUrl={previewRecord.signedSheetDataUrl}
          language={language}
          onClose={() => setPreviewRecord(null)}
        />
      )}
    </div>
  );
};
