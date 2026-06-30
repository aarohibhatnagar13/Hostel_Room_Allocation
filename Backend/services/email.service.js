import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables directly from the backend folder
dotenv.config();

// Transporter strictly uses your Environment Variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendVerificationEmail = async (toEmail, token) => {
    // STRICT DECOUPLING: Always pull from the .env file.
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (!frontendUrl) {
        console.error("CRITICAL: FRONTEND_URL is missing from .env file!");
        throw new Error("Server configuration error: FRONTEND_URL missing");
    }

    // Generate the dynamic verification link
    const verifyLink = `${frontendUrl}/verify?token=${token}`;
    
    const mailOptions = {
        from: `"Hostel Allocation System" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Verify your Hostel Allocation Account',
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2c3e50;">Welcome to the Hostel Allocation System</h2>
                <p>Please verify your email address to activate your account and start submitting your room preferences.</p>
                <div style="margin: 30px 0;">
                    <a href="${verifyLink}" style="padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
                </div>
                <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #3498db; word-break: break-all;">${verifyLink}</p>
                <p style="font-size: 12px; color: #999;">This link will expire in 15 minutes.</p>
            </div>
        `
    };

    // Sends the email safely
    await transporter.sendMail(mailOptions); 
};

export const sendPasswordResetEmail = async (toEmail, token) => {
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (!frontendUrl) {
        console.error("CRITICAL: FRONTEND_URL is missing from .env file!");
        throw new Error("Server configuration error: FRONTEND_URL missing");
    }

    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    
    const mailOptions = {
        from: `"Hostel Allocation System" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #e67e22;">Password Reset Request</h2>
                <p>We received a request to reset your password for the Hostel Allocation System.</p>
                <div style="margin: 30px 0;">
                    <a href="${resetLink}" style="padding: 12px 24px; background-color: #e67e22; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
                <p style="font-size: 12px; color: #999;">This link will expire in 15 minutes.</p>
            </div>
        `
    };

    console.log(`Sending Password Reset Email to -> ${toEmail}`);
    
    // Sends the email safely
    await transporter.sendMail(mailOptions); 
};