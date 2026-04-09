using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace MatchDay.Api.Controllers;

[ApiController]
[Route("api/cache")]
public class CacheController : ControllerBase
{
    private readonly IMemoryCache _cache;

    public CacheController(IMemoryCache cache) => _cache = cache;

    [HttpPost("clear")]
    public IActionResult Clear()
    {
        if (_cache is MemoryCache mc)
            mc.Compact(1.0);
        return Ok(new { message = "Cache vidé." });
    }
}