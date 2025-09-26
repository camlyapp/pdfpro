'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Camera, RefreshCcw, Check, Video, VideoOff } from 'lucide-react';
import { Card } from './ui/card';

interface ScanDocumentProps {
  onScanComplete: (imageBlob: Blob) => void;
}

export function ScanDocument({ onScanComplete }: ScanDocumentProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (hasCameraPermission) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to scan documents.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Stop the camera stream when the component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasCameraPermission, toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          onScanComplete(blob);
        });
    }
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Scan Document</DialogTitle>
        <DialogDescription>
          Position your document in the frame and capture the image.
        </DialogDescription>
      </DialogHeader>
      
      <Card className="aspect-video w-full overflow-hidden relative bg-muted">
        {hasCameraPermission === null && (
            <div className="flex items-center justify-center h-full text-muted-foreground">Requesting camera access...</div>
        )}

        {hasCameraPermission === true && !capturedImage && (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        )}
        
        {capturedImage && (
          <img src={capturedImage} alt="Captured document" className="w-full h-full object-contain" />
        )}

        {hasCameraPermission === false && (
             <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive" className="w-full">
                    <VideoOff className="h-4 w-4" />
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                        Please allow camera access in your browser settings to use this feature. You may need to refresh the page after granting permissions.
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </Card>

      <DialogFooter className="gap-2">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={handleRetake}>
              <RefreshCcw className="mr-2" /> Retake
            </Button>
            <Button onClick={handleConfirm}>
              <Check className="mr-2" /> Confirm
            </Button>
          </>
        ) : (
          <Button onClick={handleCapture} disabled={!hasCameraPermission}>
            <Camera className="mr-2" /> Capture
          </Button>
        )}
      </DialogFooter>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </DialogContent>
  );
}
