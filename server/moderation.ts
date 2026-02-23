import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (openai) return openai;
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  openai = new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
  return openai;
}

interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
}

/**
 * Normalize username by removing common obfuscation techniques
 * - Removes special characters, underscores, dots, dashes
 * - Converts leetspeak to letters
 * - Normalizes repeated characters
 */
function normalizeUsername(username: string): string {
  let normalized = username.toLowerCase();
  
  // Replace common leetspeak substitutions
  const leetspeak: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '6': 'g',
    '7': 't',
    '8': 'b',
    '9': 'g',
    '@': 'a',
    '$': 's',
    '!': 'i',
    '|': 'i',
    '+': 't',
  };
  
  for (const [char, replacement] of Object.entries(leetspeak)) {
    normalized = normalized.split(char).join(replacement);
  }
  
  // Remove all non-letter characters (spaces, underscores, dots, emojis, etc.)
  normalized = normalized.replace(/[^a-zа-яёіїєґ]/gi, '');
  
  // Reduce repeated characters (e.g., "niggger" -> "niger")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  
  return normalized;
}

/**
 * Check if username contains obvious offensive patterns
 * Returns true if offensive pattern detected
 */
function containsObviousOffense(username: string): boolean {
  const normalized = normalizeUsername(username);
  
  // Common offensive patterns in various languages
  const offensivePatterns = [
    // English slurs and offensive terms
    /n[i1!|]g+[e3]r/i,
    /n[i1!|]gg/i,
    /f[a4@]g+[o0]/i,
    /f[a4@]gg/i,
    /k[i1!|]k[e3]/i,
    /sp[i1!|]c/i,
    /ch[i1!|]nk/i,
    /g[o0][o0]k/i,
    /w[e3]tb[a4@]ck/i,
    /b[e3][a4@]n[e3]r/i,
    /cr[a4@]ck[e3]r/i,
    /wh[i1!|]t[e3]y/i,
    /r[e3]t[a4@]rd/i,
    /p[e3]d[o0]/i,
    /r[a4@]p[i1!|]st/i,
    /murd[e3]r[e3]r/i,
    /t[e3]rr[o0]r/i,
    /h[i1!|]tl[e3]r/i,
    /n[a4@]z[i1!|]/i,
    /ss\s*[a4@]rm/i,
    /g[e3]st[a4@]p[o0]/i,
    /h[o0]l[o0]c[a4@]ust/i,
    /wh[o0]r[e3]/i,
    /sl[u]t/i,
    /b[i1!|]tch/i,
    /c[u]nt/i,
    /d[i1!|]ck/i,
    /p[e3]n[i1!|]s/i,
    /v[a4@]g[i1!|]n/i,
    /f[u]ck/i,
    /sh[i1!|]t/i,
    /[a4@]ssh[o0]l/i,
    // Russian offensive terms
    /хуй/i,
    /пизд/i,
    /бля/i,
    /еба/i,
    /сука/i,
    /хач/i,
    /чурк/i,
    /негр/i,
    /жид/i,
    /пидор/i,
    /педофил/i,
    /педик/i,
    /гитлер/i,
    /наци/i,
    /фашист/i,
  ];
  
  for (const pattern of offensivePatterns) {
    if (pattern.test(normalized) || pattern.test(username)) {
      return true;
    }
  }
  
  return false;
}

/**
 * AI-based moderation for complex cases
 * Uses OpenAI to analyze username for hidden offensive content
 */
async function aiModerateUsername(username: string): Promise<ModerationResult> {
  try {
    const client = getOpenAI();
    if (!client) {
      console.log('[Moderation] OpenAI not configured, skipping AI moderation');
      return { isAllowed: true };
    }
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content moderation system. Your job is to analyze usernames and detect if they contain:
1. Racial slurs or racism in ANY language
2. Sexual content or sexism
3. Pedophilia references
4. Discrimination of any kind (religion, nationality, gender, disability, etc.)
5. Violence, terrorism, or murder references
6. Nazi/fascist symbols or references
7. Hate speech or harassment
8. Obfuscated offensive words (using symbols, numbers, underscores, or creative spelling to hide offensive content)

The username may be in ANY language (English, Russian, Chinese, Arabic, etc.) and may use:
- Leetspeak (n1gg3r, f4g, etc.)
- Symbols between letters (n_a_z_i, p.e.d.o)
- Emojis to hide meaning
- Creative misspellings
- Phonetic spellings
- Multiple languages mixed together

Respond with JSON only:
{
  "isAllowed": true/false,
  "reason": "brief explanation if not allowed, or null if allowed"
}

Be strict - if there's any doubt, err on the side of rejection.`
        },
        {
          role: "user",
          content: `Analyze this username: "${username}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { isAllowed: true };
    }

    const result = JSON.parse(content);
    return {
      isAllowed: result.isAllowed === true,
      reason: result.reason || undefined,
    };
  } catch (error) {
    console.error("AI moderation error:", error);
    // On AI error, fall back to allowing (we already did pattern matching)
    return { isAllowed: true };
  }
}

/**
 * Main moderation function - checks username for offensive content
 * Uses both pattern matching and AI for comprehensive detection
 */
export async function moderateUsername(username: string): Promise<ModerationResult> {
  // Basic validation
  if (!username || username.length < 2) {
    return { isAllowed: false, reason: "Username too short" };
  }
  
  if (username.length > 30) {
    return { isAllowed: false, reason: "Username too long" };
  }
  
  // Check for excessive special characters or emojis
  const letterCount = (username.match(/[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ]/g) || []).length;
  if (letterCount < username.length * 0.3) {
    return { isAllowed: false, reason: "Username must contain mostly letters" };
  }
  
  // Quick pattern-based check first
  if (containsObviousOffense(username)) {
    return { isAllowed: false, reason: "Username contains inappropriate content" };
  }
  
  // AI-based check for complex cases
  const aiResult = await aiModerateUsername(username);
  if (!aiResult.isAllowed) {
    return { isAllowed: false, reason: aiResult.reason || "Username contains inappropriate content" };
  }
  
  return { isAllowed: true };
}
