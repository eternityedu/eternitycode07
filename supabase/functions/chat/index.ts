import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5-mini",
  "openai/gpt-5",
];

const systemPrompt = `You are Eternity Code, an expert AI coding assistant. You help developers build web applications using React, TypeScript, and Tailwind CSS.

Your capabilities:
- Generate clean, production-ready React/TypeScript code
- Create modular, reusable components
- Follow modern best practices and design patterns
- Provide clear explanations for code decisions

CODE FORMATTING RULES:
1. Always wrap code in triple backticks with language identifier
2. Include the filename as a comment at the top:
\`\`\`tsx
// ComponentName.tsx
function ComponentName() {
  return <div>Content</div>;
}
export default ComponentName;
\`\`\`

3. For CSS files:
\`\`\`css
// styles.css
.container { padding: 20px; }
\`\`\`

CODE QUALITY:
- Use functional components with hooks
- Include TypeScript types
- Use Tailwind CSS for styling
- Create self-contained, runnable components
- Add helpful comments
- Handle edge cases and errors

Be concise but thorough. Generate complete, working code that can be previewed immediately.`;

// Handle custom API requests
async function handleCustomApi(
  messages: any[],
  customConfig: any
): Promise<Response> {
  const { provider, apiKey, baseUrl, modelId } = customConfig;
  
  let endpoint = baseUrl || '';
  let headers: Record<string, string> = {};
  let body: any = {};
  
  switch (provider) {
    case 'openai':
      endpoint = baseUrl || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: modelId || 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
      };
      break;
      
    case 'anthropic':
      endpoint = baseUrl || 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      };
      body = {
        model: modelId || 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: systemPrompt,
        messages: messages,
        stream: true,
      };
      break;
      
    case 'google':
      const model = modelId || 'gemini-2.0-flash';
      endpoint = baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
      headers = {
        'Content-Type': 'application/json',
      };
      body = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        ],
      };
      break;
      
    case 'custom':
    default:
      endpoint = baseUrl || '';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: modelId || 'default',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
      };
  }
  
  if (!endpoint) {
    throw new Error('Custom API endpoint not configured');
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Custom API error:", response.status, errorText);
    throw new Error(`Custom API error: ${response.status}`);
  }
  
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = "google/gemini-3-flash-preview", customApi } = await req.json();
    
    // If custom API is provided, use it
    if (customApi && customApi.enabled && customApi.apiKey) {
      try {
        const response = await handleCustomApi(messages, customApi);
        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      } catch (error) {
        console.error("Custom API failed:", error);
        return new Response(
          JSON.stringify({ error: (error as Error).message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Use Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate model
    const selectedModel = VALID_MODELS.includes(model) ? model : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to connect to AI service" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
