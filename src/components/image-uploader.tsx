'use client';

import { useState, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/ai/flows/upload-file-flow';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string | null;
  folderName: string;
}

export default function ImageUploader({ onUploadComplete, initialImageUrl, folderName }: ImageUploaderProps) {
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    
    // Show preview immediately
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Prepare for server-side upload
    const serverReader = new FileReader();
    serverReader.onload = async (e) => {
      try {
        setIsUploading(true);
        const base64DataUrl = e.target?.result as string;
        
        const result = await uploadFile({
          fileDataUrl: base64DataUrl,
          folderName: folderName,
          fileName: file.name
        });

        if (result.downloadURL) {
          onUploadComplete(result.downloadURL);
          setPreviewUrl(result.downloadURL);
          toast({
            title: 'Upload Complete!',
            description: 'Your image has been successfully uploaded.',
          });
        } else {
          throw new Error('Upload did not return a URL.');
        }

      } catch (error: any) {
        console.error('[Uploader] Upload failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'An unexpected error occurred during upload.',
        });
        setPreviewUrl(initialImageUrl || null); // Revert to initial
      } finally {
        setIsUploading(false);
      }
    };
    serverReader.readAsDataURL(file);
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
            <Progress value={100} className="animate-pulse" />
            <p className="text-sm text-center text-muted-foreground">Uploading...</p>
        </div>
      )}
    </div>
  );
}
