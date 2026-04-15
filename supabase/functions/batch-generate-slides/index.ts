import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks (Supabase Edge Functions)
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External Supabase connection (oqgotlmztpvchkipslnc - MockExam & Knowledge Base)
const EXAM_SUPABASE_URL = "https://oqgotlmztpvchkipslnc.supabase.co";
const EXAM_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZ290bG16dHB2Y2hraXBzbG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMjc0MjAsImV4cCI6MjA3NTkwMzQyMH0.1yt8V-9weq5n7z2ncN1p9vAgRvNI4TAIC5VyDFcuM7w";

// Gemini API — model selected per slide based on content weight
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_FLASH = "gemini-2.5-flash";          // diagram-heavy / visual slides
const GEMINI_FLASH_LITE = "gemini-2.5-flash-lite"; // text-heavy / bulk slides

// Lecture context metadata for all 22 lectures
const LECTURE_CONTEXT: Record<string, { chapter: string; title: string; topics: string[] }> = {
  "01-Introduction": {
    chapter: "Foundations & Internet Overview",
    title: "Introduction to Computer Networks",
    topics: ["Network fundamentals", "Internet architecture", "Protocol layers", "Network edge and core"]
  },
  "02-Web": {
    chapter: "Foundations & Internet Overview",
    title: "Web and HTTP",
    topics: ["HTTP protocol", "Web architecture", "Client-server model", "Cookies and sessions"]
  },
  "03-Mail": {
    chapter: "Foundations & Internet Overview",
    title: "Email Systems",
    topics: ["SMTP protocol", "Email architecture", "POP3 and IMAP", "Mail servers"]
  },
  "04-DNS": {
    chapter: "Foundations & Internet Overview",
    title: "Domain Name System",
    topics: ["DNS hierarchy", "Name resolution", "DNS records", "Caching"]
  },
  "05-SocketProgramming": {
    chapter: "Foundations & Internet Overview",
    title: "Socket Programming",
    topics: ["TCP sockets", "UDP sockets", "Client-server programming", "Network APIs"]
  },
  "06-TransportLayerIntro": {
    chapter: "Transport Layer",
    title: "Transport Layer Introduction",
    topics: ["Transport services", "Multiplexing", "Demultiplexing", "UDP basics"]
  },
  "07-ReliableDataTransfer": {
    chapter: "Transport Layer",
    title: "Reliable Data Transfer",
    topics: ["RDT protocols", "Stop-and-wait", "Pipelining", "Error recovery"]
  },
  "08-TCP": {
    chapter: "Transport Layer",
    title: "TCP Protocol",
    topics: ["TCP segment structure", "Connection management", "Flow control", "Congestion control"]
  },
  "09-NetworkLayer": {
    chapter: "Network Layer",
    title: "Network Layer Introduction",
    topics: ["Forwarding vs routing", "Router architecture", "IP protocol", "Datagram format"]
  },
  "10-IP": {
    chapter: "Network Layer",
    title: "Internet Protocol",
    topics: ["IPv4 addressing", "Subnetting", "CIDR", "NAT"]
  },
  "11-RoutingAlgorithms": {
    chapter: "Network Layer",
    title: "Routing Algorithms",
    topics: ["Link state routing", "Distance vector", "Dijkstra's algorithm", "Bellman-Ford"]
  },
  "12-InternetRouting": {
    chapter: "Network Layer",
    title: "Internet Routing",
    topics: ["OSPF", "BGP", "Autonomous systems", "Inter-domain routing"]
  },
  "13-SDN": {
    chapter: "Network Layer",
    title: "Software Defined Networking",
    topics: ["SDN architecture", "OpenFlow", "Control plane", "Data plane separation"]
  },
  "14-LinkLayer": {
    chapter: "Link Layer",
    title: "Link Layer Introduction",
    topics: ["Error detection", "Multiple access protocols", "MAC addresses", "ARP"]
  },
  "15-Ethernet": {
    chapter: "Link Layer",
    title: "Ethernet and Switching",
    topics: ["Ethernet protocol", "Switches", "VLANs", "Spanning tree"]
  },
  "16-Wireless": {
    chapter: "Wireless & Mobile",
    title: "Wireless Networks",
    topics: ["WiFi 802.11", "Wireless challenges", "CSMA/CA", "Hidden terminal problem"]
  },
  "17-MobileIP": {
    chapter: "Wireless & Mobile",
    title: "Mobile IP and Cellular",
    topics: ["Mobile IP", "Handoff", "4G/5G networks", "Mobility management"]
  },
  "18-Security": {
    chapter: "Network Security",
    title: "Network Security Fundamentals",
    topics: ["Encryption", "Authentication", "Message integrity", "Key distribution"]
  },
  "19-SecurityProtocols": {
    chapter: "Network Security",
    title: "Security Protocols",
    topics: ["SSL/TLS", "IPsec", "Firewalls", "VPNs"]
  },
  "20-Multimedia": {
    chapter: "Multimedia Networking",
    title: "Multimedia Networking",
    topics: ["Streaming protocols", "VoIP", "QoS", "CDNs"]
  },
  "21-DataCenters": {
    chapter: "Advanced Topics",
    title: "Data Center Networks",
    topics: ["Data center architecture", "Load balancing", "Fat-tree topology", "SDN in data centers"]
  },
  "22-Review": {
    chapter: "Course Review",
    title: "Course Summary and Review",
    topics: ["Key concepts review", "Protocol stack", "Exam preparation", "Important formulas"]
  }
};

interface SlideContent {
  slide_number: number;
  content: string;
}

interface GeneratedContent {
  explanation: string;
  keyPoints: string[];
  comprehensionQuestion?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

// Shutdown handler to log progress when function terminates
addEventListener('beforeunload', (ev: Event) => {
  const detail = (ev as CustomEvent).detail;
  console.log('[batch-generate-slides] Shutting down:', detail?.reason);
});

/** Pick model tier based on extracted text length */
function selectModel(slideText: string): string {
  const wordCount = slideText.split(/\s+/).filter(Boolean).length;
  return wordCount < 30 ? GEMINI_FLASH : GEMINI_FLASH_LITE;
}

function buildLectureOutline(slides: SlideContent[]): string {
  return slides
    .map((s) => `Slide ${s.slide_number}: ${s.content.slice(0, 100)}${s.content.length > 100 ? '...' : ''}`)
    .join('\n');
}

async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${model}):`, response.status, errorText);
    if (response.status === 429) throw new Error("Gemini rate limit exceeded.");
    if (response.status === 403) throw new Error("Gemini API key invalid.");
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function generateSlideExplanation(
  lectureId: string,
  slideNumber: number,
  slideText: string,
  totalSlides: number,
  lectureOutline: string,
  apiKey: string
): Promise<GeneratedContent> {
  const context = LECTURE_CONTEXT[lectureId] || {
    chapter: "Computer Networks",
    title: lectureId,
    topics: ["Networking concepts"]
  };

  const systemPrompt = `You are an expert computer networks instructor for ELEC3120 at HKUST.
Your role is to explain lecture slide content clearly and accurately to undergraduate engineering students.

GROUNDING RULES:
1. ONLY explain what is on the provided slide. Do not add information from external knowledge unless the slide explicitly references it.
2. Every technical claim must be traceable to content on this slide or earlier slides in this lecture.
3. Use the EXACT terminology from the slides. If the slide says "segment", do not substitute "packet" unless the slide itself equates them.
4. Do NOT produce generic textbook summaries. Explain what THIS slide is teaching and why it matters in the lecture sequence.

STYLE RULES:
- Do NOT start with greetings like "Welcome!", "Hello!", etc.
- Only slide 1 may include a brief introduction to the lecture topic.
- For slides 2+, dive directly into the content without preamble.
- Write as if continuing a conversation, not starting a new one.
- Be conversational but technically accurate.
- Use analogies and concrete examples with specific values (e.g., "window size = 4") where appropriate.
- For mathematical formulas, use LaTeX notation where helpful.
- Keep the tone educational, clear, and engaging.`;

  const isFirstSlide = slideNumber === 1;
  const isLowText = slideText.split(/\s+/).filter(Boolean).length < 30;

  const userPrompt = `Explain this lecture slide.

LECTURE: ${context.title} (ELEC3120 Computer Networks)
CHAPTER: ${context.chapter}
TOPICS: ${context.topics.join(", ")}
SLIDE: ${slideNumber} of ${totalSlides}

LECTURE OUTLINE:
${lectureOutline}

SLIDE CONTENT:
${slideText}
${isLowText ? "\nNOTE: This slide has very little text — it likely contains a diagram, chart, or visual. Explain what the visual likely illustrates based on the text labels and the lecture context.\n" : ""}
INSTRUCTIONS:
- ${isFirstSlide ? "You may include ONE brief introduction to the lecture topic." : "Skip any introduction — dive straight into explaining the content."}
- Explain what this slide teaches and connect to earlier slides where relevant.
- If the slide introduces a formula or protocol mechanism, use a concrete example.

Return a JSON object with:
1. "explanation": A clear, grounded 2-4 paragraph explanation of THIS slide's content
2. "keyPoints": 3-5 specific takeaways a student could use as study notes (each one sentence)
3. "comprehensionQuestion": {
     "question": "A question answerable using ONLY information from this slide",
     "options": ["A", "B", "C", "D"],
     "correctIndex": 0-3,
     "explanation": "Why the correct answer is right"
   }

Respond ONLY with valid JSON.`;

  const model = selectModel(slideText);
  console.log(`[batch] Using ${model} for slide ${slideNumber} (${isLowText ? "diagram-heavy" : "text-heavy"})`);

  const content = await callGemini(model, systemPrompt, userPrompt, apiKey);

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr) as GeneratedContent;
  } catch (parseError) {
    console.error("Failed to parse AI response:", jsonStr);
    throw new Error("Invalid JSON in AI response");
  }
}

// Background processing function
async function processSlides(
  slides: SlideContent[],
  allSlides: SlideContent[],
  lectureId: string,
  apiKey: string,
  examSupabaseUrl: string,
  examSupabaseKey: string
): Promise<void> {
  const examSupabase = createClient(examSupabaseUrl, examSupabaseKey);
  const totalSlides = allSlides.length;
  const lectureOutline = buildLectureOutline(allSlides);

  let generated = 0;
  let errors = 0;

  for (const slide of slides) {
    try {
      console.log(`[background] Generating slide ${slide.slide_number}...`);

      const content = await generateSlideExplanation(
        lectureId,
        slide.slide_number,
        slide.content,
        totalSlides,
        lectureOutline,
        apiKey
      );

      // Upsert to slide_explanations with status = 'draft'
      const { error: upsertError } = await examSupabase
        .from("slide_explanations")
        .upsert(
          {
            lecture_id: lectureId,
            slide_number: slide.slide_number,
            explanation: content.explanation,
            key_points: content.keyPoints,
            comprehension_question: content.comprehensionQuestion || null,
            status: "draft",
          },
          { onConflict: "lecture_id,slide_number" }
        );

      if (upsertError) {
        console.error(`[background] Error upserting slide ${slide.slide_number}:`, upsertError);
        errors++;
      } else {
        generated++;
        console.log(`[background] Slide ${slide.slide_number} done (${generated}/${slides.length})`);
      }

      // Rate limiting: wait 1 second between API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`[background] Error generating slide ${slide.slide_number}:`, err);
      errors++;
    }
  }

  console.log(`[background] Complete: ${generated} generated, ${errors} errors out of ${slides.length} slides`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lecture_id, force_regenerate = false, slide_range } = await req.json();

    if (!lecture_id) {
      return new Response(
        JSON.stringify({ error: "lecture_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to external Supabase
    const examSupabase = createClient(EXAM_SUPABASE_URL, EXAM_SUPABASE_ANON_KEY);

    console.log(`[batch-generate-slides] Starting for lecture: ${lecture_id}`);

    // Fetch all slides for this lecture from lecture_slides_course
    let query = examSupabase
      .from("lecture_slides_course")
      .select("slide_number, content")
      .eq("lecture_id", lecture_id)
      .order("slide_number", { ascending: true });

    // Optional: limit to specific slide range
    if (slide_range) {
      const [start, end] = slide_range;
      query = query.gte("slide_number", start).lte("slide_number", end);
    }

    const { data: slides, error: slidesError } = await query;

    if (slidesError) {
      console.error("Error fetching slides:", slidesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch slides", details: slidesError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!slides || slides.length === 0) {
      return new Response(
        JSON.stringify({ error: "No slides found for lecture", lecture_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always fetch ALL slides for context (even if we're only regenerating a range)
    const { data: allSlides } = await examSupabase
      .from("lecture_slides_course")
      .select("slide_number, content")
      .eq("lecture_id", lecture_id)
      .order("slide_number", { ascending: true });

    const fullSlideList = (allSlides || slides) as SlideContent[];

    console.log(`[batch-generate-slides] Found ${slides.length} slides (${fullSlideList.length} total in lecture)`);

    // Check which slides already have explanations
    const { data: existingExplanations } = await examSupabase
      .from("slide_explanations")
      .select("slide_number")
      .eq("lecture_id", lecture_id);

    const existingSlideNumbers = new Set(
      existingExplanations?.map((e) => e.slide_number) || []
    );

    // Filter slides that need generation
    const slidesToProcess = (slides as SlideContent[]).filter(slide => {
      if (existingSlideNumbers.has(slide.slide_number) && !force_regenerate) {
        console.log(`[batch-generate-slides] Skipping slide ${slide.slide_number} (already exists)`);
        return false;
      }
      return true;
    });

    const skippedCount = slides.length - slidesToProcess.length;

    // If nothing to process, return early
    if (slidesToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          status: "complete",
          message: "All slides already have explanations",
          total_slides: slides.length,
          to_generate: 0,
          skipped: skippedCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start background processing using EdgeRuntime.waitUntil
    EdgeRuntime.waitUntil(
      processSlides(
        slidesToProcess,
        fullSlideList,
        lecture_id,
        GEMINI_API_KEY,
        EXAM_SUPABASE_URL,
        EXAM_SUPABASE_ANON_KEY
      )
    );

    console.log(`[batch-generate-slides] Started background processing for ${slidesToProcess.length} slides`);

    // Return immediate response
    return new Response(
      JSON.stringify({
        status: "processing",
        message: `Started generating ${slidesToProcess.length} slides in background`,
        total_slides: slides.length,
        to_generate: slidesToProcess.length,
        skipped: skippedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("batch-generate-slides error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
