'use server';
/**
 * @fileOverview A flow for uploading files to Firebase Storage using the Admin SDK.
 * This flow runs on the server and bypasses browser CORS restrictions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      storageBucket: firebaseConfig.storageBucket,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

const UploadFileInputSchema = z.object({
  fileDataUrl: z.string().describe("The file content as a Base64 data URL. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  folderName: z.string().describe('The name of the folder in Firebase Storage to upload the file to.'),
  fileName: z.string().describe('The original name of the file.'),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

const UploadFileOutputSchema = z.object({
  downloadURL: z.string().describe('The public URL of the uploaded file.'),
});
export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;


const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    const { fileDataUrl, folderName, fileName } = input;
    
    const bucket = admin.storage().bucket();

    // Extract mime type and base64 data from data URL
    const matches = fileDataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid fileDataUrl format.');
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Create a buffer from the base64 data
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Define the path in the bucket
    const filePath = `${folderName}/${new Date().getTime()}-${fileName}`;
    const file = bucket.file(filePath);
    
    // Upload the file
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make the file public and get the URL
    // Note: This makes the file publicly readable.
    // For production apps, signed URLs are a more secure alternative.
    await file.makePublic();

    const downloadURL = file.publicUrl();

    return { downloadURL };
  }
);


// Export a wrapper function for client-side use
export async function uploadFile(input: UploadFileInput): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}
