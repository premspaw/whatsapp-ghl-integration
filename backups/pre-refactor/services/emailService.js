const EventEmitter = require('events');
const nodemailer = require('nodemailer');

class EmailService extends EventEmitter {
  constructor() {
    super();
    this.isReady = false;
    this.transporter = null;
    this.config = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };
  }

  async initialize() {
    try {
      if (!this.isConfigured()) {
        console.log('📧 Email service not configured - running in mock mode');
        this.isReady = true; // Allow service to work without real email
        return;
      }

      this.transporter = nodemailer.createTransporter(this.config);
      
      // Verify connection
      await this.transporter.verify();
      this.isReady = true;
      console.log('✅ Email service initialized');
      this.emit('ready');
    } catch (error) {
      console.error('❌ Error initializing email service:', error.message);
      console.log('📧 Email service will run in mock mode');
      this.isReady = true; // Allow service to work without real email
    }
  }

  async sendEmail(to, subject, text, html = null) {
    if (!this.isReady) {
      throw new Error('Email service is not ready');
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || this.config.auth.user,
        to: to,
        subject: subject,
        text: text,
        html: html || text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async receiveEmail(emailData) {
    // This would be called by a webhook or email parser
    const message = {
      id: emailData.id || `email_${Date.now()}`,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.text || emailData.html,
      timestamp: Date.now(),
      type: 'email'
    };

    this.emit('message', message);
  }

  async sendReply(to, subject, text, html = null, inReplyTo = null) {
    if (!this.isReady) {
      throw new Error('Email service is not ready');
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || this.config.auth.user,
        to: to,
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        text: text,
        html: html || text,
        inReplyTo: inReplyTo,
        references: inReplyTo
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email reply sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email reply:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isConfigured: this.isConfigured()
    };
  }

  isConfigured() {
    return !!(
      this.config.host &&
      this.config.auth.user &&
      this.config.auth.pass
    );
  }
}

module.exports = EmailService;
