# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/MatchDay.Api/MatchDay.Api.csproj ./MatchDay.Api/
RUN dotnet restore ./MatchDay.Api/MatchDay.Api.csproj

COPY src/MatchDay.Api/ ./MatchDay.Api/
WORKDIR /src/MatchDay.Api
RUN dotnet build -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

RUN adduser --disabled-password --gecos '' appuser

COPY --from=publish /app/publish .

RUN mkdir -p /app/data && chown appuser:appuser /app/data

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

USER appuser
ENTRYPOINT ["dotnet", "MatchDay.Api.dll"]