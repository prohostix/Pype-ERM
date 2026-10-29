import { sendBrandedStudentCredentials, sendBrandedFeeReceipt, sendEmail } from './emailService.js';
import {
  sendAdmissionConfirmationWhatsApp,
  sendFeeReceiptWhatsApp,
  sendPaymentReminderWhatsApp,
  sendLeadWelcomeWhatsApp
} from './whatsappService.js';

export type NotificationJob =
  | {
      type: 'STUDENT_CREDENTIALS';
      data: {
        to: string;
        recipientName: string;
        email: string;
        password?: string;
        userId?: string;
        loginUrl?: string;
        roleTitle?: string;
        organizationId: string;
        studentPhone?: string;
        programName?: string;
        admissionNo?: string;
      };
    }
  | {
      type: 'FEE_RECEIPT';
      data: {
        to?: string;
        recipientName: string;
        amount: string | number;
        receiptNo: string;
        paymentDate?: string;
        paymentMode?: string;
        balanceAmount?: string | number;
        organizationId: string;
        paymentId?: string;
        admissionNo?: string;
        programName?: string;
        studentPhone?: string;
      };
    }
  | {
      type: 'PAYMENT_REMINDER';
      data: {
        studentPhone: string;
        studentName: string;
        amount: number | string;
        dueDate: string;
        organizationId: string;
      };
    }
  | {
      type: 'LEAD_WELCOME';
      data: {
        studentPhone: string;
        studentName: string;
        organizationId: string;
      };
    }
  | {
      type: 'CUSTOM_EMAIL';
      data: {
        to: string;
        subject: string;
        text: string;
        html: string;
        organizationId?: string;
      };
    };

interface QueueItem {
  id: string;
  job: NotificationJob;
  retries: number;
  addedAt: Date;
}

class NotificationQueueManager {
  private queue: QueueItem[] = [];
  private activeWorkers = 0;
  private readonly maxConcurrency = 3;
  private readonly maxRetries = 1;

  /**
   * Enqueues a notification job and returns immediately (0ms blocking)
   */
  public enqueue(job: NotificationJob): void {
    const item: QueueItem = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      job,
      retries: 0,
      addedAt: new Date()
    };

    this.queue.push(item);
    console.log(`[NotificationQueue] 📥 Enqueued job ${item.id} (${job.type}). Queue length: ${this.queue.length}`);

    // Trigger worker asynchronously on next event loop tick
    setImmediate(() => this.processNext());
  }

  private async processNext(): Promise<void> {
    if (this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeWorkers++;

    try {
      console.log(`[NotificationQueue] ⚙️ Processing job ${item.id} (${item.job.type})...`);
      await this.executeJob(item.job);
      console.log(`[NotificationQueue] ✅ Job ${item.id} completed successfully.`);
    } catch (err: any) {
      console.error(`[NotificationQueue] ❌ Job ${item.id} failed:`, err?.message || err);

      // Simple retry mechanism for transient network hiccups
      if (item.retries < this.maxRetries) {
        item.retries++;
        console.log(`[NotificationQueue] 🔄 Re-enqueuing job ${item.id} (Retry ${item.retries}/${this.maxRetries}) in 2s...`);
        setTimeout(() => {
          this.queue.push(item);
          this.processNext();
        }, 2000);
      }
    } finally {
      this.activeWorkers--;
      // Continue draining queue
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  private async executeJob(job: NotificationJob): Promise<void> {
    const { recordCommunicationAudit } = await import('./communicationAudit.js');

    switch (job.type) {
      case 'STUDENT_CREDENTIALS': {
        const { data } = job;
        const promises: Promise<any>[] = [];

        // 1. Send credentials email
        if (data.to && data.password && data.password !== '(Existing student account)') {
          promises.push(
            (async () => {
              try {
                await sendBrandedStudentCredentials({
                  to: data.to,
                  recipientName: data.recipientName,
                  email: data.email,
                  password: data.password!,
                  userId: data.userId,
                  loginUrl: data.loginUrl,
                  roleTitle: data.roleTitle,
                  organizationId: data.organizationId
                });
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'email',
                  recipient: data.to,
                  recipientName: data.recipientName,
                  subject: 'Student Portal Access Credentials',
                  category: 'STUDENT_CREDENTIALS',
                  content: `Student credentials for ${data.recipientName} (ID: ${data.userId || data.admissionNo || 'Student'})`,
                  status: 'sent',
                  metadata: data
                });
              } catch (err: any) {
                console.error('[NotificationQueue] Email credentials dispatch error:', err?.message);
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'email',
                  recipient: data.to,
                  recipientName: data.recipientName,
                  subject: 'Student Portal Access Credentials',
                  category: 'STUDENT_CREDENTIALS',
                  content: `Student credentials for ${data.recipientName}`,
                  status: 'failed',
                  errorMessage: err?.message || 'Email delivery failed',
                  metadata: data
                });
              }
            })()
          );
        }

        // 2. Send WhatsApp admission confirmation if student phone exists
        if (data.studentPhone) {
          promises.push(
            (async () => {
              try {
                await sendAdmissionConfirmationWhatsApp({
                  studentPhone: data.studentPhone!,
                  studentName: data.recipientName,
                  programName: data.programName || 'Academic Program',
                  admissionNo: data.admissionNo || data.userId || 'Enrolled',
                  organizationId: data.organizationId
                });
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'whatsapp',
                  recipient: data.studentPhone,
                  recipientName: data.recipientName,
                  subject: 'Admission Confirmation (WhatsApp)',
                  category: 'STUDENT_CREDENTIALS',
                  content: `Admission confirmation to ${data.recipientName} for ${data.programName || 'Course'}`,
                  status: 'sent',
                  metadata: data
                });
              } catch (err: any) {
                console.error('[NotificationQueue] WhatsApp admission confirmation error:', err?.message);
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'whatsapp',
                  recipient: data.studentPhone,
                  recipientName: data.recipientName,
                  subject: 'Admission Confirmation (WhatsApp)',
                  category: 'STUDENT_CREDENTIALS',
                  content: `Admission confirmation to ${data.recipientName}`,
                  status: 'failed',
                  errorMessage: err?.message || 'WhatsApp message failed',
                  metadata: data
                });
              }
            })()
          );
        }

        await Promise.allSettled(promises);
        break;
      }

      case 'FEE_RECEIPT': {
        const { data } = job;
        const promises: Promise<any>[] = [];

        // 1. Send fee receipt email (generates & attaches exact BillReceiptPanel PDF)
        if (data.to) {
          promises.push(
            (async () => {
              try {
                await sendBrandedFeeReceipt({
                  to: data.to!,
                  recipientName: data.recipientName,
                  amount: data.amount,
                  receiptNo: data.receiptNo,
                  paymentDate: data.paymentDate,
                  paymentMode: data.paymentMode,
                  balanceAmount: data.balanceAmount,
                  organizationId: data.organizationId,
                  paymentId: data.paymentId,
                  admissionNo: data.admissionNo,
                  programName: data.programName
                });
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'email',
                  recipient: data.to,
                  recipientName: data.recipientName,
                  subject: `Fee Payment Receipt #${data.receiptNo}`,
                  category: 'FEE_RECEIPT',
                  content: `Payment receipt #${data.receiptNo} of ₹${data.amount} for ${data.recipientName}`,
                  status: 'sent',
                  metadata: data
                });
              } catch (err: any) {
                console.error('[NotificationQueue] Email fee receipt error:', err?.message);
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'email',
                  recipient: data.to,
                  recipientName: data.recipientName,
                  subject: `Fee Payment Receipt #${data.receiptNo}`,
                  category: 'FEE_RECEIPT',
                  content: `Payment receipt #${data.receiptNo} for ${data.recipientName}`,
                  status: 'failed',
                  errorMessage: err?.message || 'Email receipt failed',
                  metadata: data
                });
              }
            })()
          );
        }

        // 2. Send WhatsApp fee receipt (with document attachment & download link)
        if (data.studentPhone) {
          promises.push(
            (async () => {
              try {
                await sendFeeReceiptWhatsApp({
                  studentPhone: data.studentPhone!,
                  studentName: data.recipientName,
                  amount: data.amount,
                  receiptNo: data.receiptNo,
                  organizationId: data.organizationId,
                  paymentId: data.paymentId
                });
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'whatsapp',
                  recipient: data.studentPhone,
                  recipientName: data.recipientName,
                  subject: `Fee Receipt Notification #${data.receiptNo}`,
                  category: 'FEE_RECEIPT',
                  content: `Payment receipt #${data.receiptNo} of ₹${data.amount} sent via WhatsApp to ${data.recipientName}`,
                  status: 'sent',
                  metadata: data
                });
              } catch (err: any) {
                console.error('[NotificationQueue] WhatsApp fee receipt error:', err?.message);
                await recordCommunicationAudit({
                  organizationId: data.organizationId,
                  type: 'whatsapp',
                  recipient: data.studentPhone,
                  recipientName: data.recipientName,
                  subject: `Fee Receipt Notification #${data.receiptNo}`,
                  category: 'FEE_RECEIPT',
                  content: `Payment receipt #${data.receiptNo} via WhatsApp to ${data.recipientName}`,
                  status: 'failed',
                  errorMessage: err?.message || 'WhatsApp message failed',
                  metadata: data
                });
              }
            })()
          );
        }

        await Promise.allSettled(promises);
        break;
      }

      case 'PAYMENT_REMINDER': {
        try {
          await sendPaymentReminderWhatsApp(job.data);
          await recordCommunicationAudit({
            organizationId: job.data.organizationId,
            type: 'whatsapp',
            recipient: job.data.studentPhone,
            recipientName: job.data.studentName,
            subject: 'Fee Installment Reminder',
            category: 'PAYMENT_REMINDER',
            content: `Reminder for ${job.data.studentName} - Amount Due: ₹${job.data.amount}, Due Date: ${job.data.dueDate}`,
            status: 'sent',
            metadata: job.data
          });
        } catch (err: any) {
          console.error('[NotificationQueue] WhatsApp payment reminder error:', err?.message);
          await recordCommunicationAudit({
            organizationId: job.data.organizationId,
            type: 'whatsapp',
            recipient: job.data.studentPhone,
            recipientName: job.data.studentName,
            subject: 'Fee Installment Reminder',
            category: 'PAYMENT_REMINDER',
            content: `Reminder for ${job.data.studentName}`,
            status: 'failed',
            errorMessage: err?.message || 'WhatsApp reminder failed',
            metadata: job.data
          });
        }
        break;
      }

      case 'LEAD_WELCOME': {
        try {
          await sendLeadWelcomeWhatsApp(job.data);
          await recordCommunicationAudit({
            organizationId: job.data.organizationId,
            type: 'whatsapp',
            recipient: job.data.studentPhone,
            recipientName: job.data.studentName,
            subject: 'New Lead Inquiry Welcome',
            category: 'LEAD_WELCOME',
            content: `Welcome message to lead ${job.data.studentName}`,
            status: 'sent',
            metadata: job.data
          });
        } catch (err: any) {
          console.error('[NotificationQueue] WhatsApp lead welcome error:', err?.message);
          await recordCommunicationAudit({
            organizationId: job.data.organizationId,
            type: 'whatsapp',
            recipient: job.data.studentPhone,
            recipientName: job.data.studentName,
            subject: 'New Lead Inquiry Welcome',
            category: 'LEAD_WELCOME',
            content: `Welcome message to lead ${job.data.studentName}`,
            status: 'failed',
            errorMessage: err?.message || 'WhatsApp lead welcome failed',
            metadata: job.data
          });
        }
        break;
      }

      case 'CUSTOM_EMAIL': {
        const { to, subject, text, html, organizationId } = job.data;
        try {
          await sendEmail(to, subject, text, html, organizationId);
          await recordCommunicationAudit({
            organizationId: organizationId || '',
            type: 'email',
            recipient: to,
            subject,
            category: 'CUSTOM_EMAIL',
            content: text || subject,
            status: 'sent',
            metadata: job.data
          });
        } catch (err: any) {
          console.error('[NotificationQueue] Custom email error:', err?.message);
          await recordCommunicationAudit({
            organizationId: organizationId || '',
            type: 'email',
            recipient: to,
            subject,
            category: 'CUSTOM_EMAIL',
            content: text || subject,
            status: 'failed',
            errorMessage: err?.message || 'Custom email failed',
            metadata: job.data
          });
        }
        break;
      }

      default:
        console.warn('[NotificationQueue] Unknown job type received:', (job as any)?.type);
    }
  }
}

export const notificationQueue = new NotificationQueueManager();

/**
 * Global helper to dispatch background notifications with zero API delay
 */
export const enqueueNotification = (job: NotificationJob): void => {
  notificationQueue.enqueue(job);
};
