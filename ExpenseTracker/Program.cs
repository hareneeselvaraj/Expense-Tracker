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
using ExpenseTracker.Models;

var builder = WebApplication.CreateBuilder(args);

// ───────────────────── Database ─────────────────────
// Create SQLite DB inside Railway container directory
var dbPath = Path.Combine(AppContext.BaseDirectory, "expense.db");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));


// ───────────────────── JWT Authentication ─────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
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

// ───────────────────── Dependency Injection ─────────────────────
// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IBudgetRepository, BudgetRepository>();
builder.Services.AddScoped<IInvestmentRepository, InvestmentRepository>();
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();
builder.Services.AddScoped<IFuelEntryRepository, FuelEntryRepository>();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IBudgetService, BudgetService>();
builder.Services.AddScoped<IInvestmentService, InvestmentService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IMileageService, MileageService>();
builder.Services.AddScoped<IStatementParserService, StatementParserService>();

// ───────────────────── Controllers + Swagger ─────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Expense Tracker API",
        Version = "v1",
        Description = "Production-ready Expense Tracker Web API with JWT Authentication"
    });

    // Add JWT Bearer button in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ───────────────────── CORS ─────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// ───────────────────── Startup DB Migration (raw SQL) ─────────────────────
// The DB was created outside EF migrations, so we use raw SQL to add missing columns safely.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();

    // Get existing columns
    var existingCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    using (var cmd = conn.CreateCommand())
    {
        cmd.CommandText = "PRAGMA table_info(Investments);";
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            existingCols.Add(reader.GetString(1));
    }

    Console.WriteLine($"  Investments table has {existingCols.Count} columns: {string.Join(", ", existingCols)}");

    // ALL columns that should exist (model fields minus Id, UserId, Name, InvestedAmount, CurrentValue which are original)
    var requiredColumns = new Dictionary<string, string>
    {
        ["AssetType"]            = "ALTER TABLE Investments ADD COLUMN AssetType TEXT NULL",
        ["Category"]             = "ALTER TABLE Investments ADD COLUMN Category TEXT NULL",
        ["Quantity"]             = "ALTER TABLE Investments ADD COLUMN Quantity REAL NULL",
        ["BuyPrice"]             = "ALTER TABLE Investments ADD COLUMN BuyPrice REAL NULL",
        ["Platform"]             = "ALTER TABLE Investments ADD COLUMN Platform TEXT NULL",
        ["Notes"]                = "ALTER TABLE Investments ADD COLUMN Notes TEXT NULL",
        ["DateInvested"]         = "ALTER TABLE Investments ADD COLUMN DateInvested TEXT NULL",
        ["InterestRate"]         = "ALTER TABLE Investments ADD COLUMN InterestRate REAL NULL",
        ["TenureMonths"]         = "ALTER TABLE Investments ADD COLUMN TenureMonths INTEGER NULL",
        ["MonthlyAmount"]        = "ALTER TABLE Investments ADD COLUMN MonthlyAmount REAL NULL",
        ["InvestmentFrequency"]  = "ALTER TABLE Investments ADD COLUMN InvestmentFrequency TEXT NULL",
        // Deposit lifecycle columns
        ["Status"]               = "ALTER TABLE Investments ADD COLUMN Status TEXT NULL",
        ["MonthsCompleted"]      = "ALTER TABLE Investments ADD COLUMN MonthsCompleted INTEGER NULL",
        ["LastProcessedDate"]    = "ALTER TABLE Investments ADD COLUMN LastProcessedDate TEXT NULL",
        ["ProjectedMaturityValue"] = "ALTER TABLE Investments ADD COLUMN ProjectedMaturityValue REAL NULL",
    };

    foreach (var (col, sql) in requiredColumns)
    {
        if (!existingCols.Contains(col))
        {
            using var cmd2 = conn.CreateCommand();
            cmd2.CommandText = sql;
            await cmd2.ExecuteNonQueryAsync();
            Console.WriteLine($"  ✓ Added column: {col}");
        }
    }

    // ── Add missing columns to Transactions table ──
    var txCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    using (var cmdTx = conn.CreateCommand())
    {
        cmdTx.CommandText = "PRAGMA table_info(Transactions);";
        using var readerTx = await cmdTx.ExecuteReaderAsync();
        while (await readerTx.ReadAsync())
            txCols.Add(readerTx.GetString(1));
    }

    var requiredTxColumns = new Dictionary<string, string>
    {
        ["InvestmentId"] = "ALTER TABLE Transactions ADD COLUMN InvestmentId TEXT NULL",
    };

    foreach (var (col, sql) in requiredTxColumns)
    {
        if (!txCols.Contains(col))
        {
            using var cmd3 = conn.CreateCommand();
            cmd3.CommandText = sql;
            await cmd3.ExecuteNonQueryAsync();
            Console.WriteLine($"  ✓ Added column to Transactions: {col}");
        }
    }

    // ── Create Vehicles table if it doesn't exist ──
    using (var cmdCheck = conn.CreateCommand())
    {
        cmdCheck.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='Vehicles';";
        var exists = await cmdCheck.ExecuteScalarAsync();
        if (exists == null)
        {
            using var cmdCreate = conn.CreateCommand();
            cmdCreate.CommandText = @"
                CREATE TABLE Vehicles (
                    Id TEXT PRIMARY KEY,
                    UserId TEXT NOT NULL,
                    Name TEXT NOT NULL,
                    VehicleType TEXT NOT NULL DEFAULT 'Car',
                    FuelType TEXT NOT NULL DEFAULT 'Petrol',
                    RegistrationNumber TEXT NULL,
                    ServiceIntervalKm INTEGER NULL,
                    CreatedAt TEXT NOT NULL,
                    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                );";
            await cmdCreate.ExecuteNonQueryAsync();
            Console.WriteLine("  ✓ Created Vehicles table");
        }
    }

    // ── Create FuelEntries table if it doesn't exist ──
    using (var cmdCheck2 = conn.CreateCommand())
    {
        cmdCheck2.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='FuelEntries';";
        var exists2 = await cmdCheck2.ExecuteScalarAsync();
        if (exists2 == null)
        {
            using var cmdCreate2 = conn.CreateCommand();
            cmdCreate2.CommandText = @"
                CREATE TABLE FuelEntries (
                    Id TEXT PRIMARY KEY,
                    UserId TEXT NOT NULL,
                    VehicleId TEXT NOT NULL,
                    Date TEXT NOT NULL,
                    OdometerReading REAL NOT NULL,
                    FuelQuantity REAL NOT NULL,
                    FuelCost REAL NOT NULL,
                    PricePerLiter REAL NULL,
                    Notes TEXT NULL,
                    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
                    FOREIGN KEY (VehicleId) REFERENCES Vehicles(Id) ON DELETE CASCADE
                );";
            await cmdCreate2.ExecuteNonQueryAsync();
            Console.WriteLine("  ✓ Created FuelEntries table");
        }
    }

    // ── Backfill Category for existing rows that have AssetType but no Category ──
    Console.WriteLine("  Backfilling Category for existing investments...");
    var allInvestments = db.Set<Investment>().Where(i => i.Category == null && i.AssetType != null).ToList();
    foreach (var inv in allInvestments)
    {
        inv.Category = Investment.DeriveCategory(inv.AssetType);
    }
    if (allInvestments.Count > 0)
    {
        await db.SaveChangesAsync();
        Console.WriteLine($"  ✓ Backfilled Category for {allInvestments.Count} investment(s).");
    }

    // ── RD Monthly Installment Scheduler (catch-up on startup) ──
    Console.WriteLine("  Checking active RDs for missed installments...");
    var today = DateTime.UtcNow;
    var activeRDs = db.Set<Investment>()
        .Where(i => i.AssetType == "RD" && i.Status == "Active"
                     && i.MonthlyAmount != null && i.TenureMonths != null && i.DateInvested != null)
        .ToList();

    foreach (var rd in activeRDs)
    {
        var startDate = rd.DateInvested!.Value;
        // How many months elapsed since start (including the first month)
        int monthsElapsed = ((today.Year - startDate.Year) * 12) + today.Month - startDate.Month;
        if (today.Day >= startDate.Day) monthsElapsed += 1;  // include current month if past the date
        else monthsElapsed = Math.Max(monthsElapsed, 1);     // at minimum 1 (first installment)

        // Cap at tenure
        monthsElapsed = Math.Min(monthsElapsed, rd.TenureMonths!.Value);

        int currentCompleted = rd.MonthsCompleted ?? 1;
        if (monthsElapsed > currentCompleted)
        {
            int missed = monthsElapsed - currentCompleted;
            rd.InvestedAmount += rd.MonthlyAmount!.Value * missed;
            rd.CurrentValue = rd.InvestedAmount;
            rd.MonthsCompleted = monthsElapsed;
            rd.LastProcessedDate = today;
            Console.WriteLine($"  ✓ RD '{rd.Name}': added {missed} missed installments → total ₹{rd.InvestedAmount}");
        }

        // Mark matured if all installments done
        if (rd.MonthsCompleted >= rd.TenureMonths)
        {
            rd.Status = "Matured";
            Console.WriteLine($"  ✓ RD '{rd.Name}': marked as Matured");
        }
    }

    if (activeRDs.Count > 0) await db.SaveChangesAsync();
    Console.WriteLine($"  RD check done. {activeRDs.Count} active RD(s) processed.");

    await conn.CloseAsync();
}

// ───────────────────── Middleware Pipeline ─────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Expense Tracker API v1"));
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
// ───── Railway Dynamic Port Binding ─────
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Urls.Add($"http://0.0.0.0:{port}");
app.Run();

