
# Decraft — Solution Approach

**Version:** 1.0  
**Status:** Proposed technical architecture and implementation plan  
**Product:** Decraft  
**Target release:** Public MVP in Nigeria  
**Architecture style:** Modular monolith with asynchronous background processing  
**Primary design priorities:** Privacy, project-centric data, AI-assisted documentation, reliable media handling and mobile-first performance

---

# 1. Purpose

This document translates the Decraft Product Requirements Document into a proposed technical solution.

It defines:

- System architecture and technology choices.
- Frontend and backend responsibilities.
- Database structure and relationships.
- Project and media-processing workflows.
- AI-assisted project organization.
- Privacy and client-access enforcement.
- Discovery and search.
- Messaging and notifications.
- Offline drafts and synchronization.
- Deployment, monitoring, testing and implementation milestones.

The architecture should make the MVP practical to build while preserving room for future capabilities such as workshop collaboration, reviews, advanced analytics and paid professional tools.

## 1.1 Core engineering principle

**The project is the central unit of Decraft.**

The profile provides identity. The project records work. The timeline records progress. AI assists with organization. Discovery makes eligible work visible. Messaging connects the artisan with customers. Access-control rules determine who can see each piece of information.

All major product modules should follow this model.

---

# 2. Recommended technology stack

These are proposed choices, selected to minimize operational complexity while supporting Decraft's requirements.

| Layer | Proposed technology | Responsibility |
|---|---|---|
| Web application | React + TypeScript | User interface and client-side interactions |
| Web framework | Next.js | Routing, rendering and public profile/project pages |
| Styling | Tailwind CSS | Responsive, consistent interface |
| Backend API | Python + FastAPI | Business logic, authorization and API endpoints |
| Database | PostgreSQL | Users, profiles, projects, timelines, messages and permissions |
| Authentication | Supabase Auth | Sign-in, verification and account recovery |
| Database hosting | Supabase PostgreSQL | Managed database and access to PostgreSQL features |
| Media storage | Supabase Storage or compatible private object storage | Photos, videos, voice notes and project files |
| Background jobs | Redis-backed worker, such as Celery | Media processing, AI tasks and retryable background work |
| AI integration | Provider-independent Python adapter | Media analysis, transcription and project drafting |
| Search | PostgreSQL full-text search and geographic queries | Initial discovery and filtering |
| Realtime messaging | WebSockets through FastAPI | Live message delivery and updates |
| Notifications | Database-backed notification records, with email delivery | In-app alerts and essential communications |
| Offline support | Progressive Web App capabilities and IndexedDB | Local drafts and synchronization queue |
| Error monitoring | A suitable hosted error and performance-monitoring service | Diagnostics and operational visibility |
| Deployment | Managed application hosting and a managed database | Public API, web application and background workers |

### Why this stack?

- **React and TypeScript** support a rich, mobile-first application.
- **FastAPI** provides a clear API boundary and works well with Python-based AI and media-processing libraries.
- **PostgreSQL** can handle relational data, text search and location queries without requiring several separate databases.
- **Managed authentication and storage** reduce the amount of infrastructure that must be built and maintained.
- **Background workers** prevent AI generation and large media uploads from blocking normal user interactions.
- **A PWA** provides an accessible web-first launch while supporting offline drafts.

This stack is not mandatory. If implementation testing shows that the team can meet the requirements with fewer services, simplify it. Do not introduce Redis, a separate worker or another paid service without confirming that the workload requires it.

---

# 3. System architecture

## 3.1 High-level architecture

<escape>```text
                     ARTISANS AND CUSTOMERS
                               |
                               v
                  React / TypeScript Web App
                       Next.js + PWA
                               |
                    HTTPS / WebSocket
                               |
                               v
                      FastAPI Backend
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
       Authentication     Core Modules     Realtime Gateway
       Supabase Auth      Profiles         Messaging
                          Projects         Notifications
                          Discovery
                          Access Control
                          AI Orchestration
              |                |
              +----------------+
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
         PostgreSQL       Private Object     Job Queue
         + PostGIS        Storage            Redis
         + Full-text      Photos/videos           |
           Search         and files               v
                                           Background Workers
                                                  |
                                       +----------+----------+
                                       |          |          |
                                       v          v          v
                                     Media      Speech      AI Provider
                                   Processing  Processing   Adapter
                                       |          |          |
                                       +----------+----------+
                                                  |
                                                  v
                                       Draft results stored
                                       in PostgreSQL
                                                  |
                                                  v
                                       Artisan reviews draft
                                       and approves publishing
```</escape>

### Architectural rules

1. The browser must never be trusted to enforce access permissions on its own.
2. The backend owns business rules and authorization decisions.
3. PostgreSQL is the authoritative record for projects, updates, visibility and client grants.
4. Object storage holds the actual media files; the database stores metadata and storage references.
5. AI and media processing run asynchronously when tasks may take more than a normal request should handle.
6. The AI provider never receives unrestricted database or storage access.
7. Public pages expose only content that has been explicitly published and authorized for public access.
8. Offline changes are drafts until synchronized and explicitly published.

## 3.2 Why a modular monolith?

A modular monolith means one principal backend application contains distinct, well-defined modules.

The initial modules should be:

- Identity and profiles.
- Projects and timelines.
- Media management.
- AI orchestration.
- Access control.
- Discovery and search.
- Messaging and inquiries.
- Notifications.
- Moderation.
- Administration and audit logging.

These modules may share the same deployment and database while maintaining clear internal boundaries.

**Do not start with microservices.** Separate services would add deployment, networking, monitoring and failure-management overhead without proven scale requirements.

Background workers are a justified exception because AI processing and media conversion have different resource and execution requirements from ordinary API requests.

---

# 4. Repository and code organization

A monorepo is a reasonable initial choice.

<escape>```text
decraft/
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── profiles/
│       │   ├── projects/
│       │   ├── discovery/
│       │   ├── messages/
│       │   └── settings/
│       ├── lib/
│       └── public/
│
├── services/
│   └── api/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── profiles/
│       │   │   ├── projects/
│       │   │   ├── media/
│       │   │   ├── ai/
│       │   │   ├── discovery/
│       │   │   ├── messaging/
│       │   │   ├── notifications/
│       │   │   └── moderation/
│       │   ├── workers/
│       │   └── main.py
│       ├── migrations/
│       └── tests/
│
├── packages/
│   └── shared-types/
│
├── docs/
│   ├── PRD.md
│   ├── SOLUTION_APPROACH.md
│   ├── API.md
│   └── SECURITY.md
│
└── README.md
```</escape>

The web application and backend should be deployable independently, even if they live in the same repository.

Do not create a separate microservice for every module. Separate deployment should follow a real scaling, security or operational need.

---

# 5. Database and domain model

PostgreSQL should be the system of record for Decraft's structured application data.

## 5.1 Principal entities

### `users`

Stores the application-level user record and its relationship to the authentication provider.

Suggested fields:

- `id`
- `auth_user_id`
- `account_status`
- `created_at`
- `updated_at`

Authentication credentials should remain with the authentication provider rather than being stored as application-managed passwords.

### `profiles`

Represents an individual, workshop or business.

Suggested fields:

- `id`
- `owner_user_id`
- `profile_type`
- `display_name`
- `slug`
- `bio`
- `avatar_media_id`
- `location_id` or supported geographic fields
- `service_area`
- `contact_preferences`
- `availability`
- `price_range`
- `created_at`
- `updated_at`

The MVP should support one primary profile per account unless the product later defines a clear need for multiple profiles. This assumption should be confirmed during implementation planning.

### `craft_categories`

Provides consistent categories for crafts and services.

Suggested fields:

- `id`
- `name`
- `parent_id`
- `description`
- `is_active`

A hierarchical taxonomy can accommodate categories such as construction, electrical work, tailoring, beauty, repairs and other crafts without hard-coding categories into application logic.

### `profile_services`

Associates profiles with their craft categories and services.

Suggested fields:

- `profile_id`
- `category_id`
- `service_description`

### `projects`

The core content entity.

Suggested fields:

- `id`
- `owner_profile_id`
- `title`
- `description`
- `category_id`
- `status`
- `visibility`
- `published_at`
- `created_at`
- `updated_at`
- `completed_at`
- `location_id`, where applicable

Use a controlled status set:

- `planned`
- `in_progress`
- `completed`

Use a separate visibility field:

- `public`
- `private`
- `client_only`

Status and visibility must remain separate. A completed project may still be private, and a public project may still be in progress.

### `project_updates`

Stores entries in a project's timeline.

Suggested fields:

- `id`
- `project_id`
- `author_user_id`
- `content`
- `visibility`
- `publication_status`
- `created_at`
- `updated_at`
- `published_at`

Publication state should distinguish at least:

- `draft`
- `published`
- `archived`, if supported

Update visibility must be checked alongside parent-project visibility and access grants. A child update must never accidentally override a stricter parent permission.

### `project_milestones`

Suggested fields:

- `id`
- `project_id`
- `title`
- `description`
- `status`
- `sort_order`
- `created_at`
- `updated_at`

Milestones are optional and should not be mandatory for every craft or project.

### `media_assets`

Suggested fields:

- `id`
- `owner_user_id`
- `project_id`
- `project_update_id`
- `storage_key`
- `media_type`
- `mime_type`
- `file_size`
- `width`
- `height`
- `duration_seconds`
- `processing_status`
- `created_at`

Possible processing states include:

- `uploaded`
- `processing`
- `ready`
- `failed`
- `deleted`

The original file and generated derivatives should be distinguishable. The system should not silently replace original media with compressed or AI-generated versions.

### `project_access_grants`

Suggested fields:

- `id`
- `project_id`
- `grantee_user_id`, nullable for link-based grants
- `grant_type`
- `permissions`
- `token_hash`, when applicable
- `expires_at`
- `revoked_at`
- `created_by_user_id`
- `created_at`

Do not store raw private sharing tokens if a secure token-hashing design can be used. Define token validation, expiration and revocation rules before implementation.

### `conversations`

Suggested fields:

- `id`
- `conversation_type`
- `related_project_id`, nullable
- `related_inquiry_id`, nullable
- `created_at`
- `updated_at`

### `conversation_participants`

Suggested fields:

- `conversation_id`
- `user_id`
- `joined_at`
- `last_read_at`
- `muted_at`, nullable

A separate participant table supports future group conversations without requiring them in the MVP.

### `messages`

Suggested fields:

- `id`
- `conversation_id`
- `sender_user_id`
- `body`
- `created_at`
- `edited_at`, nullable
- `deleted_at`, nullable

Message attachments are excluded from the MVP. The database design should not imply that attachments are already supported.

### `job_inquiries`

Suggested fields:

- `id`
- `customer_user_id`
- `artisan_profile_id`
- `related_project_id`, nullable
- `message`
- `status`
- `created_at`
- `updated_at`

The initial inquiry workflow should remain simple. Avoid introducing complex quotation, negotiation and contract entities before those features are approved.

### `notifications`

Suggested fields:

- `id`
- `recipient_user_id`
- `notification_type`
- `resource_type`
- `resource_id`
- `read_at`
- `created_at`

### `ai_tasks`

Suggested fields:

- `id`
- `requested_by_user_id`
- `project_id`
- `task_type`
- `status`
- `input_reference`
- `output_reference`
- `error_code`
- `created_at`
- `completed_at`

The record should not indiscriminately store sensitive media content or entire private prompts. Define a retention policy for AI inputs and outputs.

### `reports` and `moderation_actions`

These entities support reporting, blocking, manual review and account restrictions.

They should store references to the reported resource, the reporter, the reason, the processing status and relevant administrative actions.

## 5.2 Data integrity

Implement:

- Foreign keys for relationships.
- Unique constraints for account-to-profile rules where applicable.
- Indexes on common lookup and join fields.
- Database constraints for supported statuses and visibility values.
- Transactions for multi-step operations that must remain consistent.
- Appropriate deletion and retention rules.
- Audit records for security-sensitive administrative actions.

## 5.3 Location storage

Use PostgreSQL geographic capabilities, such as PostGIS, if supported by the chosen hosting configuration.

Store a suitable location representation for each profile. Do not require artisans to expose their exact residential address publicly.

The product should allow coarse public locations, service areas or customer-selected geographic regions where appropriate. Exact location collection and display policies require explicit UX and privacy decisions.

---

# 6. Backend API design

Use a versioned REST API initially, with WebSockets for live messaging and other useful realtime updates.

Example base path:

`/api/v1`

The API should enforce authentication, validation, rate limits and authorization consistently.

## 6.1 Authentication and profiles

Representative endpoints:

- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/profiles/{profile_id}`
- `PATCH /api/v1/profiles/{profile_id}`
- `GET /api/v1/profiles/{profile_id}/projects`

The API should not allow arbitrary profile identifiers to bypass ownership checks.

## 6.2 Projects and updates

- `POST /api/v1/projects`
- `GET /api/v1/projects/{project_id}`
- `PATCH /api/v1/projects/{project_id}`
- `DELETE /api/v1/projects/{project_id}`
- `POST /api/v1/projects/{project_id}/updates`
- `GET /api/v1/projects/{project_id}/updates`
- `PATCH /api/v1/updates/{update_id}`
- `POST /api/v1/projects/{project_id}/publish`
- `POST /api/v1/projects/{project_id}/visibility`
- `POST /api/v1/projects/{project_id}/milestones`

Publishing must be a deliberate operation that checks ownership, visibility, media readiness and required fields.

## 6.3 Media

- `POST /api/v1/media/upload-intents`
- `POST /api/v1/media/{media_id}/complete`
- `GET /api/v1/media/{media_id}`
- `DELETE /api/v1/media/{media_id}`

The upload-intent endpoint should validate the user, permitted file type, intended parent resource and current storage policy before issuing upload instructions.

The completion endpoint should verify that the upload actually exists and passes required checks before marking it ready.

## 6.4 AI tasks

- `POST /api/v1/ai/project-assistance`
- `GET /api/v1/ai/tasks/{task_id}`
- `POST /api/v1/ai/tasks/{task_id}/cancel`, if cancellation is supported

Long-running AI tasks should return a task identifier. The client can poll for completion or receive an authorized realtime notification.

AI output should be stored as a draft and must not publish content automatically.

## 6.5 Discovery

- `GET /api/v1/discovery`
- `GET /api/v1/search`
- `GET /api/v1/categories`
- `GET /api/v1/locations`

Support query parameters for location, craft category, services, availability, price range and pagination.

Only published, eligible content should be indexed or returned.

## 6.6 Messaging and inquiries

- `POST /api/v1/conversations`
- `GET /api/v1/conversations`
- `GET /api/v1/conversations/{conversation_id}/messages`
- `POST /api/v1/conversations/{conversation_id}/messages`
- `POST /api/v1/inquiries`
- `GET /api/v1/inquiries`
- `POST /api/v1/users/{user_id}/block`
- `POST /api/v1/reports`

Every conversation operation must verify participant membership and blocking restrictions.

## 6.7 Notifications

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{notification_id}/read`
- `PATCH /api/v1/me/notification-preferences`

## 6.8 API conventions

The backend should provide:

- Consistent error formats.
- Request validation.
- Pagination for collection endpoints.
- Idempotency where repeated requests could create duplicate records or jobs.
- Rate limiting.
- Structured logging.
- API documentation generated from the FastAPI schema.
- Explicit authorization checks for all protected resources.

The frontend must not be able to grant itself permissions by submitting a modified request body.

---

# 7. Media upload and processing pipeline

Media is central to Decraft's value and cost structure. The upload pipeline must be reliable before building advanced AI features on top of it.

## 7.1 Proposed upload workflow

1. The user selects a project or update and chooses media.
2. The frontend requests an upload intent.
3. The backend checks ownership, authorization, supported media type and applicable limits.
4. The backend creates a pending media record and issues a short-lived, restricted upload authorization.
5. The browser uploads directly to object storage where supported.
6. The browser confirms completion with the backend.
7. The backend verifies the stored object and required metadata.
8. A background worker processes the media.
9. The worker creates appropriate derivatives, such as thumbnails or compressed previews.
10. The media record becomes `ready` only when required processing has succeeded.
11. The frontend displays the completed upload.

Direct uploads reduce the need to route large files through the application server.

## 7.2 Processing controls

The pipeline should:

- Validate file type and actual content.
- Enforce size limits.
- Reject unsupported or suspicious files.
- Normalize images and generate thumbnails.
- Generate suitable video previews when supported.
- Extract duration and dimensions.
- Avoid executing uploaded files.
- Handle retries without duplicating media records.
- Track failed processing jobs.
- Clean up abandoned uploads according to a documented retention policy.

Video transcoding and advanced media processing should be added only when usage justifies their cost.

## 7.3 Storage cost discovery

Before fixing free storage quotas:

1. Recruit a representative group of artisans.
2. Observe typical photo counts, video sizes and project lengths.
3. Measure original upload size and processed derivative size.
4. Estimate storage, delivery, backup and AI-processing costs.
5. Establish initial limits that fit the validated operating budget.
6. Monitor usage after launch and adjust transparently.

Do not promise unlimited storage until the business has evidence that it can support it.

---

# 8. AI orchestration design

AI should operate as a controlled assistant within the project workflow, not as an unrestricted agent with permission to publish or modify anything.

## 8.1 Recommended AI architecture

Use a provider-independent AI adapter behind the FastAPI backend.

The application should call internal capabilities such as:

- `classify_project_media`
- `suggest_project_title`
- `draft_project_description`
- `suggest_project_stage`
- `draft_progress_update`
- `transcribe_voice_note`, where supported

Each capability should have a defined input schema, output schema, authorization context and failure behavior.

The provider adapter allows the model provider to change without rewriting project logic.

## 8.2 AI task lifecycle

<escape>```text
User selects media or requests assistance
                  |
                  v
      Backend validates authorization
                  |
                  v
       Create AI task and draft context
                  |
                  v
        Queue background processing
                  |
                  v
      Prepare permitted media inputs
                  |
                  v
        Run AI task through adapter
                  |
                  v
       Validate structured AI output
                  |
                  v
        Save result as unpublished draft
                  |
                  v
         Notify authorized user
                  |
                  v
      User reviews, edits or rejects
                  |
                  v
       Explicit publication approval
                  |
                  v
        Backend validates and publishes
```</escape>

## 8.3 Structured outputs

Do not rely on free-form model text alone to drive state changes.

Use validated structures for fields such as:

- Suggested title.
- Suggested description.
- Suggested category.
- Suggested stage.
- Proposed milestone list.
- Draft progress-update text.
- Missing information.
- Confidence or review indicators, where meaningful.

The backend must validate every output against its schema and business rules.

A model's confidence score must not be treated as proof that a factual claim is true.

## 8.4 Preventing hallucinations

The AI should:

- Use only supplied media and user-provided context for factual claims.
- Avoid inventing prices, materials, dates, customer approval or credentials.
- Ask for missing details when necessary.
- Distinguish visual observations from conclusions about the work.
- Allow users to edit and reject drafts.
- Keep all generated content unpublished until approval.

For example, if an image shows a wooden cabinet, the AI may suggest that the project involves furniture or cabinetry. It must not assert that the user personally built the cabinet or that a named customer approved it unless the user supplies that information.

## 8.5 AI privacy

Before sending any content to an external AI provider:

1. Verify that the requesting user has access to the project and media.
2. Send only the information needed for the requested task.
3. Avoid sending unrelated private project data.
4. Apply the provider's data-handling and retention settings where available.
5. Avoid including private messages or customer information unless essential and authorized.
6. Record task metadata without unnecessarily retaining raw sensitive inputs.

AI processing must not change the visibility of the source project or publish content as a side effect.

## 8.6 AI cost controls

Implement:

- Per-user and per-project rate limits.
- Maximum input sizes.
- Task deduplication.
- Timeouts and bounded retries.
- Model selection by task complexity.
- Usage and cost logging.
- Failure monitoring.
- Graceful fallback to manual project editing.

Begin with a small set of high-value AI actions. Do not build a multi-agent orchestration framework unless a measured product requirement calls for it.

---

# 9. Privacy and authorization architecture

Privacy is a foundational engineering requirement because Decraft supports private projects, client-only access, per-update visibility and private sharing links.

## 9.1 Authorization layers

Every protected request should pass through:

1. **Authentication:** Who is making the request?
2. **Resource authorization:** Does that user own or have permission to access the resource?
3. **Visibility evaluation:** Is the project or update public, private or client-only?
4. **Relationship evaluation:** Is the requester an authorized client, and has access been revoked?
5. **Action authorization:** Is the requester allowed to perform the specific action, such as editing, sharing or publishing?

These checks must apply consistently to API endpoints, media downloads, realtime events and AI tasks.

## 9.2 Access policy

| Resource state | Owner | Authorized client | Other users |
|---|---|---|---|
| Public published project | Full permitted access | Access as a normal viewer, unless additional restrictions apply | Publicly eligible content only |
| Private project | Full permitted access | Only if separately granted access is explicitly supported by the policy | No access |
| Client-only project | Full permitted access | Access according to the grant and update-level permissions | No access |
| Unpublished draft | Owner only, subject to authorized collaborators if later supported | No access unless an explicit draft-sharing feature is designed | No access |

For the MVP, the simplest and safest default is that a private project is visible only to its owner. Any exception must be explicitly designed rather than inferred.

## 9.3 Per-update visibility

An update must be checked against both its parent project and its own permissions.

A child update must not be more visible than the parent project permits.

For example, an update cannot become publicly visible when its parent project is private or client-only.

The system should define whether updates inherit visibility by default and when an owner may narrow access to an individual update.

## 9.4 Private sharing links

A secure sharing link should:

- Use a cryptographically secure, unpredictable token.
- Store a token hash where practical.
- Support revocation.
- Support expiration where required.
- Resolve only to the intended resource.
- Enforce the associated access policy on every request.
- Avoid exposing private metadata in public previews.
- Be excluded from search indexing and public sitemap generation.

A private link is a bearer credential: anyone possessing an active link may be able to use it according to its permissions. The interface must explain this clearly. If a link must be restricted to one specific person, require authentication and validate the intended recipient.

## 9.5 Media access

Private files should not use permanent public URLs.

For protected media, the backend should validate access before serving the content or issuing a short-lived signed URL.

Revocation prevents future authorized access, but cannot recall files that a recipient already downloaded or copied.

## 9.6 Supabase-specific security consideration

If the frontend accesses Supabase directly for selected data, configure and test PostgreSQL Row Level Security policies. Never expose a service-role key to the browser.

If the FastAPI backend is the sole application-data gateway, keep privileged credentials server-side and enforce authorization consistently in the backend. Database-level protections can provide an additional defense layer where feasible.

Do not create two inconsistent authorization systems. Decide which component owns each permission check and test the resulting behavior end to end.

---

# 10. Discovery and search implementation

The first discovery system should use PostgreSQL rather than adding a separate search engine prematurely.

## 10.1 Search data

Discovery requires:

- Public profile details.
- Craft categories.
- Services offered.
- Public project titles and descriptions.
- Public project media references.
- Location or service-area information.
- Optional availability.
- Optional price range.

Only content that is published and eligible for public discovery should be included.

## 10.2 Query flow

1. The customer submits a search and optional filters.
2. The backend validates query parameters.
3. The search module applies visibility and publication restrictions.
4. Location filtering narrows the candidate set.
5. Craft and service relevance are evaluated.
6. Additional filters are applied.
7. Results are sorted and paginated.
8. The response returns eligible profiles and public project summaries.

## 10.3 Initial ranking strategy

Use a transparent, configurable ranking approach.

Suggested ordering:

1. Geographic relevance.
2. Craft and service match.
3. Match to the customer's requested criteria.
4. Availability or price filters, when specified and supplied.
5. Useful, complete public portfolio information.

Avoid making popularity the dominant signal. New artisans should be discoverable without already having a large audience.

The exact weighting should be measured and adjusted using user testing rather than treated as a permanent formula.

## 10.4 Geographic handling

- Allow users to select or change their search location.
- Avoid requiring precise GPS access.
- Allow broader service areas for artisans who travel to customers.
- Avoid publicly displaying exact residential coordinates by default.
- Support Nigerian locations beyond the initial marketing areas.
- Handle missing location data explicitly rather than inventing distances.

## 10.5 Future search evolution

Consider a dedicated search service only when PostgreSQL search becomes inadequate for measured scale, relevance or latency requirements.

Natural-language job matching and semantic search may be valuable later, but ordinary keyword, category and location search should work without an AI provider.

---

# 11. Messaging and inquiry workflow

The MVP messaging system should remain text-first.

## 11.1 Creating a conversation

A conversation begins when a permitted user starts a direct conversation or submits an inquiry to an artisan.

The backend should:

1. Authenticate the sender.
2. Validate the recipient and relevant profile.
3. Check blocking and account restrictions.
4. Apply rate limits and spam controls.
5. Create or retrieve the appropriate conversation.
6. Store the message or inquiry.
7. Create notification records for relevant recipients.
8. Deliver updates through realtime transport when possible.

The system should avoid creating duplicate conversations when a user retries a request.

## 11.2 Realtime delivery

WebSockets can deliver new-message notifications to connected clients.

However, PostgreSQL remains the authoritative source of message history. A disconnected user should be able to retrieve messages through normal API requests when they reconnect.

Realtime delivery must not bypass conversation membership or blocking rules.

## 11.3 Inquiry lifecycle

A basic inquiry can have a small status set, such as:

- `open`
- `closed`

Additional states should only be introduced if they represent a real user action.

The MVP does not require quotations, payment collection, scheduling or contract acceptance.

## 11.4 Blocking and reporting

Blocking should prevent new ordinary contact between the relevant users and restrict access to affected messaging interactions according to the product's safety policy.

Reporting should preserve the necessary reference to the relevant message, profile or project for authorized moderation without exposing the report to the reported user by default.

---

# 12. Notifications architecture

Notifications should be generated from application events rather than embedded in every frontend action.

Examples:

- `message.created`
- `inquiry.created`
- `project.update.published`
- `project.access.granted`
- `project.access.revoked`
- `account.security_event`

An event handler creates the appropriate notification record after checking the recipient and notification preferences.

For external delivery, use a background worker.

## Reliability considerations

- Store notification records before attempting external delivery.
- Retry temporary provider failures with bounded backoff.
- Avoid duplicate notifications when processing the same event repeatedly.
- Respect user preferences.
- Avoid exposing private message content in emails or lock-screen previews.
- Keep delivery failures observable for operators.

In-app notifications should remain usable even when email delivery fails.

---

# 13. Offline drafts and synchronization

Offline drafts are essential for users working on unreliable mobile connections.

This feature must be deliberately scoped: Decraft is not required to make every part of the application available offline.

## 13.1 Local data

Use IndexedDB for supported local drafts and pending changes.

A local draft may contain:

- Project title and description.
- Current stage.
- Draft milestone information.
- Pending progress-update text.
- References to media that still needs uploading.
- Local synchronization metadata.

Sensitive information should be minimized, and the application should define what happens to local data on sign-out or account removal.

## 13.2 Synchronization workflow

1. A user creates or edits a draft while offline.
2. The application saves the draft locally.
3. The UI marks it as pending synchronization.
4. When connectivity returns, the client sends queued changes.
5. The backend authenticates the request and validates permissions.
6. Changes are applied or a conflict is returned.
7. The client records successful synchronization.
8. Any conflict is presented clearly rather than silently overwriting work.

## 13.3 Conflict handling

For the MVP:

- Use server versions or update timestamps to detect concurrent changes.
- Avoid blindly applying last-write-wins to meaningful project edits.
- Where two edits conflict, preserve both versions or ask the user to resolve the conflict.
- Use idempotency keys for queued operations where retries could create duplicates.
- Keep offline drafts unpublished until the user explicitly publishes them.

## 13.4 Media offline behavior

The initial offline implementation may queue media uploads while online access is unavailable. It does not need to support unlimited offline video capture, editing or background uploads on every mobile browser.

Define and test supported browser behavior before promising resumable or background upload guarantees.

---

# 14. Moderation and operational tooling

The MVP does not require a dedicated moderation dashboard, but manual moderation must still be possible.

## 14.1 Minimum operational capability

Authorized operators must be able to:

- Find and review reported resources.
- Identify the reported user and relevant content.
- Restrict an account when justified.
- Remove or disable eligible content.
- Record the action taken and the reason.
- Investigate repeated abuse.
- Restore an account or content when appropriate.
- Review relevant security and moderation events.

This can initially use restricted internal tooling, protected administrative endpoints or a secure database-backed workflow. Ordinary users must not have access to these capabilities.

## 14.2 Audit requirements

Record sensitive actions such as:

- Account restrictions.
- Content removal.
- Permission changes by administrators.
- Access to sensitive moderation records.
- Changes to critical access-control settings.

Do not rely on application logs alone as the complete audit trail.

## 14.3 Moderation readiness

Before public launch, assign responsibility for monitoring and responding to reports. A report button without an operational response process is not a complete safety feature.

---

# 15. Deployment and infrastructure

## 15.1 Initial deployment units

Deploy the system as a small number of units:

1. **Web application:** React/Next.js frontend.
2. **API:** FastAPI backend.
3. **Worker:** background media and AI tasks.
4. **Database and storage:** managed PostgreSQL and object storage USE supabase.
5. **Queue:** managed or hosted Redis if required by the selected worker system.

The worker and API may share application code and release versions while running separately.

## 15.2 Environments

Maintain separate environments for:

- Local development.
- Staging/testing.
- Production.

Production credentials, storage and databases must not be reused in development.

Use migrations for database schema changes and validate them against staging before production deployment.

## 15.3 Secrets management

Store server-side credentials in the deployment platform's secret manager or equivalent secure environment configuration.

Never commit:

- Database passwords.
- Authentication service secrets.
- AI API keys.
- Storage service-role keys.
- Private signing keys.
- put .env in .gitignore
Use different credentials for different environments and rotate them when exposure is suspected.

## 15.4 Backups and recovery

Define:

- Database backup frequency.
- Recovery point and recovery time objectives.
- Object-storage backup or recovery strategy.
- Retention periods.
- Procedures for restoring deleted or corrupted data.
- Periodic restore testing.

A backup that has never been tested should not be treated as a proven recovery mechanism.

## 15.5 Monitoring

Track:

- API latency and error rates.
- Database connection and query performance.
- Upload failures.
- Media-processing queue depth.
- AI task failures, latency and cost.
- Messaging failures.
- Notification delivery failures.
- Storage usage and bandwidth.
- Authentication failures and suspicious activity.
- Privacy and authorization errors.

Monitoring should help diagnose issues without indiscriminately collecting private media or message content.

---

# 16. Testing strategy

Testing should be organized around the most important product risks.

## 16.1 Unit tests

Test:

- Project status transitions.
- Visibility evaluation.
- Client-access permissions.
- AI output validation.
- Notification preference rules.
- Search-filter logic.
- Inquiry validation.
- Synchronization conflict logic.

## 16.2 Integration tests

Test:

- Authentication and protected API requests.
- Database transactions.
- Media upload completion and processing.
- AI task creation and failure recovery.
- Messaging and participant permissions.
- Client invitation and revocation.
- Notification event handling.
- Offline synchronization against the backend.

## 16.3 End-to-end tests

Test the full workflows:

1. Register, create a profile and publish a project.
2. Upload media and generate an AI-assisted draft.
3. Review and publish an update.
4. Search for an artisan and send an inquiry.
5. Start a conversation and receive a notification.
6. Share a client-only project and revoke access.
7. Create a project draft offline and synchronize it.
8. Report and block a user.

## 16.4 Mandatory security tests

The test suite must verify that:

- User A cannot edit User B's project.
- A private project cannot be retrieved by an unauthorized account.
- Client-only content is unavailable without a valid grant.
- Revoked grants no longer authorize new access.
- A private media URL cannot bypass backend permissions.
- Per-update permissions cannot override a stricter parent-project policy.
- AI-generated content cannot be published without approval.
- A blocked user cannot continue ordinary contact through an alternate API path.
- Unauthorized users cannot access administrative moderation actions.
- Repeated or retried requests do not create duplicate messages or AI jobs unexpectedly.

These are release-blocking tests, not optional enhancements.

---

# 17. Implementation roadmap

The work should proceed in dependency order rather than starting with the most visually impressive features.

## Phase 1 — Foundation

**Deliverables**
- Repository and environments.
- Authentication.
- User and profile models.
- Profile creation and editing.
- Database migrations.
- Basic API authorization.
- Initial UI navigation.

**Exit criteria:** Users can register and create individual or business profiles securely.

## Phase 2 — Project system

**Deliverables**
- Project CRUD operations.
- Project status transitions.
- Milestones.
- Project timelines.
- Draft and publication states.
- Basic media metadata and storage integration.

**Exit criteria:** A user can create a project, attach supported media and document its progress.

## Phase 3 — Privacy and sharing

**Deliverables**
- Public/private/client-only access.
- Per-update visibility.
- Account-based client invitations.
- Private sharing links.
- Access revocation.
- Media authorization.
- Authorization test suite.

**Exit criteria:** Privacy boundaries are enforced consistently across project, update and media endpoints.

**This phase should be completed before AI processing or public discovery is allowed to expose project data.**

## Phase 4 — AI and media pipeline

**Deliverables**
- Upload processing.
- Thumbnail and preview generation.
- Background job infrastructure.
- AI provider adapter.
- Structured draft generation.
- Review and approval interface.
- AI usage monitoring.

**Exit criteria:** AI can prepare useful project drafts without publishing them or bypassing privacy controls.

## Phase 5 — Discovery and communication

**Deliverables**
- Location and category data.
- Search and filtering.
- Public portfolio views.
- Direct text messaging.
- Basic inquiries.
- Blocking and reporting.
- Notifications.

**Exit criteria:** Customers can discover eligible artisans and initiate a conversation successfully.

## Phase 6 — Offline and operational readiness

**Deliverables**
- Local project drafts.
- Synchronization queue.
- Conflict handling.
- Essential notification preferences.
- Manual moderation workflow.
- Backups and monitoring.
- Security and recovery tests.

**Exit criteria:** The product handles unreliable connectivity, operational issues and core safety scenarios.

## Phase 7 — Public MVP

**Deliverables**
- Production deployment.
- Public registration.
- User support and moderation ownership.
- Initial marketing in selected Nigerian areas.
- Usage and retention analytics.
- Feedback and incident-response procedures.

**Exit criteria:** The core product is usable, secure enough for its intended launch, observable and supported by a team capable of handling reports and failures.

---

# 18. Technical risks and decisions

| Risk | Proposed mitigation |
|---|---|
| Privacy leaks through media URLs | Private storage, backend authorization, short-lived signed URLs and access-control tests |
| AI invents project details | Structured output, source-grounded prompts, validation and mandatory approval |
| Storage costs grow unexpectedly | Measure actual media usage, generate derivatives, establish limits and monitor bandwidth |
| Offline synchronization loses work | Local persistence, version checks, idempotency and explicit conflict resolution |
| Search is empty outside core markets | Nationwide registration with focused acquisition and coverage monitoring |
| AI provider outages interrupt project creation | Manual fallback and asynchronous processing |
| Messaging becomes a spam channel | Rate limits, blocking, reporting and manual moderation |
| Stack becomes unnecessarily complex | Modular monolith, PostgreSQL-first search and only essential infrastructure |
| Future features require extensive rewrites | Clear module boundaries, stable domain entities and versioned APIs |

---

# 19. Decisions required before implementation

The following decisions should be finalized during technical planning:

1. Confirm the frontend, backend and hosting providers.
2. Confirm whether Supabase will provide both authentication and primary database hosting.
3. Choose the object-storage and private-media delivery approach.
4. Estimate representative media sizes and establish initial upload limits.
5. Select the AI provider and models after comparing quality, cost, latency and data-handling terms.
6. Define the initial geographic model and public location precision.
7. Confirm the language policy for the MVP.
8. Decide the initial notification channels.
9. Define account deletion, data retention and AI-input retention.
10. Define the moderation team's operational process.
11. Establish measurable performance and reliability targets.
12. Confirm a delivery plan based on team capacity and budget.

These decisions should be documented, but they do not require reopening the already accepted product vision or repeating the discovery process.

---

# 20. Definition of technical readiness

Decraft is ready for its public MVP when:

- The principal user journeys work end to end.
- Projects and media are stored and retrieved reliably.
- AI assists with documentation while leaving publishing under user control.
- Public discovery cannot expose private or client-only content.
- Customer messaging respects authorization and blocking.
- Offline drafts synchronize without silently losing edits.
- Reports can be reviewed and acted upon by an authorized person.
- Critical authorization and privacy tests pass.
- Costs for media and AI are observable.
- Backups and recovery procedures are documented and tested.
- The team can diagnose production errors and respond to user reports.

## Final recommendation

Build Decraft in dependency order:

**Project foundation → privacy and access control → media and AI → discovery and messaging → offline reliability → public launch.**

The biggest mistake would be to build a polished feed and AI experience first, then retrofit privacy and synchronization. Those are foundational requirements in Decraft, not secondary features.

The goal of this architecture is to launch a focused, maintainable product that makes documenting work easier and finding skilled people more useful—without paying the complexity cost of building every possible marketplace or social-network feature at once.