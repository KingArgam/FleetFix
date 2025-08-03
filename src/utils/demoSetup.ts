// Demo user setup for FleetFix
// This script helps create demo credentials in Firebase

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const createDemoUser = async () => {
  try {
    console.log('Creating demo user...');
    
    const demoCredentials = {
      email: 'demo@fleetfix.com',
      password: 'demo123',
      name: 'Demo User',
      companyName: 'FleetFix Demo Company'
    };

    // Create the user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      demoCredentials.email,
      demoCredentials.password
    );

    // Add user data to Firestore
    const userData = {
      id: userCredential.user.uid,
      email: demoCredentials.email,
      name: demoCredentials.name,
      role: 'admin',
      companyId: 'fleetfix-demo',
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

    console.log('Demo user created successfully!');
    console.log('Email: demo@fleetfix.com');
    console.log('Password: demo123');
    
    return { success: true, user: userData };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Demo user already exists, that\'s fine!');
      return { success: true, message: 'Demo user already exists' };
    }
    
    console.error('Error creating demo user:', error);
    return { success: false, error: error.message };
  }
};

export const testDemoLogin = async () => {
  try {
    console.log('Testing demo login...');
    
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'demo@fleetfix.com',
      'demo123'
    );

    console.log('Demo login successful!');
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Demo login failed:', error);
    return { success: false, error: error.message };
  }
};

// Function to call from browser console
(window as any).createDemoUser = createDemoUser;
(window as any).testDemoLogin = testDemoLogin;
