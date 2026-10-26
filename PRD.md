

# Decraft — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Ready for solution design and MVP implementation planning  
**Product:** Decraft  
**Initial market:** Nigeria, with an Africa-wide expansion vision  
**Product category:** Work-centered social network, project portfolio and artisan discovery platform

---

## 1. Executive summary

Decraft is a platform where artisans, independent professionals, workshops and businesses document their work through structured projects, build professional portfolios, and get discovered by customers.

Today, many artisans showcase their work across scattered WhatsApp conversations, Instagram posts, Facebook pages, videos and personal phone galleries. Customers often struggle to find relevant professionals, assess their experience, understand the work they have completed, and contact someone suitable.

Decraft brings this experience together in one place.

Every piece of work is represented as a project. Projects contain media, descriptions, progress updates and optional milestones. AI assists with organizing uploaded content, proposing project stages and drafting updates. The artisan reviews and approves any content before it becomes public.

Customers discover artisans primarily by location, with filters for craft, services, project examples, availability and price range. They can view portfolios, use external contact methods, submit inquiries and communicate through built-in text messaging.

Decraft is designed as a professional network centered on work rather than a conventional social network centered on general posts and engagement.

### Product positioning

**Your craft. Your work. Your reputation.**

### Core product loop

Capture work → organize the project → publish progress → build a portfolio → get discovered → receive inquiries → document future work.

---

## 2. Vision and objectives

### 2.1 Vision

Become a trusted digital home for skilled work across Africa, helping artisans build lasting professional reputations and helping customers find the right people for the job.

### 2.2 Product objectives

1. Give artisans a structured, reusable portfolio of their work.
2. Make documenting ongoing projects easier through AI-assisted organization.
3. Help customers discover relevant artisans, especially within their preferred locations.
4. Enable customers and artisans to initiate and manage professional conversations.
5. Preserve control over private, public and client-shared project information.
6. Encourage ongoing project documentation and repeat platform usage.
7. Establish a scalable foundation for individual professionals, workshops and businesses.

### 2.3 Non-goals for the MVP

The first release is not intended to provide:

- Escrow, payment processing or pooled funds.
- Full job bidding, contracting or dispute resolution.
- Formal customer reviews or star-rating systems.
- Mandatory identity verification or certification of craftsmanship.
- Advanced workshop team management and staff permissions.
- A full social network with extensive likes, comments and content collections.
- AI-based automatic public publishing.
- Complex customer relationship management tools.
- A comprehensive native Android or iOS application, unless separately approved during solution design.

These may be considered later based on evidence of user demand.

---

## 3. Target users and roles

### 3.1 Independent artisan

An individual who performs skilled work, such as tailoring, electrical installation, plumbing, carpentry, photography, beauty services, repairs, painting or other trades.

**Needs**
- A professional profile.
- A simple way to document completed and ongoing work.
- Help organizing photos, videos and voice notes.
- Discovery by customers.
- Control over what customers can see.
- A straightforward way to receive inquiries.

### 3.2 Workshop or business

An established business or workshop that offers services and manages a collection of projects.

**Needs**
- A business identity and public profile.
- Project portfolios associated with the business.
- Business contact details and service information.
- Customer discovery and messaging.

For the MVP, a single account manages the business profile and its projects. Separate staff accounts, team invitations and role-based permissions are deferred.

### 3.3 Customer

An individual or organization looking for a skilled professional or service provider.

**Needs**
- Discover artisans near a chosen location.
- Browse relevant projects and services.
- Understand an artisan's documented experience.
- Filter candidates based on practical criteria.
- Contact an artisan externally or through Decraft.
- Share project requirements through a basic inquiry.

### 3.4 Platform administrator

An authorized person responsible for handling reports, abuse, spam, support requests and account restrictions.

The MVP will use manual moderation processes and available internal tools rather than a dedicated administrative dashboard.

### 3.5 Account and profile model

Decraft must support both individual and business identities from launch.

During onboarding, users select their profile type. A user may register as an individual, workshop or business. The system must not assume every professional is a sole individual.

The exact rules for converting profile types, managing multiple profiles under one account and transferring business ownership must be defined during solution design.

---

## 4. Core product principles

### 4.1 Work is the primary content

Projects—not standalone posts—are the fundamental unit of content.

### 4.2 Document once, reuse everywhere

Project information should support the artisan's portfolio, discovery results and customer evaluation without requiring repeated manual entry.

### 4.3 AI assists; artisans decide

AI may organize drafts and propose descriptions, stages and updates. It must not publish publicly without explicit approval.

### 4.4 Privacy must be enforced

Project visibility must be enforced on the server and in media access, not merely hidden in the user interface.

### 4.5 Evidence is not verification

A documented project timeline shows what has been recorded. It does not independently prove that the artisan performed the work, that the images are authentic, or that the quality meets a particular standard.

### 4.6 Build for practical conditions

The experience must be mobile-first, resilient to poor connectivity and careful with media storage and bandwidth.

### 4.7 Avoid premature complexity

Build the smallest complete product that solves the portfolio, documentation and discovery problem well.

---

## 5. MVP scope and priorities

| Priority | Capability | MVP requirement |
|---|---|---|
| P0 | Authentication | Registration, sign-in, account recovery and email or phone verification |
| P0 | Profiles | Individual, workshop and business profiles |
| P0 | Projects | Create, edit, organize and manage projects |
| P0 | Project timeline | Planned, in-progress and completed stages, with optional milestones |
| P0 | Media | Photos, videos, voice notes and other relevant project files, subject to validated limits |
| P0 | AI assistance | Organize media and prepare project updates in draft form |
| P0 | Publishing | Explicit artisan approval before public publication |
| P0 | Privacy | Public, private and client-only project visibility |
| P0 | Client access | Account invitations and private links, with access permissions and revocation |
| P0 | Discovery | Location-first discovery and practical search filters |
| P0 | Customer contact | Simple contact button and external contact options |
| P0 | Messaging | Built-in direct text messaging and basic job inquiries |
| P0 | Notifications | Essential alerts and relevant project activity, with user controls |
| P0 | Safety | User blocking, reporting and manual moderation |
| P0 | Connectivity | Mobile optimization, offline drafts and synchronization |
| P1 | Storage tiers | Establish limits based on cost and observed usage |
| P1 | Business analytics | Consider after validating user needs |
| P1 | Paid features | Evaluate only after early usage validation |
| P2 | Reviews and ratings | Consider after reliable review eligibility can be established |
| P2 | Team management | Multi-user workshop and business permissions |
| P2 | Payments and contracts | Separate product and operational evaluation |
| P2 | Advanced verification | Optional identity, business or credential verification |

P0 means required for the first public MVP. P1 and P2 are later priorities, not commitments to implement immediately after launch.

---

## 6. Functional requirements

### 6.1 Registration and authentication

**FR-001:** Users must be able to register, sign in and recover account access.

**FR-002:** The system must support email or phone verification as an account-safety measure.

**FR-003:** Onboarding must begin with selecting an account/profile type: individual, workshop or business.

**FR-004:** Users must be able to create a basic profile without completing every optional field.

**FR-005:** The system should encourage users to complete relevant profile details progressively.

**FR-006:** Users must be able to edit their profile and contact preferences.

**FR-007:** Account recovery must not expose private projects, messages or customer information.

### 6.2 Professional profiles

Profiles should support:

- Display name or business name.
- Profile image or business logo.
- Profile description.
- Craft and service categories.
- Location.
- Services offered.
- Portfolio of eligible public projects.
- Contact preferences and available contact methods.
- Availability information, where provided.
- Optional price range.
- Account type.

The product must distinguish between information the user has supplied and information independently verified by Decraft. No verification badge should be implied by ordinary registration.

**FR-008:** Customers must be able to view public profiles without gaining access to private project information.

**FR-009:** Profiles must clearly distinguish public portfolio content from content available only to authorized clients.

**FR-010:** Business profiles must work without requiring team collaboration features in the MVP.

### 6.3 Project management

Every piece of work documented in Decraft must belong to a project.

A project should contain:

- Project title.
- Description.
- Craft or service category.
- Relevant media.
- Current project stage.
- Optional milestones.
- Progress updates.
- Creation and update timestamps.
- Visibility settings.
- Optional customer access grants.
- Optional location and other discovery metadata.

**FR-011:** Users must be able to create, edit and manage projects.

**FR-012:** Each project must support the guided stages:
- Planned.
- In progress.
- Completed.

**FR-013:** Users must be able to add optional milestones to explain key stages of work.

**FR-014:** Users must be able to add progress updates to an existing project timeline.

**FR-015:** Progress updates must remain inside their parent project. They must not become separate standalone feed posts.

**FR-016:** Users must be able to edit project information and manage project visibility.

**FR-017:** The system must maintain appropriate timestamps for project creation and updates.

**FR-018:** The system must not treat the completed stage as independent proof that a customer approved the work or that the work meets a quality standard.

### 6.4 Project timeline and media

Supported media types include photos, videos, voice notes and other relevant project files, subject to supported formats and validated upload limits.

**FR-019:** Users must be able to attach media to projects and relevant progress updates.

**FR-020:** Project timelines must display updates in a clear chronological order.

**FR-021:** Users must be able to distinguish planned work, ongoing work and completed work.

**FR-022:** The system must support before-and-after documentation when users provide the relevant media.

**FR-023:** Users must be able to review, remove or replace media they control, subject to applicable retention and access rules.

**FR-024:** The interface must show upload progress and communicate failures clearly.

**FR-025:** Uploads should support recovery or resumption where technically feasible.

**FR-026:** Media storage limits, maximum file sizes, video-duration limits and supported formats must be established after cost analysis and user testing. They must not be invented as fixed requirements in this PRD.

### 6.5 AI-assisted project organization

AI is a core product capability, not a separate general-purpose chatbot.

The AI system should reduce the work required to transform raw project media into an organized, useful portfolio.

Expected capabilities:

- Analyze uploaded media where supported.
- Group related media into proposed project structures.
- Suggest project titles and descriptions.
- Suggest relevant categories.
- Propose possible stages or milestones.
- Draft progress updates from available media and user-provided context.
- Help turn voice notes into usable text where speech recognition supports the language.
- Identify missing information and ask for clarification when necessary.

**FR-027:** AI-generated changes must initially be treated as drafts.

**FR-028:** The system must require explicit user approval before AI-generated content is published publicly.

**FR-029:** The user must be able to edit or reject AI-generated content.

**FR-030:** AI must not invent dates, materials, prices, client approvals, certifications, project outcomes or other unsupported facts.

**FR-031:** AI should distinguish observations from assumptions and request clarification when available evidence is insufficient.

**FR-032:** The system must preserve the user's original media and prevent AI transformations from silently overwriting source files.

**FR-033:** The interface must make it clear when text or project organization has been generated or suggested by AI.

**FR-034:** AI processing must respect project permissions. Private project content must not be exposed to unauthorized users through AI outputs, logs or generated summaries.

**FR-035:** The system must handle processing failures gracefully and allow manual project creation and editing when AI is unavailable.

### 6.6 Project visibility and client access

Every project must have one of three visibility modes:

1. **Public:** eligible content may appear on the public profile and in discovery.
2. **Private:** only the owner and authorized platform processes can access the project.
3. **Client-only:** the project is shared with specifically authorized customers.

The product must also support controlling which individual progress updates are visible to a client.

**FR-036:** Users must be able to change project visibility.

**FR-037:** Users must be able to grant access through account invitations and private sharing links.

**FR-038:** Authorized users must be able to revoke client access.

**FR-039:** Project owners must be able to control which updates are visible to authorized clients.

**FR-040:** Private and client-only projects must not appear in public discovery results.

**FR-041:** Private media must not become accessible simply because a user knows or guesses its URL.

**FR-042:** Authorization must be enforced by backend access controls for project records, updates, media and sharing links.

**FR-043:** Revoked access must prevent future access to protected content, subject to explicitly documented caching and already-downloaded-copy limitations.

**FR-044:** Sharing links must use sufficiently unpredictable tokens, support revocation and avoid exposing sensitive information in their URLs.

**FR-045:** The system must make the audience and visibility of an update clear before publication.

The PRD does not promise that Decraft can retrieve or erase copies of media that an authorized recipient has already downloaded or captured outside the platform.

### 6.7 Artisan discovery and search

Discovery is location-first, but relevance must still matter.

Customers must be able to search for artisans and browse public portfolios.

**FR-046:** Discovery must prioritize the customer's selected location or geographic area.

**FR-047:** Customers must be able to filter by:
- Location.
- Craft category.
- Services offered.
- Project examples.
- Availability.
- Price range, where supplied by the artisan.

**FR-048:** Search results must display relevant public profile information and project examples.

**FR-049:** Discovery must exclude private projects, client-only content and unauthorized media.

**FR-050:** The system must not invent availability, price information, credentials or service offerings.

**FR-051:** Missing profile data must be handled transparently rather than fabricated.

**FR-052:** Customers must be able to search beyond their immediate location.

**FR-053:** Location-based search must work across supported Nigerian locations, not only the initial marketing areas.

**FR-054:** The system should avoid making popularity the dominant ranking signal, especially for new artisans.

The initial ranking model should prioritize geographic relevance and matching craft or service needs. The exact distance calculation, ranking weights, handling of incomplete location data and tie-breaking rules must be defined and tested during implementation.

### 6.8 Customer inquiries and contact

**FR-055:** Public artisan profiles must provide a simple contact action.

**FR-056:** Users must be able to choose supported external contact methods, such as phone or WhatsApp, where configured.

**FR-057:** Customers must be able to initiate a built-in text conversation with an artisan.

**FR-058:** Customers must be able to send a basic job inquiry.

**FR-059:** Inquiries and direct messages must be associated with the relevant participants and maintain conversation history.

**FR-060:** Messaging must support text in the MVP. Message attachments are out of scope for the first release.

**FR-061:** The interface must distinguish a message conversation from a formal contract, accepted quotation or confirmed job.

**FR-062:** Users must be able to block other users and report problematic conversations or accounts.

**FR-063:** Messaging access and notifications must respect account status and applicable safety restrictions.

**FR-064:** The system must use appropriate spam controls and rate limits to reduce abusive messaging.

No payment, escrow, formal quotation, contract signing or dispute-resolution workflow is required in the MVP.

### 6.9 Notifications

The system must provide essential account and communication alerts, plus relevant project activity.

**FR-065:** Users must receive notifications for new messages and customer inquiries.

**FR-066:** Users must receive relevant account and security alerts.

**FR-067:** Users must be able to configure notification preferences for supported notification categories.

**FR-068:** Notifications must not reveal the content of private projects to unauthorized recipients.

**FR-069:** The system should avoid excessive, repetitive or irrelevant notifications.

**FR-070:** Notification delivery should handle temporary failures and avoid unnecessary duplicate alerts.

The precise initial channels—such as in-app and email—must be confirmed during solution design. WhatsApp notification integration is not a launch requirement.

### 6.10 Offline drafts and synchronization

**FR-071:** Users must be able to prepare project drafts when connectivity is unavailable.

**FR-072:** Offline drafts must remain available locally until the user can synchronize them.

**FR-073:** The system must synchronize pending drafts when connectivity returns.

**FR-074:** The interface must distinguish local, pending-sync and successfully synchronized changes.

**FR-075:** Synchronization conflicts must be handled without silently overwriting user work.

**FR-076:** Offline drafts must not become public merely because synchronization occurs.

**FR-077:** The system must protect locally stored sensitive information and avoid retaining it indefinitely when an account is signed out or removed, subject to the defined product behavior.

The MVP must not claim full offline operation. The minimum requirement is offline draft creation and reliable synchronization.

### 6.11 Trust, safety and moderation

**FR-078:** Users must be able to report profiles, projects and inappropriate interactions.

**FR-079:** Users must be able to block other users.

**FR-080:** Authorized moderators must have a secure method to review reports and apply account restrictions, even if the initial process uses internal tools and manual workflows.

**FR-081:** Reports must contain enough information to identify the relevant content or account and understand the issue.

**FR-082:** Moderation actions should be recorded in an appropriate internal audit trail.

**FR-083:** The system must implement basic spam prevention and rate limiting.

**FR-084:** Users must not be able to bypass blocking and access controls through ordinary profile, project or messaging flows.

**FR-085:** Decraft must communicate that portfolios and timelines are user-submitted content, not independently verified proof of professional competence.

A dedicated administrative dashboard, advanced fraud detection and formal artisan certification are deferred. However, manual moderation must still be operationally possible before the public MVP launches.

### 6.12 Business model

The initial MVP will be free to use while the team validates user behavior.

**FR-086:** No paid subscription, promoted listing or mandatory payment should block initial portfolio creation, project documentation or ordinary discovery.

**FR-087:** The product architecture should allow future storage tiers, professional tools and business features without requiring a fundamental redesign.

**FR-088:** Monetization decisions must be informed by observed usage, user interviews, infrastructure costs and evidence of willingness to pay.

**FR-089:** If paid visibility is introduced later, promoted results must be clearly labeled and distinguishable from organic relevance-based results.

No specific subscription prices, revenue targets or storage quotas are established in this version.

---

## 7. User journeys

### Journey A: An artisan joins Decraft

1. The user registers and verifies their email or phone.
2. They select an individual, workshop or business profile.
3. They enter basic profile information and location.
4. They create a first project.
5. They add photos, videos, voice notes or other supported media.
6. AI suggests organization, a title, a description and possible stages.
7. The artisan reviews and edits the suggestions.
8. The artisan saves the project as a draft or explicitly publishes it.
9. The public project becomes eligible for discovery only if its visibility permits it.

**Success condition:** The artisan can publish a useful portfolio project without needing to master complicated publishing tools.

### Journey B: An artisan documents ongoing work

1. The artisan opens an existing project.
2. They add new media or a progress update.
3. AI proposes an update based on the available context.
4. The artisan reviews and approves the draft.
5. The update appears in the project's timeline with the correct visibility.
6. The timeline reflects the project's updated stage and progress.

**Success condition:** Updating a project is easier than composing a separate social-media post.

### Journey C: A customer discovers an artisan

1. The customer opens discovery or search.
2. They select a location or area.
3. They filter by craft, services, project examples, availability or price range.
4. They open relevant public profiles and projects.
5. They review the artisan's documented work.
6. They contact the artisan through an external contact method or built-in messaging.
7. They can continue the discussion through the relevant conversation.

**Success condition:** A customer can move from discovery to meaningful contact without unnecessary steps.

### Journey D: An artisan shares a client-only project

1. The artisan creates a project and selects client-only visibility.
2. They invite a specific customer or create a private sharing link.
3. They select which project updates the customer can access.
4. The customer opens the project after the access check succeeds.
5. The artisan may change permissions or revoke access.
6. Future access to protected content is denied after revocation.

**Success condition:** The artisan can share relevant work with a client without exposing the entire project publicly.

### Journey E: An artisan works offline

1. The artisan begins a project draft while disconnected.
2. The draft and permitted edits are saved locally.
3. The interface shows that the draft has not synchronized.
4. Connectivity returns.
5. The system synchronizes the draft and resolves any conflicts safely.
6. The draft remains unpublished until the artisan approves publication.

**Success condition:** Poor connectivity does not cause the artisan to lose their work or accidentally publish it.

---

## 8. Information architecture

The primary application navigation should remain simple and mobile-first.

### Main navigation

1. **Home / Discover:** Location-first discovery and relevant public projects.
2. **Search:** Search and filter artisans, services and projects.
3. **Projects:** Create, manage and update the user's projects.
4. **Messages:** Direct conversations and job inquiries.
5. **Profile:** Professional profile, settings and account management.

The exact navigation labels and mobile layout can be refined during UX design, but these capabilities must remain accessible.

### Main screens

- Registration and sign-in.
- Account type selection.
- Progressive profile setup.
- Home/discovery.
- Search and filter results.
- Artisan or business profile.
- Project detail and timeline.
- Create/edit project.
- AI-assisted project organization.
- Media upload and review.
- Project visibility and client access management.
- Inbox and conversation.
- Basic job inquiry.
- Notifications.
- Profile and privacy settings.
- Report/block flows.
- Offline draft and synchronization status.

---

## 9. Data model

The following entities provide a logical starting point. They do not mandate a specific database or implementation technology.

### User
- User identifier.
- Authentication reference.
- Verification status.
- Account status.
- Creation and update timestamps.

### Profile
- Profile identifier.
- Owner user identifier.
- Profile type: individual, workshop or business.
- Display name.
- Description.
- Location.
- Craft categories and services.
- Contact preferences.
- Optional availability and price-range information.

### Project
- Project identifier.
- Owner profile identifier.
- Title and description.
- Craft/service category.
- Current stage.
- Visibility.
- Creation and update timestamps.
- Optional project location.
- Optional discovery metadata.

### Project update
- Update identifier.
- Parent project identifier.
- Text and relevant metadata.
- Creation timestamp.
- Visibility or access policy.
- Publication state.

### Project media
- Media identifier.
- Parent project or update identifier.
- Media type.
- Storage reference.
- File metadata.
- Processing status.
- Access policy.
- Creation timestamp.

### Milestone
- Milestone identifier.
- Parent project identifier.
- Title and optional description.
- Status or completion information.
- Relevant timestamps.

### Client access grant
- Grant identifier.
- Project identifier.
- Authorized user or secure sharing-link reference.
- Permitted update scope.
- Expiration, where applicable.
- Revocation status.
- Creation timestamp.

### Conversation
- Conversation identifier.
- Relevant participants.
- Optional related project or inquiry.
- Creation timestamp.
- Conversation status.

### Message
- Message identifier.
- Conversation identifier.
- Sender identifier.
- Text content.
- Creation timestamp.
- Delivery/read metadata, where supported.

### Job inquiry
- Inquiry identifier.
- Customer identifier.
- Artisan/profile identifier.
- Optional related project.
- Inquiry text.
- Status.
- Creation and update timestamps.

### Notification
- Notification identifier.
- Recipient identifier.
- Notification category.
- Related resource reference.
- Read status.
- Creation timestamp.

### AI generation record
- Record identifier.
- Relevant user and project references.
- Input and output references, subject to retention policy.
- Generation type.
- Processing status.
- Approval state.
- Relevant timestamps.

The implementation must define appropriate retention and privacy rules for messages, media, AI records and revoked access grants.

---

## 10. Non-functional requirements

### 10.1 Performance

- Common profile, project and search screens should load quickly on ordinary mobile connections.
- Media thumbnails and previews should be optimized separately from original files.
- Large media processing should not block ordinary navigation.
- The system should provide clear loading, processing and failure states.

Exact performance targets must be defined and measured during implementation and testing.

### 10.2 Reliability

- Project edits and drafts must not be silently lost.
- Failed uploads must be communicated clearly.
- Synchronization must be recoverable.
- AI service failures must not prevent manual project creation or editing.
- Errors should be logged in a way that supports debugging without unnecessarily collecting private content.

### 10.3 Security and privacy

- Enforce authentication and authorization on protected resources.
- Use secure password and session-management practices through the chosen authentication solution.
- Enforce project and update visibility on the backend.
- Protect private media with appropriate access controls.
- Use secure, revocable sharing links.
- Apply rate limits to authentication, uploads, messaging and other abuse-prone endpoints.
- Protect account recovery and prevent unauthorized account takeover.
- Define data retention, account deletion and backup policies.
- Avoid logging sensitive private messages or media content unnecessarily.
- Keep secrets and service credentials out of client-side code.

### 10.4 Accessibility and usability

- Use readable text, sufficient contrast and clear controls.
- Ensure the essential project and messaging workflows work on small screens.
- Avoid making AI assistance mandatory.
- Clearly explain privacy and publication settings.
- Provide useful error messages and recovery actions.

### 10.5 Scalability and operating costs

- Media storage and delivery must be measured and monitored.
- Image/video processing should be designed to control bandwidth and compute usage.
- AI usage must be observable so that per-project processing costs can be estimated.
- The system should allow storage limits and AI usage policies to evolve as actual usage becomes clearer.

---

## 11. Language, geography and rollout

### 11.1 Initial market

The first country is Nigeria, but registration will be open nationwide.

Marketing and user acquisition should focus on selected areas to build sufficient local coverage. This is a distribution strategy, not a restriction preventing people in other Nigerian locations from joining.

### 11.2 Africa-wide vision

Decraft should be designed so that future expansion can support additional countries, regional location data, craft taxonomies and country-specific requirements.

The product must not hard-code assumptions that make expansion beyond Nigeria impractical.

### 11.3 Language policy

The precise MVP language policy remains to be confirmed. An English-first interface is a provisional implementation assumption, not a final user-approved decision.

Future language expansion should consider demand and the languages artisans and customers actually use. AI transcription and generated descriptions must not claim reliable support for languages that have not been tested.

### 11.4 Rollout strategy

The accepted release strategy is a public MVP with iterative improvement.

Before public launch, the team should validate critical workflows with a representative group of artisans and customers, especially project creation, media upload, discovery, messaging, privacy and synchronization.

---

## 12. Success metrics

Decraft's primary early success measure should be **repeat project documentation**, supported by evidence that customers can discover and contact artisans.

### North-star metric

**Weekly active project documenters:** the number of distinct artisan or business profiles that make a meaningful project update during a week.

A meaningful update should represent a substantive action, such as adding a progress update, adding project media or changing a project's stage—not simply opening a screen.

### Supporting metrics

#### Project documentation
- Percentage of new artisan profiles that publish a first project.
- Time from registration to first published project.
- Percentage of active artisans who update projects repeatedly.
- Number of meaningful project updates per active artisan.
- Percentage of projects that progress through documented stages.

#### Retention
- Weekly and monthly active artisans.
- Week-over-week and month-over-month retention.
- Percentage of artisans who return to update an existing project.
- Percentage of customers who return to discover or contact artisans.

#### Discovery
- Searches that result in a relevant profile view.
- Profile views that lead to contact actions.
- Search-to-profile and profile-to-contact conversion rates.
- Search-result coverage by location and craft category.

#### AI value
- Percentage of AI drafts accepted with or without edits.
- Percentage of AI suggestions rejected.
- Time required to create or update a project, measured through user testing.
- AI processing cost per active artisan and per meaningful project update.

#### Reliability and safety
- Upload and synchronization failure rates.
- Privacy incidents and unauthorized-access attempts.
- Report-handling time.
- Message delivery failures and spam reports.

### Measurement principle

Do not treat total registrations, total uploads or raw engagement as proof of product-market fit. The most important question is whether artisans keep documenting work and whether customers find the resulting portfolios useful.

Numerical targets should be set after establishing a baseline from the initial user cohort rather than inventing arbitrary targets now.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Sparse discovery results across Nigeria | Open registration nationwide but focus acquisition in selected areas; monitor coverage by location and craft |
| Artisans do not maintain portfolios | Minimize project update effort through AI assistance, guided stages and offline drafts |
| AI invents project details | Ground outputs in available information, allow editing and require approval before public publishing |
| Media storage becomes expensive | Measure usage, compress previews, establish tested limits and monitor delivery costs |
| Private client work is exposed | Enforce permissions on backend endpoints and media access; support access revocation |
| Fake or misleading portfolios | Clearly communicate that documentation is user-submitted and not independently verified |
| Spam and harassment | Provide blocking, reporting, rate limits and an operational manual moderation process |
| Customers cannot assess reliability | Present organized project histories and relevant service information without implying unsupported verification |
| Too many features delay launch | Keep reviews, payments, advanced social functions and team collaboration outside the MVP |
| Monetization reduces participation | Validate free usage and willingness to pay before introducing paid restrictions |

---

## 14. Launch acceptance criteria

The MVP is not ready for public launch until the following conditions are satisfied.

### Accounts and profiles
- Users can register, verify, sign in and recover accounts.
- Individual, workshop and business profiles work.
- Users can complete basic profiles and edit them.

### Projects and AI
- Users can create projects, add media, edit descriptions and manage stages.
- Project updates appear within the correct project timeline.
- AI can assist with supported organization and drafting tasks.
- AI-generated content cannot be published publicly without explicit approval.
- Users can continue working when AI is unavailable.

### Discovery and contact
- Customers can search and filter by the supported criteria.
- Location-first discovery returns only eligible public profiles and projects.
- Customers can initiate built-in text conversations and basic inquiries.
- External contact options work when configured.

### Privacy and safety
- Public, private and client-only visibility is enforced.
- Per-update client visibility is respected.
- Invitations and sharing links work with permission checks and revocation.
- Unauthorized users cannot access private media through direct URLs.
- Blocking and reporting function as intended.
- A real person with appropriate authorization can handle reports and apply restrictions.

### Connectivity and notifications
- Offline project drafts survive disconnection and synchronize when connectivity returns.
- Synchronization does not silently overwrite conflicting work.
- Notifications are delivered for essential supported events and respect user preferences.
- Private content is not exposed through notification previews or unauthorized delivery.

### Operational readiness
- Media and AI costs can be monitored.
- Critical errors and security-relevant events can be investigated.
- Backup, recovery, account deletion and data-retention behavior are documented.
- The support and moderation process is operational.
- Core workflows have been tested on representative mobile devices and network conditions.

---

## 15. Implementation phases

### Phase 1 — Product foundation
- Authentication and account types.
- Individual and business profiles.
- Project data model and visibility rules.
- Basic project creation and editing.

### Phase 2 — Project documentation
- Media uploads and processing.
- Project timelines and milestones.
- AI-assisted organization and draft generation.
- Publication approval workflow.
- Offline drafts and synchronization.

### Phase 3 — Discovery and communication
- Location-first discovery.
- Search and filters.
- Public profiles and portfolios.
- Built-in text messaging and job inquiries.
- External contact actions.

### Phase 4 — Safety and operational readiness
- Notifications and preferences.
- Blocking, reporting and rate limiting.
- Manual moderation workflow.
- Privacy, access-control and recovery testing.
- Storage and AI cost monitoring.

### Phase 5 — Public MVP and validation
- Open registration across Nigeria.
- Focused marketing in selected areas.
- Measure repeat project documentation and retention.
- Interview artisans and customers.
- Fix onboarding, performance, discovery and privacy issues based on observed behavior.

### Phase 6 — Evidence-driven expansion
Potential additions include reviews tied to genuine jobs, advanced business tools, team collaboration, optional verification, paid professional features, additional languages and other African markets.

Each addition should be justified by observed needs and a separate scope decision.

---

## 16. Decisions reserved for solution design

The following items should be settled before or during implementation planning:

1. **Technology stack:** frontend, backend, database, authentication, object storage, background processing and hosting.
2. **Media policy:** supported formats, file sizes, video duration, compression strategy and initial storage limits.
3. **AI architecture:** model/provider selection, cost limits, media-processing workflow, retry behavior and data-retention policy.
4. **Location implementation:** supported geographic granularity, distance calculations and handling of users who do not provide a precise location.
5. **Search ranking:** exact weighting of location, craft relevance, service match and other signals.
6. **Sharing-link policy:** expiration behavior, authentication requirements and whether links can be restricted to particular recipients.
7. **Messaging behavior:** delivery/read indicators, conversation retention, spam controls and notification channels.
8. **Offline synchronization:** local storage strategy, conflict resolution and device sign-out behavior.
9. **Language policy:** MVP interface languages and tested AI language support.
10. **Operational ownership:** who handles support, moderation reports, account restrictions and security incidents.

These decisions must be documented before the affected features are considered complete.

---

## 17. Final product definition

Decraft is a mobile-first, AI-assisted professional work network for artisans, workshops and businesses. It turns scattered project media into structured, shareable work histories; helps customers discover relevant professionals through location-first search; and supports direct communication while protecting private and client-specific information.

Its distinguishing value is not merely that artisans can post photos. It is that they can **build an organized, evolving record of their work**, with AI reducing the effort required to maintain it.

The MVP succeeds when artisans repeatedly document their projects, customers find those portfolios useful, and meaningful conversations result—without compromising privacy or making the product unnecessarily complex.

**Decraft's first priority is to make documenting work effortless and discovering skilled people useful. Everything else should earn its place after that foundation works.**