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
    const savedUser = localStorage.getItem('fleetfix_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.createUserFromFirebaseUser(firebaseUser);
        this.currentUser = user;
        localStorage.setItem('fleetfix_user', JSON.stringify(user));
        this.notifyAuthStateListeners(user);
      } else {
        this.currentUser = null;
        localStorage.removeItem('fleetfix_user');
        this.notifyAuthStateListeners(null);
      }
    });
  }

  
  
  setMockUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem('fleetfix_user', JSON.stringify(user));
    this.notifyAuthStateListeners(user);
  }

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

  
  async updateProfile(profileData: ProfileUpdateData): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      
      if (profileData.displayName) {
        await updateProfile(user, {
          displayName: profileData.displayName
        });
      }

      
      if (profileData.email && profileData.email !== user.email) {
        await updateEmail(user, profileData.email);
        await sendEmailVerification(user);
      }

      
      if (this.currentUser) {
        this.currentUser = {
          ...this.currentUser,
          name: profileData.displayName || this.currentUser.name,
          email: profileData.email || this.currentUser.email
        };
        
        this.notifyAuthStateListeners(this.currentUser);
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw {
        code: error.code,
        message: this.getErrorMessage(error.code)
      } as AuthError;
    }
  }

  
  async changePassword(passwordData: PasswordChangeData): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);

      
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

  
  async login(credentials: LoginCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      if (!auth) {
        return this.offlineLogin(credentials);
      }
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const user = await this.createUserFromFirebaseUser(userCredential.user);
      this.currentUser = user;
      localStorage.setItem('fleetfix_user', JSON.stringify(user));
      this.authStateListeners.forEach(callback => callback(user));
      return { user };
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed' || error.message?.includes('network') || error.message?.includes('fetch')) {
        return this.offlineLogin(credentials);
      }
      return { error: { code: error.code, message: this.getErrorMessage(error.code) } };
    }
  }

  private async offlineLogin(credentials: LoginCredentials): Promise<{ user: User } | { error: AuthError }> {
    try {
      
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

      
      const storedPassword = localStorage.getItem(`password_${user.id}`);
      if (storedPassword !== credentials.password) {
        return {
          error: {
            code: 'auth/wrong-password',
            message: 'Incorrect password. Please try again.'
          }
        };
      }

      
      user.lastLogin = new Date();
      const updatedUsers = offlineUsers.map((u: any) => u.id === user.id ? user : u);
      localStorage.setItem('offlineUsers', JSON.stringify(updatedUsers));

      
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
      
      
      if (!auth) {
        console.warn('Firebase not available, using offline mode');
        return this.offlineSignup(credentials);
      }

      
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

      
      await updateProfile(userCredential.user, {
        displayName: credentials.name
      });

      
      let userRole: 'viewer' | 'editor' | 'admin' = 'viewer';
      if (credentials.teamCode) {
        if (credentials.teamCode.includes('ADMIN')) {
          userRole = 'admin';
        } else if (credentials.teamCode.includes('MECHANIC') || credentials.teamCode.includes('TEAM')) {
          userRole = 'editor';
        }
      }

      
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
        
      }

      
      const user = await this.createUserFromFirebaseUser(userCredential.user);
      console.log('User creation completed successfully:', user);
      
      
      this.currentUser = user;
      this.authStateListeners.forEach(callback => callback(user));
      
      return { user };
    } catch (error: any) {
      console.error('Firebase signup error:', error);
      
      
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
      
      const existingUsers = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
      if (existingUsers.find((u: any) => u.email === credentials.email)) {
        return {
          error: {
            code: 'auth/email-already-in-use',
            message: 'An account with this email already exists.'
          }
        };
      }

      
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
      await signOut(auth);
      this.currentUser = null;
      localStorage.removeItem('fleetfix_user');
      this.authStateListeners.forEach(callback => callback(null));
    } catch (error) {
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

  
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    
    callback(this.currentUser);
    
    
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


export const authService = new AuthenticationService();
export default authService;
