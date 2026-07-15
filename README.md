<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=200&color=0:140A22,45:EC4899,100:8B5CF6&text=%20TCS%20Scripts%20&fontColor=ffffff&fontAlignY=42&fontSize=30&textBg=true&desc=Code%20nodes,%20automation%20logic,%20and%20the%20glue%20behind%20the%20content%20pipeline&descAlignY=68&descSize=17" />
</p>

<p align="center">
  <a href="https://thecanadian.space"><img src="https://img.shields.io/badge/The%20Canadian%20Space-space%20blog-0EA5E9?style=for-the-badge&logo=rocket&logoColor=white" alt="TCS" /></a>
  <a href="https://github.com/The-Canadian-Space/tcs-scripts/issues/new"><img src="https://img.shields.io/badge/Report%20a%20bug-red?style=for-the-badge&logo=github&logoColor=white" alt="Report a bug" /></a>
  <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111827" alt="JavaScript" />
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

## 🐛 Found a bug?

- **[Open an issue](https://github.com/The-Canadian-Space/tcs-scripts/issues/new)** — for reproducible bugs, feature requests, or existential questions about automation
- If it's a broken code node in production, mention which workflow / which content stream

## 🔗 Related

- **Main site:** [thecanadian.space](https://thecanadian.space)
- **Public wiki:** [wiki.thecanadian.space](https://wiki.thecanadian.space)
- **[`tcs-tools`](https://github.com/The-Canadian-Space/tcs-tools)** — the Python utilities these code nodes call
- **[`tcs-workflows`](https://github.com/The-Canadian-Space/tcs-workflows)** *(private)* — n8n workflow backups

## 🧡 Support

TCS is a personal project + portfolio piece. If you like what we're building, **Patreon** is where the running project log lives.

[![Support on Patreon](https://raw.githubusercontent.com/Godimas101/personal-projects/main/patreon/images/buttons/patreon-medium.png)](https://patreon.com/Godimas101)

---

*"Make it work, make it right, make it fast, make it automated."*
