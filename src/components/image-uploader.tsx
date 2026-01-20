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
  const { toast } = useToast();
  const storage = useStorage();
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setPreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const clearUploadState = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      uploadTaskRef.current = null;
      setIsUploading(false);
      setProgress(0);
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage) {
        if (!storage) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'Storage service is not available. Please try again later.',
            });
        }
        return;
    };

    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    const storageRef = ref(storage, `${folderName}/${new Date().getTime()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    setIsUploading(true);
    setProgress(0);

    timeoutRef.current = setTimeout(() => {
        if (progress === 0 && isUploading) {
            uploadTask.cancel();
            toast({
                variant: "destructive",
                title: "Upload Timed Out",
                description: "The upload did not start. This could be a CORS issue on your storage bucket. Please check the browser console for more details.",
                duration: 10000,
            });
            clearUploadState();
            setPreviewUrl(initialImageUrl || null);
        }
    }, 8000); // 8-second timeout

    uploadTask.on('state_changed',
      (snapshot) => {
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(currentProgress);
      },
      (error) => {
        clearUploadState();
        switch (error.code) {
          case 'storage/unauthorized':
            toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: 'You do not have permission to upload files. Check your Storage Rules.',
            });
            break;
          case 'storage/canceled':
            console.log("Upload canceled, likely due to timeout.");
            break;
          default:
            toast({
              variant: 'destructive',
              title: 'Upload Failed',
              description: error.message,
            });
            break;
        }

        console.error("Upload failed:", error);
        setPreviewUrl(initialImageUrl || null);
        URL.revokeObjectURL(localPreviewUrl);
      },
      () => {
        clearUploadState();
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setPreviewUrl(downloadURL);
          toast({
            title: 'Upload Complete!',
            description: 'Your image has been successfully uploaded.',
          });
        }).catch((error) => {
             console.error("Failed to get download URL:", error);
             toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'File uploaded, but could not get the URL.',
            });
        });
         URL.revokeObjectURL(localPreviewUrl);
      }
    );
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
    if (uploadTaskRef.current) {
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
