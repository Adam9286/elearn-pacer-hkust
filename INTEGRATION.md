# LearningPacer Integration Guide

## Overview
LearningPacer is an AI-powered teaching assistant for ELEC3120: Computer Networks at HKUST. This guide explains how to connect the frontend to your Python Flask backend and n8n workflow.

## Architecture

### Frontend (This Application)
- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS with HKUST branding
- **Components**: Chat interface, course progress tracker, mock exam generator
- **State Management**: React hooks

### Backend (Your Implementation)
- **Framework**: Python Flask
- **Database**: Supabase (PostgreSQL + pgvector)
- **Automation**: n8n workflow
- **AI**: RAG-based Q&A with vector search

## Connecting to Your Backend

### 1. Chat Mode Integration

The chat interface is in `src/components/ChatMode.tsx`. Replace the simulated response with your n8n webhook:

```typescript
const handleSend = async () => {
  if (!input.trim()) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: input,
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput("");

  try {
    // Replace with your n8n webhook URL
    const response = await fetch('YOUR_N8N_WEBHOOK_URL', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: input,
        context: messages, // Send conversation history
      }),
    });

    const data = await response.json();
    
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: data.answer,
      source: data.source_document, // From your RAG system
    };
    
    setMessages((prev) => [...prev, aiMessage]);
  } catch (error) {
    console.error('Error calling AI:', error);
    // Show error toast
  }
};
```

### 2. Supabase Configuration

Create a `.env.local` file (not tracked in git):

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Course Mode Integration

Connect to your Supabase database to track user progress:

```typescript
// Example: Fetching user progress
const fetchUserProgress = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('unit_id, mastery_score, completed')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data;
};
```

### 4. Mock Exam Mode Integration

Connect to your adaptive exam generator:

```typescript
// Example: Fetching adaptive questions
const fetchAdaptiveQuestions = async (userId: string, weakAreas: string[]) => {
  const response = await fetch('YOUR_EXAM_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      weak_areas: weakAreas,
      question_count: 15,
    }),
  });

  const data = await response.json();
  return data.questions;
};
```

## Database Schema Suggestions

### Supabase Tables

```sql
-- User Progress Table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  unit_id INTEGER,
  mastery_score DECIMAL(5,2),
  completed BOOLEAN DEFAULT false,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Materials (Vector Store)
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  embedding vector(1536), -- For OpenAI embeddings
  source_type TEXT, -- 'lecture', 'lab', 'exam'
  week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Quiz Results
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  quiz_id UUID,
  score DECIMAL(5,2),
  questions_correct INTEGER,
  questions_total INTEGER,
  weak_topics TEXT[],
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector similarity search index
CREATE INDEX ON course_materials 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## RAG System Prompt

Use this system prompt for scope protection:

```text
You are LearningPacer, an AI teaching assistant for ELEC3120: Computer Networks at The Hong Kong University of Science and Technology (HKUST).

CRITICAL RULES:
1. ONLY answer questions using the provided course materials (lecture slides, lab manuals, past exams)
2. If a question is outside ELEC3120 scope, respond: "I'm sorry, but this topic is not covered in ELEC3120. Please ask a question related to the course content."
3. ALWAYS cite your source document when answering
4. Provide tiered hints for incorrect answers:
   - Level 1: Symptom (what's wrong)
   - Level 2: Reasoning (why it's wrong)
   - Level 3: Concept (what concept applies)
   - Level 4: Code/Formula (example solution)
   - Level 5: Patch (complete answer)

CONTEXT:
{retrieved_course_materials}

USER QUESTION:
{user_question}
```

## n8n Workflow Structure

### Suggested Workflow Nodes:

1. **Webhook Trigger** - Receives user question
2. **Extract Question** - Parse incoming data
3. **Vector Search** - Query Supabase for relevant materials
4. **Format Context** - Prepare RAG context
5. **OpenAI Chat** - Generate answer with scope protection
6. **Cite Sources** - Extract source documents
7. **Respond** - Return JSON with answer and citations

### Example Response Format:

```json
{
  "answer": "TCP flow control prevents the sender from overwhelming the receiver's buffer...",
  "source_document": "Lecture Slides - Week 3: Transport Layer",
  "confidence": 0.95,
  "related_topics": ["TCP", "Flow Control", "Sliding Window"]
}
```

## Environment Variables

### Frontend (.env.local)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
```

### Backend (Flask)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
N8N_WEBHOOK_SECRET=your_webhook_secret
```

## Testing the Integration

1. **Test Scope Protection**:
   - Ask: "What is Roblox?" → Should reject
   - Ask: "Explain TCP flow control" → Should answer with citation

2. **Test Vector Search**:
   - Verify relevant course materials are retrieved
   - Check embedding quality and similarity scores

3. **Test Mastery Tracking**:
   - Complete quizzes and verify 80% threshold locks/unlocks units
   - Check progress persistence

4. **Test Adaptive Exams**:
   - Take multiple exams
   - Verify questions adapt to weak areas

## Next.js Migration (Optional)

If you need to migrate to Next.js as originally planned:

```bash
# All components are framework-agnostic and will work in Next.js
# Key changes:
1. Replace Vite with Next.js config
2. Convert routes to Next.js app router
3. Use next/image for optimizations
4. Server components for data fetching
```

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **n8n Documentation**: https://docs.n8n.io/
- **RAG Best Practices**: https://docs.anthropic.com/en/docs/build-with-claude/embeddings
- **HKUST ELEC3120**: [Your course website]

## Presentation Tips for FYP Defense

1. **Demo Flow**: Chat → Course → Exam → Show "How It Works"
2. **Highlight RAG**: Explain vector search preventing hallucinations
3. **Show Gating**: Demonstrate 80% mastery requirement
4. **Adaptive Learning**: Display question weighting based on weak areas
5. **Performance**: Show response times and citation accuracy

---

**Ready to deploy?** This frontend is production-ready and optimized for academic use. Connect your backend and start helping ELEC3120 students master Computer Networks!
