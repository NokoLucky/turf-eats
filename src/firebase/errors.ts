'use client';
import { getAuth, type User } from 'firebase/auth';

/**
 * Maps Firebase error codes to human-readable messages.
 * @param error The error object returned by Firebase SDK.
 * @returns A user-friendly error message.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  
  const code = error.code;
  const originalMessage = error.message;

  switch (code) {
    // Auth errors
    case 'auth/invalid-email':
      return 'The email address is not valid. Please check and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/requires-recent-login':
      return 'For security, please log in again before making this change.';
    case 'auth/invalid-credential':
      return 'Invalid login details. Please check your email and password.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled.';
    
    // Firestore errors
    case 'permission-denied':
      return "You don't have permission to perform this action.";
    case 'unavailable':
      return 'The service is currently offline. Please try again in a moment.';
    case 'not-found':
      return 'The requested information could not be found.';
    case 'already-exists':
      return 'This record already exists in our system.';
    case 'resource-exhausted':
      return 'System quota exceeded. Please try again later.';
    case 'deadline-exceeded':
      return 'The operation took too long. Please check your connection and try again.';
    
    // Storage errors
    case 'storage/unauthorized':
      return "You don't have permission to upload files.";
    case 'storage/canceled':
      return 'The upload was canceled.';
    case 'storage/unknown':
      return 'An unknown error occurred during file upload.';

    default:
      // If it's a FirestorePermissionError or has a specific message but no code
      return originalMessage || 'An unexpected error occurred. Please try again.';
  }
}

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

interface FirebaseAuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}

interface FirebaseAuthObject {
  uid: string;
  token: FirebaseAuthToken;
}

interface SecurityRuleRequest {
  auth: FirebaseAuthObject | null;
  method: string;
  path: string;
  resource?: {
    data: any;
  };
}

function buildAuthObject(currentUser: User | null): FirebaseAuthObject | null {
  if (!currentUser) {
    return null;
  }

  const token: FirebaseAuthToken = {
    name: currentUser.displayName,
    email: currentUser.email,
    email_verified: currentUser.emailVerified,
    phone_number: currentUser.phoneNumber,
    sub: currentUser.uid,
    firebase: {
      identities: currentUser.providerData.reduce((acc, p) => {
        if (p.providerId) {
          acc[p.providerId] = [p.uid];
        }
        return acc;
      }, {} as Record<string, string[]>),
      sign_in_provider: currentUser.providerData[0]?.providerId || 'custom',
      tenant: currentUser.tenantId,
    },
  };

  return {
    uid: currentUser.uid,
    token: token,
  };
}

function buildRequestObject(context: SecurityRuleContext): SecurityRuleRequest {
  let authObject: FirebaseAuthObject | null = null;
  try {
    const firebaseAuth = getAuth();
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      authObject = buildAuthObject(currentUser);
    }
  } catch {
    // Auth not initialized yet
  }

  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}

function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `Action Denied: You don't have permission to perform this ${requestObject.method} operation on this part of the database.
  
Technical Details for Debugging:
${JSON.stringify(requestObject, null, 2)}`;
}

export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    super(buildErrorMessage(requestObject));
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
}
