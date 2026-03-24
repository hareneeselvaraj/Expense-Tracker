# Use the official .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj and restore dependencies
COPY ["ExpenseTracker/ExpenseTracker.csproj", "ExpenseTracker/"]
RUN dotnet restore "ExpenseTracker/ExpenseTracker.csproj"

# Copy the rest of the code and build
COPY . .
WORKDIR "/app/ExpenseTracker"
RUN dotnet build "ExpenseTracker.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "ExpenseTracker.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the ASP.NET Core runtime image for the final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Set the environment variable to listen on the port provided by Render
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "ExpenseTracker.dll"]
