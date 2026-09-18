# Khulafasco SMS — Official Email Templates

These templates provide high-fidelity, school-branded email notifications for **Alkhulafau Arrashiduun Islamic Senior High School (Khulafasco)**.

## Brand Tokens Used
- **Primary Color:** `#6B1A2A` (Rich Burgundy / Maroon)
- **Secondary Accent:** `#C4956A` (Warm Rose Gold)
- **School Crest:** `https://khulafasco-sms-disci-net.vercel.app/school-logo.png`
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

---

## How Email Confirmation Flow Works

1. Supabase sends the branded email containing the action button linking to `{{ .ConfirmationURL }}`.
2. The user clicks the button, which routes to `https://khulafasco-sms-disci-net.vercel.app/auth/confirm?token_hash=...&type=signup`.
3. The Next.js handler (`src/app/auth/confirm/route.ts`):
   - Verifies the OTP token with Supabase Auth.
   - Automatically writes an `EMAIL_CONFIRMED` event into `public.audit_logs`.
   - Cleanses the session and redirects the user to `/login?verified=true`.
4. The Staff Sign-In page displays a confirmation alert:
   > **✓ Email Confirmed Successfully!**  
   > Your Khulafasco staff account is confirmed and active. Enter your password below to sign in.

---

## Applying to Supabase

1. Open your **Supabase Dashboard**: [https://supabase.com/dashboard/project/uscveouabdtcyxlitiyo](https://supabase.com/dashboard/project/uscveouabdtcyxlitiyo)
2. Navigate to **Authentication** → **Email Templates**.
3. Select **Confirm signup**:
   - Set Subject: `Verify Your Email | Khulafasco Student Management System`
   - Copy and paste the HTML content from [`email-confirmation.html`](./email-confirmation.html).
   - Click **Save**.
4. Repeat for **Invite user** using [`staff-invite.html`](./staff-invite.html) and **Reset password** using [`password-recovery.html`](./password-recovery.html).
