import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate exam function called');
    
    const { numQuestions = 15, difficulty = "mixed", includeTypes = ["mcq", "short_answer", "calculation"] } = await req.json();
    
    console.log('Request params:', { numQuestions, difficulty, includeTypes });

    // Call the n8n webhook
    const webhookUrl = 'https://smellycat9286.app.n8n.cloud/webhook-test/exam-generator';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numQuestions,
        difficulty,
        includeTypes,
      }),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook error:', webhookResponse.status, webhookResponse.statusText);
      throw new Error(`Webhook returned status ${webhookResponse.status}`);
    }

    const data = await webhookResponse.json();
    console.log('Webhook response received, questions count:', data.questions?.length);

    // Validate and format the response
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format from webhook');
    }

    // Ensure all questions have required fields
    const formattedQuestions = data.questions.map((q: any, index: number) => ({
      id: q.id || index + 1,
      type: q.type || 'mcq',
      question: q.question || '',
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'medium',
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      correctAnswerText: q.correctAnswerText || '',
      acceptableAnswers: q.acceptableAnswers || [],
      points: q.points || 1,
    }));

    return new Response(
      JSON.stringify({ 
        questions: formattedQuestions,
        totalQuestions: formattedQuestions.length,
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-exam function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to generate exam questions. Please try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
