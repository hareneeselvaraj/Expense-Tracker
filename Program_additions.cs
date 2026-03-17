// ─────────────────────────────────────────────────────────────────────────────
// ADD these lines to Program.cs in the Dependency Injection section,
// alongside the other builder.Services.AddScoped<...> registrations.
// ─────────────────────────────────────────────────────────────────────────────

// HttpClient factory (used by AIChatService to call Anthropic API)
builder.Services.AddHttpClient("google");

// AI Chat Service
builder.Services.AddScoped<IAIChatService, AIChatService>();


// ─────────────────────────────────────────────────────────────────────────────
// ADD this to appsettings.json (alongside "Jwt" and "SmtpSettings"):
// ─────────────────────────────────────────────────────────────────────────────
/*
  "Anthropic": {
    "ApiKey": "sk-ant-YOUR_KEY_HERE"
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// ADD this USING at the top of Program.cs (if not already present):
// ─────────────────────────────────────────────────────────────────────────────
// using ExpenseTracker.Services.Implementations;
// using ExpenseTracker.Services.Interfaces;
