'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  
  useEffect(() => {
    setPreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage) return;

    // Create a local URL for instant preview
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    const storageRef = ref(storage, `${folderName}/${new Date().getTime()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setIsUploading(true);
    setProgress(0);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: 'Could not upload the file. Please try again.',
        });
        setIsUploading(false);
        setPreviewUrl(initialImageUrl || null); // Revert on failure
        URL.revokeObjectURL(localPreviewUrl);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setPreviewUrl(downloadURL); // Update to final URL
          setIsUploading(false);
          toast({
            title: 'Upload Complete!',
            description: 'Your image has been successfully uploaded.',
          });
        });
         URL.revokeObjectURL(localPreviewUrl);
      }
    );
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
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
