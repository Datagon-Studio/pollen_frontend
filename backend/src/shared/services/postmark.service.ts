/**
 * Postmark Email Service
 * 
 * Handles sending emails via Postmark API
 */

interface PostmarkEmailResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

interface PostmarkBatchEmailResponse {
  ErrorCode: number;
  Message: string;
  MessageID?: string;
  SubmittedAt?: string;
  To?: string;
}

class PostmarkService {
  private apiToken: string;
  private baseUrl = 'https://api.postmarkapp.com';
  private fromEmail: string;
  private messageStream: string;

  constructor() {
    this.apiToken = process.env.POSTMARK_API_TOKEN || '';
    this.fromEmail = process.env.POSTMARK_FROM_EMAIL || '';
    this.messageStream = process.env.POSTMARK_MESSAGE_STREAM || 'outbound';
    
    if (!this.apiToken) {
      console.error('❌ CRITICAL: POSTMARK_API_TOKEN not set in environment variables!');
    }
    if (!this.fromEmail) {
      console.error('❌ CRITICAL: POSTMARK_FROM_EMAIL not set in environment variables!');
    }
  }

  /**
   * Send a single email via Postmark
   * @param to Recipient email address
   * @param subject Email subject
   * @param htmlBody HTML email body
   * @param textBody Plain text email body (optional)
   * @param tag Optional tag for tracking
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
    tag?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('📧 [Postmark] Sending email to:', to);
    
    if (!this.apiToken) {
      console.error('❌ [Postmark] API token not configured');
      return {
        success: false,
        error: 'Postmark API token not configured',
      };
    }

    if (!this.fromEmail) {
      console.error('❌ [Postmark] From email not configured');
      return {
        success: false,
        error: 'Postmark from email not configured',
      };
    }

    const requestBody: Record<string, string> = {
      From: this.fromEmail,
      To: to,
      Subject: subject,
      HtmlBody: htmlBody,
      MessageStream: this.messageStream,
    };

    if (textBody) {
      requestBody.TextBody = textBody;
    }

    if (tag) {
      requestBody.Tag = tag;
    }

    const endpoint = `${this.baseUrl}/email`;
    console.log('📤 [Postmark] Sending email:', { to, subject, tag });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('📧 [Postmark] Response Status:', response.status);
      console.log('📧 [Postmark] Response Text:', responseText);

      let data: PostmarkEmailResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Postmark response:', responseText);
        return {
          success: false,
          error: `Invalid response from Postmark: ${responseText.substring(0, 100)}`,
        };
      }

      // Postmark returns ErrorCode 0 for success
      if (data.ErrorCode === 0) {
        console.log('✅ [Postmark] Email sent successfully:', data.MessageID);
        return {
          success: true,
          messageId: data.MessageID,
        };
      }

      const errorMessage = data.Message || `Failed to send email (ErrorCode: ${data.ErrorCode})`;
      console.error('❌ [Postmark] Email Error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      console.error('❌ [Postmark] Network Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Send batch emails via Postmark
   * @param emails Array of email objects
   */
  async sendBatchEmails(
    emails: Array<{
      To: string;
      Subject: string;
      HtmlBody: string;
      TextBody?: string;
      Tag?: string;
    }>
  ): Promise<{ success: boolean; results?: Array<{ success: boolean; to: string; messageId?: string; error?: string }>; error?: string }> {
    console.log('📧 [Postmark] Sending batch emails:', emails.length);
    
    if (!this.apiToken) {
      return {
        success: false,
        error: 'Postmark API token not configured',
      };
    }

    if (!this.fromEmail) {
      return {
        success: false,
        error: 'Postmark from email not configured',
      };
    }

    const requestBody = emails.map(email => ({
      From: this.fromEmail,
      To: email.To,
      Subject: email.Subject,
      HtmlBody: email.HtmlBody,
      TextBody: email.TextBody || '',
      Tag: email.Tag || 'batch',
      MessageStream: this.messageStream,
    }));

    const endpoint = `${this.baseUrl}/email/batch`;
    console.log('📤 [Postmark] Sending batch emails');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('📧 [Postmark] Batch Response Status:', response.status);

      let data: PostmarkBatchEmailResponse[];
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Postmark batch response:', responseText);
        return {
          success: false,
          error: `Invalid response from Postmark: ${responseText.substring(0, 100)}`,
        };
      }

      const results = data.map((result, index) => ({
        success: result.ErrorCode === 0,
        to: emails[index].To,
        messageId: result.MessageID,
        error: result.ErrorCode !== 0 ? result.Message : undefined,
      }));

      const allSuccess = results.every(r => r.success);
      console.log(`📧 [Postmark] Batch emails: ${results.filter(r => r.success).length}/${results.length} sent successfully`);

      return {
        success: allSuccess,
        results,
      };
    } catch (error) {
      console.error('❌ [Postmark] Batch Network Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

export const postmarkService = new PostmarkService();
