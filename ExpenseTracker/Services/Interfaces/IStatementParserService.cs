using ExpenseTracker.DTOs.Statement;

namespace ExpenseTracker.Services.Interfaces;

public interface IStatementParserService
{
    Task<StatementPreviewDto> ParseExcelAsync(Stream stream, string fileName);
    Task<StatementPreviewDto> ParsePdfAsync(Stream stream, string fileName);
    Task<StatementPreviewDto> MarkDuplicatesAsync(StatementPreviewDto preview, Guid userId);
}
