'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, BellRing, ChevronDown, ChevronRight, FileAudio2, FileText, MapPin, MessageCircleQuestion, Mic, MoreHorizontal, Pencil, Share2, Square, Trash2, Users, Waypoints } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProjectCommercialFields } from '@/components/projects/ProjectCommercialFields';
import {
  createProjectActivity,
  createProjectStakeholder,
  deleteProjectActivity,
  deleteProject as deleteProjectApi,
  deleteProjectStakeholder as deleteProjectStakeholderApi,
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
import {
  commercialSpecsComplete,
  formatProjectSpecs,
  formatSpecsSummary,
} from '@/lib/project-specs';
import { cn, formatAED, relativeTime } from '@/lib/utils';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

function toAbsoluteAssetUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4001/api/v1';
  const apiOrigin = new URL(apiBase).origin;
  return `${apiOrigin}${url}`;
}

function toActivityAttachmentUrl(url: string, token?: string | null): string {
  const absolute = toAbsoluteAssetUrl(url);
  if (!absolute.includes('blob.vercel-storage.com')) {
    return absolute;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4001/api/v1';
  const params = new URLSearchParams({ url: absolute });
  if (token) {
    params.set('access_token', token);
  }
  return `${apiBase}/files/proxy?${params.toString()}`;
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

const ACTIVITY_PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/;

function formatActivityDateTime(value: string): string {
  return new Date(value).toLocaleString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenComposerFromQuery = searchParams.get('composeActivity');
  const { token, user, reportVisitPing } = useAuth();
  const [project, setProject] = useState<ApiProject | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [stakeholders, setStakeholders] = useState<ProjectStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ProjectActivity['type']>('note');
  const [activityMessage, setActivityMessage] = useState('');
  const [activityDictating, setActivityDictating] = useState(false);
  const [activityStakeholderMode, setActivityStakeholderMode] = useState<'existing' | 'other'>('existing');
  const [activityStakeholderId, setActivityStakeholderId] = useState('');
  const [activityContactName, setActivityContactName] = useState('');
  const [activityContactPhone, setActivityContactPhone] = useState('');
  const [activityContactEmail, setActivityContactEmail] = useState('');
  const [activityVisitLocation, setActivityVisitLocation] = useState('');
  const [activityMeetingAt, setActivityMeetingAt] = useState('');
  const [activityAttachment, setActivityAttachment] = useState<File | null>(null);
  const [activityVoiceAttachment, setActivityVoiceAttachment] = useState<File | null>(null);
  const [activityVoicePreviewUrl, setActivityVoicePreviewUrl] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>(() => Array.from({ length: 24 }, () => 0.12));
  const [addToFollowUps, setAddToFollowUps] = useState(false);
  const [activityFollowUpDueAt, setActivityFollowUpDueAt] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const [showActivityComposer, setShowActivityComposer] = useState(false);
  const [activityPersonFilter, setActivityPersonFilter] = useState('all');
  const [savingActivity, setSavingActivity] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityType, setEditingActivityType] = useState<ProjectActivity['type']>('note');
  const [editingActivityMessage, setEditingActivityMessage] = useState('');
  const [editingActivityVisitWhatHappened, setEditingActivityVisitWhatHappened] = useState('');
  const [savingEditedActivity, setSavingEditedActivity] = useState(false);
  const [visitRecapActivityId, setVisitRecapActivityId] = useState<string | null>(null);
  const [visitRecapMessage, setVisitRecapMessage] = useState('');
  const [visitRecapDictating, setVisitRecapDictating] = useState(false);
  const [savingVisitRecap, setSavingVisitRecap] = useState(false);
  const [expandedMediaByActivityId, setExpandedMediaByActivityId] = useState<Record<string, boolean>>({});
  const [sharingAttachmentId, setSharingAttachmentId] = useState<string | null>(null);
  const [copiedAttachmentId, setCopiedAttachmentId] = useState<string | null>(null);
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
  const [stakeholderMenuId, setStakeholderMenuId] = useState<string | null>(null);
  const [deletingStakeholderId, setDeletingStakeholderId] = useState<string | null>(null);
  const [sharingSiteLocation, setSharingSiteLocation] = useState(false);
  const [siteLocationShareMessage, setSiteLocationShareMessage] = useState<string | null>(null);
  const [editingCommercial, setEditingCommercial] = useState(false);
  const [commercialValueAed, setCommercialValueAed] = useState('');
  const [commercialItemQuantity, setCommercialItemQuantity] = useState('');
  const [commercialSpecThickness, setCommercialSpecThickness] = useState('');
  const [commercialSpecCore, setCommercialSpecCore] = useState('');
  const [commercialSpecPaintType, setCommercialSpecPaintType] = useState('');
  const [commercialError, setCommercialError] = useState<string | null>(null);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [showAssignmentPerformance, setShowAssignmentPerformance] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const activityRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activityDictationBaseTextRef = useRef('');
  const visitRecapRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const visitRecapDictationBaseTextRef = useRef('');

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
    if (shouldOpenComposerFromQuery === '1') {
      setShowActivityComposer(true);
    }
  }, [shouldOpenComposerFromQuery]);

  useEffect(() => {
    function handleOpenActivityComposer(event: Event) {
      const customEvent = event as CustomEvent<{ projectId?: string }>;
      if (customEvent.detail?.projectId && customEvent.detail.projectId !== params.id) {
        return;
      }
      setShowActivityComposer(true);
    }

    window.addEventListener('project:open-activity-composer', handleOpenActivityComposer as EventListener);
    return () => {
      window.removeEventListener('project:open-activity-composer', handleOpenActivityComposer as EventListener);
    };
  }, [params.id]);

  useEffect(() => {
    if (activityStakeholderMode !== 'existing' || !activityStakeholderId) return;
    const selected = stakeholders.find((entry) => entry.id === activityStakeholderId);
    if (!selected) return;
    setActivityContactName(selected.name);
    if (selected.phone) setActivityContactPhone(selected.phone);
    if (selected.email) setActivityContactEmail(selected.email);
  }, [activityStakeholderMode, activityStakeholderId, stakeholders]);

  useEffect(() => {
    if (!project) return;
    setCommercialValueAed(String(project.valueAed));
    setCommercialItemQuantity(String(project.itemQuantity ?? 0));
    setCommercialSpecThickness(project.specThickness ?? '');
    setCommercialSpecCore(project.specCore ?? '');
    setCommercialSpecPaintType(project.specPaintType ?? '');
    setCommercialError(null);
    setEditingCommercial(false);
  }, [
    project?.id,
    project?.valueAed,
    project?.itemQuantity,
    project?.specThickness,
    project?.specCore,
    project?.specPaintType,
  ]);

  useEffect(() => {
    return () => {
      stopRecordingVisuals();
      if (activityVoicePreviewUrl) {
        URL.revokeObjectURL(activityVoicePreviewUrl);
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [activityVoicePreviewUrl]);

  useEffect(() => {
    return () => {
      activityRecognitionRef.current?.stop();
      activityRecognitionRef.current = null;
      visitRecapRecognitionRef.current?.stop();
      visitRecapRecognitionRef.current = null;
    };
  }, []);

  function resolveSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  }

  function toggleActivityDictation() {
    if (activityDictating) {
      activityRecognitionRef.current?.stop();
      return;
    }
    const RecognitionCtor = resolveSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      setActivityError('Voice typing is not supported in this browser.');
      return;
    }
    const recognition = new RecognitionCtor();
    activityDictationBaseTextRef.current = activityMessage.trim();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const resultEvent = event as Event & {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      const transcript = Array.from(resultEvent.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      const base = activityDictationBaseTextRef.current;
      setActivityMessage([base, transcript].filter(Boolean).join(' ').trim());
    };
    recognition.onerror = () => {
      setActivityError('Unable to capture voice typing. Please check microphone permission.');
      setActivityDictating(false);
      activityRecognitionRef.current = null;
    };
    recognition.onend = () => {
      setActivityDictating(false);
      activityRecognitionRef.current = null;
    };
    activityRecognitionRef.current = recognition;
    setActivityError(null);
    setActivityDictating(true);
    recognition.start();
  }

  function toggleVisitRecapDictation() {
    if (visitRecapDictating) {
      visitRecapRecognitionRef.current?.stop();
      return;
    }
    const RecognitionCtor = resolveSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      setActivityError('Voice typing is not supported in this browser.');
      return;
    }
    const recognition = new RecognitionCtor();
    visitRecapDictationBaseTextRef.current = visitRecapMessage.trim();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const resultEvent = event as Event & {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      const transcript = Array.from(resultEvent.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      const base = visitRecapDictationBaseTextRef.current;
      setVisitRecapMessage([base, transcript].filter(Boolean).join(' ').trim());
    };
    recognition.onerror = () => {
      setActivityError('Unable to capture voice typing. Please check microphone permission.');
      setVisitRecapDictating(false);
      visitRecapRecognitionRef.current = null;
    };
    recognition.onend = () => {
      setVisitRecapDictating(false);
      visitRecapRecognitionRef.current = null;
    };
    visitRecapRecognitionRef.current = recognition;
    setActivityError(null);
    setVisitRecapDictating(true);
    recognition.start();
  }

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
  const currentUserId = user?.id ?? null;
  const canManageActivity = (activity: ProjectActivity) => Boolean(currentUserId) && activity.createdById === currentUserId;
  const followUpMinDateTime = toDateTimeLocalValue(new Date());
  const activityPersonOptions = Array.from(
    new Map(
      activities.map((activity) => [activity.createdById ?? '__system__', activity.createdByName ?? 'System'])
    ).entries()
  ).map(([id, name]) => ({ id, name }));
  const filteredActivities =
    activityPersonFilter === 'all'
      ? activities
      : activities.filter((activity) => (activity.createdById ?? '__system__') === activityPersonFilter);
  const contactTargetLabel =
    activityType === 'email'
      ? 'Mailing to'
      : activityType === 'call'
        ? 'Calling to'
        : activityType === 'whatsapp'
          ? 'WhatsApp to'
          : 'Meeting with';
  const assignmentMembers = [
    ...(project.regionalManagerId
      ? [
          {
            id: project.regionalManagerId,
            name: project.regionalManagerName || 'Regional manager',
            role: 'Regional manager',
          },
        ]
      : []),
    ...(project.managerId
      ? [
          {
            id: project.managerId,
            name: project.managerName || 'Manager',
            role: 'Manager',
          },
        ]
      : []),
    ...project.salesRepIds.map((id, index) => ({
      id,
      name: project.salesRepNames[index] || `Sales rep ${index + 1}`,
      role: 'Sales rep',
    })),
  ];
  const totalAssignmentActivities = activities.filter((activity) =>
    activity.createdById != null && assignmentMembers.some((member) => member.id === activity.createdById)
  ).length;
  const assignmentPerformance = assignmentMembers.map((member) => {
    const memberActivities = activities.filter((activity) => activity.createdById === member.id);
    const visits = memberActivities.filter((activity) => activity.type === 'visit').length;
    const contributionPct =
      totalAssignmentActivities > 0
        ? Math.round((memberActivities.length / totalAssignmentActivities) * 100)
        : 0;
    return {
      ...member,
      activities: memberActivities.length,
      visits,
      contributionPct,
    };
  });

  function requiresCommercialDetails(stage: string) {
    return ['Tender', 'Negotiation', 'Approved', 'PO Expected', 'Won', 'Lost'].includes(stage);
  }

  async function onSaveCommercialDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) return;
    const nextValue = Number(commercialValueAed);
    const parsedQuantity = Number(commercialItemQuantity);
    const nextItemQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.round(parsedQuantity) : 0;

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setCommercialError('Total project value must be greater than 0.');
      return;
    }
    if (requiresCommercialDetails(project.stage) && nextItemQuantity <= 0) {
      setCommercialError('Total project quantity is required for quotation stage and later.');
      return;
    }
    if (
      requiresCommercialDetails(project.stage) &&
      !commercialSpecsComplete(commercialSpecThickness, commercialSpecCore, commercialSpecPaintType)
    ) {
      setCommercialError('Select thickness, core, and paint type.');
      return;
    }

    const nextItemName = commercialSpecsComplete(
      commercialSpecThickness,
      commercialSpecCore,
      commercialSpecPaintType,
    )
      ? formatProjectSpecs(commercialSpecThickness, commercialSpecCore, commercialSpecPaintType)
      : project.itemName;

    setSavingCommercial(true);
    setCommercialError(null);
    try {
      const updated = await updateProjectApi(token, project.id, {
        name: project.name,
        city: project.city,
        country: project.country,
        developer: project.developer,
        businessDivision: project.businessDivision,
        stage: project.stage,
        valueAed: nextValue,
        itemName: nextItemName,
        itemQuantity: nextItemQuantity,
        specThickness: commercialSpecThickness,
        specCore: commercialSpecCore,
        specPaintType: commercialSpecPaintType,
        lat: project.lat,
        lng: project.lng,
        probability: project.probability,
        daysInStage: project.daysInStage,
        competitor: project.competitor,
        regionalManagerId: project.regionalManagerId,
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
    const contactPhone = activityContactPhone.trim();
    if (!message) {
      setActivityError('Activity message is required.');
      return;
    }
    const needsContactDetails = activityType === 'call' || activityType === 'email' || activityType === 'whatsapp';
    if (needsContactDetails && !activityContactName.trim()) {
      setActivityError('Contact name is required for this activity.');
      return;
    }
    if ((activityType === 'call' || activityType === 'whatsapp') && !contactPhone) {
      setActivityError('Phone number is required for call and WhatsApp activities.');
      return;
    }
    if ((activityType === 'call' || activityType === 'whatsapp') && !ACTIVITY_PHONE_REGEX.test(contactPhone)) {
      setActivityError('Enter a valid phone number.');
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
      if (!activityContactName.trim()) {
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
    if (addToFollowUps) {
      const dueAtMs = new Date(activityFollowUpDueAt).getTime();
      if (!Number.isFinite(dueAtMs) || dueAtMs < Date.now()) {
        setActivityError('Follow-up date & time must be in the future.');
        return;
      }
    }
    if (isRecordingVoice) {
      setActivityError('Stop the voice recording before saving the activity.');
      return;
    }
    if (activityDictating) {
      setActivityError('Stop voice typing before saving the activity.');
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
      if ((activityType === 'call' || activityType === 'whatsapp') && contactPhone) {
        details.push(`Phone: ${contactPhone}`);
      }
      if (activityType === 'email') {
        details.push(`Email: ${activityContactEmail.trim()}`);
      }
      if (activityType === 'visit') {
        details.push(`Location: ${activityVisitLocation.trim()}`);
        details.push(`Meeting with: ${activityContactName.trim()}`);
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

  async function onShareAttachment(attachmentId: string, attachmentName: string, attachmentUrl: string) {
    const href = toActivityAttachmentUrl(attachmentUrl, token);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        setSharingAttachmentId(attachmentId);
        await navigator.share({
          title: attachmentName,
          text: 'Shared from project activity',
          url: href,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(href);
        setCopiedAttachmentId(attachmentId);
        window.setTimeout(() => {
          setCopiedAttachmentId((prev) => (prev === attachmentId ? null : prev));
        }, 1800);
        return;
      }
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setActivityError('Unable to share attachment right now.');
    } finally {
      setSharingAttachmentId((prev) => (prev === attachmentId ? null : prev));
    }
  }

  async function onShareSiteLocation() {
    if (!project) return;
    const mapsUrl = `https://www.google.com/maps?q=${project.lat},${project.lng}`;
    try {
      setSharingSiteLocation(true);
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `${project.name} site location`,
          text: `${project.name} · ${project.city}, ${project.country}`,
          url: mapsUrl,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(mapsUrl);
        setSiteLocationShareMessage('Location link copied.');
        window.setTimeout(() => {
          setSiteLocationShareMessage(null);
        }, 1800);
        return;
      }
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSiteLocationShareMessage('Unable to share location right now.');
    } finally {
      setSharingSiteLocation(false);
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

  async function onDeleteStakeholder(stakeholder: ProjectStakeholder) {
    if (!token || !project) {
      setStakeholderError('Session expired. Please login again.');
      return;
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Delete stakeholder "${stakeholder.name}"? This cannot be undone.`)
      : true;
    if (!confirmed) return;

    setDeletingStakeholderId(stakeholder.id);
    setStakeholderError(null);
    setStakeholderMenuId(null);
    try {
      await deleteProjectStakeholderApi(token, project.id, stakeholder.id);
      setStakeholders((prev) => prev.filter((entry) => entry.id !== stakeholder.id));
      if (editingStakeholderId === stakeholder.id) {
        resetStakeholderForm();
      }
    } catch (err) {
      setStakeholderError(err instanceof Error ? err.message : 'Failed to delete stakeholder.');
    } finally {
      setDeletingStakeholderId(null);
    }
  }

  async function onDeleteActivity(activityId: string) {
    if (!token || !project) {
      setActivityError('Session expired. Please login again.');
      return;
    }
    const activity = activities.find((entry) => entry.id === activityId);
    if (!activity || !canManageActivity(activity)) {
      setActivityError('You can only delete activities created by you.');
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

  async function onDeleteProject() {
    if (!project || !token || user?.role !== 'ADMIN') return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(
          `Delete project "${project.name}"? This will remove all activities, stakeholders, and follow-ups. This cannot be undone.`
        )
      : false;
    if (!confirmed) return;

    setError(null);
    try {
      await deleteProjectApi(token, project.id);
      router.push('/pipeline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project.');
    }
  }

  function startEditActivity(activity: ProjectActivity) {
    if (!canManageActivity(activity)) {
      setActivityError('You can only edit activities created by you.');
      return;
    }
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
    const existing = activities.find((entry) => entry.id === activityId);
    if (!existing || !canManageActivity(existing)) {
      setActivityError('You can only edit activities created by you.');
      return;
    }
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
    if (visitRecapDictating) {
      visitRecapRecognitionRef.current?.stop();
      visitRecapRecognitionRef.current = null;
      setVisitRecapDictating(false);
    }
    setVisitRecapActivityId(null);
    setVisitRecapMessage('');
  }

  async function saveVisitRecap() {
    if (!token || !project || !visitRecapActivityId) return;
    if (visitRecapDictating) {
      setActivityError('Stop voice typing before saving the visit update.');
      return;
    }
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
      <div className="px-4 lg:px-8 pt-6 flex items-center justify-between gap-3">
        <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-xs text-3 hover:text-[var(--text)] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pipeline
        </Link>
        {user?.role === 'ADMIN' && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="text-rose-600 hover:text-rose-700"
            onClick={() => void onDeleteProject()}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete project
          </Button>
        )}
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
                <ProjectCommercialFields
                  idPrefix="project-commercial"
                  value={commercialValueAed}
                  itemQuantity={commercialItemQuantity}
                  specThickness={commercialSpecThickness}
                  specCore={commercialSpecCore}
                  specPaintType={commercialSpecPaintType}
                  onValueChange={setCommercialValueAed}
                  onItemQuantityChange={setCommercialItemQuantity}
                  onSpecThicknessChange={setCommercialSpecThickness}
                  onSpecCoreChange={setCommercialSpecCore}
                  onSpecPaintTypeChange={setCommercialSpecPaintType}
                  required={requiresCommercialDetails(project.stage)}
                />
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
                      setCommercialItemQuantity(String(project.itemQuantity ?? 0));
                      setCommercialSpecThickness(project.specThickness ?? '');
                      setCommercialSpecCore(project.specCore ?? '');
                      setCommercialSpecPaintType(project.specPaintType ?? '');
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
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Total value</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {formatAED(project.valueAed, true)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Total quantity</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {project.itemQuantity > 0 ? `${project.itemQuantity} m²` : 'Not provided'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Specifications</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {formatSpecsSummary(project) || 'Not provided'}
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
          <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">Days in this stage</p>
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
            <CardHeader
              title="Site location"
              subtitle={`${project.city}, ${project.country}`}
              action={
                <Button type="button" variant="ghost" size="sm" onClick={() => void onShareSiteLocation()} disabled={sharingSiteLocation}>
                  <Share2 className="h-3.5 w-3.5" />
                  {sharingSiteLocation ? 'Sharing...' : 'Share'}
                </Button>
              }
            />
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
              {siteLocationShareMessage && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{siteLocationShareMessage}</p>}
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader
              title="Activity timeline"
              subtitle={
                activityPersonFilter === 'all'
                  ? `${activities.length} updates`
                  : `${filteredActivities.length} of ${activities.length} updates`
              }
            />
            <div className="px-5 pb-4">
              <div className="mb-3 flex items-center justify-end">
                <select
                  value={activityPersonFilter}
                  onChange={(event) => setActivityPersonFilter(event.target.value)}
                  className="h-9 rounded-lg border border-transparent bg-[var(--surface-2)] px-3 text-xs focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none"
                >
                  <option value="all">All people</option>
                  {activityPersonOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              {showActivityComposer && (
              <div className="fixed inset-0 z-50 bg-black/45 px-4 py-6 sm:p-8" onClick={() => setShowActivityComposer(false)}>
                <div
                  className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold tracking-tight">Log new update</p>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowActivityComposer(false)}>
                      Close
                    </Button>
                  </div>
                  <form onSubmit={onCreateActivity} className="p-4 space-y-2">
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
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      value={activityMessage}
                      onChange={(e) => setActivityMessage(e.target.value)}
                      placeholder="message"
                      className="h-10 flex-1 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                    />
                    <Button
                      type="button"
                      variant={activityDictating ? 'soft' : 'secondary'}
                      size="sm"
                      onClick={toggleActivityDictation}
                      className={activityDictating ? 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-200' : undefined}
                      title={activityDictating ? 'Stop voice typing' : 'Start voice typing'}
                    >
                      {activityDictating ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                {(activityType === 'call' || activityType === 'email' || activityType === 'whatsapp' || activityType === 'visit') && (
                  <div className="grid grid-cols-1 sm:grid-cols-[220px,1fr] gap-2">
                    <select
                      value={activityStakeholderMode === 'existing' ? activityStakeholderId : '__other__'}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === '__other__') {
                          setActivityStakeholderMode('other');
                          setActivityStakeholderId('');
                          setActivityContactName('');
                          return;
                        }
                        setActivityStakeholderMode('existing');
                        setActivityStakeholderId(nextValue);
                      }}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                    >
                      <option value="">{contactTargetLabel}</option>
                      {stakeholders.map((stakeholder) => (
                        <option key={stakeholder.id} value={stakeholder.id}>
                          {stakeholder.name} ({stakeholder.role})
                        </option>
                      ))}
                      <option value="__other__">Other (enter name)</option>
                    </select>
                    <input
                      value={activityContactName}
                      onChange={(e) => setActivityContactName(e.target.value)}
                      placeholder={activityStakeholderMode === 'other' ? 'Enter other name' : `${contactTargetLabel} name`}
                      className="h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                    />
                  </div>
                )}
                {(activityType === 'call' || activityType === 'whatsapp') && (
                  <input
                    type="tel"
                    value={activityContactPhone}
                    onChange={(e) => {
                      setActivityContactPhone(e.target.value);
                      if (activityError) setActivityError(null);
                    }}
                    placeholder="Phone number"
                    inputMode="tel"
                    pattern="[+]?[0-9()\-\\s]{7,20}"
                    title="Enter a valid phone number (7-20 characters)"
                    maxLength={20}
                    required
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
                    <div className="space-y-1">
                      <p className="text-[11px] text-3">Visit location</p>
                      <input
                        value={activityVisitLocation}
                        onChange={(e) => setActivityVisitLocation(e.target.value)}
                        placeholder="Enter place name"
                        className="h-10 w-full px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-3">Meeting time</p>
                      <input
                        type="datetime-local"
                        value={activityMeetingAt}
                        onChange={(e) => setActivityMeetingAt(e.target.value)}
                        className="h-10 w-full px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                      />
                    </div>
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
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-2">
                  <label className="inline-flex items-start gap-2 text-xs text-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addToFollowUps}
                      onChange={(e) => setAddToFollowUps(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-semibold text-[var(--text)] inline-flex items-center gap-1">
                        <BellRing className="h-3.5 w-3.5" />
                        Add to follow-ups
                      </span>
                      <span className="block text-[11px] text-3 mt-0.5">
                        This will notify you regarding this activity.
                      </span>
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={activityFollowUpDueAt}
                    min={followUpMinDateTime}
                    onChange={(e) => setActivityFollowUpDueAt(e.target.value)}
                    disabled={!addToFollowUps}
                    className="h-10 w-full px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--border-strong)] focus:outline-none text-sm disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {activityError && <p className="text-xs text-rose-600 mr-auto">{activityError}</p>}
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={savingActivity || uploadingActivityAttachment || isRecordingVoice || activityDictating}
                  >
                    {savingActivity || uploadingActivityAttachment ? 'Saving...' : 'Log update'}
                  </Button>
                </div>
              </form>
                </div>
              </div>
              )}

              {filteredActivities.length === 0 ? (
                <p className="text-sm text-3">{activityLoadError ?? 'No activity yet. Log first update.'}</p>
              ) : (
                <ol className="space-y-3">
                  {filteredActivities.map((activity, index) => (
                    <li key={activity.id} className="relative pl-7">
                      {index < filteredActivities.length - 1 && (
                        <span className="absolute left-2.5 top-6 h-[calc(100%+0.75rem)] w-px bg-[var(--border)]" aria-hidden="true" />
                      )}
                      <span
                        className={cn(
                          'absolute left-0 top-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] ring-2 ring-[var(--surface)]',
                          activityStepColorClass(activity.type)
                        )}
                        aria-hidden="true"
                      />
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="inline-flex flex-wrap items-center gap-2">
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
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                          <div className="leading-tight sm:text-right">
                            <p className="text-[11px] font-semibold text-[var(--text)]">{relativeTime(activity.createdAt)}</p>
                            <p className="text-[10px] text-3">{formatActivityDateTime(activity.createdAt)}</p>
                          </div>
                          {canManageActivity(activity) && (
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditActivity(activity)}
                                disabled={deletingActivityId === activity.id}
                                title="Edit activity"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void onDeleteActivity(activity.id)}
                                disabled={deletingActivityId === activity.id}
                                title="Delete activity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{deletingActivityId === activity.id ? 'Deleting...' : 'Delete'}</span>
                              </Button>
                            </div>
                          )}
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
                                      const href = toActivityAttachmentUrl(attachment.url, token);
                                      const isVoice = attachment.mimeType.startsWith('audio/') || attachment.kind === 'voice';
                                      return (
                                        <div key={attachment.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                                          <p className="text-[11px] text-3 truncate">{attachment.name}</p>
                                          {isVoice ? (
                                            <>
                                              <audio controls src={href} className="w-full h-9 mt-1">
                                                Your browser does not support audio playback.
                                              </audio>
                                              <div className="mt-1 flex items-center justify-end">
                                                <button
                                                  type="button"
                                                  onClick={() => void onShareAttachment(attachment.id, attachment.name, attachment.url)}
                                                  className="inline-flex items-center gap-1.5 text-[11px] text-brand-700 hover:underline"
                                                >
                                                  <Share2 className="h-3.5 w-3.5" />
                                                  {sharingAttachmentId === attachment.id
                                                    ? 'Sharing...'
                                                    : copiedAttachmentId === attachment.id
                                                      ? 'Copied link'
                                                      : 'Share'}
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="mt-1 flex items-center justify-between gap-2">
                                              <a
                                                href={href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-brand-700 hover:underline"
                                              >
                                                Open file
                                              </a>
                                              <button
                                                type="button"
                                                onClick={() => void onShareAttachment(attachment.id, attachment.name, attachment.url)}
                                                className="inline-flex items-center gap-1.5 text-[11px] text-brand-700 hover:underline"
                                              >
                                                <Share2 className="h-3.5 w-3.5" />
                                                {sharingAttachmentId === attachment.id
                                                  ? 'Sharing...'
                                                  : copiedAttachmentId === attachment.id
                                                    ? 'Copied link'
                                                    : 'Share'}
                                              </button>
                                            </div>
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
                      </div>
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
                    <li key={stakeholder.id} className="rounded-xl border border-[var(--border)] p-3 relative">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="neutral">{stakeholder.role}</Badge>
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-3">{relativeTime(stakeholder.createdAt)}</span>
                          <div className="relative">
                            <button
                              type="button"
                              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-3 hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                              onClick={() =>
                                setStakeholderMenuId((current) => (current === stakeholder.id ? null : stakeholder.id))
                              }
                              aria-label={`Open actions for ${stakeholder.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {stakeholderMenuId === stakeholder.id && (
                              <div className="absolute right-0 mt-1 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-card z-10 overflow-hidden">
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--surface-2)]"
                                  onClick={() => {
                                    setStakeholderMenuId(null);
                                    startEditStakeholder(stakeholder);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-xs text-left text-rose-600 hover:bg-rose-500/10 disabled:opacity-60"
                                  disabled={deletingStakeholderId === stakeholder.id}
                                  onClick={() => void onDeleteStakeholder(stakeholder)}
                                >
                                  {deletingStakeholderId === stakeholder.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            )}
                          </div>
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
              {project.regionalManagerName && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[11px] text-3 mb-1">Regional manager</p>
                  <p className="font-semibold">{project.regionalManagerName}</p>
                </div>
              )}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] text-3 mb-1">Manager</p>
                <p className="font-semibold">{project.managerName || '—'}</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] text-3 inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Sales reps ({project.salesRepNames.length})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {project.salesRepNames.map((name, index) => (
                    <li
                      key={`${name}-${project.salesRepIds[index] ?? index}`}
                      className="font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5"
                    >
                      {name || `Sales rep ${index + 1}`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAssignmentPerformance(true)}>
                  <BarChart3 className="h-4 w-4" />
                  View performance
                </Button>
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
              <Row k="Customer" v={project.developer} />
              <Row k="Business division" v={project.businessDivision?.trim() || 'Not provided'} />
              <Row k="Specifications" v={formatSpecsSummary(project) || 'Not provided'} />
              <Row k="Total quantity (m²)" v={project.itemQuantity > 0 ? `${project.itemQuantity}` : 'Not provided'} />
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
              <div className="space-y-2">
                <textarea
                  value={visitRecapMessage}
                  onChange={(event) => setVisitRecapMessage(event.target.value)}
                  placeholder="Example: Met consultant, confirmed sample approval, shared updated BOQ."
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm"
                />
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant={visitRecapDictating ? 'soft' : 'secondary'}
                    size="sm"
                    onClick={toggleVisitRecapDictation}
                    className={visitRecapDictating ? 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-200' : undefined}
                    title={visitRecapDictating ? 'Stop voice typing' : 'Start voice typing'}
                  >
                    {visitRecapDictating ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {visitRecapDictating ? 'Stop dictation' : 'Use mic'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={closeVisitRecap} disabled={savingVisitRecap}>
                  Cancel
                </Button>
                <Button type="button" size="sm" variant="primary" onClick={() => void saveVisitRecap()} disabled={savingVisitRecap || visitRecapDictating}>
                  {savingVisitRecap ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAssignmentPerformance && (
        <div className="fixed inset-0 z-50 bg-black/45 px-4 py-6 sm:p-8" onClick={() => setShowAssignmentPerformance(false)}>
          <div
            className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-sm font-semibold tracking-tight">Project contribution</p>
                <p className="text-xs text-3">Performance for assigned manager and sales reps</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAssignmentPerformance(false)}>
                Close
              </Button>
            </div>
            <div className="p-4 space-y-2.5">
              {assignmentPerformance.map((member) => (
                <div key={`${member.role}-${member.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{member.name}</p>
                      <p className="text-xs text-3">{member.role}</p>
                    </div>
                    <Badge tone="neutral">{member.contributionPct}% contribution</Badge>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                    <div className="h-full bg-brand-600" style={{ width: `${Math.max(2, member.contributionPct)}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                      <p className="text-3 text-[10px]">Activities</p>
                      <p className="font-semibold">{member.activities}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                      <p className="text-3 text-[10px]">Visits</p>
                      <p className="font-semibold">{member.visits}</p>
                    </div>
                  </div>
                </div>
              ))}
              {assignmentPerformance.length === 0 && (
                <p className="text-sm text-3">No assignment data available for this project.</p>
              )}
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

function toDateTimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
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

function activityStepColorClass(type: ProjectActivity['type']) {
  if (type === 'visit') return 'bg-violet-500';
  if (type === 'call' || type === 'whatsapp') return 'bg-sky-500';
  if (type === 'email') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function stageTone(stage: string): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (stage === 'Won') return 'success';
  if (stage === 'Lost') return 'danger';
  if (stage === 'Negotiation' || stage === 'PO Expected') return 'warning';
  return 'neutral';
}
