using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ExpenseTracker.DTOs.Investment;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Controllers;

[Route("api/[controller]")]
[Authorize]
public class InvestmentController : BaseApiController
{
    private readonly IInvestmentService _investmentService;

    public InvestmentController(IInvestmentService investmentService)
    {
        _investmentService = investmentService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvestmentDto dto)
    {
        var result = await _investmentService.CreateAsync(GetUserId(), dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _investmentService.GetAllAsync(GetUserId());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _investmentService.GetByIdAsync(GetUserId(), id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInvestmentDto dto)
    {
        var result = await _investmentService.UpdateAsync(GetUserId(), id, dto);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _investmentService.DeleteAsync(GetUserId(), id);
        return deleted ? NoContent() : NotFound();
    }
}
