'use server';
/**
 * @fileOverview A flow for uploading files to Firebase Storage using the Admin SDK.
 * This flow runs on the server and bypasses browser CORS restrictions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
// Use modular imports for firebase-admin to prevent bundling issues
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

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


/**
 * Initializes and returns the Firebase Admin App instance, guaranteeing it's a singleton.
 * In a Google Cloud environment, initializeApp() with no arguments will auto-discover
 * the project configuration and credentials.
 */
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // In a Google Cloud environment, initializeApp() with no arguments should
  // auto-discover the project configuration and credentials via Application Default Credentials.
  return initializeApp();
}


const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    // Get the initialized admin app.
    const adminApp = getFirebaseAdminApp();
    
    const { fileDataUrl, folderName, fileName } = input;
    
    // Explicitly provide the bucket name, as this was the source of our initial error.
    const bucket = getStorage(adminApp).bucket(firebaseConfig.storageBucket);
    
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
    await file.makePublic();

    const downloadURL = file.publicUrl();

    return { downloadURL };
  }
);


// Export a wrapper function for client-side use
export async function uploadFile(input: UploadFileInput): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}
