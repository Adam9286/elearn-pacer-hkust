import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Section content mapping for quiz generation context (11 sections)
const chapterContent: Record<number, { title: string; topics: string[] }> = {
  1: {
    title: "Foundations & Internet Overview",
    topics: ["Network edge", "Network core", "Delay/loss/throughput", "Protocol layers", "HTTP basics", "Web fundamentals", "Video streaming", "Internet history"]
  },
  2: {
    title: "Transport Layer & End-to-End Communication",
    topics: ["Transport layer services", "Multiplexing/demultiplexing", "UDP", "Reliable data transfer", "TCP", "Flow control", "Congestion control", "TCP fairness", "Advanced congestion control"]
  },
  3: {
    title: "Queueing & Resource Management",
    topics: ["Queueing theory", "Queue management", "Fairness", "Token buckets", "Traffic shaping", "Active Queue Management", "RED", "Weighted fair queueing"]
  },
  4: {
    title: "Network Layer: IP & Addressing",
    topics: ["IPv4 addressing", "IPv6", "NAT", "DHCP", "DNS", "Fragmentation", "Longest prefix matching", "Router architecture"]
  },
  5: {
    title: "Interdomain Routing & Global Internet",
    topics: ["BGP basics", "BGP path attributes", "AS relationships", "Peering", "Transit", "Internet structure", "IXPs", "Routing policy", "Internet economics"]
  },
  6: {
    title: "Local Area Networks & Intra-Domain Routing",
    topics: ["Ethernet", "MAC addressing", "ARP", "DHCP", "Spanning tree protocol", "VLANs", "Distance vector routing", "Link state routing", "OSPF"]
  },
  7: {
    title: "Wireless Networks",
    topics: ["Wireless links", "WiFi 802.11", "CSMA/CA", "Hidden terminal problem", "Wireless interference", "Mobility management", "Handoff"]
  },
  8: {
    title: "Content Delivery & Internet Performance",
    topics: ["CDN architecture", "Content caching", "DNS-based load balancing", "Anycast", "Edge computing", "Performance optimization", "Video delivery"]
  },
  9: {
    title: "Datacenter Networks",
    topics: ["Datacenter topology", "Fat tree", "Clos networks", "Traffic patterns", "East-west traffic", "SDN in datacenters", "Load balancing", "ECMP"]
  },
  10: {
    title: "Network Security",
    topics: ["Threat models", "Symmetric cryptography", "Public key cryptography", "Digital signatures", "Authentication protocols", "SSL/TLS", "Firewalls", "IPsec", "VPNs"]
  },
  11: {
    title: "Real-Time Systems & Future Networking",
    topics: ["Real-time video", "Latency requirements", "Jitter", "QoS", "Adaptive bitrate streaming", "WebRTC", "Future networking challenges"]
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
      throw new Error(`Invalid section ID: ${chapterId}`);
    }

    console.log(`Generating ${numQuestions} quiz questions for Section ${chapterId}: ${chapter.title}`);

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
          { role: "user", content: `Generate ${numQuestions} quiz questions for Section ${chapterId}: ${chapter.title}. Respond with JSON only.` }
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
