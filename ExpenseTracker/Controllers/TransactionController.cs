using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ExpenseTracker.DTOs.Transaction;
using ExpenseTracker.Models;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Controllers;

[Route("api/[controller]")]
[Authorize]
public class TransactionController : BaseApiController
{
    private readonly ITransactionService _transactionService;

    public TransactionController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionDto dto)
    {
        try
        {
            var result = await _transactionService.CreateAsync(GetUserId(), dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] TransactionType? type,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? accountId)
    {
        if (startDate.HasValue || endDate.HasValue || type.HasValue ||
            categoryId.HasValue || accountId.HasValue)
        {
            var filtered = await _transactionService.GetFilteredAsync(
                GetUserId(), startDate, endDate, type, categoryId, accountId);
            return Ok(filtered);
        }

        var result = await _transactionService.GetAllAsync(GetUserId());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _transactionService.GetByIdAsync(GetUserId(), id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTransactionDto dto)
    {
        var result = await _transactionService.UpdateAsync(GetUserId(), id, dto);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _transactionService.DeleteAsync(GetUserId(), id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpDelete("bulk")]
    public async Task<IActionResult> DeleteBulk([FromBody] BulkDeleteDto dto)
    {
        if (dto?.Ids == null || !dto.Ids.Any()) return BadRequest(new { error = "No IDs provided" });
        var count = await _transactionService.DeleteBulkAsync(GetUserId(), dto.Ids);
        return Ok(new { message = $"Successfully deleted {count} transactions" });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] Guid accountId)
    {
        if (file == null || file.Length == 0) return BadRequest(new { error = "File is empty" });
        
        try
        {
            System.Console.WriteLine($"[UPLOAD CONTROLLER] file={file.FileName}, size={file.Length}, account={accountId}, user={GetUserId()}");
            using var stream = file.OpenReadStream();
            var count = await _transactionService.UploadAsync(GetUserId(), accountId, stream, file.FileName);
            System.Console.WriteLine($"[UPLOAD CONTROLLER] SUCCESS: {count} transactions imported");
            return Ok(new { message = $"Successfully uploaded {count} transactions" });
        }
        catch (Exception ex)
        {
            var fullError = ex.ToString();
            System.Console.WriteLine($"[UPLOAD CONTROLLER ERROR] {fullError}");
            return BadRequest(new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }

    /// <summary>Diagnostic: trigger a budget check for a category in the current month and return detailed results.</summary>
    [HttpPost("test-budget-alert/{categoryId:guid}")]
    public async Task<IActionResult> TestBudgetAlert(Guid categoryId)
    {
        var result = await _transactionService.TestBudgetCheckAsync(GetUserId(), categoryId);
        return Ok(result);
    }
}
