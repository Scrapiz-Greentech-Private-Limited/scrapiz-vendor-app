import * as ImageManipulator from 'expo-image-manipulator';

export const STAGES = [
  { progress: 10, label: 'Setting up your partner profile...' },
  { progress: 30, label: 'Securing your kabadiwala identity...' },
  { progress: 55, label: 'Verifying you are who you say you are...' },
  { progress: 75, label: 'Building your scrap collection record...' },
  { progress: 90, label: 'Unlocking access to nearby pickups...' },
  { progress: 100, label: 'You are ready to collect!' },
] as const;

export type FaceUploadResponse = {
  success: boolean;
  data?: {
    task_id?: string;
    status?: string;
  };
  message?: string;
  error?: string;
};

export type PollResponse = {
  success?: boolean;
  data?: {
    task_id?: string;
    status?: 'processing' | 'verified' | 'rejected';
  };
  status?: 'processing' | 'verified' | 'rejected';
  message?: string;
  error?: string;
};

type RunFaceCaptureFlowArgs = {
  uri: string;
  token: string;
  onStage: (stage: (typeof STAGES)[number]) => void;
  onTaskId: (taskId: string) => void;
  onRejected: (message: string) => Promise<void> | void;
  onVerified: () => Promise<void> | void;
  onFailure: (message: string) => Promise<void> | void;
  compressImage?: (uri: string) => Promise<string>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  baseUrl: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxPollMs?: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseJsonSafely = async <T,>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export async function runFaceCaptureFlow({
  uri,
  token,
  onStage,
  onTaskId,
  onRejected,
  onVerified,
  onFailure,
  compressImage,
  fetchImpl = fetch,
  sleep: sleepImpl = sleep,
  baseUrl,
  timeoutMs = 20000,
  pollIntervalMs = 3000,
  maxPollMs = 60000,
}: RunFaceCaptureFlowArgs): Promise<void> {
  onStage(STAGES[0]);

  const compressedUri = compressImage
    ? await compressImage(uri)
    : (
        await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 640 } }],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        )
      ).uri;

  onStage(STAGES[1]);

  const formData = new FormData();
  formData.append('face_image', {
    uri: compressedUri,
    name: 'face.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  onStage(STAGES[2]);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const uploadResponse = await fetchImpl(`${baseUrl}/api/vendor/upload-face/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const uploadBody = await parseJsonSafely<FaceUploadResponse>(uploadResponse);

  if (!uploadResponse.ok) {
    await onFailure(uploadBody?.error || uploadBody?.message || 'Upload failed. Please try again.');
    return;
  }

  if (!uploadBody?.success) {
    await onFailure(uploadBody?.message || 'Upload failed. Please try again.');
    return;
  }

  const taskId = uploadBody.data?.task_id;
  if (!taskId) {
    await onFailure('Upload failed. Please try again.');
    return;
  }

  onTaskId(taskId);
  onStage(STAGES[3]);

  const pollStartedAt = Date.now();

  while (Date.now() - pollStartedAt < maxPollMs) {
    await sleepImpl(pollIntervalMs);

    const statusResponse = await fetchImpl(`${baseUrl}/api/vendor/face-status/`, {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    const statusBody = await parseJsonSafely<PollResponse>(statusResponse);
    const status = statusBody?.data?.status || statusBody?.status;

    if (status === 'processing') {
      continue;
    }

    if (status === 'verified') {
      onStage(STAGES[4]);
      await sleepImpl(800);
      onStage(STAGES[5]);
      await sleepImpl(2000);
      await onVerified();
      return;
    }

    if (status === 'rejected') {
      await onRejected(statusBody?.message || 'Verification failed. Please retake.');
      return;
    }
  }

  await onFailure('Verification timed out. Please retake.');
}
