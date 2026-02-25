using System.Globalization;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using ExpenseTracker.DTOs.Statement;
using ExpenseTracker.Data;
using ExpenseTracker.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Services.Implementations;

public class StatementParserService : IStatementParserService
{
    private readonly AppDbContext _db;

    public StatementParserService(AppDbContext db)
    {
        _db = db;
    }

    // ═══════════════════════ EXCEL PARSER ═══════════════════════
    public Task<StatementPreviewDto> ParseExcelAsync(Stream stream, string fileName)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First();
        var rows = new List<ParsedStatementRowDto>();
        var detectedCols = new List<string>();

        // Find header row (first row with at least 3 non-empty cells)
        int headerRow = 1;
        for (int r = 1; r <= Math.Min(sheet.LastRowUsed()?.RowNumber() ?? 1, 10); r++)
        {
            var row = sheet.Row(r);
            int filled = 0;
            for (int c = 1; c <= (sheet.LastColumnUsed()?.ColumnNumber() ?? 1); c++)
            {
                if (!row.Cell(c).IsEmpty()) filled++;
            }
            if (filled >= 3) { headerRow = r; break; }
        }

        // Read column headers
        int lastCol = sheet.LastColumnUsed()?.ColumnNumber() ?? 1;
        var headers = new Dictionary<int, string>();
        for (int c = 1; c <= lastCol; c++)
        {
            var val = sheet.Row(headerRow).Cell(c).GetString().Trim();
            if (!string.IsNullOrEmpty(val))
            {
                headers[c] = val;
                detectedCols.Add(val);
            }
        }

        // Auto-detect date, description, amount columns
        int dateCol = -1, descCol = -1, amtCol = -1, creditCol = -1, debitCol = -1;
        foreach (var (col, name) in headers)
        {
            var lower = name.ToLowerInvariant();
            if (dateCol < 0 && (lower.Contains("date") || lower.Contains("txn date") || lower.Contains("value date")))
                dateCol = col;
            else if (descCol < 0 && (lower.Contains("narration") || lower.Contains("description") || lower.Contains("particular") || lower.Contains("remark")))
                descCol = col;
            else if (amtCol < 0 && (lower.Contains("amount") || lower.Contains("transaction amount")))
                amtCol = col;
            else if (debitCol < 0 && (lower.Contains("debit") || lower.Contains("withdrawal") || lower.Contains("dr")))
                debitCol = col;
            else if (creditCol < 0 && (lower.Contains("credit") || lower.Contains("deposit") || lower.Contains("cr")))
                creditCol = col;
        }

        // Fallback: if no amount but debit/credit found, we'll combine them
        bool hasSeparateDebitCredit = (debitCol > 0 || creditCol > 0) && amtCol < 0;

        int lastRow = sheet.LastRowUsed()?.RowNumber() ?? headerRow;
        int idx = 0;
        for (int r = headerRow + 1; r <= lastRow; r++)
        {
            var row = sheet.Row(r);

            // Parse date
            DateTime date;
            if (dateCol > 0)
            {
                var dateCell = row.Cell(dateCol);
                if (dateCell.IsEmpty()) continue;
                if (!TryParseDate(dateCell.GetString().Trim(), out date))
                {
                    try { date = dateCell.GetDateTime(); } catch { continue; }
                }
            }
            else continue;

            // Parse description
            string desc = descCol > 0 ? row.Cell(descCol).GetString().Trim() : "";

            // Parse amount
            decimal amount = 0;
            if (hasSeparateDebitCredit)
            {
                decimal debit = 0, credit = 0;
                if (debitCol > 0) TryParseAmount(row.Cell(debitCol).GetString(), out debit);
                if (creditCol > 0) TryParseAmount(row.Cell(creditCol).GetString(), out credit);
                amount = credit > 0 ? credit : -debit;
            }
            else if (amtCol > 0)
            {
                if (!TryParseAmount(row.Cell(amtCol).GetString(), out amount)) continue;
            }
            else continue;

            if (amount == 0) continue;

            var parsed = BuildRow(idx++, date, desc, amount);
            rows.Add(parsed);
        }

        return Task.FromResult(new StatementPreviewDto
        {
            FileName = fileName,
            TotalRows = rows.Count,
            DetectedColumns = detectedCols,
            Rows = rows
        });
    }

    // ═══════════════════════ PDF PARSER ═══════════════════════
    public Task<StatementPreviewDto> ParsePdfAsync(Stream stream, string fileName)
    {
        var rows = new List<ParsedStatementRowDto>();
        using var document = PdfDocument.Open(stream);

        // Date patterns common in Indian bank statements
        var datePattern = new Regex(@"\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b");

        int idx = 0;
        foreach (var page in document.GetPages())
        {
            var text = page.Text;
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);

            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (string.IsNullOrWhiteSpace(trimmed)) continue;

                var dateMatch = datePattern.Match(trimmed);
                if (!dateMatch.Success) continue;
                if (!TryParseDate(dateMatch.Value, out var date)) continue;

                // Extract the rest of the line after the date
                var rest = trimmed.Substring(dateMatch.Index + dateMatch.Length).Trim();

                // Try to extract amount — look for the last number pattern in the line
                var amountPattern = new Regex(@"([\d,]+\.\d{2})\s*(Cr|Dr|CR|DR)?$");
                var amountMatch = amountPattern.Match(rest);
                if (!amountMatch.Success)
                {
                    // Try alternate: numbers at the end
                    var altPattern = new Regex(@"([\d,]+\.?\d*)\s*$");
                    amountMatch = altPattern.Match(rest);
                }

                if (!amountMatch.Success) continue;

                if (!TryParseAmount(amountMatch.Groups[1].Value, out var amount)) continue;
                if (amount == 0) continue;

                // Check for Cr/Dr suffix
                var suffix = amountMatch.Groups.Count > 2 ? amountMatch.Groups[2].Value.ToUpperInvariant() : "";
                if (suffix == "DR") amount = -Math.Abs(amount);
                else if (suffix == "CR") amount = Math.Abs(amount);

                // Description is everything between date and amount
                var desc = rest.Substring(0, amountMatch.Index).Trim();
                desc = Regex.Replace(desc, @"\s{2,}", " ");

                rows.Add(BuildRow(idx++, date, desc, amount));
            }
        }

        return Task.FromResult(new StatementPreviewDto
        {
            FileName = fileName,
            TotalRows = rows.Count,
            DetectedColumns = new List<string> { "Date", "Description", "Amount" },
            Rows = rows
        });
    }

    // ═══════════════════════ DUPLICATE CHECK ═══════════════════════
    public async Task<StatementPreviewDto> MarkDuplicatesAsync(StatementPreviewDto preview, Guid userId)
    {
        if (preview.Rows.Count == 0) return preview;

        var minDate = preview.Rows.Min(r => r.Date).AddDays(-1);
        var maxDate = preview.Rows.Max(r => r.Date).AddDays(1);

        var existing = await _db.Transactions
            .Where(t => t.UserId == userId && t.Date >= minDate && t.Date <= maxDate)
            .Select(t => new { t.Date, t.Amount, t.Description })
            .ToListAsync();

        var existingSet = existing
            .Select(t => $"{t.Date:yyyy-MM-dd}|{Math.Abs(t.Amount)}|{(t.Description ?? "").Trim().ToLowerInvariant()}")
            .ToHashSet();

        int dupCount = 0;
        foreach (var row in preview.Rows)
        {
            var key = $"{row.Date:yyyy-MM-dd}|{Math.Abs(row.Amount)}|{row.Description.Trim().ToLowerInvariant()}";
            if (existingSet.Contains(key))
            {
                row.IsDuplicate = true;
                dupCount++;
            }
        }
        preview.DuplicateCount = dupCount;
        return preview;
    }

    // ═══════════════════════ HELPERS ═══════════════════════
    private static ParsedStatementRowDto BuildRow(int index, DateTime date, string desc, decimal amount)
    {
        var (channel, bankMode) = DetectChannel(desc);
        return new ParsedStatementRowDto
        {
            RowIndex = index,
            Date = date,
            Description = desc,
            Amount = Math.Abs(amount),
            Type = amount < 0 ? "Expense" : "Income",
            Channel = channel,
            BankMode = bankMode
        };
    }

    private static (string channel, string? bankMode) DetectChannel(string desc)
    {
        var upper = desc.ToUpperInvariant();

        if (upper.Contains("UPI") || upper.Contains("GPAY") || upper.Contains("PHONEPE") ||
            upper.Contains("PAYTM") || upper.Contains("GOOGLE PAY"))
            return ("Online", "GPay");

        if (upper.Contains("NEFT") || upper.Contains("IMPS") || upper.Contains("RTGS") ||
            upper.Contains("NET BANKING") || upper.Contains("NETBANKING"))
            return ("Online", "NetBanking");

        if (upper.Contains("DEBIT CARD") || upper.Contains("POS") || upper.Contains("DEBIT CRD"))
            return ("Online", "Debit");

        if (upper.Contains("CREDIT CARD") || upper.Contains("CC "))
            return ("Online", "Credit");

        if (upper.Contains("ATM") || upper.Contains("CASH") || upper.Contains("CDM"))
            return ("Offline", null);

        if (upper.Contains("ECS") || upper.Contains("NACH") || upper.Contains("AUTO"))
            return ("Online", "NetBanking");

        return ("Offline", null);
    }

    private static readonly string[] DateFormats = new[]
    {
        "dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yy", "dd-MM-yy",
        "d/M/yyyy", "d-M-yyyy", "MM/dd/yyyy", "yyyy-MM-dd",
        "dd MMM yyyy", "dd-MMM-yyyy", "dd MMM yy"
    };

    private static bool TryParseDate(string input, out DateTime date)
    {
        return DateTime.TryParseExact(
            input.Trim(), DateFormats, CultureInfo.InvariantCulture,
            DateTimeStyles.None, out date);
    }

    private static bool TryParseAmount(string input, out decimal amount)
    {
        amount = 0;
        if (string.IsNullOrWhiteSpace(input)) return false;
        var cleaned = input.Replace(",", "").Replace("₹", "").Replace("INR", "").Trim();
        // Handle Dr/Cr suffix
        bool isDebit = false;
        if (cleaned.EndsWith("Dr", StringComparison.OrdinalIgnoreCase) || cleaned.EndsWith("DR"))
        {
            cleaned = cleaned[..^2].Trim();
            isDebit = true;
        }
        else if (cleaned.EndsWith("Cr", StringComparison.OrdinalIgnoreCase) || cleaned.EndsWith("CR"))
        {
            cleaned = cleaned[..^2].Trim();
        }
        if (!decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out amount))
            return false;
        if (isDebit) amount = -amount;
        return true;
    }
}
