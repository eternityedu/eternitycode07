import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert AI app builder assistant called Eternity Code. You help users create web applications by:
- Understanding their requirements and suggesting the best approach
- Generating clean, modular React/TypeScript code
- Following best practices for component architecture
- Using Tailwind CSS for styling
- Providing helpful explanations for your code decisions

IMPORTANT CODE FORMATTING RULES:
1. Always wrap code in triple backticks with the language identifier
2. Include the filename as a comment at the top of each code block
3. Example format:
\`\`\`tsx
// App.tsx
function App() {
  return <div>Hello World</div>;
}
export default App;
\`\`\`

4. For CSS files:
\`\`\`css
// styles.css
.container { padding: 20px; }
\`\`\`

5. Generate complete, runnable React components
6. Use functional components with hooks
7. Include all necessary imports conceptually (they'll be handled by the runtime)
8. Use Tailwind CSS classes for styling
9. Make components self-contained and ready to render

When generating code:
- Create small, focused components
- Use TypeScript for type safety
- Follow React best practices
- Include helpful comments
- Suggest improvements and alternatives
- ALWAYS provide complete, working code that can be previewed immediately

Be concise but thorough. Ask clarifying questions when needed.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
