'use client';

import { useState, ChangeEvent, useEffect, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { useStorage } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string | null;
  folderName: string;
}

export default function ImageUploader({ onUploadComplete, initialImageUrl, folderName }: ImageUploaderProps) {
  console.log('[Uploader] Component Rendered/Re-rendered');
  const { toast } = useToast();
  const storage = useStorage();
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[Uploader Effect] initialImageUrl changed:', initialImageUrl);
    setPreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const clearUploadState = () => {
      console.log('[Uploader] Clearing upload state.');
      if (timeoutRef.current) {
        console.log('[Uploader] Clearing timeout.');
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      uploadTaskRef.current = null;
      setIsUploading(false);
      setProgress(0);
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    console.log('[Uploader] handleFileChange triggered.');
    const file = event.target.files?.[0];
    
    if (!file) {
        console.warn('[Uploader] No file selected.');
        return;
    }

    if (!storage) {
        console.error('[Uploader] Firebase Storage service is not available!');
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: 'Storage service is not available. Please try again later.',
        });
        return;
    }

    console.log('[Uploader] Selected file:', { name: file.name, size: file.size, type: file.type });
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);
    console.log('[Uploader] Set local preview URL:', localPreviewUrl);

    const storagePath = `${folderName}/${new Date().getTime()}-${file.name}`;
    console.log('[Uploader] Creating storage reference with path:', storagePath);
    const storageRef = ref(storage, storagePath);
    
    console.log('[Uploader] Creating upload task.');
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    setIsUploading(true);
    setProgress(0);

    console.log('[Uploader] Setting 8-second timeout for upload start.');
    timeoutRef.current = setTimeout(() => {
        if (progress === 0 && isUploading) {
            console.error('[Uploader Timeout] Upload did not start within 8 seconds. Cancelling task.');
            uploadTask.cancel();
            toast({
                variant: "destructive",
                title: "Upload Timed Out",
                description: "The upload did not start. This is likely a CORS configuration issue on your storage bucket. Please check the browser console for more details.",
                duration: 10000,
            });
            clearUploadState();
            setPreviewUrl(initialImageUrl || null);
        }
    }, 8000); // 8-second timeout

    uploadTask.on('state_changed',
      (snapshot) => {
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`[Uploader Progress] State: ${snapshot.state}, Progress: ${currentProgress.toFixed(2)}%`);
        setProgress(currentProgress);
      },
      (error) => {
        console.error("[Uploader Error] Upload failed with error object:", error);
        clearUploadState();
        switch (error.code) {
          case 'storage/unauthorized':
            console.error('[Uploader Error] Reason: Permission Denied. Check your Firebase Storage rules.');
            toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: 'You do not have permission to upload files. Check your Storage Rules in the Firebase console.',
            });
            break;
          case 'storage/canceled':
            console.log("[Uploader Info] Upload canceled, likely due to timeout or user action.");
            break;
          case 'storage/unknown':
             console.error('[Uploader Error] Reason: An unknown error occurred, often related to CORS policy. Ensure your bucket is configured to accept uploads from this origin.');
             toast({
              variant: 'destructive',
              title: 'Upload Failed (CORS?)',
              description: 'An unknown error occurred. This is often a CORS policy issue on the bucket.',
            });
            break;
          default:
            console.error(`[Uploader Error] Unhandled error code: ${error.code}`);
            toast({
              variant: 'destructive',
              title: 'Upload Failed',
              description: error.message,
            });
            break;
        }

        setPreviewUrl(initialImageUrl || null);
        URL.revokeObjectURL(localPreviewUrl);
      },
      () => {
        console.log('[Uploader Complete] Upload finished successfully. Getting download URL...');
        clearUploadState();
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('[Uploader Complete] Got download URL:', downloadURL);
          onUploadComplete(downloadURL);
          setPreviewUrl(downloadURL);
          toast({
            title: 'Upload Complete!',
            description: 'Your image has been successfully uploaded.',
          });
        }).catch((error) => {
             console.error("[Uploader Error] Failed to get download URL after upload:", error);
             toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'File uploaded, but could not get the final URL.',
            });
        });
         URL.revokeObjectURL(localPreviewUrl);
      }
    );
  };

  const handleRemoveImage = () => {
    console.log('[Uploader] handleRemoveImage called.');
    setPreviewUrl(null);
    onUploadComplete('');
    if (uploadTaskRef.current) {
      console.log('[Uploader] Cancelling active upload task.');
      uploadTaskRef.current.cancel();
      clearUploadState();
    }
  };

  return (
    <div className="space-y-4">
      <div className={cn("relative aspect-video w-full rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center", previewUrl && "border-solid")}>
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt="Image preview" fill className="object-contain rounded-md" />
             <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-3 -right-3 rounded-full h-8 w-8 z-10"
                onClick={handleRemoveImage}
                disabled={isUploading}
            >
                <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
            <div className="text-center text-muted-foreground p-4">
                 <ImageIcon className="mx-auto h-12 w-12" />
                <p className="mt-2 text-sm">No image selected</p>
            </div>
        )}
      </div>

      <div>
        <label htmlFor="file-upload" className={cn("w-full items-center gap-2", { 'hidden': isUploading || previewUrl })}>
          <Button asChild className="w-full">
            <div>
              <Upload className="mr-2" />
              Choose Image
            </div>
          </Button>
        </label>
        <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" disabled={isUploading || !!previewUrl} />
      </div>

      {isUploading && (
        <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">Uploading... {Math.round(progress)}%</p>
        </div>
      )}
    </div>
  );
}
