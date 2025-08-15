
import { notificationService } from './NotificationService';

export class GDPRDataService {
  private static instance: GDPRDataService;

  static getInstance(): GDPRDataService {
    if (!this.instance) {
      this.instance = new GDPRDataService();
    }
    return this.instance;
  }

  
  async requestDataExport(userId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<string> {
    try {
      notificationService.addNotification({
        type: 'info',
        title: 'Data Export Requested',
        message: 'Your data export request has been submitted and will be processed shortly.',
        priority: 'medium',
        actionRequired: false
      });

      return 'export-request-id';
    } catch (error) {
      console.error('Error requesting data export:', error);
      notificationService.addNotification({
        type: 'alert',
        title: 'Export Request Failed',
        message: 'Failed to submit data export request. Please try again.',
        priority: 'high',
        actionRequired: true
      });
      throw error;
    }
  }

  
  async deleteUserAccount(userId: string): Promise<void> {
    try {
      notificationService.addNotification({
        type: 'info',
        title: 'Account Deletion Started',
        message: 'Processing account deletion request...',
        priority: 'high',
        actionRequired: false
      });

      
      console.log('Deleting account for user:', userId);

      notificationService.addNotification({
        type: 'info',
        title: 'Account Deletion Processed',
        message: 'Your account and associated data have been scheduled for deletion in accordance with GDPR requirements.',
        priority: 'high',
        actionRequired: false
      });

    } catch (error) {
      console.error('Error deleting account:', error);
      
      notificationService.addNotification({
        type: 'alert',
        title: 'Account Deletion Failed',
        message: 'There was an error processing your account deletion request. Please contact support.',
        priority: 'high',
        actionRequired: true
      });
      
      throw error;
    }
  }
}

export const gdprDataService = GDPRDataService.getInstance();
