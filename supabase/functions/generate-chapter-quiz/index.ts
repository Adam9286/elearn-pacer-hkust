import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chapter content mapping for quiz generation context
const chapterContent: Record<number, { title: string; topics: string[] }> = {
  1: {
    title: "Computer Networks and the Internet",
    topics: ["Network edge", "Network core", "Delay/loss/throughput", "Protocol layers", "Security basics", "Internet history", "HTTP basics", "Video streaming"]
  },
  2: {
    title: "Application Layer",
    topics: ["Application layer principles", "Web and HTTP", "Email protocols", "DNS", "P2P applications", "Socket programming"]
  },
  3: {
    title: "Transport Layer",
    topics: ["Transport layer services", "Multiplexing/demultiplexing", "UDP", "Reliable data transfer", "TCP", "Congestion control", "TCP fairness"]
  },
  4: {
    title: "Network Layer - Data Plane",
    topics: ["Network layer overview", "Router architecture", "IPv4", "NAT", "IPv6", "Generalized forwarding", "SDN"]
  },
  5: {
    title: "Network Layer - Control Plane",
    topics: ["Routing algorithms", "OSPF", "BGP", "SDN control plane", "ICMP", "Network management"]
  },
  6: {
    title: "Link Layer and LANs",
    topics: ["Link layer services", "Error detection", "Multiple access protocols", "Switched LANs", "VLANs", "Data center networking"]
  },
  7: {
    title: "Wireless and Mobile Networks",
    topics: ["Wireless links", "WiFi (802.11)", "Cellular networks", "Mobility management", "Mobile IP"]
  },
  8: {
    title: "Security and Advanced Topics",
    topics: ["Network security principles", "Cryptography", "Authentication", "SSL/TLS", "Firewalls", "CDN", "Datacenter networks", "Real-time video"]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, numQuestions = 5 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const chapter = chapterContent[chapterId];
    if (!chapter) {
      throw new Error(`Invalid chapter ID: ${chapterId}`);
    }

    console.log(`Generating ${numQuestions} quiz questions for Chapter ${chapterId}: ${chapter.title}`);

    const systemPrompt = `You are an expert computer networks professor creating quiz questions for the ELEC3120 course. 
Generate exactly ${numQuestions} multiple choice questions about "${chapter.title}".

Topics to cover: ${chapter.topics.join(", ")}

IMPORTANT: You MUST respond with valid JSON only. No markdown, no code blocks, no extra text.

The JSON format must be exactly:
{
  "questions": [
    {
      "id": 1,
      "question": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Rules:
- correctAnswer is the 0-based index (0, 1, 2, or 3)
- Each question must have exactly 4 options
- Questions should test understanding, not just memorization
- Include a mix of conceptual and applied questions
- Explanations should be educational and concise`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${numQuestions} quiz questions for Chapter ${chapterId}: ${chapter.title}. Respond with JSON only.` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("Raw AI response:", content);

    // Parse JSON from response (handle potential markdown code blocks)
    let quizData;
    try {
      // Try direct parse first
      quizData = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find JSON object in the content
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          quizData = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        } else {
          throw new Error("Could not parse AI response as JSON");
        }
      }
    }

    console.log(`Successfully generated ${quizData.questions?.length || 0} questions`);

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating quiz:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
