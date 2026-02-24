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
            AssetType = dto.AssetType,
            Quantity = dto.Quantity,
            BuyPrice = dto.BuyPrice,
            InvestedAmount = dto.InvestedAmount,
            CurrentValue = dto.CurrentValue,
            Platform = dto.Platform,
            Notes = dto.Notes,
            DateInvested = dto.DateInvested
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
        if (dto.AssetType != null) investment.AssetType = dto.AssetType;
        if (dto.Quantity.HasValue) investment.Quantity = dto.Quantity.Value;
        if (dto.BuyPrice.HasValue) investment.BuyPrice = dto.BuyPrice.Value;
        if (dto.InvestedAmount.HasValue) investment.InvestedAmount = dto.InvestedAmount.Value;
        if (dto.CurrentValue.HasValue) investment.CurrentValue = dto.CurrentValue.Value;
        if (dto.Platform != null) investment.Platform = dto.Platform;
        if (dto.Notes != null) investment.Notes = dto.Notes;
        if (dto.DateInvested.HasValue) investment.DateInvested = dto.DateInvested.Value;

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

    private static InvestmentResponseDto MapToDto(Investment i) => new()
    {
        Id = i.Id,
        Name = i.Name,
        AssetType = i.AssetType,
        Quantity = i.Quantity,
        BuyPrice = i.BuyPrice,
        InvestedAmount = i.InvestedAmount,
        CurrentValue = i.CurrentValue,
        Platform = i.Platform,
        Notes = i.Notes,
        DateInvested = i.DateInvested,
        ROI = i.ROI
    };
}
