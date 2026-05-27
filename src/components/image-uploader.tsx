
'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useStorage } from '@/firebase'; // Import the hook
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { firebaseConfig } from '@/firebase/config';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string | null;
  folderName: string;
}

export default function ImageUploader({ onUploadComplete, initialImageUrl, folderName }: ImageUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const storage = useStorage(); // Use the hook

  useEffect(() => {
    setPreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase Storage is not available. Please try again later.',
      });
      return;
    }

    // Validate
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select an image file',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);

      // Upload file
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folderName}/${timestamp}_${safeName}`;
      
      console.log('Uploading to:', filePath);
      console.log('Bucket:', storage.app.options.storageBucket);

      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      // Get URL
      const url = await getDownloadURL(snapshot.ref);
      console.log('Upload successful! URL:', url);

      setPreviewUrl(url);
      onUploadComplete(url);
      
      toast({
        title: 'Success!',
        description: 'Image uploaded successfully',
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let message = error.message || 'Upload failed';
      
      // Specific error handling
      if (error.code === 'storage/bucket-not-found') {
        message = `Storage bucket not found. Check if bucket "${firebaseConfig.storageBucket}" exists.`;
      } else if (error.code === 'storage/unauthorized') {
        message = 'Not authorized. Please sign in.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: message,
      });
      
      setPreviewUrl(initialImageUrl || null);
      
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-4 w-full">
      <div className="border rounded-xl p-4 bg-muted/30">
        {previewUrl ? (
          <div className="relative aspect-square w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-md">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized={previewUrl.startsWith('blob:')}
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="aspect-square w-32 h-32 mx-auto border-2 border-dashed rounded-full flex items-center justify-center bg-white">
            <div className="text-center">
              <Upload className="h-6 w-6 mx-auto text-gray-400" />
            </div>
          </div>
        )}
      </div>

      <div>
        <Button asChild disabled={isUploading || !storage} className="w-full cursor-pointer" variant="outline">
          <label className="cursor-pointer flex items-center justify-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {previewUrl ? 'Change Photo' : 'Choose Photo'}
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading || !storage}
            />
          </label>
        </Button>
      </div>
    </div>
  );
}
