import { EmailData, NotificationPreferences } from '../types';

export interface EmailServiceConfig {
  sendgridApiKey?: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private static instance: EmailService;
  private config: EmailServiceConfig;

  private constructor() {
    this.config = {
      sendgridApiKey: process.env.REACT_APP_SENDGRID_API_KEY,
      fromEmail: process.env.REACT_APP_FROM_EMAIL || 'noreply@oculynx.com',
      fromName: process.env.REACT_APP_FROM_NAME || 'Oculynx Fleet Management'
    };
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async sendMaintenanceReminder(
    to: string,
    vehicleInfo: { make: string; model: string; year: number; vin: string },
    maintenanceType: string,
    dueDate: Date
  ): Promise<boolean> {
    if (!this.config.sendgridApiKey) {
      console.log('EmailService: Simulating maintenance reminder email');
      console.log(`To: ${to}`);
      console.log(`Vehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`);
      console.log(`Maintenance: ${maintenanceType}`);
      console.log(`Due: ${dueDate.toLocaleDateString()}`);
      return true;
    }

    const emailData: EmailData = {
      to,
      subject: `Maintenance Reminder: ${maintenanceType} Due`,
      html: this.generateMaintenanceReminderHtml(vehicleInfo, maintenanceType, dueDate),
      text: this.generateMaintenanceReminderText(vehicleInfo, maintenanceType, dueDate)
    };

    return this.sendEmail(emailData);
  }

  public async sendMaintenanceCompleteNotification(
    to: string,
    vehicleInfo: { make: string; model: string; year: number; vin: string },
    maintenanceType: string,
    completedBy: string,
    completionDate: Date,
    cost?: number
  ): Promise<boolean> {
    if (!this.config.sendgridApiKey) {
      console.log('EmailService: Simulating maintenance completion email');
      console.log(`To: ${to}`);
      console.log(`Vehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`);
      console.log(`Completed: ${maintenanceType} by ${completedBy}`);
      return true;
    }

    const emailData: EmailData = {
      to,
      subject: `Maintenance Completed: ${maintenanceType}`,
      html: this.generateMaintenanceCompleteHtml(vehicleInfo, maintenanceType, completedBy, completionDate, cost),
      text: this.generateMaintenanceCompleteText(vehicleInfo, maintenanceType, completedBy, completionDate, cost)
    };

    return this.sendEmail(emailData);
  }

  public async sendLowInventoryAlert(
    to: string,
    partName: string,
    currentLevel: number,
    minLevel: number,
    location?: string
  ): Promise<boolean> {
    if (!this.config.sendgridApiKey) {
      console.log('EmailService: Simulating low inventory alert');
      console.log(`To: ${to}`);
      console.log(`Part: ${partName} (${currentLevel}/${minLevel})`);
      return true;
    }

    const emailData: EmailData = {
      to,
      subject: `Low Inventory Alert: ${partName}`,
      html: this.generateLowInventoryHtml(partName, currentLevel, minLevel, location),
      text: this.generateLowInventoryText(partName, currentLevel, minLevel, location)
    };

    return this.sendEmail(emailData);
  }

  public async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    if (!this.config.sendgridApiKey) {
      console.log('EmailService: Simulating welcome email');
      console.log(`To: ${to}, Name: ${userName}`);
      return true;
    }

    const emailData: EmailData = {
      to,
      subject: 'Welcome to Oculynx Fleet Management',
      html: this.generateWelcomeHtml(userName),
      text: this.generateWelcomeText(userName)
    };

    return this.sendEmail(emailData);
  }

  private async sendEmail(emailData: EmailData): Promise<boolean> {
    if (!this.config.sendgridApiKey) {
      return false;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: emailData.to }]
          }],
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName
          },
          subject: emailData.subject,
          content: [
            {
              type: 'text/html',
              value: emailData.html
            },
            {
              type: 'text/plain',
              value: emailData.text
            }
          ]
        })
      });

      if (response.ok) {
        console.log('Email sent successfully');
        return true;
      } else {
        console.error('Failed to send email:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private generateMaintenanceReminderHtml(
    vehicle: { make: string; model: string; year: number; vin: string },
    maintenanceType: string,
    dueDate: Date
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Maintenance Reminder</h2>
        <p>Dear Fleet Manager,</p>
        <p>This is a reminder that maintenance is due for one of your vehicles:</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Vehicle Information</h3>
          <p><strong>Vehicle:</strong> ${vehicle.year} ${vehicle.make} ${vehicle.model}</p>
          <p><strong>VIN:</strong> ${vehicle.vin}</p>
          <p><strong>Maintenance Type:</strong> ${maintenanceType}</p>
          <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
        </div>
        <p>Please schedule this maintenance as soon as possible to ensure optimal vehicle performance and safety.</p>
        <p>Best regards,<br>Your Oculynx Fleet Management System</p>
      </div>
    `;
  }

  private generateMaintenanceReminderText(
    vehicle: { make: string; model: string; year: number; vin: string },
    maintenanceType: string,
    dueDate: Date
  ): string {
    return `
Maintenance Reminder

Dear Fleet Manager,

This is a reminder that maintenance is due for one of your vehicles:

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
VIN: ${vehicle.vin}
Maintenance Type: ${maintenanceType}
Due Date: ${dueDate.toLocaleDateString()}

Please schedule this maintenance as soon as possible to ensure optimal vehicle performance and safety.

Best regards,
Your Oculynx Fleet Management System
    `.trim();
  }

  private generateMaintenanceCompleteHtml(
    vehicle: { make: string; model: string; year: number; vin: string },
    maintenanceType: string,
    completedBy: string,
    completionDate: Date,
    cost?: number
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Maintenance Completed</h2>
        <p>Dear Fleet Manager,</p>
        <p>Maintenance has been completed for one of your vehicles:</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Maintenance Details</h3>
          <p><strong>Vehicle:</strong> ${vehicle.year} ${vehicle.make} ${vehicle.model}</p>
          <p><strong>VIN:</strong> ${vehicle.vin}</p>
          <p><strong>Service:</strong> ${maintenanceType}</p>
          <p><strong>Completed By:</strong> ${completedBy}</p>
          <p><strong>Date:</strong> ${completionDate.toLocaleDateString()}</p>
          ${cost ? `<p><strong>Cost:</strong> $${cost.toFixed(2)}</p>` : ''}
        </div>
        <p>Your vehicle is now ready for service.</p>
        <p>Best regards,<br>Your Oculynx Fleet Management System</p>
      </div>
    `;
  }

  private generateMaintenanceCompleteText(
    vehicle: { make: string; model: string; year: number; vin: string },
    maintenanceType: string,
    completedBy: string,
    completionDate: Date,
    cost?: number
  ): string {
    return `
Maintenance Completed

Dear Fleet Manager,

Maintenance has been completed for one of your vehicles:

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
VIN: ${vehicle.vin}
Service: ${maintenanceType}
Completed By: ${completedBy}
Date: ${completionDate.toLocaleDateString()}
${cost ? `Cost: $${cost.toFixed(2)}` : ''}

Your vehicle is now ready for service.

Best regards,
Your Oculynx Fleet Management System
    `.trim();
  }

  private generateLowInventoryHtml(
    partName: string,
    currentLevel: number,
    minLevel: number,
    location?: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Low Inventory Alert</h2>
        <p>Dear Inventory Manager,</p>
        <p>The following part has reached a low inventory level:</p>
        <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">Inventory Alert</h3>
          <p><strong>Part:</strong> ${partName}</p>
          <p><strong>Current Level:</strong> ${currentLevel}</p>
          <p><strong>Minimum Level:</strong> ${minLevel}</p>
          ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
        </div>
        <p>Please consider reordering this part to maintain adequate inventory levels.</p>
        <p>Best regards,<br>Your Oculynx Fleet Management System</p>
      </div>
    `;
  }

  private generateLowInventoryText(
    partName: string,
    currentLevel: number,
    minLevel: number,
    location?: string
  ): string {
    return `
Low Inventory Alert

Dear Inventory Manager,

The following part has reached a low inventory level:

Part: ${partName}
Current Level: ${currentLevel}
Minimum Level: ${minLevel}
${location ? `Location: ${location}` : ''}

Please consider reordering this part to maintain adequate inventory levels.

Best regards,
Your Oculynx Fleet Management System
    `.trim();
  }

  private generateWelcomeHtml(userName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Welcome to Oculynx Fleet Management</h2>
        <p>Dear ${userName},</p>
        <p>Welcome to Oculynx Fleet Management! Your account has been successfully created.</p>
        <div style="background: #e7f3ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Getting Started</h3>
          <ul>
            <li>Add your vehicles to the fleet</li>
            <li>Set up maintenance schedules</li>
            <li>Manage your parts inventory</li>
            <li>View analytics and reports</li>
          </ul>
        </div>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The Oculynx Team</p>
      </div>
    `;
  }

  private generateWelcomeText(userName: string): string {
    return `
Welcome to Oculynx Fleet Management

Dear ${userName},

Welcome to Oculynx Fleet Management! Your account has been successfully created.

Getting Started:
- Add your vehicles to the fleet
- Set up maintenance schedules
- Manage your parts inventory
- View analytics and reports

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Oculynx Team
    `.trim();
  }
}
