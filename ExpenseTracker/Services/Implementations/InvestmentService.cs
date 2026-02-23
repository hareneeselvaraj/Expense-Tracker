using ExpenseTracker.DTOs.Investment;
using ExpenseTracker.Models;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Services.Implementations;

public class InvestmentService : IInvestmentService
{
    private readonly IInvestmentRepository _investmentRepo;

    public InvestmentService(IInvestmentRepository investmentRepo)
    {
        _investmentRepo = investmentRepo;
    }

    public async Task<InvestmentResponseDto> CreateAsync(Guid userId, CreateInvestmentDto dto)
    {
        var investment = new Investment
        {
            UserId = userId,
            Name = dto.Name,
            InvestedAmount = dto.InvestedAmount,
            CurrentValue = dto.CurrentValue
        };

        await _investmentRepo.AddAsync(investment);
        return MapToDto(investment);
    }

    public async Task<IEnumerable<InvestmentResponseDto>> GetAllAsync(Guid userId)
    {
        var investments = await _investmentRepo.GetByUserIdAsync(userId);
        return investments.Select(MapToDto);
    }

    public async Task<InvestmentResponseDto?> GetByIdAsync(Guid userId, Guid id)
    {
        var investment = await _investmentRepo.GetByIdAsync(id);
        if (investment == null || investment.UserId != userId) return null;
        return MapToDto(investment);
    }

    public async Task<InvestmentResponseDto?> UpdateAsync(Guid userId, Guid id, UpdateInvestmentDto dto)
    {
        var investment = await _investmentRepo.GetByIdAsync(id);
        if (investment == null || investment.UserId != userId) return null;

        if (dto.Name != null) investment.Name = dto.Name;
        if (dto.InvestedAmount.HasValue) investment.InvestedAmount = dto.InvestedAmount.Value;
        if (dto.CurrentValue.HasValue) investment.CurrentValue = dto.CurrentValue.Value;

        await _investmentRepo.UpdateAsync(investment);
        return MapToDto(investment);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id)
    {
        var investment = await _investmentRepo.GetByIdAsync(id);
        if (investment == null || investment.UserId != userId) return false;

        await _investmentRepo.DeleteAsync(investment);
        return true;
    }

    /// <summary>
    /// ROI = ((CurrentValue - InvestedAmount) / InvestedAmount) * 100
    /// </summary>
    private static InvestmentResponseDto MapToDto(Investment i) => new()
    {
        Id = i.Id,
        Name = i.Name,
        InvestedAmount = i.InvestedAmount,
        CurrentValue = i.CurrentValue,
        ROI = i.ROI
    };
}
