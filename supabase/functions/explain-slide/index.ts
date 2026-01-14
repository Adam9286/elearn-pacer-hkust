import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideRequest {
  lessonId: string;
  slideNumber: number;
  totalSlides: number;
  lessonTitle: string;
  chapterTitle: string;
  chapterTopics: string[];
  textbookSections?: string;
  previousContext?: string;
  generateQuestion: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { 
      lessonId, 
      slideNumber, 
      totalSlides,
      lessonTitle, 
      chapterTitle, 
      chapterTopics,
      textbookSections,
      previousContext,
      generateQuestion 
    }: SlideRequest = await req.json();

    console.log(`Generating explanation for slide ${slideNumber}/${totalSlides} of lesson: ${lessonTitle}`);

    const systemPrompt = `You are an expert computer networks tutor for the ELEC3120 course at HKUST. Your role is to explain lecture slides in an engaging, clear, and educational manner.

Course context:
- Chapter: ${chapterTitle}
- Lesson: ${lessonTitle}
- Topics covered: ${chapterTopics.join(', ')}
${textbookSections ? `- Textbook sections: ${textbookSections}` : ''}

Your teaching style:
- Be conversational but technically accurate
- Use analogies to explain complex concepts
- Break down technical terms
- Connect concepts to real-world applications
- Keep explanations focused and digestible (2-3 paragraphs max)

${previousContext ? `Previous slides context: ${previousContext}` : ''}`;

    const userPrompt = generateQuestion 
      ? `Explain slide ${slideNumber} of ${totalSlides} for the lecture "${lessonTitle}". 

Since this is a comprehension checkpoint, also generate a multiple-choice question to test understanding.

Respond in JSON format:
{
  "explanation": "Your 2-3 paragraph explanation of the slide content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "comprehensionQuestion": {
    "question": "Your question testing slide comprehension",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why the correct answer is right"
  }
}`
      : `Explain slide ${slideNumber} of ${totalSlides} for the lecture "${lessonTitle}".

Respond in JSON format:
{
  "explanation": "Your 2-3 paragraph explanation of the slide content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response from AI
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Fallback: treat as plain explanation
      parsed = {
        explanation: content,
        keyPoints: ['Key concept from this slide'],
      };
    }

    console.log('Successfully generated slide explanation');

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in explain-slide function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
