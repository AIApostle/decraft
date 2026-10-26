---
doc: prd
status: approved
---

# Decraft — Product Requirements

## What We're Building

Decraft is a work-centered professional network for artisans, workshops, and businesses. It gives each professional a place to document projects over time and reuse that work as a portfolio customers can discover. The learner describes it as a “GitHub for craftsmen.”

The full P0 feature set in the project PRD is the MVP and will be delivered in stages. This product plan is grounded in [the project's PRD](../PRD.md), not a replacement for its detailed requirements.

## Users and Needs

- **Artisans and small workshops** need a professional home for work currently scattered across phone galleries and social platforms. They need to add projects and progress without making a separate social post for each update.
- **Customers** need to find relevant professionals, review public work, and make contact.
- **Platform moderators** need reports, blocks, and a manual way to respond to abuse.

Business profiles are supported from launch. The P0 does not require multiple staff accounts or team permissions.

## Core Journey

1. An artisan registers, verifies access, and chooses an individual, workshop, or business profile.
2. They create a project, add media and project details, and record its stage or milestones.
3. AI may suggest organization or draft copy, but the artisan reviews and edits all suggestions.
4. The artisan chooses the project's visibility and explicitly saves it as a draft or publishes it.
5. The project appears in the appropriate portfolio or authorized client view; private information is not exposed.
6. A customer discovers an eligible public profile by location and relevant services, reviews its projects, and starts an inquiry or text conversation.
7. The artisan can document further progress; offline drafts synchronize without becoming public automatically.

## Features and Behavior

### Landing page and navigation

- The landing page pitches Decraft by telling the story from scattered work examples, to an organized project portfolio, to customer discovery and contact.
- It speaks to both sides of the product: professionals building a portfolio and customers looking for skilled work.
- The existing PRD does not define marketing-page actions. **Working assumption for review:** visitors can browse or find artisans, and artisans can start creating a professional profile.
- The app provides access to discovery, search, projects, messages, and profile capabilities, with navigation adapted to mobile and larger screens.

### Accounts and profiles

- Users can register, sign in, recover access, and complete email or phone verification.
- Onboarding supports individual, workshop, and business profiles.
- Profiles may include name, description, category/services, location, contact preferences, optional availability, and optional price range.
- Missing or unverified information is not fabricated or presented as verified.

### Projects, timelines, and media

- An artisan can create, edit, organize, and manage projects.
- Projects support planned, in-progress, and completed stages, with optional milestones and progress updates.
- Projects can include photos, videos, voice notes, and other supported files, subject to validated limits.
- The timeline keeps updates attached to their project so portfolio information can be reused.

### AI-assisted project organization

- AI can assist with organizing submitted project material and drafting titles, descriptions, stages, or updates.
- Suggestions remain drafts until the artisan reviews and explicitly approves publication.
- The user can proceed with manual project work when AI is unavailable.

### Visibility and client access

- Projects support public, private, and client-only visibility.
- Client access can be granted through an invitation or private link with permissions and revocation.
- Private and client-only projects and media do not appear in public discovery.
- Access controls are enforced by the server and media delivery, not only by hiding UI elements.

### Discovery, contact, and messaging

- Customers can discover professionals by location and search by craft, services, project examples, availability, and price range where provided.
- Results prioritize geographic and service relevance; popularity is not the dominant ranking signal.
- A public profile supports configured external contact methods and built-in text messaging.
- Customers can submit a basic job inquiry. Messaging is not a contract, accepted quote, or confirmed job.
- Blocking, reporting, and spam controls apply to interactions.

### Notifications and safety

- Users receive essential account/security, message, inquiry, and relevant project-activity alerts, with controls for supported categories.
- Notifications must not reveal private project information to unauthorized recipients.
- Users can report profiles, projects, and interactions, and block other users.
- Manual moderation is operationally possible; moderation decisions are recorded.

### Offline drafts and synchronization

- Users can create and edit project drafts while disconnected.
- The interface distinguishes local, pending-sync, and synchronized changes.
- Changes synchronize when connectivity returns without silently overwriting work.
- Synchronization never publishes a draft; sensitive local information is handled appropriately on sign-out or account removal.

### Responsive experience

- The landing page and all app flows work on phones and larger screens.
- Essential project documentation, privacy, discovery, and contact actions remain usable on small touch screens and keyboard navigation.

## Acceptance Criteria

- A user can register, select one of the supported profile types, and complete a basic profile.
- An artisan can create a project with media, describe its progress, choose visibility, and keep it unpublished until explicitly approved.
- An AI suggestion is editable and never becomes public without an explicit artisan action.
- A customer can find a public profile using location and service criteria, review eligible projects, and start a contact action.
- Private and client-only content is inaccessible through public profile, search, and media flows; revoked client access no longer works.
- A user can report or block another user; essential messaging and inquiry alerts do not expose protected project details.
- An artisan can prepare an offline draft, see its sync status, and retain draft status after synchronization.
- Core journeys remain operable at mobile and desktop viewport sizes.

## Look and Feel

The learner wants the landing page to tell the product story and the whole app to be responsive. The PRD positions Decraft as practical, professional, and trust-first, centered on work rather than general social engagement. Specific visual references, typography, and palette are not yet established.

## Product Decisions

- The full P0 feature set in the existing PRD is treated as the MVP, delivered in stages, per the learner's direction.
- The project-to-portfolio journey is the first demonstrable slice; it establishes the product's unique project-centered kernel.
- The landing page serves both professionals and customers. Its initial browse/create actions are an assumption derived from the PRD's discovery and registration journeys and are open for correction.
- P1 and P2 capabilities remain later priorities as classified in the source PRD.

## Deferred and Out of Scope

P1 storage tiers, business analytics, and paid features; P2 reviews and ratings, workshop team management, payments and contracts, and advanced verification remain deferred. The MVP also excludes a general-purpose social feed, payment processing, full job bidding, formal contracts, and dispute resolution.

## Source

The detailed source of truth is the top-level [Decraft PRD](../PRD.md), especially its MVP priorities, functional requirements, user journeys, information architecture, and launch acceptance criteria.
