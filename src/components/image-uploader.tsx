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

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    console.log('[Uploader] File input changed.');
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    console.log(`[Uploader] File selected: ${file.name} (size: ${file.size} bytes)`);
    setIsUploading(true);
    setUploadProgress(25); // Initial progress

    // Read the file as a Data URL
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async (e) => {
      const fileDataUrl = e.target?.result as string;
      setPreviewUrl(fileDataUrl);
      setUploadProgress(50);

      try {
        console.log('[Uploader] Calling server-side upload flow.');
        const result = await uploadFile({
          fileDataUrl,
          folderName,
          fileName: file.name,
        });
        setUploadProgress(100);
        
        console.log('[Uploader] Server-side upload complete. URL:', result.downloadURL);
        onUploadComplete(result.downloadURL);
        
        toast({
          title: 'Upload Complete!',
          description: 'Your image has been successfully uploaded.',
        });

      } catch (error: any) {
        console.error('[Uploader] Server-side upload failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'Could not upload the file via the server.',
        });
        setPreviewUrl(initialImageUrl || null); // Revert on failure
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = (error) => {
        console.error('[Uploader] Error reading file:', error);
        toast({
            variant: 'destructive',
            title: 'File Read Error',
            description: 'Could not read the selected file.',
        });
        setIsUploading(false);
    };
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
