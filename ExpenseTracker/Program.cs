using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ExpenseTracker.Data;
using ExpenseTracker.Repositories.Implementations;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Implementations;
using ExpenseTracker.Services.Interfaces;
using ExpenseTracker.Services;
using ExpenseTracker.Models;

var builder = WebApplication.CreateBuilder(args);

// Register encoding provider for ExcelDataReader to support old .xls format
System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

// ───────────────────── Database ─────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// ───────────────────── JWT Authentication ─────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});
builder.Services.AddAuthorization();

// ───────────────────── Repositories ─────────────────────
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IBudgetRepository, BudgetRepository>();
builder.Services.AddScoped<IInvestmentRepository, InvestmentRepository>();
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();
builder.Services.AddScoped<IFuelEntryRepository, FuelEntryRepository>();

// ───────────────────── Services ─────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IBudgetService, BudgetService>();
builder.Services.AddScoped<IInvestmentService, InvestmentService>();
builder.Services.AddScoped<ICoupleService, CoupleService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IMileageService, MileageService>();
builder.Services.AddScoped<IAIChatService, AIChatService>();
builder.Services.AddScoped<IAIFeaturesService, AIFeaturesService>();
builder.Services.AddHttpClient("google");

// ───────────────────── Wealth Dashboard ─────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IPriceFeedService, PriceFeedService>();
builder.Services.AddSingleton<AMFIService>();
builder.Services.AddScoped<SIPService>();
builder.Services.AddScoped<PnLCalculationService>();
builder.Services.AddScoped<XIRRService>();
builder.Services.AddScoped<ImportService>();
builder.Services.AddScoped<SnapshotService>();
builder.Services.AddSingleton<BackupService>();
builder.Services.AddHostedService<ExpenseTracker.Services.SIPBackgroundService>();
builder.Services.AddHostedService<ExpenseTracker.Services.SnapshotBackgroundService>();
builder.Services.AddHostedService<ExpenseTracker.Services.BackupBackgroundService>();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Expense Tracker API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "Bearer", BearerFormat = "JWT", In = ParameterLocation.Header });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
});

builder.Services.AddCors(o => o.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// ───────────────────── Startup Migrations ─────────────────────
var app = builder.Build();

try 
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        // ── Create DB from current model (includes ALL columns) ──
        await db.Database.EnsureCreatedAsync();
        
        // ── Wealth Dashboard: ensure new tables & columns exist ──
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                -- Add Ticker columns to Investments (idempotent)
                CREATE TABLE IF NOT EXISTS _migration_check (id INTEGER);
                
                -- Ticker column
                INSERT OR IGNORE INTO _migration_check SELECT 1 WHERE EXISTS (SELECT 1 FROM pragma_table_info('Investments') WHERE name='Ticker');
                
                -- SIPs table
                CREATE TABLE IF NOT EXISTS SIPs (
                    Id TEXT PRIMARY KEY,
                    UserId TEXT NOT NULL,
                    InvestmentId TEXT NOT NULL,
                    MonthlyAmount REAL NOT NULL,
                    ExecutionDay INTEGER NOT NULL DEFAULT 1,
                    Status TEXT DEFAULT 'Active',
                    NextExecutionDate TEXT,
                    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (UserId) REFERENCES Users(Id),
                    FOREIGN KEY (InvestmentId) REFERENCES Investments(Id)
                );

                -- SIPHistories table
                CREATE TABLE IF NOT EXISTS SIPHistories (
                    Id TEXT PRIMARY KEY,
                    SIPId TEXT NOT NULL,
                    Amount REAL NOT NULL,
                    NavAtExecution REAL,
                    ExecutedAt TEXT NOT NULL DEFAULT (datetime('now')),
                    Status TEXT DEFAULT 'Success',
                    Notes TEXT,
                    FOREIGN KEY (SIPId) REFERENCES SIPs(Id)
                );

                -- PortfolioSnapshots table
                CREATE TABLE IF NOT EXISTS PortfolioSnapshots (
                    Id TEXT PRIMARY KEY,
                    UserId TEXT NOT NULL,
                    Date TEXT NOT NULL,
                    TotalValue REAL NOT NULL,
                    TotalInvested REAL NOT NULL,
                    TotalPnl REAL NOT NULL,
                    FOREIGN KEY (UserId) REFERENCES Users(Id)
                );
            ";
            await cmd.ExecuteNonQueryAsync();
        }
        // Add new columns if missing (ALTER TABLE can't use IF NOT EXISTS in SQLite)
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Categories ADD COLUMN Icon TEXT"); } catch { }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Investments ADD COLUMN Ticker TEXT"); } catch { }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Investments ADD COLUMN PriceSource TEXT"); } catch { }
        try { await db.Database.ExecuteSqlRawAsync("ALTER TABLE Investments ADD COLUMN LastPriceUpdate TEXT"); } catch { }
        await conn.CloseAsync();
        
        // RD Catch-up Logic
        var today = DateTime.UtcNow;
        var rds = await db.Investments.Where(i => i.AssetType == "RD" && i.Status == "Active").ToListAsync();
        foreach (var rd in rds)
        {
            if (rd.DateInvested == null || rd.MonthlyAmount == null || rd.TenureMonths == null) continue;
            var start = rd.DateInvested.Value;
            int elapsed = Math.Max(1, ((today.Year - start.Year) * 12) + today.Month - start.Month + (today.Day >= start.Day ? 1 : 0));
            elapsed = Math.Min(elapsed, rd.TenureMonths.Value);
            int current = rd.MonthsCompleted ?? 1;
            if (elapsed > current)
            {
                rd.InvestedAmount += rd.MonthlyAmount.Value * (elapsed - current);
                rd.CurrentValue = rd.InvestedAmount;
                rd.MonthsCompleted = elapsed;
                rd.LastProcessedDate = today;
            }
            if (rd.MonthsCompleted >= rd.TenureMonths) rd.Status = "Matured";
        }
        if (rds.Count > 0) await db.SaveChangesAsync();
    }
}
catch (Exception ex) { Console.WriteLine($"Startup Migration Error: {ex.Message}"); }


if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1"));
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
