# Orbit Public Showcase Redesign

**Date:** 2026-07-17  
**Status:** Approved

## Goal

Turn Orbit's public entry point into a polished product showcase with the clarity and confidence of Assistive while preserving Orbit's distinct identity and working dashboard. The page must make an AWS challenge judge understand within seconds that Orbit wakes automatically, reads several sources, ranks what matters, delivers a briefing, and leaves evidence.

## Chosen approach

Use one integrated React experience:

1. Public visitors first see the showcase.
2. The showcase embeds a realistic, read-only briefing preview as its primary product proof.
3. “View today's briefing” opens the existing demo dashboard.
4. “Private access” opens the existing token gate.
5. Authenticated users retain the current private dashboard, task CRUD, report history, theme, and Run now controls.

No router, framework migration, backend contract change, or new runtime dependency is required.

## Visual direction

The design is inspired by Assistive's strong product framing, restrained SaaS palette, generous spacing, and asymmetric feature storytelling without copying its brand or composition.

- **Canvas:** cool mist blue.
- **Surface:** pale blue-white.
- **Ink:** deep blue-black.
- **Signal:** restrained teal.
- **Alert:** muted warm red, used only for exceptions.
- **Display type:** Familjen Grotesk Variable.
- **Body and utility type:** IBM Plex Sans Variable.
- **Texture:** subtle orbital-line pattern and low-contrast ambient fields; no stock imagery.
- **Motion:** one orchestrated page-entry sequence and restrained scroll/hover transitions, all disabled under reduced-motion preference.

The signature element is a continuous orbital path connecting schedule, sources, reasoning, delivery, and archived proof.

## Information architecture

### Navigation

- Orbit brand
- How it works
- Sources
- Proof
- Private access
- Primary action: View demo

The mobile navigation remains compact and avoids a bulky wrapped header.

### Hero

- Headline: “Your day, already ranked.”
- Supporting copy explains that Orbit wakes before Joel, reads work signals, and returns a focused briefing.
- Primary action opens the public briefing demo.
- Secondary text action moves to the process explanation.
- The right side contains a layered product window built from the real wake trace, top priorities, and source evidence rather than a decorative mockup.

### Trust strip

A compact strip identifies the real services in the loop: EventBridge Scheduler, Lambda, DynamoDB, OpenAI, SES, S3, and CloudWatch. This is technical proof, not a logo wall.

### Product narrative

Three varied, asymmetric sections:

1. **Wakes without being asked** — scheduled-run receipt and next wake.
2. **Reads the work around you** — tasks, GitHub, Calendar, and Gmail signals.
3. **Leaves proof** — delivered email, archived report, and CloudWatch execution evidence.

Each section uses actual Orbit data and UI fragments. Avoid repeated equal-width feature cards.

### Final action

A concise close invites visitors to open the synthetic demo. Private access remains available but visually secondary.

### Footer

State the unattended 6:00 AM Accra schedule and identify the core AWS services. Include repository and challenge article links only when real URLs are available; never add dead links.

## Dashboard refinement

The existing dashboard remains report-first but receives targeted polish:

- Stronger visual framing around the wake trace and ranked priorities.
- Briefing date restored to the header.
- Supporting evidence uses a varied grid instead of four equal quadrants.
- Report history becomes a true horizontal scroller.
- Narrow-screen header, task metadata, and action wrapping are tightened.
- Inline styles move into the stylesheet.
- Focus-line markup is rendered safely without `dangerouslySetInnerHTML`.
- Run failures become visible inline status.
- Loading state is announced to assistive technology.
- History buttons retain button semantics.

## States and behavior

- Public showcase and demo use bundled synthetic data only.
- Demo actions stay disabled and visibly explained.
- Token gate behavior and private API authentication stay unchanged.
- Loading, empty, error, active-run, and reduced-motion states remain supported.
- Existing task CRUD and optimistic updates must not change behavior.

## Responsive and accessibility requirements

- Work from 360px through wide desktop layouts.
- Preserve semantic landmarks and skip navigation.
- Maintain visible focus indicators and 44px touch targets.
- Use balanced headings and readable paragraph measures.
- Avoid horizontal page overflow; only report history may scroll horizontally.
- Keep color contrast suitable in both light and dark dashboard themes.

## Verification

- Build the Vite app successfully.
- Run existing tests.
- Check edited files for lint diagnostics.
- Exercise public showcase → demo, public showcase → token gate, dashboard navigation, theme, report selection, and disabled demo actions.
- Verify desktop and narrow responsive layouts.
- Confirm no live API request occurs before private authentication.

## Out of scope

- Backend changes
- New routes or a routing library
- Authentication redesign
- New data sources
- Stock photography or generated hero imagery
- Pricing, blog, changelog, or other fictional marketing pages
