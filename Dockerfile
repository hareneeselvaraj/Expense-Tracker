# ── Build Stage ──
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore
COPY ExpenseTracker/ExpenseTracker.csproj ExpenseTracker/
RUN dotnet restore ExpenseTracker/ExpenseTracker.csproj

# Copy everything and publish
COPY ExpenseTracker/ ExpenseTracker/
WORKDIR /src/ExpenseTracker
RUN dotnet publish -c Release -o /app/publish --no-restore

# ── Runtime Stage ──
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Railway sets PORT env var
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "ExpenseTracker.dll"]
