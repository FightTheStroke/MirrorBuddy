# User Testing Guide for MirrorBuddy

**Last Updated**: 2025-10-15
**Related Task**: Subtask 98.5 - Conduct User Testing with Children and Implement Refinements

## Overview

This guide provides protocols for testing MirrorBuddy with children ages 6-10, especially those with DSA needs (dyslexia, discalculia, working memory challenges).

## Ethical Considerations

### Before Testing
- [ ] Obtain parental/guardian consent (written)
- [ ] Explain testing purpose to child in simple terms
- [ ] Emphasize there are no "wrong answers"
- [ ] Allow child to stop at any time
- [ ] Ensure comfortable, familiar environment
- [ ] Have parent/guardian present if child prefers

### During Testing
- [ ] Never pressure or rush the child
- [ ] Take breaks every 10-15 minutes
- [ ] Watch for signs of frustration or fatigue
- [ ] Praise effort, not just success
- [ ] Keep sessions under 45 minutes total

## Recruitment

### Target Participants
- **Age**: 6-10 years old
- **Diversity**: Mix of genders, backgrounds, abilities
- **DSA Representation**: At least 50% with diagnosed DSA
- **Group Size**: 5-8 children minimum

### Screening Questions
1. Does your child use tablets/iPads regularly?
2. Does your child have any diagnosed learning differences?
3. What school subjects does your child find challenging?
4. Does your child currently use any study apps?

## Testing Protocol

### Session Structure (45 minutes)

**Part 1: Welcome & Setup (5 min)**
- Introduce yourself and the app
- Explain we're testing the app, not the child
- Show device and ask if they're comfortable

**Part 2: First Impressions (5 min)**
- Open app and observe initial reaction
- Ask: "What do you think this app does?"
- Note: facial expressions, comments, hesitation

**Part 3: Guided Tasks (25 min)**
Execute 5 core tasks (see below)
- Give task, observe without helping immediately
- Note: time to complete, errors, frustration signs
- Ask "think aloud" questions if child is comfortable

**Part 4: Free Exploration (5 min)**
- "Now you can try anything you want"
- Observe what features attract attention
- Note which areas are avoided

**Part 5: Wrap-up Interview (5 min)**
- Ask feedback questions (see below)
- Thank child enthusiastically
- Small reward/sticker if allowed

### Core Testing Tasks

**Task 1: Navigate to Materials**
- "Can you find where your school books are?"
- Metrics: Time, success rate, help needed
- Observations: Tab recognition, icon understanding

**Task 2: Import a Material**
- "Let's pretend to add a new book"
- Metrics: Button discovery, completion
- Observations: Touch accuracy, instruction clarity

**Task 3: Start Voice Coach**
- "Can you talk to the voice helper?"
- Metrics: Feature discovery, activation success
- Observations: Microphone permission understanding

**Task 4: View Tasks**
- "Where can you see your homework?"
- Metrics: Navigation success, list comprehension
- Observations: Icon recognition, label clarity

**Task 5: Customize Something**
- "Can you change a color or setting?"
- Metrics: Settings discovery, preference application
- Observations: Control understanding, feedback clarity

## Observation Checklist

### Usability Metrics

**Touch Target Issues:**
- [ ] Child misses buttons repeatedly
- [ ] Child uses two fingers to tap
- [ ] Child struggles with small icons
- [ ] Child hits wrong button frequently

**Navigation Problems:**
- [ ] Child gets lost between screens
- [ ] Child can't find way back
- [ ] Child doesn't understand tab labels
- [ ] Child confused by navigation icons

**Content Clarity:**
- [ ] Child asks what words mean
- [ ] Child skips reading instructions
- [ ] Child misunderstands error messages
- [ ] Child confused by feedback

**Visual Design:**
- [ ] Child mentions colors being too bright/dull
- [ ] Child squints or moves device closer
- [ ] Child mentions text being too small/large
- [ ] Child distracted by animations

**Engagement:**
- [ ] Child seems bored or disengaged
- [ ] Child excited about features
- [ ] Child wants to continue using app
- [ ] Child recommends to friends (hypothetically)

### Behavioral Observations

**Positive Signs:**
- Smiles or laughs while using
- Says "cool!" or similar enthusiasm
- Wants to explore more features
- Asks when they can use it again
- Shows app features to parent

**Warning Signs:**
- Sighs or shows frustration
- Asks "when are we done?"
- Makes negative comments
- Repeatedly fails at tasks
- Avoids certain features

## Feedback Questions

### For Children (Simple Language)

**Overall:**
1. Did you like using this app?
2. What was your favorite part?
3. What was hard or confusing?
4. Would you want to use this for homework?
5. What would make it better?

**Specific Features:**
6. Were the buttons easy to press?
7. Could you read all the words?
8. Did the colors look nice?
9. Was the voice helper useful?
10. Did you feel like it helped you learn?

### For Parents/Guardians

1. Did your child seem engaged?
2. Would this help with homework stress?
3. Any accessibility concerns?
4. Would you pay for this app?
5. What features would you want added?

## Data Collection

### Quantitative Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Task completion rate | >80% | ___ |
| Average task time | <2 min | ___ |
| Error rate | <20% | ___ |
| Help requests | <3 per session | ___ |
| Touch target accuracy | >90% | ___ |

### Qualitative Data

**Record:**
- Direct quotes from children
- Facial expressions and body language
- Spontaneous comments
- Questions asked
- Features explored voluntarily

**Tools:**
- Video recording (with consent)
- Screen recording
- Written notes
- Parent feedback forms

## Analysis Framework

### Severity Rating

**Critical (Fix Immediately)**
- Prevents task completion
- Causes significant frustration
- Mentioned by >50% of testers
- Safety/privacy concern

**High (Fix Soon)**
- Slows task completion significantly
- Causes moderate frustration
- Mentioned by 30-50% of testers
- Impacts core functionality

**Medium (Plan to Fix)**
- Minor inconvenience
- Mentioned by 10-30% of testers
- Workarounds exist
- Enhancement opportunity

**Low (Consider)**
- Cosmetic issues
- Mentioned by <10% of testers
- Nice-to-have features
- Personal preferences

### Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Can't tap buttons | Touch targets too small | Increase to 48px minimum |
| Gets lost | Poor navigation | Improve breadcrumbs/back buttons |
| Doesn't read text | Too complex | Simplify language, reduce text |
| Confused by icons | Unclear metaphors | Add labels, use familiar icons |
| Frustrated by errors | Unhelpful messages | Use encouraging, actionable feedback |

## Refinement Process

### 1. Prioritize Findings
- List all issues discovered
- Rate by severity (Critical/High/Medium/Low)
- Consider frequency (how many children affected)
- Estimate effort to fix (Small/Medium/Large)

### 2. Quick Wins
Fix issues that are:
- High frequency + Low effort
- Critical severity (regardless of effort)
- Mentioned by children with DSA

### 3. Iterate
- Implement fixes in priority order
- Test internally first
- Re-test with 2-3 children
- Repeat until targets met

### 4. Document
- Update CHANGELOG with refinements
- Note which feedback drove changes
- Track improvement in metrics

## Success Criteria

**Testing is successful when:**
- [ ] 80%+ task completion rate
- [ ] <20% error rate on core tasks
- [ ] Positive sentiment from >70% of children
- [ ] Parents express interest in using app
- [ ] No critical accessibility issues found
- [ ] Children want to use app again

**App is ready when:**
- [ ] All critical issues resolved
- [ ] All high-priority issues resolved or mitigated
- [ ] Tested with at least 5 diverse children
- [ ] Positive feedback from parents
- [ ] Meets all WCAG 2.1 AA requirements
- [ ] No ethical concerns remaining

## Resources

### Templates
- `Docs/templates/consent-form.md` - Parental consent template
- `Docs/templates/testing-script.md` - Session script
- `Docs/templates/feedback-form.md` - Data collection form

### Tools
- Lookback.io - Remote user testing
- Maze - Usability testing platform
- UserTesting - Participant recruitment

### Further Reading
- "Rocket Surgery Made Easy" - Steve Krug
- "Don't Make Me Think" - Steve Krug
- "The Design of Everyday Things" - Don Norman
- "Observing the User Experience" - Goodman, Kuniavsky, Moed

---

**Questions?** Update this guide or contact the UX team.

**Remember**: We're testing the app, not the children. Every piece of feedback is valuable!
