# LearningPacer 🚀

An AI-powered Virtual Teaching Assistant designed specifically for ELEC3120 (Computer Networks) at HKUST. Built as a Final Year Project to enhance student learning through intelligent, context-aware interactions.

## ✨ Features

*   **💬 Chat Mode:** Ask questions and get instant, accurate answers cited directly from Prof. Meng's lecture slides. Features dual AI modes ("Quick" and "DeepThink") for varied complexity.
*   **📘 Course Mode:** Structured, sequential learning path with AI-powered, section-by-section slide explanations.
*   **📝 Mock Exam Generator:** Dynamically generates unique practice exams (MCQ & Open-Ended with network diagrams) based on selected topics, exported directly to PDF.
*   **🎨 Customizable UI:** 8 eye-comfortable themes (Dark/Light) with persistent preferences.

## 🛠️ Tech Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
*   **Backend & Orchestration:** n8n (Docker-hosted AI Agent workflows)
*   **Database & Auth:** Supabase (PostgreSQL, Vector Store for RAG, User Auth)
*   **AI Models:** DeepSeek, Google Gemini, BAAI/bge-base embeddings
*   **Deployment:** Cloudflare Pages (Frontend), Cloudflare Tunnels (Remote access to local n8n)

## 🚀 Local Development Setup

### Prerequisites
*   Node.js (v18+)
*   Docker & Docker Compose (for local n8n backend)
*   Supabase projects (for Auth/Chat history and RAG Knowledge Base)

### Installation

1.  **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/Adam9286/elearn-pacer-hkust.git
    cd elearn-pacer-hkust
    \`\`\`

2.  **Install dependencies:**
    \`\`\`bash
    npm install
    \`\`\`

3.  **Environment Variables:**
    Copy the example environment file and fill in your Supabase credentials:
    \`\`\`bash
    cp .env.example .env
    \`\`\`

4.  **Start the n8n backend:**
    \`\`\`bash
    docker compose up -d
    \`\`\`

5.  **Start the frontend development server:**
    \`\`\`bash
    npm run dev
    \`\`\`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.