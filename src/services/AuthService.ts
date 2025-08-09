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
  reauthenticateWithCredential,
  deleteUser
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
  name: string;
  role?: 'viewer' | 'editor' | 'admin';
  companyId?: string;
  teamCode?: string;
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
  teamCode?: string;
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
    // Simplified version - avoid additional Firestore reads that might cause hanging
    console.log('Creating user object from Firebase user:', firebaseUser.uid);
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'User',
      role: 'viewer',
      companyId: 'default-company',
      isActive: true,
      lastLogin: new Date(),
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
  }

  private notifyAuthStateListeners(user: User | null) {
    this.authStateListeners.forEach(listener => listener(user));
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      console.log('Starting login process...');
      
      // Handle demo credentials
      if (credentials.email === 'demo@fleetfix.com' && credentials.password === 'demo123') {
        const demoUser: User = {
          id: 'demo-user-123',
          email: 'demo@fleetfix.com',
          name: 'Demo User',
          role: 'admin',
          companyId: 'fleetfix-demo',
          isActive: true,
          createdAt: new Date(),
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

        // Set demo user state
        this.currentUser = demoUser;
        this.authStateListeners.forEach(callback => callback(demoUser));
        
        return { user: demoUser };
      }

      // Handle simple demo credentials
      if (credentials.email === 'demo@demo.com' && credentials.password === 'demo123') {
        const simpleDemoUser: User = {
          id: 'simple-demo-user',
          email: 'demo@demo.com',
          name: 'Simple Demo',
          role: 'admin',
          companyId: 'demo-company',
          isActive: true,
          createdAt: new Date(),
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

        // Set demo user state
        this.currentUser = simpleDemoUser;
        this.authStateListeners.forEach(callback => callback(simpleDemoUser));
        
        return { user: simpleDemoUser };
      }      // Check if Firebase is available
      if (!auth) {
        console.warn('Firebase not available, using offline mode');
        return this.offlineLogin(credentials);
      }

      console.log('Attempting Firebase login...');
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      console.log('Firebase login successful, creating user object...');
      const user = await this.createUserFromFirebaseUser(userCredential.user);
      
      // Set current user immediately
      this.currentUser = user;
      this.authStateListeners.forEach(callback => callback(user));
      
      // Skip the updateUserData call that might be causing hanging
      // await this.updateUserData(user.id, { lastLogin: new Date() });
      console.log('Login completed successfully');
      
      return { user };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      
      // Fallback to offline mode if Firebase fails
      if (error.code === 'auth/network-request-failed' || 
          error.message?.includes('network') ||
          error.message?.includes('fetch')) {
        console.log('Network error detected, falling back to offline login');
        return this.offlineLogin(credentials);
      }
      
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  private async offlineLogin(credentials: LoginCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      // Check offline users in localStorage
      const offlineUsers = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
      const user = offlineUsers.find((u: any) => u.email === credentials.email);
      
      if (!user) {
        return {
          error: {
            code: 'auth/user-not-found',
            message: 'No account found with this email address.'
          }
        };
      }

      // Check password
      const storedPassword = localStorage.getItem(`password_${user.id}`);
      if (storedPassword !== credentials.password) {
        return {
          error: {
            code: 'auth/wrong-password',
            message: 'Incorrect password. Please try again.'
          }
        };
      }

      // Update last login
      user.lastLogin = new Date();
      const updatedUsers = offlineUsers.map((u: any) => u.id === user.id ? user : u);
      localStorage.setItem('offlineUsers', JSON.stringify(updatedUsers));

      // Update internal state
      this.currentUser = user;
      this.authStateListeners.forEach(callback => callback(user));

      console.log('Offline login successful:', user);
      return { user };
    } catch (error) {
      console.error('Offline login error:', error);
      return {
        error: {
          code: 'offline-error',
          message: 'Failed to log in. Please try again.'
        }
      };
    }
  }

  async signup(credentials: SignupCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      console.log('Starting signup process...');
      
      // Check if Firebase is available
      if (!auth) {
        console.warn('Firebase not available, using offline mode');
        return this.offlineSignup(credentials);
      }

      // Validate team code if provided
      if (credentials.teamCode) {
        const validTeamCodes = [
          'FLEET2024', 'ADMIN2024', 'DEMO2024', 'TEAM001', 'TEAM002', 'MECHANIC01'
        ];
        if (!validTeamCodes.includes(credentials.teamCode)) {
          return {
            error: {
              code: 'invalid-team-code',
              message: 'Invalid team code. Please contact your team administrator.'
            }
          };
        }
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Update Firebase user profile
      await updateProfile(userCredential.user, {
        displayName: credentials.name
      });

      // Determine role based on team code
      let userRole: 'viewer' | 'editor' | 'admin' = 'viewer';
      if (credentials.teamCode) {
        if (credentials.teamCode.includes('ADMIN')) {
          userRole = 'admin';
        } else if (credentials.teamCode.includes('MECHANIC') || credentials.teamCode.includes('TEAM')) {
          userRole = 'editor';
        }
      }

      // Create user document in Firestore with timeout
      const userData: Partial<User> = {
        id: userCredential.user.uid,
        email: credentials.email,
        name: credentials.name,
        role: userRole,
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

      try {
        console.log('Creating Firestore document...');
        await Promise.race([
          setDoc(doc(db, 'users', userCredential.user.uid), userData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000))
        ]);
        console.log('Firestore document created successfully');
      } catch (firestoreError) {
        console.warn('Firestore document creation failed, continuing anyway:', firestoreError);
        // Don't fail the signup if Firestore fails
      }

      // Create user object immediately without additional operations
      const user = await this.createUserFromFirebaseUser(userCredential.user);
      console.log('User creation completed successfully:', user);
      
      // Set current user immediately
      this.currentUser = user;
      this.authStateListeners.forEach(callback => callback(user));
      
      return { user };
    } catch (error: any) {
      console.error('Firebase signup error:', error);
      
      // Fallback to offline mode if Firebase fails
      if (error.code === 'auth/network-request-failed' || 
          error.message?.includes('network') ||
          error.message?.includes('fetch')) {
        console.log('Network error detected, falling back to offline signup');
        return this.offlineSignup(credentials);
      }
      
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  private async offlineSignup(credentials: SignupCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      // Check if user already exists in localStorage
      const existingUsers = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
      if (existingUsers.find((u: any) => u.email === credentials.email)) {
        return {
          error: {
            code: 'auth/email-already-in-use',
            message: 'An account with this email already exists.'
          }
        };
      }

      // Create new user
      const newUser: User = {
        id: 'offline-' + Date.now(),
        email: credentials.email,
        name: credentials.name,
        role: 'viewer',
        companyId: credentials.companyName ? 
          credentials.companyName.toLowerCase().replace(/\s+/g, '-') : 
          'default-company',
        isActive: true,
        createdAt: new Date(),
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

      // Store user and password in localStorage
      existingUsers.push(newUser);
      localStorage.setItem('offlineUsers', JSON.stringify(existingUsers));
      localStorage.setItem(`password_${newUser.id}`, credentials.password);

      console.log('Offline user created successfully:', newUser);
      return { user: newUser };
    } catch (error) {
      console.error('Offline signup error:', error);
      return {
        error: {
          code: 'offline-error',
          message: 'Failed to create account. Please try again.'
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

  async deleteAccount(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found');
    }

    try {
      await deleteUser(auth.currentUser);
      this.currentUser = null;
      localStorage.removeItem('authToken');
      this.notifyAuthStateListeners(null);
    } catch (error) {
      console.error('Error deleting account:', error);
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
