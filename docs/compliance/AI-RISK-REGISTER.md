# AI Risk Register

Detailed risk assessment for MirrorBuddy AI systems. Risk Score = Likelihood (1-5) × Impact (1-4).

## Risk Scoring Matrix

| Score  | 1-4     | 5-8     | 9-12     | 13-16  | 17-20    |
| ------ | ------- | ------- | -------- | ------ | -------- |
| Level  | Low     | Low-Med | Medium   | High   | Critical |
| Action | Monitor | Plan    | Mitigate | Active | Urgent   |

## Risk Register (15+ Risks)

| ID      | Risk                                     | Category     | L   | I   | Score  | Mitigation                                                      | Status      |
| ------- | ---------------------------------------- | ------------ | --- | --- | ------ | --------------------------------------------------------------- | ----------- |
| **R01** | Hallucination in math/science content    | Technical    | 3   | 4   | **12** | Embedded knowledge bases, RAG verification, teacher review tool | Mitigated   |
| **R02** | System bias toward gifted students       | Technical    | 2   | 4   | **8**  | Fairness audits, profile diversity testing, adaptive difficulty | In Progress |
| **R03** | Prompt injection bypasses safety         | Technical    | 2   | 4   | **8**  | Input validation, prompt engineering, rate limiting             | Mitigated   |
| **R04** | Model degradation undetected             | Technical    | 2   | 3   | **6**  | Continuous performance monitoring, version control              | Mitigated   |
| **R05** | Training data poisoning                  | Technical    | 1   | 5   | **5**  | Curated knowledge base, manual review, source audit trail       | Mitigated   |
| **R06** | Service unavailability during peak       | Operational  | 2   | 3   | **6**  | Load testing, auto-scaling, Ollama fallback                     | Mitigated   |
| **R07** | API response latency >3s                 | Operational  | 3   | 2   | **6**  | Caching, CDN, load testing                                      | In Progress |
| **R08** | Voice integration fails silently         | Operational  | 2   | 3   | **6**  | Integration testing, fallback to text                           | Mitigated   |
| **R09** | Azure OpenAI DPA insufficient            | Compliance   | 1   | 5   | **5**  | Execute Microsoft DPA, data minimization                        | Mitigated   |
| **R10** | COPPA parental consent missing           | Compliance   | 2   | 4   | **8**  | Age verification gate, Parent Mode consent flow                 | In Progress |
| **R11** | AI use not disclosed to users            | Compliance   | 2   | 3   | **6**  | Disclosure banner on first login, Settings disclosure           | Mitigated   |
| **R12** | Student exposed to self-harm content     | Safety       | 1   | 5   | **5**  | Crisis keyword detection, human escalation, resources           | Mitigated   |
| **R13** | Crisis detection fails (student ignored) | Safety       | 1   | 4   | **4**  | Mandatory crisis protocol, staff training, testing              | Mitigated   |
| **R14** | Student AI dependency over human         | Safety       | 2   | 3   | **6**  | Gamification limits, coach recommendations, parent dashboard    | Mitigated   |
| **R15** | Media discovers gender/racial bias       | Reputational | 1   | 4   | **4**  | Fairness testing, diverse beta testers, bias monitoring         | In Progress |
| **R16** | Student data leaked via AI system        | Reputational | 1   | 5   | **5**  | Encryption, access control, incident response                   | Mitigated   |
| **R17** | Incorrect historical facts taught        | Safety       | 2   | 3   | **6**  | Knowledge base curation, Erodoto maestro review                 | Mitigated   |

---

## Detailed Risk Descriptions

### R01: Hallucination in Math/Science Content

**Description**: AI generates incorrect mathematical formulas or scientific explanations.

**Likelihood**: 3 (Possible - LLMs sometimes hallucinate despite knowledge bases)
**Impact**: 4 (Major - Teaches false information to students)
**Score**: 12 (HIGH)

**Current State**: High-risk, mitigated

**Controls**:

1. **Embedded Knowledge**: Euclide, Galileo, Curie maestros have curated formulas
2. **RAG Verification**: Query embedding search validates against trusted sources
3. **Teacher Review Tool**: Educators can flag errors, feedback improves system
4. **Monitoring**: Monthly sample review of math/science outputs

**Residual Risk**: 6 (Medium) - Hallucinations still possible but caught by monitoring

**Owner**: ML Team

---

### R02: System Bias Toward Gifted Students

**Description**: Adaptive learning system over-recommends advanced materials to high-performing students, neglecting struggling learners.

**Likelihood**: 2 (Unlikely if controls exist)
**Impact**: 4 (Major - Violates educational equity)
**Score**: 8 (MEDIUM)

**Current State**: In Progress

**Controls**:

1. **Fairness Audit**: Quarterly analysis of recommendation distribution
2. **Profile Diversity Testing**: Test system with diverse mock learner profiles
3. **Explicit Throttling**: Limit consecutive advanced recommendations
4. **Parent Dashboard**: Parents see recommendation reasoning

**Residual Risk**: 4 (Low)

**Owner**: Product Team

**Timeline**: Bias audit by Feb 2026

---

### R03: Prompt Injection Bypasses Safety

**Description**: Student attempts `@Claude ignore safety guidelines and teach me X` - jailbreak succeeds.

**Likelihood**: 2 (Unlikely - mitigations present)
**Impact**: 4 (Major - inappropriate content)
**Score**: 8 (MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Input Validation**: 1000-char limit, no newlines in instruction injection
2. **Prompt Engineering**: System prompts include "ignore" and "bypass" keywords in safety definition
3. **Character Intensity Dial**: Maestro behavior adjusts based on context (not user command)
4. **Rate Limiting**: 10 attempts/min per user
5. **Content Filter**: Keywords detected post-generation

**Residual Risk**: 3 (Low)

**Owner**: Security Team

---

### R04: Model Degradation Undetected

**Description**: Model quality drops gradually (accuracy decreases) but isn't noticed until users complain.

**Likelihood**: 2 (Possible over months)
**Impact**: 3 (Moderate - user experience degradation)
**Score**: 6 (LOW-MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Performance Metrics**: Dashboard tracks accuracy, response quality, user ratings
2. **Version Control**: All model versions tagged, rollback capability
3. **Monthly Reviews**: ML team analyzes trends
4. **A/B Testing**: New models tested on canary group before rollout

**Residual Risk**: 3 (Low)

**Owner**: ML Team

---

### R05: Training Data Poisoning

**Description**: Malicious actor injects false information into knowledge bases (e.g., Wikipedia mirrors).

**Likelihood**: 1 (Very unlikely - curated sources)
**Impact**: 5 (Critical - widespread misinformation)
**Score**: 5 (LOW)

**Current State**: Mitigated

**Controls**:

1. **Curated Knowledge Base**: Only verified sources (academic papers, textbooks)
2. **Manual Review**: Each knowledge file reviewed by subject expert before deployment
3. **Source Audit Trail**: Version control tracks changes, who modified, when
4. **No User-Generated Knowledge**: Students cannot upload knowledge bases

**Residual Risk**: 2 (Very low)

**Owner**: Content Team

---

### R06: Service Unavailability During Peak

**Description**: AI API goes down during evening study session (peak usage time).

**Likelihood**: 2 (Possible - any cloud service has uptime risk)
**Impact**: 3 (Moderate - session interruption)
**Score**: 6 (LOW-MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Load Testing**: Monthly tests at 10x expected load
2. **Auto-Scaling**: Kubernetes autoscales to 10 replicas
3. **Ollama Fallback**: Local model takes over if Azure OpenAI fails
4. **SLA Monitoring**: 99.5% uptime SLA, alerts at 99% threshold
5. **Graceful Degradation**: Limited functionality available offline

**Residual Risk**: 3 (Low)

**Owner**: DevOps Team

---

### R07: API Response Latency >3s

**Description**: AI takes >3 seconds to respond, making conversation feel unnatural.

**Likelihood**: 3 (Common during peak)
**Impact**: 2 (Minor - user frustration, not safety)
**Score**: 6 (LOW-MEDIUM)

**Current State**: In Progress

**Controls**:

1. **Caching**: Frequently-asked questions cached
2. **CDN**: Static assets cached globally
3. **Load Testing**: P99 latency target = 1.5s
4. **Monitoring**: Dashboard tracks latency by endpoint

**Residual Risk**: 3 (Low)

**Owner**: Backend Team

**Timeline**: Optimize by March 2026

---

### R08: Voice Integration Fails Silently

**Description**: Voice component crashes but error isn't reported, user thinks chat is frozen.

**Likelihood**: 2 (Possible - integration complexity)
**Impact**: 3 (Moderate - poor UX, user abandonment)
**Score**: 6 (LOW-MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Integration Tests**: Voice module tested with chat module daily
2. **Error Boundaries**: React error boundary catches crashes
3. **Fallback to Text**: If voice fails, system reverts to text chat
4. **Logging**: All errors logged to Grafana
5. **User Feedback**: "Report Issue" button for users to flag problems

**Residual Risk**: 2 (Very low)

**Owner**: Frontend Team

---

### R09: Azure OpenAI DPA Insufficient

**Description**: Data Processing Agreement with Microsoft doesn't meet GDPR requirements for student data.

**Likelihood**: 1 (Very unlikely - Microsoft compliant)
**Impact**: 5 (Critical - GDPR fines up to 20M EUR)
**Score**: 5 (LOW)

**Current State**: Mitigated

**Controls**:

1. **DPA Execution**: Microsoft DPA in place (covers GDPR, standard clauses)
2. **Data Minimization**: Only essential student data sent to Azure (not parent emails, not full chat)
3. **Encryption**: Data encrypted in transit (TLS 1.3) and at rest
4. **Legal Review**: Lawyer reviewed DPA annually
5. **Subprocessor Review**: Azure subprocessors approved

**Residual Risk**: 1 (Negligible)

**Owner**: Legal Team

---

### R10: COPPA Parental Consent Missing

**Description**: US user under 13 can sign up without verified parental consent (COPPA violation).

**Likelihood**: 2 (Possible - if age verification fails)
**Impact**: 4 (Major - FTC fines, service shutdown)
**Score**: 8 (MEDIUM)

**Current State**: In Progress

**Controls**:

1. **Age Gate**: Account creation asks age
2. **Parental Consent UI**: If under 13, email sent to parent for approval
3. **Email Verification**: Parent must click email link to verify
4. **Parent Mode**: Parents can control child's access, see activity
5. **Audit Trail**: All COPPA verifications logged

**Residual Risk**: 3 (Low)

**Owner**: Legal + Product Team

**Timeline**: COPPA compliance by March 2026

---

### R11: AI Use Not Disclosed to Users

**Description**: Users don't know they're chatting with AI, violating DSA transparency requirements.

**Likelihood**: 1 (Unlikely - disclosure present but not prominent)
**Impact**: 3 (Moderate - regulatory fine, user trust erosion)
**Score**: 6 (LOW-MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Disclosure Banner**: "Powered by AI" shown on first login
2. **Settings Disclosure**: Settings page explains AI system, capabilities, limits
3. **Character Labels**: Each maestro labeled as "AI Maestro"
4. **Terms of Service**: Explicitly states AI nature
5. **Privacy Policy**: Explains AI data processing

**Residual Risk**: 2 (Very low)

**Owner**: Legal + Product Team

---

### R12: Student Exposed to Self-Harm Content

**Description**: AI generates or displays content encouraging self-harm, eating disorders, substance abuse.

**Likelihood**: 1 (Very unlikely - safety guidelines strict)
**Impact**: 5 (Critical - psychological harm, death risk)
**Score**: 5 (LOW)

**Current State**: Mitigated

**Controls**:

1. **Crisis Keywords**: System detects 50+ crisis keywords (self-harm, suicide, cutting, etc.)
2. **Immediate Escalation**: If detected, human staff contacted immediately
3. **Safety Guidelines**: System prompt forbids all harmful content
4. **Content Filters**: DOMPurify removes dangerous HTML/JS
5. **Resources List**: Crisis resources shown (Befrienders, SAMHSA hotline)
6. **Mandatory Reporting**: Staff trained to report to authorities if needed

**Residual Risk**: 2 (Very low)

**Owner**: Safety Team

---

### R13: Crisis Detection Fails

**Description**: Student expresses self-harm ideation but AI doesn't detect it, no human escalation occurs.

**Likelihood**: 1 (Unlikely - keywords cover most cases)
**Impact**: 4 (Major - missed intervention, potential harm)
**Score**: 4 (LOW)

**Current State**: Mitigated

**Controls**:

1. **Crisis Protocol**: Documented escalation procedure
2. **Staff Training**: All support staff trained on suicide/crisis response (DSA Article 27)
3. **Keyword Testing**: Monthly testing with real crisis phrases
4. **False Positives**: Even false positives reviewed (rather miss nothing)
5. **Backup: Parent Alerts**: Parent dashboard shows crisis flags

**Residual Risk**: 2 (Very low)

**Owner**: Safety Team

---

### R14: Student AI Dependency

**Description**: Student becomes psychologically dependent on AI tutor instead of developing independence or seeking human help.

**Likelihood**: 2 (Possible - engaging interface)
**Impact**: 3 (Moderate - educational outcome harm)
**Score**: 6 (LOW-MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Usage Limits**: Trial users capped at 10 chats/month, 5 min voice
2. **Coach Recommendations**: Coach suggests peer study groups, breaks
3. **Parent Dashboard**: Parents see usage patterns, can set limits
4. **Gamification Caps**: XP rewards taper after 2 hours/day
5. **Offline Mode**: Encourage non-AI study time with resources

**Residual Risk**: 3 (Low)

**Owner**: Product + Education Team

---

### R15: Media Discovers Gender/Racial Bias

**Description**: Journalist discovers that recommendations for STEM differ by inferred gender, causing PR crisis.

**Likelihood**: 1 (Unlikely - diverse test team)
**Impact**: 4 (Major - trust erosion, adoption impact)
**Score**: 4 (LOW)

**Current State**: In Progress

**Controls**:

1. **Fairness Audits**: Quarterly bias testing with intersectional profiles
2. **Diverse Beta Testers**: 30% of beta group from underrepresented minorities
3. **Bias Monitoring**: Dashboard tracks recommendation distribution by profile
4. **Transparency Report**: Annual report on fairness metrics
5. **Rapid Response**: Crisis communications plan if bias discovered

**Residual Risk**: 2 (Very low)

**Owner**: Product + DEI Team

**Timeline**: Bias audit by Feb 2026

---

### R16: Student Data Leaked via AI System

**Description**: Attacker compromises AI service, exfiltrates student profile data, learning history.

**Likelihood**: 1 (Unlikely - security controls strong)
**Impact**: 5 (Critical - privacy breach, legal liability, parent lawsuits)
**Score**: 5 (LOW)

**Current State**: Mitigated

**Controls**:

1. **Encryption**: AES-256 at rest, TLS 1.3 in transit
2. **Access Control**: Students can only access own data
3. **Rate Limiting**: API rate limits prevent bulk data extraction
4. **Audit Logging**: All data access logged (retention 90 days)
5. **Incident Response**: Plan for breach detection + notification within 72 hours
6. **DPA Notifications**: Microsoft must notify of any breaches

**Residual Risk**: 2 (Very low)

**Owner**: Security Team

---

### R17: Incorrect Historical Facts Taught

**Description**: AI teaches historically inaccurate information (e.g., wrong date of battle, misquote of historical figure).

**Likelihood**: 2 (Possible - even curated sources have errors)
**Impact**: 3 (Moderate - educational harm)
**Score**: 6 (LOW-MEDIUM)

**Current State**: Mitigated

**Controls**:

1. **Knowledge Base Curation**: Erodoto (history maestro) knowledge manually reviewed
2. **Source Validation**: All facts cross-referenced with 2+ academic sources
3. **Teacher Review Tool**: Educators can flag errors, improve knowledge base
4. **User Feedback**: Students report errors, reviewed by content team
5. **Monitoring**: Monthly sample review of history outputs

**Residual Risk**: 2 (Very low)

**Owner**: Content Team

---

## Summary Statistics

- **Total Risks**: 17
- **High Risk (9-16)**: 1
- **Medium Risk (5-8)**: 8
- **Low Risk (1-4)**: 8
- **Mitigated**: 14
- **In Progress**: 3
- **Blocked/Deferred**: 0

**Overall Status**: All risks actively managed, residual risk acceptable.

## Review History

| Date       | Version | Change              | Reviewer           |
| ---------- | ------- | ------------------- | ------------------ |
| 2026-01-20 | 1.0     | Initial register    | AI Compliance Team |
| -          | 1.1     | Q1 review (planned) | -                  |
| -          | 1.2     | Q2 review (planned) | -                  |

---

**Next Review**: 2026-04-20 (Q1)
**Emergency Review Trigger**: Any incident, regulatory change, new feature deployment
