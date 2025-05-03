import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai"
import { User } from "@prisma/client";
import { generateText } from "ai";

export async function ai_extractor(content: string, user: User, ai_schema: string) {
    // Utiliser les préférences de l'utilisateur si non spécifiées
    const provider_to_use = user.preferredAiProvider as "deepseek" | "openai" || "openai";
    const model_to_use = user.preferredAiModel || "gpt-3.5-turbo";

    var provider = null

    switch (provider_to_use) {
        case "deepseek":
            provider = createDeepSeek({
                apiKey: user.DeepSeekApiKey as string,
            })
            break;
        case "openai":
            provider = createOpenAI({
                apiKey: user.ChatgptApiKey as string,
            });
            break;
    }

    if (!provider) {
        throw new Error("No AI provider selected");
    }
    let prompt = "";
    if (!ai_schema) {
        throw new Error("No schema provided for AI extraction");
    }
    // If schema is provided, ask the model to follow it
    prompt = `Extract the data from the following text as JSON following exactly this schema: ${JSON.stringify(
        ai_schema
    )}
            Text to extract from:
            ${content}
            Return only valid JSON that matches the schema. Do not include any explanations or additional text.`;
    const ai_res = (
        await generateText({
            model: provider(model_to_use),
            prompt: prompt,
        })
    ).text;

    // Clean up the response to extract just the JSON
    let ai_json = ai_res;
    if (ai_res.includes("```json")) {
        ai_json = ai_res
            .substring(ai_res.indexOf("```json") + 7, ai_res.lastIndexOf("```"))
            .trim();
    } else if (ai_res.includes("```")) {
        ai_json = ai_res
            .substring(ai_res.indexOf("```") + 3, ai_res.lastIndexOf("```"))
            .trim();
    }
    try {
        console.log("AI extracted JSON:", ai_json);
        return JSON.parse(ai_json);
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", e);
        throw new Error("Failed to parse AI response as JSON");
    }
}