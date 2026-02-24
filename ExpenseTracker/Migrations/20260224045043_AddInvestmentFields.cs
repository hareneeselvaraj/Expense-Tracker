using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExpenseTracker.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AssetType",
                table: "Investments",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BuyPrice",
                table: "Investments",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateInvested",
                table: "Investments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Investments",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Platform",
                table: "Investments",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Investments",
                type: "decimal(18,4)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssetType",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "BuyPrice",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "DateInvested",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "Platform",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Investments");
        }
    }
}
