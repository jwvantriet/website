# Xano Database Schema — Carerix Cache Layer

## Overview

This document contains the complete database schema for creating a Carerix ATS caching layer in Xano. It includes 9 tables that mirror the key Carerix entities, plus sync tracking tables for incremental updates.

### Architecture

```
Carerix (GraphQL API) → Xano (Cache/Database) → Atoms Frontend (Website)
```

### Benefits
- **Faster page loads**: Read from Xano instead of Carerix directly
- **Reduced API calls**: Sync on schedule instead of per-request
- **Data enrichment**: Add custom fields not in Carerix
- **Offline resilience**: Website works even if Carerix is temporarily down

---

## Relationships Diagram

```
companies ──────┐
                ├──< vacancies (company_carerix_id)
                ├──< jobs (company_carerix_id)
                ├──< matches (company_carerix_id)
                └──< todos (company_carerix_id)

employees ──────┐
                ├──< jobs (employee_carerix_id)
                ├──< matches (employee_carerix_id)
                └──< todos (employee_carerix_id)

vacancies ──────┐
                ├──< publications (vacancy_carerix_id)
                ├──< jobs (vacancy_carerix_id)
                ├──< matches (vacancy_carerix_id)
                └──< todos (vacancy_carerix_id)

publications ───┤
                └──< matches (publication_carerix_id)

matches ────────┤
                ├──< jobs (match_carerix_id)
                └──< todos (match_carerix_id)

jobs ───────────┤
                └──< todos (job_carerix_id)
```

---

## Table 1: `sync_metadata`

**Purpose:** Tracks sync state per entity type for incremental updates

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | Xano primary key |
| entity_type | Text (unique, indexed) | e.g. "employees", "vacancies", "publications" |
| last_sync_timestamp | Timestamp | Last successful sync time |
| last_full_sync | Timestamp (nullable) | Last full (non-incremental) sync |
| records_synced | Integer, default 0 | Count from last sync |
| status | Text, default "idle" | "idle", "running", "success", "error" |
| error_message | Text (nullable) | Last error if any |
| created_at | Timestamp | Xano auto |
| updated_at | Timestamp | Xano auto |

**Initial data** — insert one row for each entity type:
- companies
- employees
- vacancies
- publications
- jobs
- matches
- todos

---

## Table 2: `companies`

**Purpose:** Cache of Carerix CRCompany entities (clients, employers)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | Xano primary key |
| carerix_id | Integer (unique, indexed) | = `companyID` from Carerix |
| name | Text | Company name |
| short_name | Text (nullable) | Short/abbreviated name |
| division | Text (nullable) | Division |
| company_information | Text (nullable) | Company description (rich text/HTML) |
| company_profile | Text (nullable) | Extended profile (rich text/HTML) |
| email_address | Text (nullable) | Primary email |
| phone_number | Text (nullable) | Primary phone |
| fax_number | Text (nullable) | Fax number |
| url | Text (nullable) | Website URL |
| linkedin_url | Text (nullable) | LinkedIn URL |
| visit_address | Text (nullable) | Full visit address |
| visit_street | Text (nullable) | |
| visit_number | Text (nullable) | |
| visit_number_suffix | Text (nullable) | |
| visit_postal_code | Text (nullable) | |
| visit_city | Text (nullable) | |
| visit_city_code | Text (nullable) | |
| mailing_address | Text (nullable) | Full mailing address |
| mailing_street | Text (nullable) | |
| mailing_number | Text (nullable) | |
| mailing_number_suffix | Text (nullable) | |
| mailing_postal_code | Text (nullable) | |
| mailing_city | Text (nullable) | |
| mailing_city_code | Text (nullable) | |
| invoice_address | Text (nullable) | Full invoice address |
| invoice_city | Text (nullable) | |
| invoice_postal_code | Text (nullable) | |
| invoice_email_address | Text (nullable) | |
| debtor_number | Text (nullable) | |
| kvk_number | Text (nullable) | Chamber of Commerce number |
| tax_number | Text (nullable) | VAT number |
| company_size | Integer (nullable) | |
| revenue | Decimal (nullable) | |
| fee_percentage | Decimal (nullable) | |
| branche_level1 | Text (nullable) | Industry level 1 (resolved from DataNode) |
| branche_level2 | Text (nullable) | Industry level 2 |
| status_display | Text (nullable) | Current status label |
| status_indication_color | Text (nullable) | Status color |
| owner_display | Text (nullable) | Account owner name |
| owner_carerix_id | Integer (nullable) | Carerix owner user ID |
| parent_carerix_id | Integer (nullable) | Parent company Carerix ID |
| source_info | Text (nullable) | |
| notes | Text (nullable) | |
| is_competitor | Boolean, default false | |
| is_supplier | Boolean, default false | |
| deleted | Boolean, default false | |
| carerix_created_date | Timestamp (nullable) | From Carerix `creationDate` |
| carerix_modified_date | Timestamp (nullable, indexed) | From Carerix `modificationDate` |
| raw_json | JSON (nullable) | Full Carerix response for debugging |
| created_at | Timestamp | Xano auto |
| updated_at | Timestamp | Xano auto |

---

## Table 3: `employees`

**Purpose:** Cache of Carerix CREmployee entities (candidates/workers)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | Xano primary key |
| carerix_id | Integer (unique, indexed) | = `employeeID` from Carerix |
| first_name | Text (nullable) | |
| last_name | Text (nullable) | |
| last_name_prefix | Text (nullable) | e.g., "van", "de" |
| initials | Text (nullable) | |
| full_first_names | Text (nullable) | |
| name | Text (nullable) | Full display name |
| title | Text (nullable) | |
| email_address | Text (nullable) | Primary email |
| email_address_business | Text (nullable) | Business email |
| email_address_private | Text (nullable) | Private email |
| phone_number | Text (nullable) | Primary phone |
| phone_number_business | Text (nullable) | Business phone |
| mobile_number | Text (nullable) | Mobile |
| mobile_number_business | Text (nullable) | Business mobile |
| address | Text (nullable) | Full address |
| street | Text (nullable) | |
| house_number | Text (nullable) | |
| house_number_suffix | Text (nullable) | |
| postal_code | Text (nullable) | |
| city | Text (nullable) | |
| city_code | Text (nullable) | |
| birth_date | Date (nullable) | |
| birth_city | Text (nullable) | |
| gender_node | Integer (nullable) | Gender reference |
| age | Integer (nullable) | |
| cv_summary | Text (nullable) | CV/resume summary |
| employee_information | Text (nullable) | Rich text |
| experience_information | Text (nullable) | |
| education_information | Text (nullable) | |
| ambition | Text (nullable) | |
| hobbies | Text (nullable) | |
| notes | Text (nullable) | |
| skill_notes | Text (nullable) | |
| language_notes | Text (nullable) | |
| current_conditions | Text (nullable) | |
| current_employer_name | Text (nullable) | |
| current_salary | Decimal (nullable) | |
| min_salary | Decimal (nullable) | |
| salary | Integer (nullable) | |
| available_date | Date (nullable) | |
| available_from_date | Date (nullable) | |
| hours_per_week | Decimal (nullable) | |
| days_per_week | Integer (nullable) | |
| fte | Decimal (nullable) | |
| min_fte | Decimal (nullable) | |
| max_fte | Decimal (nullable) | |
| max_distance | Integer (nullable) | Max commute distance |
| years_of_experience | Integer (nullable) | |
| has_car | Boolean, default false | |
| ranking | Decimal (nullable) | |
| rating | Integer (nullable) | |
| engagement_score | Integer (nullable) | |
| completeness_score | Decimal (nullable) | |
| status_display | Text (nullable) | |
| status_indication_color | Text (nullable) | |
| owner_display | Text (nullable) | |
| owner_carerix_id | Integer (nullable) | |
| source_info | Text (nullable) | |
| active_job_count | Integer, default 0 | |
| match_count | Integer, default 0 | |
| is_confidential | Boolean, default false | |
| deleted | Boolean, default false | |
| carerix_created_date | Timestamp (nullable) | |
| carerix_modified_date | Timestamp (nullable, indexed) | |
| raw_json | JSON (nullable) | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

---

## Table 4: `vacancies`

**Purpose:** Cache of Carerix CRVacancy entities (job orders/requisitions)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | |
| carerix_id | Integer (unique, indexed) | = `vacancyID` from Carerix |
| vacancy_no | Text (nullable) | Reference number |
| job_title | Text (nullable) | |
| title_information | Text (nullable) | |
| intro_information | Text (nullable) | |
| vacancy_information | Text (nullable) | Rich text |
| offer_information | Text (nullable) | Rich text |
| company_information | Text (nullable) | Rich text |
| requirements | Text (nullable) | Rich text |
| additional_information | Text (nullable) | Rich text |
| contact_information | Text (nullable) | |
| application_contact_information | Text (nullable) | |
| training_information | Text (nullable) | |
| company_name | Text (nullable) | |
| company_carerix_id | Integer (nullable, indexed) | FK to companies.carerix_id |
| work_location | Text (nullable) | |
| work_city | Text (nullable) | |
| work_city_code | Text (nullable) | |
| work_postal_code | Text (nullable) | |
| work_street | Text (nullable) | |
| work_full_address | Text (nullable) | |
| start_date | Date (nullable) | |
| end_date | Date (nullable) | |
| deadline | Date (nullable) | |
| hours_per_week | Decimal (nullable) | |
| days_per_week | Integer (nullable) | |
| fte | Decimal (nullable) | |
| min_salary | Decimal (nullable) | |
| max_salary | Decimal (nullable) | |
| salary_scale | Text (nullable) | |
| number_of_vacancies | Integer, default 1 | |
| is_anonymous | Boolean, default false | |
| is_hidden | Boolean, default false | |
| is_template | Boolean, default false | |
| has_bonus | Boolean, default false | |
| has_company_car | Boolean, default false | |
| match_count | Integer, default 0 | |
| active_publications_count | Integer, default 0 | |
| status_display | Text (nullable) | |
| status_indication_color | Text (nullable) | |
| owner_display | Text (nullable) | |
| owner_carerix_id | Integer (nullable) | |
| source_info | Text (nullable) | |
| notes | Text (nullable) | |
| customer_reference | Text (nullable) | |
| deleted | Boolean, default false | |
| carerix_created_date | Timestamp (nullable) | |
| carerix_modified_date | Timestamp (nullable, indexed) | |
| raw_json | JSON (nullable) | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

---

## Table 5: `publications`

**Purpose:** Cache of Carerix CRPublication entities (published vacancy ads)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | |
| carerix_id | Integer (unique, indexed) | = `publicationID` from Carerix |
| vacancy_carerix_id | Integer (nullable, indexed) | FK to vacancies.carerix_id |
| company_carerix_id | Integer (nullable, indexed) | FK to companies.carerix_id |
| title_information | Text (nullable) | Plain text |
| title_information_html | Text (nullable) | HTML version |
| intro_information | Text (nullable) | Plain text |
| intro_information_html | Text (nullable) | HTML version |
| vacancy_information | Text (nullable) | Plain text |
| vacancy_information_html | Text (nullable) | HTML version |
| requirements_information | Text (nullable) | Plain text |
| requirements_information_html | Text (nullable) | HTML version |
| offer_information | Text (nullable) | Plain text |
| offer_information_html | Text (nullable) | HTML version |
| company_information | Text (nullable) | Plain text |
| company_information_html | Text (nullable) | HTML version |
| application_contact_information | Text (nullable) | |
| application_contact_information_html | Text (nullable) | |
| function_contact_information | Text (nullable) | |
| function_contact_information_html | Text (nullable) | |
| work_location | Text (nullable) | |
| work_location_html | Text (nullable) | |
| vacancy_no | Text (nullable) | |
| vacancy_url | Text (nullable) | |
| apply_url | Text (nullable) | |
| campaign | Text (nullable) | |
| meta_tags | Text (nullable) | SEO meta tags |
| publication_start | Date (nullable) | |
| publication_end | Date (nullable) | |
| status | Integer (nullable) | |
| status_display | Text (nullable) | |
| closed | Boolean, default false | |
| deleted | Boolean, default false | |
| owner_display | Text (nullable) | |
| notes | Text (nullable) | |
| carerix_created_date | Timestamp (nullable) | |
| carerix_modified_date | Timestamp (nullable, indexed) | |
| raw_json | JSON (nullable) | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

---

## Table 6: `jobs`

**Purpose:** Cache of Carerix CRJob entities (placements/assignments)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | |
| carerix_id | Integer (unique, indexed) | = `jobID` from Carerix |
| name | Text (nullable) | Job/placement name |
| employee_carerix_id | Integer (nullable, indexed) | FK to employees.carerix_id |
| vacancy_carerix_id | Integer (nullable, indexed) | FK to vacancies.carerix_id |
| company_carerix_id | Integer (nullable, indexed) | FK to companies.carerix_id |
| match_carerix_id | Integer (nullable, indexed) | FK to matches.carerix_id |
| start_date | Date (nullable) | |
| end_date | Date (nullable) | |
| hours_per_week | Decimal (nullable) | |
| days_per_week | Integer (nullable) | |
| cost_price | Decimal (nullable) | |
| selling_price | Decimal (nullable) | |
| purchase_rate | Decimal (nullable) | |
| hourly_tariff_invoice | Decimal (nullable) | |
| hourly_wage_gross | Decimal (nullable) | |
| margin_amount | Decimal (nullable) | |
| margin_percentage | Decimal (nullable) | |
| margin_ok | Boolean, default false | |
| sales_factor | Decimal (nullable) | |
| salary | Integer (nullable) | |
| customer_reference | Text (nullable) | |
| external_identifier | Text (nullable) | |
| job_information | Text (nullable) | |
| memo_general | Text (nullable) | |
| memo_declaration | Text (nullable) | |
| invoice_subject | Text (nullable) | |
| phone_number | Text (nullable) | |
| status | Integer (nullable) | |
| status_display | Text (nullable) | |
| status_indication_color | Text (nullable) | |
| owner_display | Text (nullable) | |
| is_template | Boolean, default false | |
| deleted | Boolean, default false | |
| carerix_created_date | Timestamp (nullable) | |
| carerix_modified_date | Timestamp (nullable, indexed) | |
| raw_json | JSON (nullable) | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

---

## Table 7: `matches`

**Purpose:** Cache of Carerix CRMatch entities (candidate-vacancy matches/applications)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | |
| carerix_id | Integer (unique, indexed) | = `_id` from Carerix |
| title | Text (nullable) | |
| employee_carerix_id | Integer (nullable, indexed) | FK to employees.carerix_id |
| vacancy_carerix_id | Integer (nullable, indexed) | FK to vacancies.carerix_id |
| company_carerix_id | Integer (nullable, indexed) | FK to companies.carerix_id |
| publication_carerix_id | Integer (nullable, indexed) | FK to publications.carerix_id |
| status_display | Text (nullable) | |
| status_indication_color | Text (nullable) | |
| motivation | Text (nullable) | |
| notes | Text (nullable) | |
| fit_score | Integer (nullable) | |
| fit_gap | Text (nullable) | |
| cv_summary | Text (nullable) | |
| salary | Decimal (nullable) | |
| agreed_salary | Text (nullable) | |
| cost_price | Decimal (nullable) | |
| selling_price | Decimal (nullable) | |
| purchase_rate | Decimal (nullable) | |
| invoice_rate | Decimal (nullable) | |
| wage_rate | Decimal (nullable) | |
| margin_amount | Decimal (nullable) | |
| margin_percentage | Decimal (nullable) | |
| margin_ok | Boolean, default false | |
| sales_factor | Decimal (nullable) | |
| sort_order | Integer (nullable) | |
| source_info | Text (nullable) | |
| apply_source | Text (nullable) | |
| apply_medium | Text (nullable) | |
| apply_campaign | Text (nullable) | |
| apply_content | Text (nullable) | |
| apply_term | Text (nullable) | |
| job_start_date | Date (nullable) | |
| is_overdue | Boolean, default false | |
| owner_display | Text (nullable) | |
| owner_carerix_id | Integer (nullable) | |
| deleted | Boolean, default false | |
| carerix_created_date | Timestamp (nullable) | |
| carerix_modified_date | Timestamp (nullable, indexed) | |
| raw_json | JSON (nullable) | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

---

## Table 8: `todos`

**Purpose:** Cache of Carerix CRToDo entities (tasks, notes, emails, meetings)

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | |
| carerix_id | Integer (unique, indexed) | = `toDoID` from Carerix |
| subject | Text (nullable) | |
| name | Text (nullable) | |
| title | Text (nullable) | |
| todo_type | Text (nullable) | "task", "note", "email", "meeting" |
| todo_type_key | Integer (nullable) | Carerix `toDoTypeKey` |
| status | Integer (nullable) | |
| status_display | Text (nullable) | |
| priority | Integer (nullable) | |
| start_date | Timestamp (nullable) | |
| end_date | Timestamp (nullable) | |
| deadline | Timestamp (nullable) | |
| location | Text (nullable) | For meetings |
| is_all_day | Boolean, default false | |
| is_email | Boolean, default false | |
| is_meeting | Boolean, default false | |
| is_note | Boolean, default false | |
| is_task | Boolean, default false | |
| email_body | Text (nullable) | HTML email body |
| notes_text | Text (nullable) | Plain text notes |
| from_address | Text (nullable) | Email sender |
| to_address | Text (nullable) | Email recipient |
| cc_address | Text (nullable) | CC addresses |
| employee_carerix_id | Integer (nullable, indexed) | FK to employees |
| vacancy_carerix_id | Integer (nullable, indexed) | FK to vacancies |
| company_carerix_id | Integer (nullable, indexed) | FK to companies |
| match_carerix_id | Integer (nullable, indexed) | FK to matches |
| job_carerix_id | Integer (nullable, indexed) | FK to jobs |
| contact_carerix_id | Integer (nullable, indexed) | FK (CRUser contact) |
| owner_display | Text (nullable) | |
| owner_carerix_id | Integer (nullable) | |
| deleted | Boolean, default false | |
| carerix_created_date | Timestamp (nullable) | |
| carerix_modified_date | Timestamp (nullable, indexed) | |
| raw_json | JSON (nullable) | |
| created_at | Timestamp | |
| updated_at | Timestamp | |

---

## Table 9: `sync_log`

**Purpose:** Audit trail of all sync operations

| Column | Type | Notes |
|--------|------|-------|
| id | Integer (auto PK) | |
| entity_type | Text (indexed) | "companies", "employees", etc. |
| sync_type | Text | "incremental", "full", "webhook", "manual" |
| started_at | Timestamp | |
| completed_at | Timestamp (nullable) | |
| records_fetched | Integer, default 0 | |
| records_created | Integer, default 0 | |
| records_updated | Integer, default 0 | |
| records_deleted | Integer, default 0 | |
| status | Text | "running", "success", "error", "partial" |
| error_message | Text (nullable) | |
| filter_used | Text (nullable) | e.g., "modificationDate > 2025-01-01" |
| carerix_query_time_ms | Integer (nullable) | Performance tracking |
| created_at | Timestamp | |

---

## Xano API Endpoints to Create

### Public Read APIs (for frontend consumption)

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | `/vacancies` | List active vacancies with pagination, filters (location, status), sorting |
| 2 | GET | `/vacancies/:carerix_id` | Single vacancy with related publications |
| 3 | GET | `/publications` | List active publications with vacancy data joined |
| 4 | GET | `/publications/:carerix_id` | Single publication with full HTML content |
| 5 | GET | `/companies` | List companies with pagination |
| 6 | GET | `/companies/:carerix_id` | Single company with related vacancies |
| 7 | GET | `/employees` | List employees (auth-protected) |
| 8 | GET | `/employees/:carerix_id` | Single employee profile (auth-protected) |
| 9 | GET | `/matches` | List matches with filters (by vacancy, employee, status) |
| 10 | GET | `/jobs` | List jobs/placements with filters |
| 11 | GET | `/todos` | List todos with filters (by type, entity, date range) |

### Sync/Admin APIs

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 12 | POST | `/sync/trigger/:entity_type` | Manually trigger sync for an entity type |
| 13 | GET | `/sync/status` | Get current sync status for all entity types |
| 14 | GET | `/sync/log` | Get sync audit trail |
| 15 | POST | `/webhooks/carerix` | Receive Carerix webhook notifications |

### Xano Scheduled Tasks (Cron Jobs)

| Task | Schedule | Description |
|------|----------|-------------|
| sync_companies | Every 15 min | Fetch CRCompany changes from Carerix → upsert |
| sync_employees | Every 15 min | Fetch CREmployee changes → upsert |
| sync_vacancies | Every 10 min | Fetch CRVacancy changes → upsert |
| sync_publications | Every 10 min | Fetch CRPublication changes → upsert |
| sync_jobs | Every 15 min | Fetch CRJob changes → upsert |
| sync_matches | Every 10 min | Fetch CRMatch changes → upsert |
| sync_todos | Every 15 min | Fetch CRToDo changes → upsert |

### Sync Logic (for each scheduled task)

1. Read `last_sync_timestamp` from `sync_metadata` for its entity type
2. Update `sync_metadata.status` to "running"
3. Query Carerix GraphQL: filter by `modificationDate > last_sync_timestamp`
4. For each record: UPSERT into Xano table (match on `carerix_id`)
5. Update `sync_metadata` with new timestamp, count, and status "success"
6. Insert row into `sync_log` with results
7. On error: set `sync_metadata.status` to "error" with error message

---

## Xano External API Connection

Configure a Carerix GraphQL external API in Xano with:

- **Base URL:** Your Carerix GraphQL endpoint (e.g., `https://api.carerix.com/graphql`)
- **Authentication:** OAuth2 Client Credentials
  - **Token endpoint:** Your Carerix OAuth token URL
  - **Client ID:** Your Carerix client ID
  - **Client Secret:** Your Carerix client secret
  - **Grant type:** `client_credentials`
- **Headers:** `Content-Type: application/json`

---

## Copy-Paste Prompt for Xano AI

```
Create the following 9 database tables for a Carerix CRM caching layer:

1. sync_metadata — Tracks last sync timestamp per entity type (employees, vacancies, publications, companies, matches, jobs, todos). Fields: id (auto PK), entity_type (text, unique), last_sync_timestamp (timestamp), last_full_sync (timestamp nullable), records_synced (integer default 0), status (text default "idle"), error_message (text nullable).

2. companies — Cache of Carerix companies. Key fields: carerix_id (integer, unique index), name (text), short_name (text nullable), division (text nullable), email_address (text nullable), phone_number (text nullable), fax_number (text nullable), url (text nullable), linkedin_url (text nullable), visit_address (text nullable), visit_street (text nullable), visit_number (text nullable), visit_number_suffix (text nullable), visit_postal_code (text nullable), visit_city (text nullable), visit_city_code (text nullable), mailing_address (text nullable), mailing_street (text nullable), mailing_number (text nullable), mailing_number_suffix (text nullable), mailing_postal_code (text nullable), mailing_city (text nullable), mailing_city_code (text nullable), invoice_address (text nullable), invoice_city (text nullable), invoice_postal_code (text nullable), invoice_email_address (text nullable), company_information (text nullable), company_profile (text nullable), notes (text nullable), company_size (integer nullable), revenue (decimal nullable), kvk_number (text nullable), tax_number (text nullable), debtor_number (text nullable), fee_percentage (decimal nullable), branche_level1 (text nullable), branche_level2 (text nullable), is_supplier (boolean default false), is_competitor (boolean default false), status_display (text nullable), status_indication_color (text nullable), owner_display (text nullable), owner_carerix_id (integer nullable), parent_carerix_id (integer nullable), source_info (text nullable), deleted (boolean default false), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

3. employees — Cache of Carerix employees/candidates. Key fields: carerix_id (integer, unique index), first_name (text nullable), last_name (text nullable), last_name_prefix (text nullable), initials (text nullable), full_first_names (text nullable), name (text nullable), title (text nullable), email_address (text nullable), email_address_business (text nullable), email_address_private (text nullable), phone_number (text nullable), phone_number_business (text nullable), mobile_number (text nullable), mobile_number_business (text nullable), address (text nullable), street (text nullable), house_number (text nullable), house_number_suffix (text nullable), postal_code (text nullable), city (text nullable), city_code (text nullable), birth_date (date nullable), birth_city (text nullable), gender_node (integer nullable), age (integer nullable), cv_summary (text nullable), employee_information (text nullable), experience_information (text nullable), education_information (text nullable), ambition (text nullable), hobbies (text nullable), notes (text nullable), skill_notes (text nullable), language_notes (text nullable), current_conditions (text nullable), current_employer_name (text nullable), current_salary (decimal nullable), min_salary (decimal nullable), salary (integer nullable), available_date (date nullable), available_from_date (date nullable), hours_per_week (decimal nullable), days_per_week (integer nullable), fte (decimal nullable), min_fte (decimal nullable), max_fte (decimal nullable), max_distance (integer nullable), years_of_experience (integer nullable), has_car (boolean default false), ranking (decimal nullable), rating (integer nullable), engagement_score (integer nullable), completeness_score (decimal nullable), status_display (text nullable), status_indication_color (text nullable), owner_display (text nullable), owner_carerix_id (integer nullable), source_info (text nullable), active_job_count (integer default 0), match_count (integer default 0), is_confidential (boolean default false), deleted (boolean default false), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

4. vacancies — Cache of Carerix vacancies/job orders. Key fields: carerix_id (integer, unique index), vacancy_no (text nullable), job_title (text nullable), title_information (text nullable), intro_information (text nullable), vacancy_information (text nullable), offer_information (text nullable), company_information (text nullable), requirements (text nullable), additional_information (text nullable), contact_information (text nullable), application_contact_information (text nullable), training_information (text nullable), company_name (text nullable), company_carerix_id (integer nullable, indexed), work_location (text nullable), work_city (text nullable), work_city_code (text nullable), work_postal_code (text nullable), work_street (text nullable), work_full_address (text nullable), start_date (date nullable), end_date (date nullable), deadline (date nullable), hours_per_week (decimal nullable), days_per_week (integer nullable), fte (decimal nullable), min_salary (decimal nullable), max_salary (decimal nullable), salary_scale (text nullable), number_of_vacancies (integer default 1), is_anonymous (boolean default false), is_hidden (boolean default false), is_template (boolean default false), has_bonus (boolean default false), has_company_car (boolean default false), match_count (integer default 0), active_publications_count (integer default 0), status_display (text nullable), status_indication_color (text nullable), owner_display (text nullable), owner_carerix_id (integer nullable), source_info (text nullable), notes (text nullable), customer_reference (text nullable), deleted (boolean default false), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

5. publications — Cache of Carerix publications (published vacancy ads). Key fields: carerix_id (integer, unique index), vacancy_carerix_id (integer nullable, indexed), company_carerix_id (integer nullable, indexed), title_information (text nullable), title_information_html (text nullable), intro_information (text nullable), intro_information_html (text nullable), vacancy_information (text nullable), vacancy_information_html (text nullable), requirements_information (text nullable), requirements_information_html (text nullable), offer_information (text nullable), offer_information_html (text nullable), company_information (text nullable), company_information_html (text nullable), application_contact_information (text nullable), application_contact_information_html (text nullable), function_contact_information (text nullable), function_contact_information_html (text nullable), work_location (text nullable), work_location_html (text nullable), vacancy_no (text nullable), vacancy_url (text nullable), apply_url (text nullable), campaign (text nullable), meta_tags (text nullable), publication_start (date nullable), publication_end (date nullable), status (integer nullable), status_display (text nullable), closed (boolean default false), deleted (boolean default false), owner_display (text nullable), notes (text nullable), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

6. jobs — Cache of Carerix jobs/placements. Key fields: carerix_id (integer, unique index), name (text nullable), employee_carerix_id (integer nullable, indexed), vacancy_carerix_id (integer nullable, indexed), company_carerix_id (integer nullable, indexed), match_carerix_id (integer nullable, indexed), start_date (date nullable), end_date (date nullable), hours_per_week (decimal nullable), days_per_week (integer nullable), cost_price (decimal nullable), selling_price (decimal nullable), purchase_rate (decimal nullable), hourly_tariff_invoice (decimal nullable), hourly_wage_gross (decimal nullable), margin_amount (decimal nullable), margin_percentage (decimal nullable), margin_ok (boolean default false), sales_factor (decimal nullable), salary (integer nullable), customer_reference (text nullable), external_identifier (text nullable), job_information (text nullable), memo_general (text nullable), memo_declaration (text nullable), invoice_subject (text nullable), phone_number (text nullable), status (integer nullable), status_display (text nullable), status_indication_color (text nullable), owner_display (text nullable), is_template (boolean default false), deleted (boolean default false), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

7. matches — Cache of Carerix matches (candidate-vacancy links). Key fields: carerix_id (integer, unique index), title (text nullable), employee_carerix_id (integer nullable, indexed), vacancy_carerix_id (integer nullable, indexed), company_carerix_id (integer nullable, indexed), publication_carerix_id (integer nullable, indexed), status_display (text nullable), status_indication_color (text nullable), motivation (text nullable), notes (text nullable), fit_score (integer nullable), fit_gap (text nullable), cv_summary (text nullable), salary (decimal nullable), agreed_salary (text nullable), cost_price (decimal nullable), selling_price (decimal nullable), purchase_rate (decimal nullable), invoice_rate (decimal nullable), wage_rate (decimal nullable), margin_amount (decimal nullable), margin_percentage (decimal nullable), margin_ok (boolean default false), sales_factor (decimal nullable), sort_order (integer nullable), source_info (text nullable), apply_source (text nullable), apply_medium (text nullable), apply_campaign (text nullable), apply_content (text nullable), apply_term (text nullable), job_start_date (date nullable), is_overdue (boolean default false), owner_display (text nullable), owner_carerix_id (integer nullable), deleted (boolean default false), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

8. todos — Cache of Carerix todos (tasks, emails, meetings, notes). Key fields: carerix_id (integer, unique index), subject (text nullable), name (text nullable), title (text nullable), todo_type (text nullable), todo_type_key (integer nullable), status (integer nullable), status_display (text nullable), priority (integer nullable), start_date (timestamp nullable), end_date (timestamp nullable), deadline (timestamp nullable), location (text nullable), is_all_day (boolean default false), is_email (boolean default false), is_meeting (boolean default false), is_note (boolean default false), is_task (boolean default false), email_body (text nullable), notes_text (text nullable), from_address (text nullable), to_address (text nullable), cc_address (text nullable), employee_carerix_id (integer nullable, indexed), vacancy_carerix_id (integer nullable, indexed), company_carerix_id (integer nullable, indexed), match_carerix_id (integer nullable, indexed), job_carerix_id (integer nullable, indexed), contact_carerix_id (integer nullable, indexed), owner_display (text nullable), owner_carerix_id (integer nullable), deleted (boolean default false), carerix_created_date (timestamp nullable), carerix_modified_date (timestamp nullable, indexed), raw_json (json nullable).

9. sync_log — Audit trail for sync operations. Fields: id (auto PK), entity_type (text, indexed), sync_type (text), started_at (timestamp), completed_at (timestamp nullable), records_fetched (integer default 0), records_created (integer default 0), records_updated (integer default 0), records_deleted (integer default 0), status (text), error_message (text nullable), filter_used (text nullable), carerix_query_time_ms (integer nullable).

Important: All tables should have automatic created_at and updated_at timestamps. Add indexes on all carerix_id columns (unique) and all foreign key _carerix_id columns. The raw_json column stores the complete Carerix API response for each record as a fallback.
```