using System.Security.Claims;
using ExpenseTracker.Data;
using ExpenseTracker.DTOs.Statement;
using ExpenseTracker.Models;
using ExpenseTracker.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StatementController : ControllerBase
{
    private readonly IStatementParserService _parser;
    private readonly AppDbContext _db;
    private readonly ILogger<StatementController> _logger;

    public StatementController(IStatementParserService parser, AppDbContext db, ILogger<StatementController> logger)
    {
        _parser = parser;
        _db = db;
        _logger = logger;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Upload a bank statement file (Excel or PDF) and get parsed preview.
    /// </summary>
    [HttpPost("parse")]
    public async Task<IActionResult> Parse(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".xlsx" or ".xls" or ".pdf"))
            return BadRequest(new { message = "Unsupported file type. Upload .xlsx, .xls, or .pdf." });

        try
        {
            StatementPreviewDto preview;
            using var stream = file.OpenReadStream();

            if (ext is ".xlsx" or ".xls")
                preview = await _parser.ParseExcelAsync(stream, file.FileName);
            else
                preview = await _parser.ParsePdfAsync(stream, file.FileName);

            // Mark duplicates
            preview = await _parser.MarkDuplicatesAsync(preview, GetUserId());

            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse statement file: {FileName}", file.FileName);
            return StatusCode(500, new { message = $"Failed to parse file: {ex.Message}" });
        }
    }

    /// <summary>
    /// Confirm and batch-insert parsed transactions.
    /// </summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmStatementDto dto)
    {
        if (dto.Rows == null || dto.Rows.Count == 0)
            return BadRequest(new { message = "No rows to import." });

        var userId = GetUserId();

        // Validate account
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.UserId == userId);
        if (account == null)
            return BadRequest(new { message = "Invalid account." });

        // Resolve category — use provided or find/create "Uncategorized"
        Guid categoryId;
        if (dto.CategoryId.HasValue && dto.CategoryId.Value != Guid.Empty)
        {
            categoryId = dto.CategoryId.Value;
        }
        else
        {
            var uncategorized = await _db.Categories
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Uncategorized");
            if (uncategorized == null)
            {
                uncategorized = new Category
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Name = "Uncategorized",
                    Type = CategoryType.Expense
                };
                _db.Categories.Add(uncategorized);
                await _db.SaveChangesAsync();
            }
            categoryId = uncategorized.Id;
        }

        // Filter to selected rows only
        var selectedSet = dto.SelectedRowIndices.ToHashSet();
        var rowsToInsert = dto.Rows.Where(r => selectedSet.Contains(r.RowIndex)).ToList();

        // Duplicate check against DB
        var minDate = rowsToInsert.Min(r => r.Date).AddDays(-1);
        var maxDate = rowsToInsert.Max(r => r.Date).AddDays(1);
        var existing = await _db.Transactions
            .Where(t => t.UserId == userId && t.Date >= minDate && t.Date <= maxDate)
            .Select(t => new { t.Date, t.Amount, t.Description })
            .ToListAsync();
        var existingSet = existing
            .Select(t => $"{t.Date:yyyy-MM-dd}|{Math.Abs(t.Amount)}|{(t.Description ?? "").Trim().ToLowerInvariant()}")
            .ToHashSet();

        int inserted = 0, skipped = 0;
        foreach (var row in rowsToInsert)
        {
            var key = $"{row.Date:yyyy-MM-dd}|{row.Amount}|{row.Description.Trim().ToLowerInvariant()}";
            if (existingSet.Contains(key)) { skipped++; continue; }

            var type = Enum.TryParse<TransactionType>(row.Type, true, out var tt) ? tt : TransactionType.Expense;
            var channel = Enum.TryParse<OnlineOffline>(row.Channel, true, out var oo) ? oo : OnlineOffline.Offline;
            BankMode? bankMode = null;
            if (!string.IsNullOrEmpty(row.BankMode) && Enum.TryParse<BankMode>(row.BankMode, true, out var bm))
                bankMode = bm;

            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AccountId = dto.AccountId,
                CategoryId = categoryId,
                Amount = row.Amount,
                Type = type,
                OnlineOffline = channel,
                BankMode = bankMode,
                Description = row.Description,
                Date = DateTime.SpecifyKind(row.Date, DateTimeKind.Utc),
                IsMonitor = false,
                IsAutoDebit = false
            };
            _db.Transactions.Add(transaction);
            inserted++;
        }

        await _db.SaveChangesAsync();

        return Ok(new { inserted, skipped, message = $"Imported {inserted} transactions. {skipped} duplicates skipped." });
    }
}
