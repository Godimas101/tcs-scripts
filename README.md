<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=170&color=0:140A22,45:EC4899,100:8B5CF6&text=TCS%20Scripts&fontColor=ffffff&fontAlignY=35&fontSize=32&desc=Code%20nodes,%20automation%20logic,%20and%20the%20glue%20behind%20the%20content%20pipeline&descAlignY=57&descSize=18" />
</p>

> **"Because the magic is usually just JavaScript with a deadline."**

The code node library for **The Canadian Space** automation stack. This repo holds the reusable logic, helpers, and workflow-side scripting that keep the n8n content pipelines running behind the scenes.

## 🚀 Quick Start

1. Open the folder for the content stream or workflow you care about
2. Reuse or adapt the code node logic in n8n
3. Keep script behavior versioned here instead of reinventing it in the editor every time

## ✨ What lives here

The code nodes that power **The Canadian Space** automation. These are the sticks of glue holding the magic together behind the scenes — JavaScript functions, data transformers, and workflow logic that make n8n workflows actually work.

## 📂 The workflows

Each folder contains the code nodes and scripts for a specific Canadian Space content stream:

### 📰 Content Workflows
- **canada-from-orbit/** - Canadian space news aggregation and curation
- **the-daily-broadcast/** - Daily space news roundup
- **the-spacex-report/** - SpaceX-focused coverage and updates
- **the-commercial-space/** - Commercial space industry news
- **the-nasa-overview/** - NASA missions and developments
- **rocketlab-roundup/** - Rocket Lab news and launches

### 📱 Social & Publishing
- **social-posts/** - Social media content generation and distribution
- **llm-usage-tracker/** - AI API usage monitoring and cost tracking

### 🔧 Infrastructure
- **workflow-backup/** - Automated n8n workflow backup system (backs itself up!)
  - Daily backups to private GitHub repo
  - Complete setup documentation and examples

## Philosophy

> "If you have to do it twice, automate it. If you have to automate it, over-engineer it. If you over-engineer it, write docs about it."

We believe in:
- ✅ Automation over repetition
- ✅ Documentation over confusion
- ✅ Version control over panic
- ✅ Testing in production (just kidding... mostly)

## Support

Found a bug? Feature request? Existential questions about automation?

Open an issue or submit a PR. We welcome contributions from humans and well-intentioned robots.

---

*"Make it work, make it right, make it fast, make it automated."*
