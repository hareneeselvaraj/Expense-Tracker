using ExpenseTracker.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ExpenseTracker.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CoupleController : ControllerBase
{
    private readonly ICoupleService _coupleService;

    public CoupleController(ICoupleService coupleService)
    {
        _coupleService = coupleService;
    }

    private Guid GetUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateCouple([FromBody] CreateCoupleRequest request)
    {
        try
        {
            var inviteCode = await _coupleService.CreateCoupleAsync(GetUserId(), request.InviteEmail);
            return Ok(new { inviteCode });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("accept")]
    public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteRequest request)
    {
        var success = await _coupleService.AcceptInviteAsync(request.InviteCode, GetUserId());
        if (!success) return BadRequest(new { message = "Invalid or expired invite code." });
        return Ok(new { message = "Invite accepted successfully." });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var status = await _coupleService.GetCoupleStatusAsync(GetUserId());
        return Ok(status ?? new { status = "None" });
    }

    [HttpDelete("leave")]
    public async Task<IActionResult> LeaveCouple()
    {
        var success = await _coupleService.LeaveCoupleAsync(GetUserId());
        if (!success) return BadRequest(new { message = "Could not leave couple or not part of one." });
        return Ok(new { message = "Successfully left the couple." });
    }
}

public class CreateCoupleRequest
{
    public string InviteEmail { get; set; } = string.Empty;
}

public class AcceptInviteRequest
{
    public string InviteCode { get; set; } = string.Empty;
}
