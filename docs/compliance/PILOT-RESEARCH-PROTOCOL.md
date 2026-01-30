# Pilot Research Protocol: MirrorBuddy with Students with Learning Differences

**Version:** 1.0
**Date:** 2026-02-01
**Principal Investigator:** MirrorBuddy Compliance Team
**Study ID:** MB-PILOT-2026-Q1

---

## 1. Study Overview

This protocol describes a 4-week pilot study evaluating MirrorBuddy's effectiveness and accessibility for students with ADHD and dyslexia. The study employs a pre-post comparison design with mixed-methods evaluation.

**Study Question:** Does MirrorBuddy with personalized accessibility profiles improve learning outcomes and engagement for students with ADHD/Dyslexia?

---

## 2. Study Population & Sample

- **Target:** 20 students (10 ADHD, 10 Dyslexia)
- **Age:** 13-18 years old
- **Setting:** Secondary school partner institution
- **Inclusion:** Formal diagnosis of ADHD or dyslexia, parental consent, Italian/English fluency
- **Exclusion:** Severe cognitive impairment, active behavioral crisis, no internet access

**Recruitment:** Partner school identifies eligible students; parents receive information sheet 2 weeks before enrollment.

---

## 3. Study Duration & Schedule

- **Total Duration:** 4 weeks (28 calendar days)
- **Sessions:** 3 per week, 30 minutes each (12 total sessions per student)
- **Schedule:** Consistent time slots (e.g., Tuesdays, Thursdays, Saturdays)
- **Makeup:** One makeup session if student misses one session
- **Pre-Study:** 1 week before (baseline testing)
- **Post-Study:** 1 week after (endpoint testing)

---

## 4. MirrorBuddy Intervention Configuration

### 4.1 Accessibility Profiles

| Profile               | ADHD Students | Dyslexia Students | Settings Applied                                   |
| --------------------- | ------------- | ----------------- | -------------------------------------------------- |
| **ADHD**              | ✓ (Primary)   | Optional          | Pomodoro (15/5), distraction-free, break reminders |
| **Dyslexia**          | Optional      | ✓ (Primary)       | OpenDyslexic font, +letter spacing, +line height   |
| **Visual Impairment** | Optional      | Optional          | High contrast, large text, TTS enabled             |

Students can activate multiple profiles simultaneously. Session data logs which profile(s) active.

### 4.2 Maestri & Tools

**Core Maestri (mandatory):**

- Euclide (Mathematics) – learning outcomes focus
- Lovelace (Computer Science) – engagement testing
- Darwin (Biology) – accessibility feature testing

**Optional Maestri:** Students may access other 19 maestri based on interest.

**Allowed Tools:**

- Flashcards (FSRS spaced repetition)
- Quiz (formative assessment)
- Mindmap (concept mapping)
- PDF (document upload & analysis)
- Summary (text condensation)

---

## 5. Data Collection & Metrics

### 5.1 Primary Outcome: Learning Gains

**Pre-Test & Post-Test (same assessment, counterbalanced order to minimize recall):**

- 30-minute online quiz covering Core Maestri domains
- 10 multiple-choice questions per domain (30 total)
- Scoring: 0-100%
- **Primary Analysis:** Paired t-test, Cohen's d effect size

### 5.2 Secondary Outcomes: Engagement

**Automated logging (MirrorBuddy backend):**

- Session duration (target ≥ 25 min/session)
- Session frequency (target 3/week, on-time)
- Tool usage frequency (flashcards, quiz, mindmap, PDF, summary)
- Accessibility profile activation (which profiles, when)
- Message volume and response quality (basic NLP sentiment)
- **Analysis:** Descriptive statistics, paired t-test for pre/post engagement

### 5.3 Accessibility Satisfaction (SUS Adapted)

**Post-Study Questionnaire (15 items, 5-point Likert):**

- Font readability
- Navigation ease
- Distraction-free mode effectiveness
- Break reminder helpfulness
- Overall satisfaction
- **Analysis:** SUS score (converted to 0-100), descriptive, qualitative comments

### 5.4 Student Wellbeing (SDQ-T Short Form)

**Pre-Study & Post-Study (SDQ Strengths & Difficulties Questionnaire – Teacher version administered by student):**

- 12-item short form (emotional, behavioral, peer, hyperactivity subscales)
- 3-point response scale
- **Analysis:** Mean subscale changes, paired t-test

### 5.5 Qualitative Feedback

**Post-Study Focus Group (optional, n=4-6 willing students):**

- 45-minute session with trained facilitator
- Topics: Barriers, motivators, accessibility gaps, learning improvements
- Audio recorded (with consent), transcribed, thematic analysis

---

## 6. Ethical Considerations & Safeguards

### 6.1 Informed Consent & Assent

- **Parents/Guardians:** Written informed consent form, plain language, 1-week review period
- **Students (13-17):** Written assent form, age-appropriate language
- **Students (18+):** Full informed consent replaces parental consent
- **Withdrawal:** Students may withdraw at any time without penalty; data deleted upon request

### 6.2 Data Anonymization & Storage

- **Identifiers:** Student assigned unique ID (MB-PILOT-XXX); names/email removed from datasets
- **Master List:** Encrypted file (AES-256-GCM per TOKEN_ENCRYPTION_KEY), access restricted to PI
- **Storage:** PostgreSQL with row-level security (RLS), encrypted at rest
- **Access:** Only PI and Ethics Board (if audit required)
- **Retention:** Data deleted 3 months post-study unless written consent for archiving obtained

### 6.3 Right to Withdraw

Students may withdraw:

- Without providing reason
- At any point during study
- Without loss of school services or grades
- With full data deletion from databases

**Procedure:** Student or parent emails PI; data deletion confirmed within 48 hours.

### 6.4 Minimal Risk Assessment

**Risk Level:** Minimal
**Rationale:** MirrorBuddy is a educational tool with active accessibility features; no invasive procedures; no deception; benefits (personalized learning) outweigh low risks

**Potential Risks (mitigated):**

- Privacy concern → encrypted storage, anonymization
- Screen time fatigue → 30-min sessions + Pomodoro breaks
- Feelings of inadequacy (if struggling) → supportive AI, coaching resources
- Technical issues → IT support hotline provided

---

## 7. IRB/Ethics Board Requirements

**This study requires:**

1. **Educational Research Ethics Board Approval** (or equivalent national body)
   - Italian research: Requires authorization if school is public; DPA notification if collecting health data (ADHD/dyslexia diagnosis)
   - Timeline: Submit 4 weeks before study start

2. **Data Protection Impact Assessment (DPIA)**
   - Processing health data (ADHD, dyslexia)
   - Automated decision-making (AI Maestri recommendations)
   - See: `docs/compliance/DPIA.md`

3. **Parental Notification** (for school data used)
   - MirrorBuddy partner school has duty of care
   - Letter home explaining study, opting out does not affect school services

4. **Insurance & Liability**
   - School maintains standard liability coverage
   - MirrorBuddy provides indemnification clause in contract

---

## 8. Data Collection & GDPR Compliance

### 8.1 Data Collected

| Data Type               | Source          | Retention | Legal Basis       |
| ----------------------- | --------------- | --------- | ----------------- |
| Student ID, age         | Enrollment form | 3 months  | Parental consent  |
| ADHD/Dyslexia diagnosis | Parent-reported | 3 months  | Medical necessity |
| Session logs            | MirrorBuddy API | 3 months  | Parental consent  |
| Test scores             | Quizzes         | 3 months  | Parental consent  |
| Video (optional)        | Focus group     | 6 months  | Explicit consent  |

### 8.2 Data Rights

- **Access:** Parents/students may request copy of data (within 30 days)
- **Rectification:** Incorrect data corrected within 10 days
- **Deletion:** Right to be forgotten applies post-study (3-month retention window)
- **Port:** Data provided in machine-readable format if requested

### 8.3 Third Parties

- **School:** Receives only aggregate results (no individual IDs)
- **Partners:** Azure OpenAI processes messages (see `DPIA-SERVICES.md`)
- **Other:** No data shared without written consent

---

## 9. Analysis Plan

### 9.1 Quantitative Analysis

**Primary Outcome (Learning):**

- Paired t-test: Pre vs. Post quiz scores
- Cohen's d effect size interpretation: d > 0.2 = small, d > 0.5 = medium, d > 0.8 = large
- 95% confidence intervals
- Subgroup: Compare ADHD vs. Dyslexia separately

**Secondary Outcomes (Engagement, Wellbeing):**

- Descriptive statistics (mean, SD, median, IQR)
- Paired t-tests for engagement metrics and SDQ subscales
- Pearson correlation: Engagement vs. Learning outcomes

### 9.2 Qualitative Analysis

- **Transcription:** Audio → text (Rev.com or local)
- **Coding:** NVivo or manual thematic coding (themes: barriers, motivators, learning, accessibility)
- **Validation:** Independent second coder (inter-rater reliability Cohen's κ ≥ 0.70)

### 9.3 Missing Data

- <10%: Pair-wise deletion (conservative)
- ≥10%: Multiple imputation (MI) with 20 iterations
- Report missingness pattern

### 9.4 Statistical Software

- **Analysis:** R (tidyverse, ggplot2, effsize) or Python (pandas, scipy)
- **Reproducibility:** Analysis script + seed number provided in appendix

---

## 10. Timeline & Milestones

| Date       | Milestone                              |
| ---------- | -------------------------------------- |
| 2026-02-01 | Ethics Board submission                |
| 2026-02-28 | Ethics approval (expected)             |
| 2026-03-01 | Recruitment begins, consent forms sent |
| 2026-03-15 | Baseline testing (pre-tests)           |
| 2026-03-22 | Intervention begins (4 weeks, 3x/week) |
| 2026-04-19 | Intervention ends                      |
| 2026-04-26 | Post-testing, focus groups             |
| 2026-05-15 | Data analysis complete                 |
| 2026-06-01 | Report draft to Ethics Board           |
| 2026-06-15 | Final report + dissemination           |

---

## 11. Dissemination & Reporting

**Outputs:**

- Aggregate summary for school & parents (no individual IDs)
- Peer-reviewed journal submission (Journal of Learning Disabilities or similar)
- Compliance report to Ethics Board & DPA
- Public blog post highlighting learnings (no data)

**Authorship:** Based on ICMJE criteria (all data collection staff eligible)

---

## 12. Budget & Resources

- **Personnel:** 1 PI (40h), 1 Research Assistant (80h)
- **Tools:** MirrorBuddy platform (no cost, internal), SUS/SDQ questionnaires (free)
- **Incentives:** Optional small gift cards (€10) to students post-study (disclosed in consent)
- **Insurance:** Covered under school liability

---

## References

- GDPR Compliance: docs/compliance/DPIA.md
- AI Risk Framework: docs/compliance/AI-RISK-MANAGEMENT.md
- Accessibility Standards: src/lib/accessibility/
- MirrorBuddy Architecture: docs/ARCHITECTURE.md
