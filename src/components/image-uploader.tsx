'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string | null;
  folderName: string;
}

export default function ImageUploader({ onUploadComplete, initialImageUrl, folderName }: ImageUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);

  useEffect(() => {
    setPreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const initializeStorage = () => {
    try {
      // Log the config
      console.log('Firebase Config:', {
        storageBucket: firebaseConfig.storageBucket,
        projectId: firebaseConfig.projectId,
      });

      // Initialize Firebase
      let app;
      if (getApps().length === 0) {
        console.log('Initializing Firebase with config:', firebaseConfig);
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      // Get storage - IMPORTANT: Use the correct bucket
      const storage = getStorage(app, `gs://studio-3640989321-ebeea.firebasestorage.app`);
      
      console.log('Storage initialized with bucket:', storage.app.options.storageBucket);
      return storage;
      
    } catch (error) {
      console.error('Storage initialization error:', error);
      return null;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      // Initialize storage
      const storage = initializeStorage();
      if (!storage) {
        throw new Error('Failed to initialize storage');
      }

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
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        {previewUrl ? (
          <div className="relative aspect-video">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized={previewUrl.startsWith('blob:')}
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No image selected</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <Button asChild disabled={isUploading} className="w-full">
          <label>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Choose Image
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </Button>
      </div>

      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
        <p>Bucket: <code>{firebaseConfig.storageBucket}</code></p>
        <p>Folder: <code>{folderName}</code></p>
      </div>
    </div>
  );
}
