import { EmailClient } from '@azure/communication-email';
import { env } from 'env';

const connectionString = env.COMMUNICATION_SERVICES_CONNECTION_STRING
const senderAddress = env.SENDER_ADDRESS
const emailClient = new EmailClient(connectionString);

/**
 * Sends an email using Azure Communication Services.
 * @param to - The recipient's email address.
 * @param subject - The subject line of the email.
 * @param htmlContent - The HTML body of the email.
 */ 
export async function sendEmail(to: string, subject: string, htmlContent: string) {
    if (!emailClient) {
        throw new Error("Email client is not initialized. Check your connection string.");
    }

    const message = {
        senderAddress: senderAddress,
        content: {
            subject: subject,
            html: htmlContent,
        },
        recipients: {
            to: [{ address: to }],
        }
    };

    const poller = await emailClient.beginSend(message);
    await poller.pollUntilDone();
}

// brand colors 
const brandColors = {
    primary: '#D9A5A5',
    light: '#F9EEEE',    
    dark: '#333333',     
    white: '#FFFFFF'
};

/**
 * Generates the HTML for the verification email
 * @param url - The verification URL
 * @returns HTML string
 */
export function getVerificationEmailHtml(url: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.light};">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.light}; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="padding: 40px 0; border-bottom: 1px solid #f0f0f0;">
                            <h1 style="margin: 0; color: ${brandColors.primary}; font-size: 32px; font-weight: bold;">LocaLoco</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; color: ${brandColors.dark}; font-size: 16px; line-height: 1.6;">
                            <h2 style="margin-top: 0; color: ${brandColors.dark}; font-size: 24px;">Welcome to LocaLoco!</h2>
                            <p style="margin-bottom: 25px;">Thanks for signing up! We're excited to have you join our community. Please click the button below to verify your email address and get started.</p>
                            <table border="0" cellspacing="0" cellpadding="0" align="center">
                                <tr>
                                    <td align="center" style="background-color: ${brandColors.primary}; border-radius: 5px;">
                                        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: ${brandColors.primary}; color: ${brandColors.white}; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 5px;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #FAFAFA; border-top: 1px solid #f0f0f0; color: #999; font-size: 12px;">
                            <p style="margin: 0 0 10px 0;">You received this email because you signed up for an account on LocaLoco.</p>
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} LocaLoco. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Generates the HTML for the password reset email
 * @param url - The password reset URL
 * @param user - The user object (must contain at least 'email')
 * @returns HTML string
 */
export function getResetPasswordEmailHtml(url: string, user: { email: string }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.light};">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.light}; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="padding: 40px 0; border-bottom: 1px solid #f0f0f0;">
                            <h1 style="margin: 0; color: ${brandColors.primary}; font-size: 32px; font-weight: bold;">LocaLoco</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; color: ${brandColors.dark}; font-size: 16px; line-height: 1.6;">
                            <h2 style="margin-top: 0; color: ${brandColors.dark}; font-size: 24px;">Password Reset Request</h2>
                            <p style="margin-bottom: 25px;">
                                Hi there,
                                <br><br>
                                We received a request to reset the password for your LocaLoco account (${user.email}). If this was you, click the button below to set a new password.
                            </p>
                            <table border="0" cellspacing="0" cellpadding="0" align="center">
                                <tr>
                                    <td align="center" style="background-color: ${brandColors.primary}; border-radius: 5px;">
                                        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: ${brandColors.primary}; color: ${brandColors.white}; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 5px;">
                                            Reset Your Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin-top: 25px; font-size: 14px; color: #777;">
                                If you did not request a password reset, please ignore this email. Your password will not be changed.
                                <br><br>
                                This link will expire in 1 hour.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #FAFAFA; border-top: 1px solid #f0f0f0; color: #999; font-size: 12px;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} LocaLoco. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function generateWelcomeEmail ():string {
    return ``
}

export function generateNotificationEmail ():string {
    return ``
}

/**
 * Generates the HTML for the "New Business Listing Created" confirmation email.
 * @param business - The business object
 * @returns HTML string
 */
export function generateNewBusinessListingEmail(business: { uen: string, businessName: string, businessCategory: string, address: string }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Listing is Live!</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .details { background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin-top: 20px; }
        .details p { margin: 10px 0; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.light};">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.light}; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="padding: 40px 0; border-bottom: 1px solid #f0f0f0;">
                            <h1 style="margin: 0; color: ${brandColors.primary}; font-size: 32px; font-weight: bold;">LocaLoco</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; color: ${brandColors.dark}; font-size: 16px; line-height: 1.6;">
                            <h2 style="margin-top: 0; color: ${brandColors.dark}; font-size: 24px;">Congratulations! Your Listing is Live!</h2>
                            <p style="margin-bottom: 25px;">
                                Your business listing for <strong>${business.businessName}</strong> is now live on LocaLoco and visible to all users.
                            </p>
                            
                            <div class="details" style="background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin-top: 20px;">
                                <p style="margin: 10px 0;"><strong>UEN:</strong> ${business.uen}</p>
                                <p style="margin: 10px 0;"><strong>Category:</strong> ${business.businessCategory}</p>
                                <p style="margin: 10px 0;"><strong>Address:</strong> ${business.address}</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #FAFAFA; border-top: 1px solid #f0f0f0; color: #999; font-size: 12px;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} LocaLoco. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}