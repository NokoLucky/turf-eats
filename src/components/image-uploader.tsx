'use client';

import { useState, ChangeEvent, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Create a local URL for instant preview
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    // Read file as data URL for the flow
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const fileDataUrl = reader.result as string;

      startTransition(async () => {
        try {
          const result = await uploadFile({
            fileDataUrl,
            folderName,
            fileName: file.name,
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
          console.error('[Uploader] Server-side upload failed:', error);
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: error.message || 'Could not upload the file.',
          });
          // Revert preview to initial state on failure
          setPreviewUrl(initialImageUrl || null);
        } finally {
          setIsUploading(false);
          // Clean up the local URL
          URL.revokeObjectURL(localPreviewUrl);
        }
      });
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
        });
        setIsUploading(false);
        URL.revokeObjectURL(localPreviewUrl);
    };
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };
  
  const isBusy = isUploading || isPending;

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
                disabled={isBusy}
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
        <label htmlFor="file-upload" className={cn("w-full items-center gap-2", { 'hidden': isBusy || previewUrl })}>
          <Button asChild className="w-full">
            <div>
              <Upload className="mr-2" />
              Choose Image
            </div>
          </Button>
        </label>
        <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" disabled={isBusy || !!previewUrl} />
      </div>

      {isBusy && (
        <div className="space-y-2">
            <Progress value={isPending ? undefined : 100} />
            <p className="text-sm text-center text-muted-foreground">Uploading...</p>
        </div>
      )}
    </div>
  );
}
