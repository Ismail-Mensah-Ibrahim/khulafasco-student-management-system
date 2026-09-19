# Khulafasco SMS — Official School Email Templates

These templates provide high-fidelity, school-branded email notifications for **Alkhulafau Arrashiduun Islamic Senior High School (Khulafasco)**.

## Brand Tokens Used
- **Primary Color:** `#6B1A2A` (Rich Burgundy / Maroon)
- **Secondary Accent:** `#C4956A` (Warm Rose Gold)
- **School Crest:** `https://khulafasco-sms.vercel.app/school-logo.png`
- **School Motto:** *"We Will Never Forget The Ladder"*

---

## Templates Included

1. **`email-confirmation.html`**
   - **Purpose:** Sent when a new staff member registers or requires email confirmation.
   - **Supabase Subject:** `Verify Your Email | Khulafasco Student Management System`
   - **Target Setting in Supabase:** `Authentication` → `Email Templates` → `Confirm signup`

2. **`staff-invite.html`**
   - **Purpose:** Sent when an Administrator invites a new staff member from the Staff Management view.
   - **Supabase Subject:** `Staff Account Invitation | Khulafasco SMS`
   - **Target Setting in Supabase:** `Authentication` → `Email Templates` → `Invite user`

3. **`password-recovery.html`**
   - **Purpose:** Sent when a staff member requests a password reset link.
   - **Supabase Subject:** `Password Reset Request | Khulafasco SMS`
   - **Target Setting in Supabase:** `Authentication` → `Email Templates` → `Reset password`

4. **`magic-link.html`**
   - **Purpose:** Sent when a staff member requests a passwordless magic login link.
   - **Supabase Subject:** `Your Secure Login Link | Khulafasco SMS`
   - **Target Setting in Supabase:** `Authentication` → `Email Templates` → `Magic link`

5. **`email-change.html`**
   - **Purpose:** Sent when a staff member's email address is being updated.
   - **Supabase Subject:** `Confirm Email Address Change | Khulafasco SMS`
   - **Target Setting in Supabase:** `Authentication` → `Email Templates` → `Change email address`

---

## How Email Confirmation Flow Works

1. Supabase sends the branded email containing the action button linking to `{{ .ConfirmationURL }}`.
2. The user clicks the button, which routes to `https://khulafasco-sms.vercel.app/auth/confirm?token_hash=...&type=signup` (or local development equivalent).
3. The Next.js handler (`src/app/auth/confirm/route.ts`):
   - Verifies the OTP token with Supabase Auth.
   - Automatically writes an `EMAIL_CONFIRMED` event into `public.audit_logs`.
   - Cleanses the session and redirects the user to `/login?verified=true`.
4. The Staff Sign-In page displays a confirmation alert:
   > **✓ Email Confirmed Successfully!**  
   > Your Khulafasco staff account is confirmed and active. Enter your password below to sign in.

---

## Applying in Supabase Dashboard

1. Open your **Supabase Dashboard**: [https://supabase.com/dashboard/project/uscveouabdtcyxlitiyo/auth/templates](https://supabase.com/dashboard/project/uscveouabdtcyxlitiyo/auth/templates)
2. Under **Email Templates**:
   - For **Confirm signup**: Set subject to `Verify Your Email | Khulafasco Student Management System` and paste the contents of `email-confirmation.html`.
   - For **Invite user**: Set subject to `Staff Account Invitation | Khulafasco SMS` and paste `staff-invite.html`.
   - For **Reset password**: Set subject to `Password Reset Request | Khulafasco SMS` and paste `password-recovery.html`.
   - For **Magic link**: Set subject to `Your Secure Login Link | Khulafasco SMS` and paste `magic-link.html`.
   - For **Change email address**: Set subject to `Confirm Email Address Change | Khulafasco SMS` and paste `email-change.html`.
3. Click **Save** on each template.
