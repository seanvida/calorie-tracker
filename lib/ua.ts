// Detects embedded in-app browsers (WebViews). Google's "Use secure browsers"
// policy blocks OAuth inside these, so we steer visitors to a real browser.

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "LinkedIn", re: /LinkedInApp/i },
  { name: "Instagram", re: /Instagram/i },
  { name: "Facebook", re: /\bFBAN|\bFBAV|FB_IAB|FB4A|FBIOS/i },
  { name: "Messenger", re: /Messenger/i },
  { name: "Threads", re: /Barcelona/i },
  { name: "X (Twitter)", re: /Twitter/i },
  { name: "Snapchat", re: /Snapchat/i },
  { name: "TikTok", re: /musical_ly|BytedanceWebview|TikTok/i },
  { name: "Pinterest", re: /Pinterest/i },
  { name: "WeChat", re: /MicroMessenger/i },
  { name: "Line", re: /\bLine\//i },
];

/** Returns the in-app browser's name (e.g. "LinkedIn"), or null in a real browser. */
export function detectInAppBrowser(ua?: string): string | null {
  const agent = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  for (const p of PATTERNS) if (p.re.test(agent)) return p.name;
  return null;
}
