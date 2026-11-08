import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { saveVideoToSandbox } from '../services/mediaStorage';

export interface StealthRecorderHandle {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  isRecording: boolean;
}

interface StealthRecorderProps {
  enabled: boolean;
}

export const StealthRecorder = forwardRef<StealthRecorderHandle, StealthRecorderProps>(
  ({ enabled }, ref) => {
    const cameraRef = useRef<CameraView>(null);
    const [cameraPerm, requestCameraPerm] = useCameraPermissions();
    const [micPerm, requestMicPerm] = useMicrophonePermissions();
    const [recording, setRecording] = useState<boolean>(false);
    const recordingPromiseRef = useRef<Promise<any> | null>(null);

    useImperativeHandle(ref, () => ({
      startRecording: async () => {
        if (!enabled) return;

        // Ensure permissions
        if (!cameraPerm?.granted) {
          await requestCameraPerm();
        }
        if (!micPerm?.granted) {
          await requestMicPerm();
        }

        if (cameraRef.current) {
          try {
            setRecording(true);
            recordingPromiseRef.current = cameraRef.current.recordAsync({
              maxDuration: 3600, // up to 1 hour
            });
          } catch (e) {
            console.warn('[StealthRecorder] Start recording error:', e);
            setRecording(false);
          }
        }
      },
      stopRecording: async () => {
        if (!recording && !recordingPromiseRef.current) return null;

        try {
          if (cameraRef.current) {
            cameraRef.current.stopRecording();
          }

          setRecording(false);
          const result = await recordingPromiseRef.current;
          recordingPromiseRef.current = null;

          if (result && result.uri) {
            // Save directly into DocumentDirectory sandbox
            const sandboxedVideoUri = await saveVideoToSandbox(result.uri);
            return sandboxedVideoUri;
          }
          return null;
        } catch (err) {
          console.warn('[StealthRecorder] Stop recording error:', err);
          setRecording(false);
          recordingPromiseRef.current = null;
          return null;
        }
      },
      isRecording: recording,
    }));

    if (!enabled) return null;

    return (
      <View style={styles.hiddenCameraContainer} pointerEvents="none">
        <CameraView
          ref={cameraRef}
          style={styles.hiddenCamera}
          facing="front"
          mode="video"
          mute={false}
        />
      </View>
    );
  }
);

StealthRecorder.displayName = 'StealthRecorder';

const styles = StyleSheet.create({
  hiddenCameraContainer: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 2,
    height: 2,
    opacity: 0,
    overflow: 'hidden',
  },
  hiddenCamera: {
    width: 2,
    height: 2,
  },
});
