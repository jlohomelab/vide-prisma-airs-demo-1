import type { RagDoc } from "./rag";

export const RAG_SEED_DOCS: RagDoc[] = [
  // ── HR ──────────────────────────────────────────────────────────────────────
  {
    path: "hr/pan-hr-policy.txt",
    title: "PAN HR Policy",
    folder: "hr",
    content: `PAN HR POLICY
Company: PAN Technologies Pte. Ltd.
Domain: pan.com
Effective Date: 1 January 2024

1. PROBATION PERIOD
All new employees are subject to a probation period of three (3) months from the date of commencement. During this period, either party may terminate employment with one (1) week's written notice. Upon successful completion of probation, the standard notice period applies.

2. WORKING HOURS
Standard working hours are Monday to Friday, 9:00 AM to 6:00 PM, with a one-hour lunch break. Flexible working arrangements may be approved by the line manager subject to business needs.

3. CODE OF CONDUCT
All PAN employees are expected to maintain professionalism, respect colleagues, and uphold the company's values of integrity, innovation, and inclusivity. Harassment, discrimination, and misconduct will result in disciplinary action up to and including termination.

4. NOTICE PERIOD
Confirmed employees are required to give one (1) month's written notice of resignation. The company reserves the right to require an employee to serve the full notice period or to accept payment in lieu.

5. PERFORMANCE REVIEW
Formal performance appraisals are conducted bi-annually (June and December). Employees are assessed on KPIs agreed at the start of each review cycle.

6. GRIEVANCE PROCEDURE
Employees with a workplace grievance should first raise it informally with their line manager. If unresolved, a formal grievance may be submitted to hr@pan.com. All grievances are handled confidentially.

For queries: hr@pan.com`,
  },
  {
    path: "hr/pan-leave-policy.txt",
    title: "PAN Leave Policy",
    folder: "hr",
    content: `PAN LEAVE POLICY
Company: PAN Technologies Pte. Ltd.
Effective Date: 1 January 2024

1. ANNUAL LEAVE
Full-time employees are entitled to eighteen (18) days of paid annual leave per calendar year. Leave entitlement is pro-rated for employees who join mid-year. Unused annual leave of up to five (5) days may be carried over to the following year; the remainder lapses on 31 December.

2. SICK LEAVE
Employees are entitled to fourteen (14) days of paid outpatient sick leave and sixty (60) days of paid hospitalisation leave per year. A medical certificate (MC) from a registered medical practitioner must be submitted for any sick leave taken.

3. PUBLIC HOLIDAYS
PAN observes all gazetted public holidays in Singapore. If a public holiday falls on a weekend, the following Monday is a substitute holiday.

4. MATERNITY LEAVE
Female employees who have served at least three (3) months are entitled to sixteen (16) weeks of paid maternity leave in accordance with the Child Development Co-Savings Act.

5. PATERNITY LEAVE
Male employees are entitled to two (2) weeks of paid paternity leave, to be taken within sixteen (16) weeks of the child's birth.

6. COMPASSIONATE LEAVE
Three (3) days of paid compassionate leave are granted upon the death of an immediate family member (spouse, child, parent, parent-in-law, sibling).

7. LEAVE APPLICATION
All leave must be applied in advance via the HR portal at hr.pan.com or by emailing hr@pan.com. Emergency leave should be notified to the line manager as soon as practicable.

For queries: hr@pan.com`,
  },

  // ── EXPENSE ─────────────────────────────────────────────────────────────────
  {
    path: "expense/pan-expense-policy.txt",
    title: "PAN Expense Policy",
    folder: "expense",
    content: `PAN EXPENSE POLICY
Company: PAN Technologies Pte. Ltd.
Effective Date: 1 January 2024

1. SCOPE
This policy covers all business expenses incurred by PAN employees while carrying out their official duties, including travel, accommodation, meals, and client entertainment.

2. APPROVAL THRESHOLDS
- Up to SGD 200: self-approved (claim with receipts)
- SGD 201 to SGD 1,000: line manager approval required
- Above SGD 1,000: Finance Director approval required

All expenses must be pre-approved where the amount can be anticipated in advance.

3. BUSINESS TRAVEL
Economy class air travel is the default for flights under five (5) hours. Business class may be approved by the Finance Director for flights exceeding five hours. Hotel accommodation should not exceed SGD 250 per night within Singapore and SGD 350 per night internationally, unless pre-approved.

4. MEALS AND ENTERTAINMENT
- Individual meal allowance: SGD 25 per meal (local), SGD 50 per meal (overseas)
- Client entertainment: up to SGD 80 per head; must state business purpose and attendees
- Alcohol may be claimed only during client entertainment, not for internal meals

5. NON-REIMBURSABLE ITEMS
The following will not be reimbursed: personal items, traffic fines, gym memberships, alcohol for personal consumption, and any expenses without valid receipts.

For queries: finance@pan.com`,
  },
  {
    path: "expense/pan-reimbursement-guide.txt",
    title: "PAN Expense Reimbursement Guide",
    folder: "expense",
    content: `PAN EXPENSE REIMBURSEMENT GUIDE
Company: PAN Technologies Pte. Ltd.
Last Updated: March 2024

HOW TO SUBMIT AN EXPENSE CLAIM

Step 1: Collect all original receipts. Digital receipts (PDFs or photos) are accepted if originals are unavailable.

Step 2: Log in to the Finance Portal at finance.pan.com using your PAN corporate credentials.

Step 3: Click "New Expense Claim" and complete the form:
  - Date of expense
  - Category (Travel / Meals / Accommodation / Other)
  - Amount and currency
  - Business purpose (required)
  - Project or cost centre code
  - Upload receipt image

Step 4: Submit for approval. You will receive an email confirmation. Track the status under "My Claims".

Step 5: Approved claims are processed in the next fortnightly payroll run. Reimbursements appear in your salary credit.

DEADLINES
Expense claims must be submitted within thirty (30) calendar days of the expense date. Claims submitted after this period require CFO approval and may be declined.

FOREIGN CURRENCY
Convert at the actual exchange rate shown on your receipt or bank statement. Attach exchange rate evidence if not printed on the receipt.

CONTACT
For reimbursement queries: finance@pan.com | Helpdesk ticket category: Finance > Expense Claims`,
  },

  // ── KNOWLEDGE BASE ───────────────────────────────────────────────────────────
  {
    path: "kb/pan-password-reset.txt",
    title: "How to Reset Your PAN Password",
    folder: "kb",
    content: `HOW TO RESET YOUR PAN ACCOUNT PASSWORD
IT Knowledge Base | PAN Technologies

SELF-SERVICE PASSWORD RESET

1. Open a browser and go to: https://accounts.pan.com/reset
2. Enter your PAN corporate email address (e.g. yourname@pan.com) and click "Send Reset Link".
3. Check your registered mobile number for a one-time passcode (OTP). Enter the OTP on the next screen.
4. Choose a new password. Requirements:
   - Minimum 12 characters
   - At least one uppercase letter, one lowercase letter, one number, and one special character
   - Cannot match any of your last five (5) passwords
5. Click "Set New Password". You will be redirected to the login page.

LOCKED ACCOUNT
If your account is locked after five (5) failed login attempts, please contact the IT Helpdesk:
  - Email: helpdesk@pan.com
  - Phone: +65 6123 4567 (ext. 100), Monday to Friday 8:30 AM – 6:30 PM
  - Helpdesk portal: https://helpdesk.pan.com (use guest access if locked out)

MFA ISSUES
If you have lost access to your authenticator app, contact helpdesk@pan.com with your employee ID for manual identity verification.

PASSWORD POLICY REMINDER
Passwords expire every ninety (90) days. You will receive a reminder email fourteen (14) days before expiry.`,
  },
  {
    path: "kb/pan-it-helpdesk.txt",
    title: "IT Helpdesk Guide",
    folder: "kb",
    content: `IT HELPDESK GUIDE
PAN Technologies — Internal IT Support

CONTACT INFORMATION
  Email:   helpdesk@pan.com
  Phone:   +65 6123 4567 (ext. 100)
  Portal:  https://helpdesk.pan.com
  Hours:   Monday – Friday, 8:30 AM – 6:30 PM (SGT)
           Emergency (P1) support available 24/7

HOW TO RAISE A TICKET
1. Log in to https://helpdesk.pan.com with your PAN credentials.
2. Click "New Request" and select the appropriate category:
   - Access & Accounts
   - Hardware & Devices
   - Software & Applications
   - Network & Connectivity
   - Finance Systems
   - Other
3. Describe the issue in detail, including error messages, screenshots, and steps to reproduce.
4. Set urgency level: Low / Medium / High / Critical.
5. Submit. You will receive a ticket number by email.

SERVICE LEVEL AGREEMENTS (SLA)
  Critical (P1 — service down):   Response within 1 hour, resolution within 4 hours
  High (P2 — major impact):        Response within 4 hours, resolution within 1 business day
  Medium (P3 — partial impact):    Response within 1 business day, resolution within 3 business days
  Low (P4 — minor/informational):  Response within 2 business days, resolution within 5 business days

COMMON REQUESTS
  - New laptop setup: submit 5 business days before start date
  - Software installation: requires line manager approval
  - VPN access: submit via Access & Accounts category with manager approval
  - Hardware fault: bring device to IT room (Level 3, Room 302) or raise a ticket for on-site visit`,
  },
];
