# Orbit Submission Documentation Design

**Date:** 2026-07-17
**Status:** Approved

## Goal

Produce a public-repository README and a complete AWS Builder Center challenge article that explain Orbit clearly, satisfy every submission requirement, link to the working product, and avoid exposing sensitive AWS or personal data.

## README

Replace the outdated short README with a public project overview that includes:

- Live demo and public repository links near the top.
- The problem Orbit solves and the unattended daily loop.
- Implemented sources: DynamoDB tasks, GitHub, Google Calendar, and Gmail.
- A concise architecture diagram and AWS service responsibilities.
- Product capabilities, including the public synthetic demo and private dashboard.
- Repository structure and local/deployment commands.
- Security notes covering SSM secrets, read-only GitHub access, synthetic public data, and protected reports.
- Verification commands and current test status.

The README must not contain account IDs, bucket names, email addresses, tokens, full ARNs, OAuth credentials, or SES message IDs.

## Submission article

Create `docs/submission-article.md` as a ready-to-paste article:

- Exact title: `Weekend Agent Challenge: Orbit`
- Required tag: `#agents`
- Approximately 1,000–1,300 words.
- Use the five required sections exactly:
  1. Vision & What It Does
  2. How You Built It
  3. AWS Services & Architecture
  4. What You Learned
  5. Link to App or Repo
- Tell the real build story: provider isolation after Bedrock quota friction, scoped IAM blocker, Google OAuth setup, unattended 6 AM proof, and compact ranking for 116 GitHub repositories.
- Link to the public live app and GitHub repository.
- Include safe image placeholders and captions for the 6 AM email and public showcase. Mention CloudWatch verification in prose without requiring an AWS-console screenshot.
- Avoid invented performance claims, fake user counts, or unverified statements.

## Tone

Write a judge-ready case study: personal and concrete, but technically credible. Prefer direct language over marketing clichés. Explain architecture in terms a reviewer can scan quickly.

## Verification

- Confirm the article exceeds 500 words.
- Confirm all five required sections, title phrase, `#agents`, live link, and repository link are present.
- Confirm README links are valid.
- Scan both files for sensitive identifiers and placeholders that should not ship.
- Run the existing test suite to ensure documentation work accompanies a healthy repository.
