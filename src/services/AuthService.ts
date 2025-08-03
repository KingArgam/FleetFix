import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import userDataService, { UserProfile } from './UserDataService';

export interface AuthError {
  code: string;
  message: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  displayName: string;
  role?: 'viewer' | 'editor' | 'admin';
  companyId?: string;
}

export interface ProfileUpdateData {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
  companyName?: string;
}

class AuthenticationService {
  private currentUser: User | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];

  constructor() {
    // Listen for auth state changes
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const user = await this.createUserFromFirebaseUser(firebaseUser);
        this.currentUser = user;
        this.notifyAuthStateListeners(user);
      } else {
        // User is signed out
        this.currentUser = null;
        this.notifyAuthStateListeners(null);
      }
    });
  }

  // Send password reset email
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw {
        code: error.code,
        message: this.getErrorMessage(error.code)
      } as AuthError;
    }
  }

  // Resend email verification
  async resendEmailVerification(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('Email verification error:', error);
      throw {
        code: error.code,
        message: this.getErrorMessage(error.code)
      } as AuthError;
    }
  }

  // Update user profile
  async updateProfile(profileData: ProfileUpdateData): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Update Firebase profile
      if (profileData.displayName) {
        await updateProfile(user, {
          displayName: profileData.displayName
        });
      }

      // Update email if provided
      if (profileData.email && profileData.email !== user.email) {
        await updateEmail(user, profileData.email);
        await sendEmailVerification(user);
      }

      // Update current user state
      if (this.currentUser) {
        this.currentUser = {
          ...this.currentUser,
          name: profileData.displayName || this.currentUser.name,
          email: profileData.email || this.currentUser.email
        };
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw {
        code: error.code,
        message: this.getErrorMessage(error.code)
      } as AuthError;
    }
  }

  // Change password
  async changePassword(passwordData: PasswordChangeData): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);
    } catch (error: any) {
      console.error('Password change error:', error);
      throw {
        code: error.code,
        message: this.getErrorMessage(error.code)
      } as AuthError;
    }
  }

  private async createUserFromFirebaseUser(firebaseUser: FirebaseUser): Promise<User> {
    // Get additional user data from Firestore
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    let userData: Partial<User> = {};
    if (userDoc.exists()) {
      userData = userDoc.data() as Partial<User>;
    }

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: userData.name || firebaseUser.displayName || 'User',
      role: userData.role || 'viewer',
      companyId: userData.companyId || 'default-company',
      isActive: true,
      lastLogin: new Date(),
      createdAt: userData.createdAt || new Date(),
      preferences: userData.preferences || {
        theme: 'light',
        notifications: {
          inApp: true
        },
        language: 'en',
        timezone: 'America/New_York'
      }
    };
  }

  private notifyAuthStateListeners(user: User | null) {
    this.authStateListeners.forEach(listener => listener(user));
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      // Handle demo credentials
      if (credentials.email === 'demo@fleetfix.com' && credentials.password === 'demo123') {
        const demoUser: User = {
          id: 'demo-user-123',
          email: 'demo@fleetfix.com',
          name: 'Demo User',
          role: 'admin',
          companyId: 'fleetfix-demo',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          lastLogin: new Date(),
          preferences: {
            theme: 'light',
            notifications: {
              inApp: true
            },
            language: 'en',
            timezone: 'America/New_York'
          }
        };
        
        // Update internal state and notify listeners
        this.currentUser = demoUser;
        this.authStateListeners.forEach(callback => callback(demoUser));
        
        return { user: demoUser };
      }

      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      const user = await this.createUserFromFirebaseUser(userCredential.user);
      
      // Update last login
      await this.updateUserData(user.id, { lastLogin: new Date() });
      
      return { user };
    } catch (error: any) {
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  async signup(credentials: SignupCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Update Firebase user profile
      await updateProfile(userCredential.user, {
        displayName: credentials.name
      });

      // Create user document in Firestore
      const userData: Partial<User> = {
        id: userCredential.user.uid,
        email: credentials.email,
        name: credentials.name,
        role: 'viewer', // Default role
        companyId: credentials.companyName ? 
          credentials.companyName.toLowerCase().replace(/\s+/g, '-') : 
          'default-company',
        isActive: true,
        createdAt: new Date(),
        preferences: {
          theme: 'light',
          notifications: {
            inApp: true
          },
          language: 'en',
          timezone: 'America/New_York'
        }
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // Send email verification
      await sendEmailVerification(userCredential.user);

      const user = await this.createUserFromFirebaseUser(userCredential.user);
      return { user };
    } catch (error: any) {
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // If demo user, just clear state without Firebase signout
      if (this.currentUser?.id === 'demo-user-123') {
        this.currentUser = null;
        this.authStateListeners.forEach(callback => callback(null));
        localStorage.removeItem('userSession');
        localStorage.removeItem('authToken');
        return;
      }

      await signOut(auth);
      this.currentUser = null;
      // Clear any local storage
      localStorage.removeItem('userSession');
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean } | { error: AuthError }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  async updateUserData(userId: string, data: Partial<User>): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, data, { merge: true });
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }

  // State management
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(
        listener => listener !== callback
      );
    };
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

// Create and export singleton instance
export const authService = new AuthenticationService();
export default authService;
