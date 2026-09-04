jest.mock(
  'expo-image-manipulator',
  () => ({
    SaveFormat: { JPEG: 'jpeg' },
    manipulateAsync: jest.fn(),
  }),
  { virtual: true },
);

import { runFaceCaptureFlow, STAGES } from '../screens/onboarding/faceCaptureFlow';

describe('FaceCaptureScreen flow', () => {
  it('advances through every stage in order and navigates after verification', async () => {
    const seenLabels: string[] = [];
    const navigate = jest.fn();
    const onVerified = jest.fn(() => {
      navigate('OnboardingStatus');
    });

    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { task_id: 'x', status: 'processing' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'processing',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'verified',
        }),
      } as Response);

    await runFaceCaptureFlow({
      uri: 'file:///face.jpg',
      token: 'token-123',
      baseUrl: 'https://example.com',
      fetchImpl: fetchMock,
      compressImage: async () => 'file:///face-compressed.jpg',
      sleep: async () => undefined,
      onStage: (stage) => {
        seenLabels.push(stage.label);
      },
      onTaskId: jest.fn(),
      onRejected: jest.fn(),
      onFailure: jest.fn(),
      onVerified,
    });

    expect(seenLabels).toEqual(STAGES.map((stage) => stage.label));
    expect(navigate).toHaveBeenCalledWith('OnboardingStatus');
    expect(onVerified).toHaveBeenCalledTimes(1);
  });
});
