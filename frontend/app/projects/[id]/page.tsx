'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, FileAudio2, FileText, MapPin, MessageCircleQuestion, Mic, Pencil, Square, Trash2, Users, Waypoints } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  createProjectActivity,
  createProjectStakeholder,
  deleteProjectActivity,
  getProject,
  listProjectActivities,
  listProjectStakeholders,
  updateProject as updateProjectApi,
  updateProjectActivity as updateProjectActivityApi,
  updateProjectStakeholder as updateProjectStakeholderApi,
  uploadActivityAttachment,
  type ApiProject,
  type ProjectActivity,
  type ProjectStakeholder
} from '@/lib/projects-api';
import { createLocationPing } from '@/lib/auth-api';
import { STAGES } from '@/lib/data';
import { cn, formatAED, relativeTime } from '@/lib/utils';

function toAbsoluteAssetUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  const apiOrigin = new URL(apiBase).origin;
  return `${apiOrigin}${url}`;
}

function toActivityAttachmentUrl(url: string): string {
  const absolute = toAbsoluteAssetUrl(url);
  if (!absolute.includes('blob.vercel-storage.com')) {
    return absolute;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  return `${apiBase}/files/proxy?url=${encodeURIComponent(absolute)}`;
}

function parseLegacyAttachmentLinks(message: string): Array<{ kind: 'file' | 'voice'; name: string; url: string }> {
  const lines = message.split('\n');
  const items: Array<{ kind: 'file' | 'voice'; name: string; url: string }> = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Voice note recording: ')) {
      const url = trimmed.replace('Voice note recording: ', '').trim();
      if (url) items.push({ kind: 'voice', name: 'Voice note', url });
      continue;
    }
    if (trimmed.startsWith('Attachment: ')) {
      const url = trimmed.replace('Attachment: ', '').trim();
      if (url) items.push({ kind: 'file', name: 'Attachment', url });
    }
  }
  return items;
}

function stripLegacyAttachmentLines(message: string): string {
  return message
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('Voice note recording: ') && !trimmed.startsWith('Attachment: ');
    })
    .join('\n')
    .trim();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, user, reportVisitPing } = useAuth();
  const [project, setProject] = useState<ApiProject | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [stakeholders, setStakeholders] = useState<ProjectStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ProjectActivity['type']>('note');
  const [activityMessage, setActivityMessage] = useState('');
  const [activityStakeholderMode, setActivityStakeholderMode] = useState<'existing' | 'other'>('existing');
  const [activityStakeholderId, setActivityStakeholderId] = useState('');
  const [activityContactName, setActivityContactName] = useState('');
  const [activityContactPhone, setActivityContactPhone] = useState('');
  const [activityContactEmail, setActivityContactEmail] = useState('');
  const [activityVisitLocation, setActivityVisitLocation] = useState('');
  const [activityMeetingWith, setActivityMeetingWith] = useState('');
  const [activityMeetingAt, setActivityMeetingAt] = useState('');
  const [activityAttachment, setActivityAttachment] = useState<File | null>(null);
  const [activityVoiceAttachment, setActivityVoiceAttachment] = useState<File | null>(null);
  const [activityVoicePreviewUrl, setActivityVoicePreviewUrl] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>(() => Array.from({ length: 24 }, () => 0.12));
  const [addToFollowUps, setAddToFollowUps] = useState(true);
  const [activityFollowUpDueAt, setActivityFollowUpDueAt] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const [showActivityComposer, setShowActivityComposer] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityType, setEditingActivityType] = useState<ProjectActivity['type']>('note');
  const [editingActivityMessage, setEditingActivityMessage] = useState('');
  const [editingActivityVisitWhatHappened, setEditingActivityVisitWhatHappened] = useState('');
  const [savingEditedActivity, setSavingEditedActivity] = useState(false);
  const [visitRecapActivityId, setVisitRecapActivityId] = useState<string | null>(null);
  const [visitRecapMessage, setVisitRecapMessage] = useState('');
  const [savingVisitRecap, setSavingVisitRecap] = useState(false);
  const [expandedMediaByActivityId, setExpandedMediaByActivityId] = useState<Record<string, boolean>>({});
  const [selectedVisitActivity, setSelectedVisitActivity] = useState<ProjectActivity | null>(null);
  const [uploadingActivityAttachment, setUploadingActivityAttachment] = useState(false);
  const [activityLoadError, setActivityLoadError] = useState<string | null>(null);
  const [stakeholderLoadError, setStakeholderLoadError] = useState<string | null>(null);
  const [stakeholderError, setStakeholderError] = useState<string | null>(null);
  const [savingStakeholder, setSavingStakeholder] = useState(false);
  const [showStakeholderComposer, setShowStakeholderComposer] = useState(false);
  const [stakeholderRole, setStakeholderRole] = useState<ProjectStakeholder['role']>('Consultant');
  const [stakeholderName, setStakeholderName] = useState('');
  const [stakeholderOrg, setStakeholderOrg] = useState('');
  const [stakeholderEmail, setStakeholderEmail] = useState('');
  const [stakeholderPhone, setStakeholderPhone] = useState('');
  const [editingStakeholderId, setEditingStakeholderId] = useState<string | null>(null);
  const [editingCommercial, setEditingCommercial] = useState(false);
  const [commercialValueAed, setCommercialValueAed] = useState('');
  const [commercialItemName, setCommercialItemName] = useState('');
  const [commercialItemQuantity, setCommercialItemQuantity] = useState('');
  const [commercialError, setCommercialError] = useState<string | null>(null);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (!token || !params?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setActivityLoadError(null);
      setStakeholderLoadError(null);
      try {
        const projectData = await getProject(token, params.id);
        setProject(projectData);
        try {
          const activityData = await listProjectActivities(token, params.id);
          setActivities(activityData);
        } catch (activityErr) {
          setActivities([]);
          setActivityLoadError(activityErr instanceof Error ? activityErr.message : 'Failed to load timeline.');
        }
        try {
          const stakeholderData = await listProjectStakeholders(token, params.id);
          setStakeholders(stakeholderData);
        } catch (stakeholderErr) {
          setStakeholders([]);
          setStakeholderLoadError(stakeholderErr instanceof Error ? stakeholderErr.message : 'Failed to load stakeholders.');
        }
      } catch {
        setError('Project not found or inaccessible.');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [token, params?.id]);

  useEffect(() => {
    if (activityStakeholderMode !== 'existing' || !activityStakeholderId) return;
    const selected = stakeholders.find((entry) => entry.id === activityStakeholderId);
    if (!selected) return;
    setActivityContactName(selected.name);
    if (selected.phone) setActivityContactPhone(selected.phone);
    if (selected.email) setActivityContactEmail(selected.email);
    setActivityMeetingWith(selected.name);
  }, [activityStakeholderMode, activityStakeholderId, stakeholders]);

  useEffect(() => {
    if (!project) return;
    setCommercialValueAed(String(project.valueAed));
    setCommercialItemName(project.itemName ?? '');
    setCommercialItemQuantity(String(project.itemQuantity ?? 0));
    setCommercialError(null);
    setEditingCommercial(false);
  }, [project?.id, project?.valueAed, project?.itemName, project?.itemQuantity]);

  useEffect(() => {
    return () => {
      stopRecordingVisuals();
      if (activityVoicePreviewUrl) {
        URL.revokeObjectURL(activityVoicePreviewUrl);
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [activityVoicePreviewUrl]);

  function stopRecordingVisuals() {
    if (waveformFrameRef.current != null) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    recordingStartedAtRef.current = null;
  }

  function startRecordingVisuals(stream: MediaStream) {
    setRecordingSeconds(0);
    setRecordingWaveform(Array.from({ length: 24 }, () => 0.12));
    recordingStartedAtRef.current = Date.now();
    recordingTimerRef.current = window.setInterval(() => {
      const startedAt = recordingStartedAtRef.current;
      if (!startedAt) return;
      setRecordingSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 200);

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.85;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const drawWaveform = () => {
      analyser.getByteTimeDomainData(data);
      let totalDelta = 0;
      for (let index = 0; index < data.length; index += 1) {
        totalDelta += Math.abs(data[index] - 128);
      }
      const normalized = Math.min(1, totalDelta / (data.length * 48));
      const level = 0.12 + normalized * 0.88;
      setRecordingWaveform((prev) => [...prev.slice(1), level]);
      waveformFrameRef.current = window.requestAnimationFrame(drawWaveform);
    };
    waveformFrameRef.current = window.requestAnimationFrame(drawWaveform);
  }

  async function startVoiceRecording() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setActivityError('Voice recording is not supported in this browser.');
      return;
    }
    try {
      setActivityError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];
      stopRecordingVisuals();
      startRecordingVisuals(stream);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        setIsRecordingVoice(false);
        stopRecordingVisuals();
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const fileName = `voice-note-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: blob.type || 'audio/webm' });
        if (activityVoicePreviewUrl) {
          URL.revokeObjectURL(activityVoicePreviewUrl);
        }
        setActivityVoiceAttachment(file);
        setActivityVoicePreviewUrl(URL.createObjectURL(blob));
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };
      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      stopRecordingVisuals();
      setActivityError('Unable to access microphone. Please allow mic permission.');
    }
  }

  function stopVoiceRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    setIsRecordingVoice(false);
  }

  function clearVoiceRecording() {
    if (isRecordingVoice) {
      setActivityError('Stop recording before clearing.');
      return;
    }
    if (activityVoicePreviewUrl) {
      URL.revokeObjectURL(activityVoicePreviewUrl);
    }
    stopRecordingVisuals();
    recordingStartedAtRef.current = null;
    setRecordingSeconds(0);
    setRecordingWaveform(Array.from({ length: 24 }, () => 0.12));
    setActivityVoicePreviewUrl(null);
    setActivityVoiceAttachment(null);
  }

  if (loading) {
    return <p className="px-4 lg:px-8 py-8 text-sm text-3">Loading project...</p>;
  }

  if (!project) {
    return (
      <section className="px-4 lg:px-8 py-8">
        <p className="text-sm text-rose-600">{error ?? 'Project not found.'}</p>
        <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-xs text-3 hover:text-[var(--text)] mt-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pipeline
        </Link>
      </section>
    );
  }

  const stageIndex = STAGES.indexOf(project.stage as (typeof STAGES)[number]);
  const orderedStages = [...STAGES, 'Lost', 'Won'] as const;
  const canEditCommercial = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  function requiresCommercialDetails(stage: string) {
    return ['Tender', 'Negotiation', 'Approved', 'PO Expected', 'Won', 'Lost'].includes(stage);
  }

  async function onSaveCommercialDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) return;
    const nextValue = Number(commercialValueAed);
    const nextItemName = commercialItemName.trim();
    const parsedQuantity = Number(commercialItemQuantity);
    const nextItemQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.round(parsedQuantity) : 0;

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setCommercialError('Value must be greater than 0.');
      return;
    }
    if (requiresCommercialDetails(project.stage) && !nextItemName) {
      setCommercialError('Item name is required for Tender stage and later.');
      return;
    }
    if (requiresCommercialDetails(project.stage) && nextItemQuantity <= 0) {
      setCommercialError('Item quantity is required for Tender stage and later.');
      return;
    }

    setSavingCommercial(true);
    setCommercialError(null);
    try {
      const updated = await updateProjectApi(token, project.id, {
        name: project.name,
        city: project.city,
        country: project.country,
        developer: project.developer,
        stage: project.stage,
        valueAed: nextValue,
        itemName: nextItemName,
        itemQuantity: nextItemQuantity,
        lat: project.lat,
        lng: project.lng,
        probability: project.probability,
        daysInStage: project.daysInStage,
        competitor: project.competitor,
        managerId: project.managerId,
        salesRepIds: project.salesRepIds,
      });
      setProject(updated);
      setEditingCommercial(false);
    } catch (err) {
      setCommercialError(err instanceof Error ? err.message : 'Failed to update commercial details.');
    } finally {
      setSavingCommercial(false);
    }
  }

  async function onCreateActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) {
      setActivityError('Session expired. Please login again.');
      return;
    }
    const message = activityMessage.trim();
    if (!message) {
      setActivityError('Activity message is required.');
      return;
    }
    const needsContactDetails = activityType === 'call' || activityType === 'email' || activityType === 'whatsapp';
    if (needsContactDetails && !activityContactName.trim()) {
      setActivityError('Contact name is required for this activity.');
      return;
    }
    if ((activityType === 'call' || activityType === 'whatsapp') && !activityContactPhone.trim()) {
      setActivityError('Phone number is required for call/WhatsApp.');
      return;
    }
    if (activityType === 'email' && !activityContactEmail.trim()) {
      setActivityError('Email is required for email activity.');
      return;
    }
    if (activityType === 'visit') {
      if (!activityVisitLocation.trim()) {
        setActivityError('Visit location is required.');
        return;
      }
      if (!activityMeetingWith.trim()) {
        setActivityError('Meeting person is required for visit.');
        return;
      }
      if (!activityMeetingAt) {
        setActivityError('Meeting date & time is required for visit.');
        return;
      }
    }
    if (addToFollowUps && !activityFollowUpDueAt) {
      setActivityError('Select follow-up date & time.');
      return;
    }
    if (isRecordingVoice) {
      setActivityError('Stop the voice recording before saving the activity.');
      return;
    }
    setSavingActivity(true);
    setActivityError(null);
    try {
      let visitLocationPayload: { lat: number; lng: number; accuracyM?: number | null } | undefined;
      if (activityType === 'visit' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const nowIso = new Date().toISOString();
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 15000,
            });
          });
          visitLocationPayload = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          };
          await createLocationPing(token, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            recordedAt: nowIso,
          });
          reportVisitPing({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            recordedAt: nowIso,
          });
        } catch {
          // Visit logging should still continue even if browser location is denied.
        }
      }

      const attachmentsPayload: Array<{
        kind: 'file' | 'voice';
        name: string;
        filename: string;
        size: number;
        mimeType: string;
        url: string;
      }> = [];
      if (activityAttachment) {
        setUploadingActivityAttachment(true);
        const uploaded = await uploadActivityAttachment(token, activityAttachment);
        attachmentsPayload.push({
          kind: uploaded.kind,
          name: uploaded.name,
          filename: uploaded.filename,
          size: uploaded.size,
          mimeType: uploaded.mimeType,
          url: uploaded.url,
        });
      }
      if (activityVoiceAttachment) {
        setUploadingActivityAttachment(true);
        const uploadedVoice = await uploadActivityAttachment(token, activityVoiceAttachment);
        attachmentsPayload.push({
          kind: 'voice',
          name: uploadedVoice.name,
          filename: uploadedVoice.filename,
          size: uploadedVoice.size,
          mimeType: uploadedVoice.mimeType,
          url: uploadedVoice.url,
        });
      }

      const details: string[] = [message];
      if (needsContactDetails) {
        details.push(`Contact: ${activityContactName.trim()}`);
      }
      if (activityType === 'call' || activityType === 'whatsapp') {
        details.push(`Phone: ${activityContactPhone.trim()}`);
      }
      if (activityType === 'email') {
        details.push(`Email: ${activityContactEmail.trim()}`);
      }
      if (activityType === 'visit') {
        details.push(`Location: ${activityVisitLocation.trim()}`);
        details.push(`Meeting with: ${activityMeetingWith.trim()}`);
        details.push(`Meeting time: ${new Date(activityMeetingAt).toLocaleString('en-AE')}`);
      }

      const created = await createProjectActivity(token, project.id, {
        type: activityType,
        message: details.join('\n'),
        followUpDueAt: addToFollowUps ? new Date(activityFollowUpDueAt).toISOString() : undefined,
        visitLocation: visitLocationPayload,
        attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      });
      setActivities((prev) => [created, ...prev]);
      setActivityMessage('');
      setActivityType('note');
      setActivityStakeholderMode('existing');
      setActivityStakeholderId('');
      setActivityContactName('');
      setActivityContactPhone('');
      setActivityContactEmail('');
      setActivityVisitLocation('');
      setActivityMeetingWith('');
      setActivityMeetingAt('');
      setActivityAttachment(null);
      if (activityVoicePreviewUrl) {
        URL.revokeObjectURL(activityVoicePreviewUrl);
      }
      setActivityVoicePreviewUrl(null);
      setActivityVoiceAttachment(null);
      setActivityFollowUpDueAt('');
      setShowActivityComposer(false);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to save activity.');
    } finally {
      setUploadingActivityAttachment(false);
      setSavingActivity(false);
    }
  }

  function resetStakeholderForm() {
    setEditingStakeholderId(null);
    setStakeholderName('');
    setStakeholderOrg('');
    setStakeholderEmail('');
    setStakeholderPhone('');
    setStakeholderRole('Consultant');
  }

  function startEditStakeholder(stakeholder: ProjectStakeholder) {
    setShowStakeholderComposer(true);
    setEditingStakeholderId(stakeholder.id);
    setStakeholderRole(stakeholder.role);
    setStakeholderName(stakeholder.name);
    setStakeholderOrg(stakeholder.organization ?? '');
    setStakeholderEmail(stakeholder.email ?? '');
    setStakeholderPhone(stakeholder.phone ?? '');
    setStakeholderError(null);
  }

  async function onCreateStakeholder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) {
      setStakeholderError('Session expired. Please login again.');
      return;
    }
    const name = stakeholderName.trim();
    if (!name) {
      setStakeholderError('Stakeholder name is required.');
      return;
    }
    setSavingStakeholder(true);
    setStakeholderError(null);
    try {
      const payload = {
        role: stakeholderRole,
        name,
        organization: stakeholderOrg.trim() || null,
        email: stakeholderEmail.trim() || null,
        phone: stakeholderPhone.trim() || null,
      };
      if (editingStakeholderId) {
        const updated = await updateProjectStakeholderApi(token, project.id, editingStakeholderId, payload);
        setStakeholders((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      } else {
        const created = await createProjectStakeholder(token, project.id, payload);
        setStakeholders((prev) => [created, ...prev]);
      }
      resetStakeholderForm();
      setShowStakeholderComposer(false);
    } catch (err) {
      setStakeholderError(err instanceof Error ? err.message : 'Failed to save stakeholder.');
    } finally {
      setSavingStakeholder(false);
    }
  }

  async function onDeleteActivity(activityId: string) {
    if (!token || !project) {
      setActivityError('Session expired. Please login again.');
      return;
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Delete this activity? This cannot be undone.')
      : true;
    if (!confirmed) return;

    setDeletingActivityId(activityId);
    setActivityError(null);
    try {
      await deleteProjectActivity(token, project.id, activityId);
      setActivities((prev) => prev.filter((entry) => entry.id !== activityId));
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to delete activity.');
    } finally {
      setDeletingActivityId(null);
    }
  }

  function startEditActivity(activity: ProjectActivity) {
    setEditingActivityId(activity.id);
    setEditingActivityType(activity.type);
    setEditingActivityMessage(stripLegacyAttachmentLines(activity.message));
    setEditingActivityVisitWhatHappened(resolveVisitRecap(activity));
    setActivityError(null);
  }

  function cancelEditActivity() {
    setEditingActivityId(null);
    setEditingActivityMessage('');
    setEditingActivityVisitWhatHappened('');
    setEditingActivityType('note');
  }

  async function saveEditedActivity(activityId: string) {
    if (!token || !project) return;
    const message = editingActivityMessage.trim();
    if (!message) {
      setActivityError('Activity message is required.');
      return;
    }
    setSavingEditedActivity(true);
    setActivityError(null);
    try {
      const updated = await updateProjectActivityApi(token, project.id, activityId, {
        type: editingActivityType,
        message,
        visitWhatHappened:
          editingActivityType === 'visit'
            ? (editingActivityVisitWhatHappened.trim() || null)
            : null,
      });
      setActivities((prev) => prev.map((entry) => (entry.id === activityId ? updated : entry)));
      cancelEditActivity();
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to update activity.');
    } finally {
      setSavingEditedActivity(false);
    }
  }

  function openVisitRecap(activity: ProjectActivity) {
    setVisitRecapActivityId(activity.id);
    setVisitRecapMessage(resolveVisitRecap(activity));
    setActivityError(null);
  }

  function closeVisitRecap() {
    setVisitRecapActivityId(null);
    setVisitRecapMessage('');
  }

  async function saveVisitRecap() {
    if (!token || !project || !visitRecapActivityId) return;
    const recap = visitRecapMessage.trim();
    if (!recap) {
      setActivityError('Please describe what happened during the visit.');
      return;
    }
    const current = activities.find((item) => item.id === visitRecapActivityId);
    if (!current) {
      closeVisitRecap();
      return;
    }
    setSavingVisitRecap(true);
    setActivityError(null);
    try {
      const updated = await updateProjectActivityApi(token, project.id, visitRecapActivityId, {
        type: current.type,
        message: current.message,
        visitWhatHappened: recap,
      });
      setActivities((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      closeVisitRecap();
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to save visit update.');
    } finally {
      setSavingVisitRecap(false);
    }
  }

  return (
    <>
      <div className="px-4 lg:px-8 pt-6">
        <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-xs text-3 hover:text-[var(--text)] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pipeline
        </Link>
      </div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Badge tone={stageTone(project.stage)}>{project.stage}</Badge>
            {project.competitor && <Badge tone="warning">vs {project.competitor}</Badge>}
          </span>
        }
        title={project.name}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            <MapPin className="h-3.5 w-3.5" /> {project.city}, {project.country}
            <span className="text-3">·</span>
            <span>{project.developer}</span>
          </span>
        }
      />

      <section className="px-4 lg:px-8 pb-4">
        <div className="rounded-2xl border border-amber-300/70 bg-amber-100/70 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-800 dark:text-amber-300">
                Commercial detail
              </p>
              {canEditCommercial && !editingCommercial && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingCommercial(true);
                    setCommercialError(null);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            {editingCommercial ? (
              <form className="mt-2 space-y-2" onSubmit={onSaveCommercialDetails}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={commercialValueAed}
                    onChange={(e) => setCommercialValueAed(e.target.value)}
                    placeholder="Value (AED)"
                    className="h-10 px-3 rounded-xl bg-white/70 dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-500/30 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={commercialItemName}
                    onChange={(e) => setCommercialItemName(e.target.value)}
                    placeholder="Item name"
                    className="h-10 px-3 rounded-xl bg-white/70 dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-500/30 focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={commercialItemQuantity}
                    onChange={(e) => setCommercialItemQuantity(e.target.value)}
                    placeholder="Quantity"
                    className="h-10 px-3 rounded-xl bg-white/70 dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-500/30 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {commercialError && (
                    <p className="text-xs text-rose-700 dark:text-rose-300 mr-auto">{commercialError}</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCommercial(false);
                      setCommercialError(null);
                      setCommercialValueAed(String(project.valueAed));
                      setCommercialItemName(project.itemName ?? '');
                      setCommercialItemQuantity(String(project.itemQuantity ?? 0));
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" variant="primary" disabled={savingCommercial}>
                    {savingCommercial ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Value</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {formatAED(project.valueAed, true)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Item name</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {project.itemName.trim() || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Quantity</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {project.itemQuantity > 0 ? `${project.itemQuantity} qty` : 'Not provided'}
                  </p>
                </div>
              </div>
            )}
        </div>
      </section>

      <section className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Project value</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{formatAED(project.valueAed, true)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Win probability</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{project.probability}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Days in stage</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{project.daysInStage}</p>
        </Card>
      </section>

      <section className="px-4 lg:px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold tracking-tight mb-3">Pipeline stage progress</h3>
            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1">
              {orderedStages.map((stage, index) => {
                const isCurrent = stage === project.stage;
                const isDone = stageIndex >= 0 && index < stageIndex;
                return (
                  <span
                    key={stage}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-medium border whitespace-nowrap',
                      isCurrent && 'bg-brand-600 text-white border-brand-600',
                      !isCurrent && isDone && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
                      !isCurrent && !isDone && 'text-2 border-[var(--border)]',
                    )}
                  >
                    {stage}
                  </span>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Site location" subtitle={`${project.city}, ${project.country}`} />
            <div className="px-4 pb-4">
              <div className="rounded-2xl overflow-hidden border border-[var(--border)]">
                <LocationPickerMap
                  lat={project.lat}
                  lng={project.lng}
                  interactive={false}
                  initialZoom={14}
                  focusZoom={14}
                  heightClassName="h-[340px]"
                />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-3" />
                  <span>Lat: {project.lat.toFixed(5)}</span>
                </div>
                <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 inline-flex items-center gap-1.5">
                  <Waypoints className="h-3.5 w-3.5 text-3" />
                  <span>Lng: {project.lng.toFixed(5)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader title="Activity timeline" subtitle={`${activities.length} updates`} />
            <div className="px-5 pb-4">
              <div className="mb-4 flex items-center justify-end">
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => setShowActivityComposer((prev) => !prev)}
                  className={
                    showActivityComposer
                      ? 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-200'
                      : 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-200'
                  }
                >
                  {showActivityComposer ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Hide log form
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      Log new update
                    </>
                  )}
                </Button>
              </div>
              {showActivityComposer && (
              <form onSubmit={onCreateActivity} className="space-y-2 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-[140px,1fr] gap-2">
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as ProjectActivity['type'])}
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                  >
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="visit">Visit</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="stage">Stage</option>
                  </select>
                  <input
                    value={activityMessage}
                    onChange={(e) => setActivityMessage(e.target.value)}
                    placeholder="Log a project update..."
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                  />
                </div>
                {(activityType === 'call' || activityType === 'email' || activityType === 'whatsapp' || activityType === 'visit') && (
                  <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-2">
                    <select
                      value={activityStakeholderMode}
                      onChange={(e) => {
                        const nextMode = e.target.value as 'existing' | 'other';
                        setActivityStakeholderMode(nextMode);
                        if (nextMode === 'other') {
                          setActivityStakeholderId('');
                        }
                      }}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                    >
                      <option value="existing">From stakeholders</option>
                      <option value="other">Add other</option>
                    </select>
                    {activityStakeholderMode === 'existing' ? (
                      <select
                        value={activityStakeholderId}
                        onChange={(e) => setActivityStakeholderId(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                      >
                        <option value="">Select stakeholder</option>
                        {stakeholders.map((stakeholder) => (
                          <option key={stakeholder.id} value={stakeholder.id}>
                            {stakeholder.name} ({stakeholder.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={activityContactName}
                        onChange={(e) => setActivityContactName(e.target.value)}
                        placeholder="Contact name"
                        className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                      />
                    )}
                  </div>
                )}
                {(activityType === 'call' || activityType === 'whatsapp') && (
                  <input
                    value={activityContactPhone}
                    onChange={(e) => setActivityContactPhone(e.target.value)}
                    placeholder="Phone number"
                    className="h-10 w-full px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                  />
                )}
                {activityType === 'email' && (
                  <input
                    type="email"
                    value={activityContactEmail}
                    onChange={(e) => setActivityContactEmail(e.target.value)}
                    placeholder="To email address"
                    className="h-10 w-full px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                  />
                )}
                {activityType === 'visit' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={activityVisitLocation}
                      onChange={(e) => setActivityVisitLocation(e.target.value)}
                      placeholder="Visit location"
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                    />
                    <input
                      value={activityMeetingWith}
                      onChange={(e) => setActivityMeetingWith(e.target.value)}
                      placeholder="Meeting with"
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={activityMeetingAt}
                      onChange={(e) => setActivityMeetingAt(e.target.value)}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm sm:col-span-2"
                    />
                  </div>
                )}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold tracking-tight">Voice note</p>
                    <span className={cn('text-[11px] font-medium', isRecordingVoice ? 'text-rose-600' : 'text-3')}>
                      {formatRecordingDuration(recordingSeconds)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={isRecordingVoice ? 'soft' : 'secondary'}
                      size="sm"
                      onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                      className={isRecordingVoice ? 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-200' : undefined}
                    >
                      {isRecordingVoice ? (
                        <>
                          <Square className="h-3.5 w-3.5" />
                          Stop recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" />
                          Record voice note
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearVoiceRecording}
                      disabled={!activityVoiceAttachment && !isRecordingVoice}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                    {isRecordingVoice && <span className="text-xs text-rose-600">Recording...</span>}
                  </div>
                  <div className="mt-2 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 flex items-end gap-1">
                    {recordingWaveform.map((level, index) => (
                      <span
                        key={`voice-bar-${index}`}
                        className={cn('flex-1 rounded-sm transition-all duration-100', isRecordingVoice ? 'bg-rose-500/70' : 'bg-[var(--border)]')}
                        style={{ height: `${Math.max(12, Math.round(level * 100))}%` }}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-3">
                    {isRecordingVoice ? 'Live microphone waveform' : 'Press record to capture a quick voice update.'}
                  </p>
                  {activityVoicePreviewUrl && (
                    <audio controls src={activityVoicePreviewUrl} className="w-full h-10">
                      Your browser does not support audio playback.
                    </audio>
                  )}
                  {activityVoiceAttachment && (
                    <p className="text-[11px] text-3 truncate">Voice note ready: {activityVoiceAttachment.name}</p>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-xs font-semibold tracking-tight">File attachment</p>
                  <label className="mt-2 h-10 px-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors inline-flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-xs text-2 truncate">
                      {activityAttachment ? activityAttachment.name : 'Choose a file to upload'}
                    </span>
                    <span className="text-[11px] font-medium rounded-md bg-brand-600/10 text-brand-700 px-2 py-1">
                      Browse
                    </span>
                    <input
                      type="file"
                      onChange={(e) => setActivityAttachment(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                  </label>
                  {activityAttachment && <p className="mt-1 text-[11px] text-3 truncate">Attached: {activityAttachment.name}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-2 items-center">
                  <label className="inline-flex items-center gap-2 text-xs text-2">
                    <input
                      type="checkbox"
                      checked={addToFollowUps}
                      onChange={(e) => setAddToFollowUps(e.target.checked)}
                    />
                    Add to follow-ups
                  </label>
                  <input
                    type="datetime-local"
                    value={activityFollowUpDueAt}
                    onChange={(e) => setActivityFollowUpDueAt(e.target.value)}
                    disabled={!addToFollowUps}
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {activityError && <p className="text-xs text-rose-600 mr-auto">{activityError}</p>}
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={savingActivity || uploadingActivityAttachment || isRecordingVoice}
                  >
                    {savingActivity || uploadingActivityAttachment ? 'Saving...' : 'Log update'}
                  </Button>
                </div>
              </form>
              )}

              {activities.length === 0 ? (
                <p className="text-sm text-3">{activityLoadError ?? 'No activity yet. Log first update.'}</p>
              ) : (
                <ol className="space-y-2">
                  {activities.map((activity) => (
                    <li key={activity.id} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                          <Badge tone="info">{activity.type}</Badge>
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-brand-600/20 bg-brand-600/10 text-[11px] font-semibold text-brand-700 dark:text-brand-200">
                            {activity.createdByName ?? 'System'}
                          </span>
                          {activity.type === 'visit' && activity.visitLat != null && activity.visitLng != null && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedVisitActivity(activity)}
                              title="View visit location"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Location
                            </Button>
                          )}
                          {activity.type === 'visit' && !hasSubmittedVisitRecap(activity) && (
                            <Button
                              type="button"
                              variant="soft"
                              size="sm"
                              onClick={() => openVisitRecap(activity)}
                              title="Describe what happened in this visit"
                              className="bg-rose-500/12 text-rose-700 hover:bg-rose-500/22 dark:text-rose-500"
                            >
                              <MessageCircleQuestion className="h-3.5 w-3.5" />
                              What happened?
                            </Button>
                          )}
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-3">{relativeTime(activity.createdAt)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditActivity(activity)}
                            disabled={deletingActivityId === activity.id}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void onDeleteActivity(activity.id)}
                            disabled={deletingActivityId === activity.id}
                          >
                            {deletingActivityId === activity.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                      {editingActivityId === activity.id ? (
                        <div className="mt-2 space-y-2">
                          <select
                            value={editingActivityType}
                            onChange={(e) => setEditingActivityType(e.target.value as ProjectActivity['type'])}
                            className="h-9 px-3 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                          >
                            <option value="note">Note</option>
                            <option value="call">Call</option>
                            <option value="visit">Visit</option>
                            <option value="email">Email</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="stage">Stage</option>
                          </select>
                          <textarea
                            value={editingActivityMessage}
                            onChange={(e) => setEditingActivityMessage(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                          />
                          {editingActivityType === 'visit' && (
                            <textarea
                              value={editingActivityVisitWhatHappened}
                              onChange={(e) => setEditingActivityVisitWhatHappened(e.target.value)}
                              rows={3}
                              placeholder="What happened in this visit?"
                              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                            />
                          )}
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditActivity}
                              disabled={savingEditedActivity}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => void saveEditedActivity(activity.id)}
                              disabled={savingEditedActivity}
                            >
                              {savingEditedActivity ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 space-y-1">
                          <p className="text-sm whitespace-pre-line">{stripLegacyAttachmentLines(activity.message)}</p>
                          {resolveVisitRecap(activity) && (
                            <p className="text-xs text-2">
                              <span className="font-semibold">What happened:</span> {resolveVisitRecap(activity)}
                            </p>
                          )}
                        </div>
                      )}
                      {(activity.attachments.length > 0 || parseLegacyAttachmentLinks(activity.message).length > 0) && (
                        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60">
                          {(() => {
                            const mediaItems = (activity.attachments.length > 0
                            ? activity.attachments.map((attachment) => ({
                                id: attachment.id,
                                kind: attachment.kind,
                                name: attachment.name,
                                mimeType: attachment.mimeType,
                                url: attachment.url,
                              }))
                            : parseLegacyAttachmentLinks(activity.message).map((attachment, index) => ({
                                id: `${activity.id}-legacy-${index}`,
                                kind: attachment.kind,
                                name: attachment.name,
                                mimeType: attachment.kind === 'voice' ? 'audio/webm' : '',
                                url: attachment.url,
                              }))
                            );
                            const voiceCount = mediaItems.filter((item) => item.kind === 'voice' || item.mimeType.startsWith('audio/')).length;
                            const fileCount = mediaItems.length - voiceCount;
                            const isExpanded = Boolean(expandedMediaByActivityId[activity.id]);
                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedMediaByActivityId((prev) => ({
                                      ...prev,
                                      [activity.id]: !isExpanded,
                                    }))
                                  }
                                  className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left"
                                >
                                  <span className="inline-flex items-center gap-2 text-xs text-2">
                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    Media attached
                                  </span>
                                  <span className="inline-flex items-center gap-2 text-[11px] text-3">
                                    {voiceCount > 0 && (
                                      <span className="inline-flex items-center gap-1">
                                        <FileAudio2 className="h-3.5 w-3.5" /> {voiceCount} voice
                                      </span>
                                    )}
                                    {fileCount > 0 && (
                                      <span className="inline-flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" /> {fileCount} file
                                      </span>
                                    )}
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-[var(--border)]">
                                    {mediaItems.map((attachment) => {
                                      const href = toActivityAttachmentUrl(attachment.url);
                                      const isVoice = attachment.mimeType.startsWith('audio/') || attachment.kind === 'voice';
                                      return (
                                        <div key={attachment.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                                          <p className="text-[11px] text-3 truncate">{attachment.name}</p>
                                          {isVoice ? (
                                            <audio controls src={href} className="w-full h-9 mt-1">
                                              Your browser does not support audio playback.
                                            </audio>
                                          ) : (
                                            <a
                                              href={href}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-xs text-brand-700 hover:underline"
                                            >
                                              Open file
                                            </a>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Stakeholders" subtitle={`${stakeholders.length} contacts`} />
            <div className="px-5 pb-4">
              <div className="mb-4 flex items-center justify-end">
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => setShowStakeholderComposer((prev) => !prev)}
                  className={
                    showStakeholderComposer
                      ? 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-200'
                      : 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-200'
                  }
                >
                  {showStakeholderComposer ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Hide stakeholder form
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      Add stakeholder
                    </>
                  )}
                </Button>
              </div>
              {showStakeholderComposer && (
              <form onSubmit={onCreateStakeholder} className="space-y-2 mb-4">
                <select
                  value={stakeholderRole}
                  onChange={(e) => setStakeholderRole(e.target.value as ProjectStakeholder['role'])}
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                >
                  <option value="Architect">Architect</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Fabricator">Fabricator</option>
                  <option value="Developer">Developer</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  value={stakeholderName}
                  onChange={(e) => setStakeholderName(e.target.value)}
                  placeholder="Name"
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
                <input
                  value={stakeholderOrg}
                  onChange={(e) => setStakeholderOrg(e.target.value)}
                  placeholder="Organization (optional)"
                  className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                />
                <div className="grid grid-cols-1 gap-2">
                  <input
                    value={stakeholderEmail}
                    onChange={(e) => setStakeholderEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                  />
                  <input
                    value={stakeholderPhone}
                    onChange={(e) => setStakeholderPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {stakeholderError && <p className="text-xs text-rose-600 mr-auto">{stakeholderError}</p>}
                  {editingStakeholderId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetStakeholderForm}
                      disabled={savingStakeholder}
                    >
                      Cancel edit
                    </Button>
                  )}
                  <Button type="submit" variant="primary" size="sm" disabled={savingStakeholder}>
                    {savingStakeholder ? 'Saving...' : editingStakeholderId ? 'Save stakeholder' : 'Add stakeholder'}
                  </Button>
                </div>
              </form>
              )}

              {stakeholders.length === 0 ? (
                <p className="text-sm text-3">{stakeholderLoadError ?? 'No stakeholders yet.'}</p>
              ) : (
                <ul className="space-y-2">
                  {stakeholders.map((stakeholder) => (
                    <li key={stakeholder.id} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="neutral">{stakeholder.role}</Badge>
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-3">{relativeTime(stakeholder.createdAt)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditStakeholder(stakeholder)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm font-medium">{stakeholder.name}</p>
                      {(stakeholder.organization || stakeholder.email || stakeholder.phone) && (
                        <p className="text-xs text-3 mt-0.5">
                          {[stakeholder.organization, stakeholder.email, stakeholder.phone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Assignments" />
            <div className="px-5 pb-5 space-y-3 text-sm">
              <div>
                <p className="text-[11px] text-3">Manager</p>
                <p className="font-medium">{project.managerName}</p>
              </div>
              <div>
                <p className="text-[11px] text-3 inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Sales reps ({project.salesRepNames.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {project.salesRepNames.map((name, index) => (
                    <li key={`${name}-${project.salesRepIds[index] ?? index}`} className="font-medium">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Project metadata" />
            <div className="px-5 pb-5 space-y-2 text-sm">
              <Row k="Created" v={new Date(project.createdAt).toLocaleString('en-AE')} />
              <Row k="Updated" v={new Date(project.updatedAt).toLocaleString('en-AE')} />
              <Row k="Stage" v={project.stage} />
              <Row k="Country" v={project.country} />
              <Row k="City" v={project.city} />
              <Row k="Developer" v={project.developer} />
              <Row k="Item name" v={project.itemName.trim() || 'Not provided'} />
              <Row k="Item quantity" v={project.itemQuantity > 0 ? `${project.itemQuantity}` : 'Not provided'} />
            </div>
          </Card>
        </div>
      </section>
      {selectedVisitActivity && selectedVisitActivity.visitLat != null && selectedVisitActivity.visitLng != null && (
        <div className="fixed inset-0 z-50 bg-black/45 px-4 py-6 sm:p-8" onClick={() => setSelectedVisitActivity(null)}>
          <div
            className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-sm font-semibold tracking-tight">Visit location</p>
                <p className="text-xs text-3">{relativeTime(selectedVisitActivity.createdAt)}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedVisitActivity(null)}>
                Close
              </Button>
            </div>
            <div className="p-4 space-y-2">
              <div className="rounded-xl overflow-hidden border border-[var(--border)]">
                <LocationPickerMap
                  lat={selectedVisitActivity.visitLat}
                  lng={selectedVisitActivity.visitLng}
                  interactive={false}
                  initialZoom={15}
                  focusZoom={15}
                  heightClassName="h-[360px]"
                />
              </div>
              <p className="text-xs text-3">
                {selectedVisitActivity.visitLat.toFixed(6)}, {selectedVisitActivity.visitLng.toFixed(6)}
                {selectedVisitActivity.visitAccuracyM != null
                  ? ` · Accuracy ${Math.round(selectedVisitActivity.visitAccuracyM)}m`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      )}
      {visitRecapActivityId && (
        <div className="fixed inset-0 z-50 bg-black/45 px-4 py-6 sm:p-8" onClick={closeVisitRecap}>
          <div
            className="mx-auto w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <p className="text-sm font-semibold tracking-tight">What happened in this visit?</p>
              <p className="text-xs text-3">Add a short outcome summary for this visit log.</p>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={visitRecapMessage}
                onChange={(event) => setVisitRecapMessage(event.target.value)}
                placeholder="Example: Met consultant, confirmed sample approval, shared updated BOQ."
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={closeVisitRecap} disabled={savingVisitRecap}>
                  Cancel
                </Button>
                <Button type="button" size="sm" variant="primary" onClick={() => void saveVisitRecap()} disabled={savingVisitRecap}>
                  {savingVisitRecap ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function isVisitDetailLine(line: string) {
  const trimmed = line.trim();
  return (
    /^Location:\s*/i.test(trimmed) ||
    /^Meeting with:\s*/i.test(trimmed) ||
    /^Meeting time:\s*/i.test(trimmed)
  );
}

function getLegacyVisitNarrative(message: string) {
  const cleaned = stripLegacyAttachmentLines(message);
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
  const taggedLine = lines.find((line) => /^What happened:\s*(.+)$/i.test(line));
  if (!taggedLine) return '';
  const tagged = taggedLine.match(/^What happened:\s*(.+)$/i);
  return tagged?.[1]?.trim() ?? '';
}

function resolveVisitRecap(activity: Pick<ProjectActivity, 'visitWhatHappened' | 'message'>) {
  const explicit = activity.visitWhatHappened?.trim();
  if (explicit) return explicit;
  return getLegacyVisitNarrative(activity.message);
}

function hasSubmittedVisitRecap(activity: Pick<ProjectActivity, 'visitWhatHappened' | 'message'>) {
  return Boolean(resolveVisitRecap(activity));
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-2">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function formatRecordingDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stageTone(stage: string): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (stage === 'Won') return 'success';
  if (stage === 'Lost') return 'danger';
  if (stage === 'Negotiation' || stage === 'PO Expected') return 'warning';
  return 'neutral';
}
