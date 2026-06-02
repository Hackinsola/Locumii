# Project Overview — Locumii

## What the Application Does

Locumii is a two-sided web marketplace that connects licensed Nigerian healthcare professionals (doctors, nurses, pharmacists, and medical laboratory scientists) with private clinics, hospitals, and diagnostic facilities that need verified staff to cover open shifts. Facilities post shifts with a defined role, date, time, and pay rate in Naira; professionals browse those shifts, submit a bid, and — if accepted — show up, confirm attendance via the app, complete the shift, and receive payment directly into their bank account via Paystack. The platform replaces the current informal system of WhatsApp messages and personal phone calls by handling credential storage, bid management, shift confirmation, and payment release in one place.

-----

## Goals

1. Allow any MDCN-licensed doctor, nurse, pharmacist, or medical laboratory scientist in Nigeria to create a verified profile and start bidding on shifts within 48 hours of signing up.
1. Allow any registered private clinic, hospital, or diagnostic facility to post a shift and receive qualified bids within 24 hours of posting.
1. Eliminate payment disputes between facilities and professionals by holding shift payments in escrow and releasing funds only after shift completion is confirmed by both parties.
1. Reduce facility reliance on informal WhatsApp-based locum recruitment by providing a faster, auditable alternative with credential verification built in.
1. Reach 200 verified professional profiles and 20 active registered facilities within the first 90 days of launch, starting in Abuja (FCT).
1. Generate platform revenue through a 10% commission on every shift payment processed, with a path to adding facility subscription tiers by Month 6.

-----

## Core User Flow

### Professional Flow

1. Professional visits the web app and selects “I am a Healthcare Professional.”
1. Professional creates an account with full name, phone number, email address, and password.
1. Professional completes their profile: specialty/role (doctor, nurse, pharmacist, or medical lab scientist), MDCN or relevant council registration number, years of experience, preferred work locations (states/cities), and a short bio.
1. Professional uploads required documents: MDCN/council license, NYSC discharge or exemption certificate, and a government-issued ID.
1. Platform admin reviews and approves documents within 48 hours; professional receives an SMS and email notification upon approval.
1. Professional browses the shift feed, filtered by city, role, and date.
1. Professional taps “Bid” on a shift, confirms availability, and submits.
1. Professional receives an SMS notification when a facility accepts or rejects the bid.
1. On the shift day, professional checks in via the app (location-based or facility digital signature).
1. After the shift, professional submits an invoice through the app.
1. Facility confirms the shift was completed.
1. Platform releases payment (minus 10% commission) to the professional’s linked bank account within 24 hours of confirmation.

### Facility Flow

1. Facility representative visits the web app and selects “I am a Healthcare Facility.”
1. Facility creates an account with facility name, address, facility type (clinic, hospital, pharmacy, diagnostic lab), CAC registration number, and contact person details.
1. Platform admin verifies the facility is real (manual check) within 48 hours; facility receives email confirmation.
1. Facility logs in and clicks “Post a Shift.”
1. Facility fills in shift details: role needed (e.g., Locum Doctor — General Practice), date, start time, end time, pay rate in Naira, and any special requirements (e.g., must have BLS certification).
1. Facility pays the shift amount plus 10% platform fee upfront via Paystack; funds are held in escrow.
1. Facility receives bids from verified professionals and views each bidder’s profile, credentials, and ratings.
1. Facility accepts one bid; all other bids are automatically declined and bidders are notified.
1. Facility receives an SMS reminder 2 hours before the shift starts.
1. After the shift, facility confirms completion in the app to trigger payment release to the professional.

-----

## Features

### Authentication & Profiles

- Email/password registration with role selection (Professional or Facility)
- Phone number capture for SMS notifications
- Profile pages for professionals: photo, specialty, registration number, experience, ratings from past shifts
- Profile pages for facilities: name, type, address, rating from professionals
- Password reset via email

### Credential Management

- Document upload (PDF or image) for MDCN/council license, NYSC certificate, and government ID
- Admin dashboard for manual document review and approval/rejection
- “Verified” badge displayed on professional profiles after approval
- Credential expiry tracking with automated renewal reminders via SMS

### Shift Marketplace

- Shift feed with filters: city, role type, date range, minimum pay rate
- Shift detail page: role, facility name, date/time, pay, special requirements, and facility rating
- Bid submission with one tap
- Bid management page for professionals: pending, accepted, rejected, completed
- Facility shift management: view all bids per shift, accept/reject individual bids
- Automatic cancellation of conflicting bids when one is accepted
- Double-booking prevention: system blocks a professional from bidding on overlapping shifts

### Payments (via Paystack)

- Facility pays shift fee + 10% commission upfront at time of posting
- Escrow holds funds until shift completion is confirmed
- Professional links a Nigerian bank account to their profile
- Funds disbursed to professional’s bank account within 24 hours of shift confirmation
- Earnings dashboard for professionals: total earned, pending, and completed payouts
- Transaction history for facilities: all posted shifts, total spend, payment status

### Notifications

- SMS alerts (via Termii or Twilio) for: document approval, bid accepted/rejected, shift reminder (2 hours before), payment released
- In-app notification feed for all platform events

### Ratings & Reviews

- After each completed shift, both parties leave a 1–5 star rating with an optional text comment
- Ratings are displayed publicly on both professional and facility profiles
- Professionals with ratings below 3.0 after 5+ shifts are flagged for admin review

### Admin Panel

- Queue for pending credential verification with approve/reject actions
- Queue for pending facility verification
- User management: view, suspend, or permanently ban accounts
- Transaction log: all payments processed, commissions earned, disputes flagged
- Basic dashboard: total users, total shifts posted, total shifts completed, total revenue

-----

## In Scope

- Web application accessible on mobile browsers and desktop (responsive design, no native app)
- Two user roles: Healthcare Professional and Healthcare Facility
- Four professional types: Medical Doctor, Nurse, Pharmacist, Medical Laboratory Scientist
- Manual credential verification by a platform admin (no automated OCR or third-party verification API)
- Shift posting, bidding, acceptance, check-in confirmation, and payment release
- Paystack integration for escrow, payment collection, and disbursement to Nigerian bank accounts
- SMS notifications via a Nigerian SMS gateway (Termii preferred)
- Star rating system for both professionals and facilities after each completed shift
- Admin panel for managing users, credentials, and transactions
- Launch geography: Abuja (FCT) first, with Lagos as second market in Phase 2

-----

## Out of Scope

- Native iOS or Android mobile application (MVP is web-only)
- Automated MDCN license verification via government API (not available)
- Telemedicine or remote/virtual shift types
- Permanent/full-time job placement (only per-shift locum work)
- In-app messaging or chat between professionals and facilities
- Payroll management or tax filing for professionals
- Integration with any existing Hospital Management System or EMR
- Support for international professionals or facilities outside Nigeria
- Speciality-specific features (e.g., anaesthesia equipment checklists, OT protocols)
- Shift scheduling for facilities’ internal permanent staff
- Insurance or indemnity coverage for professionals

-----

## Success Criteria

The MVP is considered complete and ready for public launch when all of the following are true:

1. **Registration works end-to-end:** A professional can sign up, upload documents, get approved, and have a visible “Verified” badge on their profile — tested with 5 real users.
1. **Shift posting works end-to-end:** A facility can register, post a shift with a Paystack payment, receive bids, accept one, and have all other bidders auto-notified — tested with 2 real facilities.
1. **Payment flow is complete:** After shift confirmation by both parties, funds are released to the professional’s bank account with the 10% commission correctly deducted — tested with live Paystack transactions.
1. **No double-booking is possible:** System correctly blocks a professional from holding two overlapping accepted shifts.
1. **SMS notifications fire correctly** for document approval, bid acceptance, and payment release — tested across MTN, Airtel, and Glo numbers.
1. **Admin panel is functional:** Admin can approve/reject credentials, suspend accounts, and view a transaction log without accessing the database directly.
1. **Mobile browser usability:** All core flows (browse shifts, bid, post shift, confirm completion) are usable on a standard Android phone on a 4G connection without layout breakage.
1. **10 completed shifts processed** through the platform end-to-end with real money before public marketing begins.