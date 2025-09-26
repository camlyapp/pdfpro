'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Camera, RefreshCcw, Check, VideoOff, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

interface ScanDocumentProps {
  onScanComplete: (imageBlob: Blob) => void;
  open: boolean;
}

export function ScanDocument({ onScanComplete, open }: ScanDocumentProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    setIsCameraLoading(true);
    setHasCameraPermission(null);
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
    } finally {
        setIsCameraLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (open) {
      // When the dialog opens, start the camera
      startCamera();
    } else {
      // When the dialog closes, stop the camera and clear the image
      stopCamera();
      setCapturedImage(null);
      setHasCameraPermission(null);
    }
    
    // Cleanup function for when the component unmounts
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);


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
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
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
      
      <Card className="aspect-video w-full overflow-hidden relative bg-muted flex items-center justify-center">
        {isCameraLoading && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                Requesting camera access...
            </div>
        )}

        {!isCameraLoading && hasCameraPermission === false && (
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

        <video ref={videoRef} className={cn("w-full h-full object-cover", capturedImage || !hasCameraPermission ? 'hidden' : 'block')} autoPlay muted playsInline />
        
        {capturedImage && (
          <img src={capturedImage} alt="Captured document" className="w-full h-full object-contain" />
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
          <Button onClick={handleCapture} disabled={!hasCameraPermission || isCameraLoading}>
            <Camera className="mr-2" /> Capture
          </Button>
        )}
      </DialogFooter>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </DialogContent>
  );
}
