# signal-triage
# 🔔 Signal — AI-Powered Customer Feedback Triage

A full-stack triage system that automatically classifies incoming customer feedback by priority, routes alerts to the right Slack channels, and generates monthly executive reports — so nothing falls through the cracks.

🎥 **Demo Video:** [Watch the demo](https://drive.google.com/file/d/15ymd4AVxYVWzakexMUXRPHITaPDCtIGA/view?usp=sharing)

---

## ✨ What It Does

1. **Intake** — customers submit feedback via Google Form, which triggers a Zapier webhook to automatically create a ticket
2. **Classification** — Claude instantly classifies each ticket by priority (P0–P4), type (Bug, Churn Risk, Feature Request, etc.), and routes it to the right Slack channel (#eng-bugs, #cs-alerts, #product-feedback, #wins)
3. **Review queue** — tickets land in Pending Review for a 5-second human sanity check before approval; edit priority or channel if Claude got it wrong
4. **Slack routing** — one click fires a structured alert to the right team with full context
5. **Kanban board** — track tickets across Pending Review → In Progress → Resolved
6. **Monthly report** — upload a CSV of feedback and Claude generates an executive summary with priority breakdown, top themes, churn risks, and actionable recommendations
7. **Report archive** — every monthly report is saved to localStorage so you can flip between months

**Result:** A lightweight ops layer that eliminates the manual work of reading, sorting, and routing customer feedback — so the right people always know what needs their attention.

---

## 🧠 Why I Built This

Chief of Staff roles at early-stage startups require automating yourself out of repetitive coordination work. Signal demonstrates exactly that: instead of manually reading every support email, deciding who needs to know, and sending individual Slack messages, this system handles the mechanical layer so I can focus on judgment calls — approving classifications, spotting patterns, and surfacing insights to leadership.

The monthly report feature turns raw feedback into a 2-minute executive briefing that would otherwise take hours to pull together.

---

## ⚙️ Architecture

```
Google Form → Zapier → Netlify Function (ingest-ticket)
                              ↓
                      Anthropic API (classification)
                              ↓
                      Netlify Blobs (persistence)
                              ↓
                      React Kanban Board (review queue)
                              ↓
                      Netlify Function (slack-proxy)
                              ↓
                      Slack Channels (eng-bugs / cs-alerts / product-feedback / wins)
```

---

## 📁 Repository Structure

- `/src` — React components and app logic (Kanban board, Monthly Report, Ticket cards)
- `/src/components` — Column, TicketCard, NewTicketModal, EditModal, MonthlyReport, PriorityBadge
- `/src/services` — Anthropic classification service, Slack proxy service
- `/netlify/functions` — serverless functions for Slack proxy and Zapier ticket ingestion
- `/public` — static assets

---

## 🏷️ Priority System

| Priority | Meaning | Slack Channel |
|----------|---------|---------------|
| P0 | Activation blocking — can't use product, data loss, security | #eng-bugs |
| P1 | Core workflow broken — workaround exists | #eng-bugs |
| P2 | Friction / annoyance — slows users down | #product-feedback |
| P3 | Feature requests | #product-feedback |
| P4 | Praise | #wins |
| Churn Risk | Customer explicitly considering leaving | #cs-alerts |

---

## 🔒 Security

No API keys or webhook URLs are stored in this repository. All secrets are stored as environment variables in Netlify and injected server-side via Netlify Functions. The `.env` file is excluded via `.gitignore`.

---

Built using Claude Code.
