# Model Card: MirrorBuddy AI Tutoring System

**Scheda Modello: Sistema di Tutoraggio IA MirrorBuddy** | AI Act Art. 50 Compliance

---

## 1. Model Details

**Model Name**: MirrorBuddy AI Tutoring System v1.0
**Developers**: MirrorBuddy Team
**Release Date**: January 2026
**Model Type**: Conversational AI with Embedded Knowledge Bases

**Primary Provider**: Azure OpenAI GPT-4o (Turbo)
**Fallback Provider**: Ollama (open-source)

**Capabilities**:

- Educational tutoring in 20+ subjects (Math, Science, Languages, History, etc.)
- 22 AI "Maestros" (tutors) with character-based embedded knowledge
- Voice conversation (text-to-speech, speech-to-text)
- FSRS adaptive learning, flashcards, quizzes, mind maps
- Accessibility: WCAG 2.1 AA, 7 disability profiles (dyslexia, ADHD, visual impairment, motor, autism, auditory, cerebral palsy)

---

## 2. Intended Use

**Primary Use Case**: Educational tutoring for students with learning differences (ages 6-19)

**Users**:

- Students with diagnosed learning disabilities or neurodivergence
- Parents monitoring educational progress
- Educators as supplementary teaching tool

**Appropriate Uses**:

- Homework assistance with teacher-approved topics
- Adaptive concept review based on student performance
- Accessible learning accommodations
- Practice and skill reinforcement

**Out-of-Scope Uses**:

- Medical or mental health diagnosis
- Legal advice or assessments
- Replacement for qualified teachers
- High-stakes assessment or standardized testing scoring
- Collection of sensitive personal data beyond educational context

---

## 3. Factors (Demographic & Instrumentation)

**Demographics**:

- Age: 6-19 years
- Language: Italian (primary), with multilingual support
- Disability Status: Neurodivergent, learning disabilities (primary), neurotypical (secondary)

**Instrumentation**:

- Keyboard and mouse navigation (motor accessibility)
- Screen reader compatible (visual accessibility)
- Text-to-speech enabled (auditory accessibility)
- High contrast, large fonts, reduced motion modes

**Data Inputs**:

- Free-form text queries
- Voice input (multilingual ASR)
- User profile (age, diagnosed conditions)
- Session metadata (timestamp, duration, subject)

---

## 4. Metrics

**Performance Metrics** (Baseline):

- BLEU score (knowledge consistency): 0.87 vs. reference answers
- Student satisfaction (post-session survey): 4.2/5.0
- Engagement time per session: 18 min average
- Accessibility feature usage: 42% of active sessions use 1+ profile

**Safety Metrics**:

- Content policy violations (flagged/reviewed): < 0.1% of responses
- Hallucination detection rate: Monitored via teacher review sampling
- Crisis escalation accuracy: 94% true positive on distress signals
- Response time (99th percentile): 2.3 seconds

---

## 5. Training Data & Knowledge

**Underlying Model**: Azure OpenAI GPT-4o trained on diverse web and academic corpus (cutoff: April 2024)

**MirrorBuddy Enhancement**:

- 22 embedded knowledge bases (verified academic sources per Maestro)
- Knowledge is NOT freely generated; constrained to curated subject matter
- Subject domains: Mathematics, Physics, Chemistry, Biology, History, Languages, Arts, Music, Philosophy, Economics, Computer Science, Health, Geography, Law, Sports, Storytelling

**No Direct Training Data**:

- Student conversations are not used to retrain models
- User data remains confidential under GDPR

---

## 6. Ethical Considerations & Bias Mitigation

**Known Limitations**:

- May generate factually incorrect responses despite knowledge constraints
- Cannot interpret non-textual context (gestures, facial expressions)
- Language biases reflect Azure OpenAI training data distribution
- Does not provide medical diagnosis or treatment recommendations

**Bias Mitigation**:

- Maestros designed with diverse representation
- Content moderation for cultural sensitivity
- Accessibility testing across all 7 disability profiles
- Quarterly bias testing on diverse student cohorts

**Safety Measures** (5-Layer Defense):

1. **Prompt Engineering**: Knowledge bases + explicit safety guidelines
2. **Content Filtering**: Flagging of violence, explicit content, self-harm language
3. **Crisis Detection**: Pattern recognition for distress signals → teacher escalation
4. **Human Review**: Sample-based audit of responses (5% random sampling)
5. **Access Control**: Age-appropriate filtering, parental consent requirements

---

## 7. Caveats & Recommendations

**Model Limitations**:

- Conversational AI hallucinations possible despite constraints
- Not suitable for real-time emergency intervention
- Performance may vary with non-standard English/Italian dialects
- Voice recognition accuracy dependent on audio quality

**Use Recommendations**:

- **Always supervised**: Teachers/parents should review key interactions
- **Not conclusive**: Use as learning aid, not authoritative answer source
- **Regular feedback**: Report issues via compliance@mirrorbuddy.it
- **Consent required**: Parental/student consent mandatory before use

**For Regulators & Authorities**:

- This system is classified as **high-risk** under AI Act Article 6 (educational + minors)
- Compliance measures align with EU AI Act Chapter III (transparency, human oversight)
- Full DPIA available in `/docs/compliance/DPIA.md`
- Risk register available in `/docs/compliance/AI-RISK-REGISTER.md`

---

**Prepared**: 20 January 2026
**Next Review**: 20 January 2027
**Transparency Statement**: Users are informed of AI usage via in-app banners and consent flows.

---

_For detailed implementation, see: AI-POLICY.md | GDPR.md | AI-RISK-MANAGEMENT.md_
