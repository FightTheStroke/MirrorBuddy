---
title: MirrorBuddy
emoji: 🪞
colorFrom: purple
colorTo: blue
sdk: static
pinned: false
license: apache-2.0
short_description: A patient tutor for children who learn differently
tags:
  - reachy_mini
  - reachy_mini_python_app
---

# MirrorBuddy for Reachy Mini

MirrorBuddy turns Reachy Mini into a patient tutor that sits on the desk next to a
child and helps with homework — out loud, with no screen to operate.

It was built for children who learn differently: dyslexia, ADHD, autism, cerebral
palsy. For a child who cannot reliably use a mouse or keyboard, a robot you can just
_talk to_ is not a nicer interface. It is the difference between studying
independently and needing an adult beside you.

## What it does

- **Talks and listens.** Natural spoken conversation in Italian, powered by Azure
  OpenAI Realtime. Short answers, one thing at a time.
- **26 professors, by voice.** Say "voglio matematica" or "chiama Galileo" and the
  persona and voice change. Learning coaches are there too, for when the problem is
  the method rather than the subject.
- **Looks at homework.** Show it an exercise, a notebook page or the screen, and it
  reads what is there and helps step by step — without handing over the answer.
- **Moves like it is listening.** Smooth, continuous body language that follows the
  child's face and shifts with the mood of the conversation.
- **Stops when told.** "Basta", "zitto", "fermati" stop it immediately, and it stays
  quiet until called back by name. Insisting is stressful; a stop is a full stop.
- **Adapts to the child.** Pacing and pause tolerance follow the learning profile, so
  a child who needs longer to form a sentence is never cut off.

## Setup

The app needs an Azure OpenAI Realtime endpoint and key. On first start it opens a
settings page on the robot (port 7862) where you enter them, along with the child's
name and profile. Nothing else is required — the professors are fetched live from
MirrorBuddy.

## Privacy

Built for children, so: the camera is used only when explicitly asked, one frame at a
time, and it is announced out loud first. No conversation recordings are stored on the
robot. GDPR, COPPA and EU AI Act obligations are handled in the MirrorBuddy platform.

## About

Part of [MirrorBuddy](https://mirrorbuddy.org) by
[FightTheStroke Foundation](https://fightthestroke.org) — a non-profit founded by the
parents of a child with cerebral palsy, building technology for children who are
usually asked to adapt to technology instead.

Source: <https://github.com/FightTheStroke/MirrorBuddy>
