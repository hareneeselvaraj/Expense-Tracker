using System.ComponentModel.DataAnnotations;
using ExpenseTracker.Models;

namespace ExpenseTracker.DTOs.Category;

public class CreateCategoryDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public CategoryType Type { get; set; }
}

public class CategoryResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}
