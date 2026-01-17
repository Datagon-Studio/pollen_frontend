# **Technical Requirements Document — PollenHive**

## **1\. Purpose**

This document defines the functional and technical requirements for **PollenHive**, a contribution management system designed to support:

* Donations  
* Sponsorships  
* Welfare contributions  
* Dues and fee collections

The system is built to serve **families, churches, associations, informal groups, and NGOs**, with features that support:

* Lightweight member CRM  
* Offline and online contribution tracking  
* Account-level KYC gating for payments  
* Expense transparency  
* Settlement tracking  
* Member trust through OTP-based access (no user accounts)

## **2\. Scope**

### **2.1 In Scope**

* Account onboarding and KYC workflow  
* Member onboarding and verification  
* Fund creation and management  
* Contribution recording (offline and online)  
* Expense recording and categorisation  
* Notification templates and delivery rules  
* Settlement tracking (fees, net amounts, status)  
* Public account page for viewing funds and making payments  
* Member transparency portal (OTP-based access)  
* Basic reporting and summaries

### **2.2 Out of Scope (MVP)**

* Full accounting or bookkeeping system  
* Inventory or asset management  
* Multi-currency FX engine  
* Advanced donor CRM automation  
* Complex approval workflows (future phase)

## **3\. Roles and Permissions**

### **3.1 Roles**

* **System Admin (Platform level)**  
   Manages platform-wide settings, integrations, compliance, and support.  
* **Account Owner / Admin**  
   Manages the account, funds, members, configurations, expenses, and visibility settings.  
* **Account Officer / Collector**  
   Records offline contributions, views member lists, and accesses limited reports.  
* **Member / Donor (Public User)**  
   Contributes to funds and views personal contribution history via OTP (no login).

### **3.2 Permission Rules (Examples)**

* Only Account Admins can configure payment integrations and settlement details  
* Only Account Admins can manage expense visibility and approval settings  
* Officers can record offline contributions but cannot alter settlements or configurations  
* Members have **read-only**, scoped access to their own records

## **4\. Data Model (Core Entities)**

### **4.1 Member**

* `member_id` (PK)  
* `full_name`  
* `dob`  
* `phone`  
* `phone_verified` (boolean)  
* `email` (nullable)  
* `email_verified` (boolean)  
* `membership_number` (unique per account, optional)  
* `account_id` (FK)  
* `created_at`, `updated_at`

### **4.2 Account**

* `account_id` (PK)  
* `account_name`  
* `kyc_status` (unverified, pending, verified, rejected)  
* `status` (active, inactive, suspended)  
* `created_at`, `updated_at`

### **4.3 Account Public Page**

* `public_page_id` (PK)  
* `account_id` (FK)  
* `url_slug` (unique)  
* `display_name`  
* `logo_url`  
* `primary_color`  
* `secondary_color`  
* `is_published` (boolean)  
* `created_at`, `updated_at`

### **4.4 Account KYC**

* `kyc_id` (PK)  
* `account_id` (FK)  
* `account_type` (individual, business)  
* `official_name`  
* `business_registration` (nullable)  
* `national_id`  
* `kyc_documents` (optional file references)  
* `verified_by`, `verified_at`  
* `created_at`, `updated_at`

### **4.5 Account Settlement Details**

* `settlement_id` (PK)  
* `account_id` (FK)  
* `settlement_type` ( mobile\_money)  
* `account_name`  
* `account_number`  
* `provider` (optional)  
* `is_active`  
* `created_at`, `updated_at`

### **4.6 Fund**

* `fund_id` (PK)  
* `account_id` (FK)  
* `fund_name`  
* `description`  
* `default_amount` (nullable)  
* `is_active`  
* `created_at`, `updated_at`

### **4.7 Contribution**

* `contribution_id` (PK)  
  `account_id` (FK)  
  `fund_id` (FK)  
* `member_id` (FK, nullable for anonymous donors if allowed)  
* `channel` (offline, online)  
* `amount`  
* `date_received`  
* `received_by_user_id` (nullable, offline only)  
* `comment`  
* `payment_reference` (nullable)  
* `status` (pending, confirmed, failed, reversed)  
* `created_at`, `updated_at`

### **4.8 Expense**

* `expense_id` (PK)  
* `account_id` (FK)  
* `expense_name`  
* `expense_category`  
* `date`  
* `amount`  
* `created_by_user_id`  
* `notes`  
* `member_visible` (boolean, optional)  
* `created_at`, `updated_at`

### **4.9 Configuration**

* `config_id` (PK)  
* `account_id` (FK)  
* `smtp_profile_id` (nullable)  
* `default_email_sender_id` (nullable)  
* `payment_integration_id` (nullable)  
* `birthday_messages_enabled` (boolean)  
* `sms_template`  
* `email_template`  
* `default_notification_channel` (sms, email, both)  
* `member_portal_enabled` (boolean)  
* `expense_visibility_level` (none, summary, detailed)  
* `created_at`, `updated_at`

### **4.10 Settlement**

* `settlement_txn_id` (PK)  
* `account_id` (FK)  
* `gross_amount`  
* `charge_amount`  
* `net_amount`  
* `settlement_date`  
* `status` (pending, processing, settled, failed)  
* `provider_reference`  
* `created_at`, `updated_at`

### **4.11 OTP Session (Member Access)**

* `otp_session_id` (PK)  
* `account_id` (FK)  
* `channel` (sms, email)  
* `destination` (phone or email)  
* `otp_hash`  
* `expires_at`  
* `attempt_count`  
* `status` (pending, verified, expired, locked)  
* `created_at`

## **5\. Core Business Rules**

### **5.1 KYC Gating**

* If `account.kyc_status ≠ verified`, online payments are disabled  
* Public pages remain visible, but payment actions are hidden

### **5.2 Offline Contributions**

* Must record `received_by_user_id` and `date_received`  
* Notifications optional but recommended

### **5.3 Online Contributions**

* Must store `payment_reference`  
* Status confirmed via webhook (Phase 2\) or simulated confirmation (MVP)

### **5.4 Fund Visibility**

* Only active funds (`is_active = true`) appear on public pages

### **5.5 Settlement Integrity**

* Settlements aggregate confirmed online contributions  
* Net amount \= gross amount – charges

## **6\. Key Workflows**

### **Account Onboarding**

1. Create account  
2. Configure public page (draft or published)  
3. Submit KYC  
4. Admin verifies KYC  
5. Enable payment and settlement details

### **Fund Management**

* Admin creates fund → sets defaults → publishes

### **Offline Contribution**

* Officer selects fund \+ member → enters details → system logs collector

### **Online Contribution**

* Member/donor selects fund → pays → system updates status → receipt sent

### **Expense Management**

* Admin records expenses → included in reports and summaries

### **Settlement**

* System groups contributions → applies charges → updates settlement status

## **7\. Settlement & Charges**

### **Supported Models**

* **Platform fee \+ provider fee**  
* **Provider fee only (subscription-based platform revenue)**

### **MVP Requirement**

* Charges must be configurable per account:  
  * `charge_type`: percentage | flat | hybrid  
  * `charge_value`: numeric

## **8\. Member Transparency Portal (OTP-Based)**

### **Objective**

Enable members to view their contribution history **without creating accounts or passwords**, using secure OTP verification.

### **Access Flow**

1. Member visits Account Public Page  
2. Selects “View My Contributions”  
3. Enters phone or email  
4. Receives OTP  
5. Gains temporary, read-only access

### **Member Data Access**

* Contribution totals (lifetime \+ recent)  
* Fund-level breakdown  
* Contribution list (date, amount, channel, status, notes)

### **Expense Visibility**

Controlled by admin configuration:

* None  
* Summary only (totals, net position)  
* Detailed (line items marked `member_visible = true`)

### **Session Rules**

* Session expires after inactivity (e.g. 15 minutes)  
* No edits or cross-account access allowed

## **9\. Reporting Requirements (MVP)**

* Contributions by fund and period  
* Member contribution history  
* Expense summaries by category/date  
* Net position per fund

## **10\. Non-Functional Requirements**

* Encryption at rest for sensitive data  
* OTP hashing and rate limiting  
* Audit logs for payments, settlements, and access  
* Scalable design (10k+ members per account)  
* Localization-ready (country codes, mobile money providers)

## **11\. Phased Delivery**

### **Phase 1 (MVP)**

* Accounts, members, funds  
* Offline contributions  
* Public fund pages  
* Expenses  
* Basic reports  
* OTP-based member access  
* Simulated notifications

### **Phase 2**

* Payment integrations & webhooks  
* Automated settlements  
* KYC document uploads  
* Downloadable statements  
* Reminders and notifications  
* Multi-language support

## **Architectural Note**

This design maintains a single source of truth for member and financial data while delivering transparency through temporary, scoped access, minimizing authentication complexity and security risk.