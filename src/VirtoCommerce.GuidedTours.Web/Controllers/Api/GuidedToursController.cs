using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.Platform.Core.Security;
using VirtoCommerce.Platform.Core.Settings;

namespace VirtoCommerce.GuidedTours.Web.Controllers.Api;

[Authorize]
[Route("api/guided-tours")]
public class GuidedToursController(
    ITourDefinitionService tourDefinitionService,
    ISettingsManager settingsManager,
    UserManager<ApplicationUser> userManager) : Controller
{
    /// <summary>
    /// Tour definitions that installed modules ship for a host app, minus tours about
    /// features that shipped before the current user's account was created.
    /// Empty when tours are switched off in the module settings.
    /// </summary>
    [HttpGet("apps/{appId}/tours")]
    public async Task<ActionResult<IList<JObject>>> GetTours([FromRoute] string appId)
    {
        var enabled = await settingsManager.GetValueAsync<bool>(ModuleConstants.Settings.General.Enabled);
        if (!enabled)
        {
            return Ok(new List<JObject>());
        }

        var user = await userManager.GetUserAsync(User);
        var tours = tourDefinitionService.GetTours(appId)
            .Where(tour => TourAudience.IsRelevantFor(tour, user?.CreatedDate))
            .ToList();

        return Ok(tours);
    }
}
