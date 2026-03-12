using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ExpenseTracker.DTOs.Auth;
using ExpenseTracker.Models;
using ExpenseTracker.Repositories.Interfaces;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly ICategoryRepository _categoryRepo;
    private readonly IConfiguration _config;

    public AuthService(IUserRepository userRepo, ICategoryRepository categoryRepo, IConfiguration config)
    {
        _userRepo = userRepo;
        _categoryRepo = categoryRepo;
        _config = config;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existing = await _userRepo.GetByEmailAsync(dto.Email);
        if (existing != null)
            throw new InvalidOperationException("A user with this email already exists.");

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            CreatedAt = DateTime.UtcNow
        };

        await _userRepo.AddAsync(user);

        // Seed default categories
        var defaultCategories = new List<Category>
        {
            // Income
            new Category { UserId = user.Id, Name = "Salary", Type = CategoryType.Income, Icon = "💸" },
            new Category { UserId = user.Id, Name = "Freelance", Type = CategoryType.Income, Icon = "💻" },
            new Category { UserId = user.Id, Name = "Investments", Type = CategoryType.Income, Icon = "📈" },
            // Expense
            new Category { UserId = user.Id, Name = "Food", Type = CategoryType.Expense, Icon = "🍔" },
            new Category { UserId = user.Id, Name = "Transport", Type = CategoryType.Expense, Icon = "🚗" },
            new Category { UserId = user.Id, Name = "Housing", Type = CategoryType.Expense, Icon = "🏠" },
            new Category { UserId = user.Id, Name = "Entertainment", Type = CategoryType.Expense, Icon = "🎬" },
            new Category { UserId = user.Id, Name = "Utilities", Type = CategoryType.Expense, Icon = "⚡" },
            new Category { UserId = user.Id, Name = "Shopping", Type = CategoryType.Expense, Icon = "🛍️" },
            // Investment
            new Category { UserId = user.Id, Name = "Stocks", Type = CategoryType.Investment, Icon = "📊" },
            new Category { UserId = user.Id, Name = "Crypto", Type = CategoryType.Investment, Icon = "🪙" }
        };

        foreach (var cat in defaultCategories)
        {
            await _categoryRepo.AddAsync(cat);
        }

        return new AuthResponseDto
        {
            UserId = user.Id,
            Name = user.Name,
            Email = user.Email,
            Token = GenerateJwtToken(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userRepo.GetByEmailAsync(dto.Email.ToLowerInvariant());
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        return new AuthResponseDto
        {
            UserId = user.Id,
            Name = user.Name,
            Email = user.Email,
            Token = GenerateJwtToken(user)
        };
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
