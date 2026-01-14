'use server';
/**
 * @fileOverview A flow for uploading files to Firebase Storage.
 * This flow runs on the server and bypasses browser CORS restrictions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase/init';

// Ensure Firebase is initialized on the server
initializeFirebase();

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
    
    // Get the default storage instance
    const storage = getStorage();

    // Create a storage reference
    const storageRef = ref(storage, `${folderName}/${new Date().getTime()}-${fileName}`);

    // Upload the file from the Data URL
    const snapshot = await uploadString(storageRef, fileDataUrl, 'data_url');
    
    // Get the public download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { downloadURL };
  }
);


// Export a wrapper function for client-side use
export async function uploadFile(input: UploadFileInput): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}
