'use client';

import { useState, ChangeEvent } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string | null;
  folderName: string;
}

export default function ImageUploader({ onUploadComplete, initialImageUrl, folderName }: ImageUploaderProps) {
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    console.log('[Uploader] File input changed.');
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    console.log(`[Uploader] File selected: ${file.name} (size: ${file.size} bytes)`);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsUploading(true);
      const storage = getStorage();
      console.log('[Uploader] Firebase Storage instance obtained.');

      const storageRef = ref(storage, `${folderName}/${new Date().getTime()}-${file.name}`);
      console.log(`[Uploader] Created storage reference at path: ${storageRef.fullPath}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('[Uploader] Upload is ' + progress + '% done');
          setUploadProgress(progress);
        },
        (error) => {
          console.error('[Uploader] Upload failed:', error);
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: error.message,
          });
          setIsUploading(false);
          setPreviewUrl(initialImageUrl || null);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log('[Uploader] File available at', downloadURL);
            onUploadComplete(downloadURL);
            setIsUploading(false);
            toast({
              title: 'Upload Complete!',
              description: 'Your image has been successfully uploaded.',
            });
          });
        }
      );
    } catch (error: any) {
        console.error('[Uploader] An unexpected error occurred during setup:', error);
         toast({
            variant: 'destructive',
            title: 'Upload Error',
            description: 'Could not start the upload process.',
        });
        setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete(''); // Notify parent that the image is removed
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
            <Progress value={uploadProgress} />
            <p className="text-sm text-center text-muted-foreground">Uploading... ({Math.round(uploadProgress)}%)</p>
        </div>
      )}
    </div>
  );
}
