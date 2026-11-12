using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.GuidedTours.Core.Validation;
using VirtoCommerce.GuidedTours.Web.ModelBinders;
using VirtoCommerce.Platform.Core.Security;
using VirtoCommerce.Platform.Core.Settings;
using Permissions = VirtoCommerce.GuidedTours.Core.ModuleConstants.Security.Permissions;

namespace VirtoCommerce.GuidedTours.Web.Controllers.Api;

[Authorize]
[Route("api/guided-tours")]
public class GuidedToursController(
    ITourService tourService,
    ISettingsManager settingsManager,
    UserManager<ApplicationUser> userManager) : Controller
{
    /// <summary>
    /// Tours an end user gets for a host app, module and custom: tours are on globally, the tour is on
    /// and not conflicting, and the feature did not ship before the user's account was created.
    /// </summary>
    [HttpGet("apps/{appId}/tours")]
    public async Task<ActionResult<IList<JObject>>> GetUserTours([FromRoute] string appId)
    {
        var user = await userManager.GetUserAsync(User);
        var tours = await tourService.GetUserToursAsync(appId, user?.CreatedDate);

        return Ok(tours);
    }

    [HttpGet("tours")]
    [Authorize(Permissions.Access)]
    public async Task<ActionResult<IList<TourInfo>>> GetTours([FromQuery] string appId = null)
    {
        return Ok(await tourService.GetToursAsync(appId));
    }

    /// <summary>
    /// One tour; for an id both a module and a custom tour use, the module tour.
    /// </summary>
    [HttpGet("tours/{id}")]
    [Authorize(Permissions.Access)]
    public async Task<ActionResult<TourInfo>> GetTour([FromRoute] string id)
    {
        var tour = await tourService.GetTourAsync(id);

        return tour is null ? NotFound() : Ok(tour);
    }

    /// <summary>
    /// Adds a custom tour, created off.
    /// </summary>
    [HttpPost("tours")]
    [Authorize(Permissions.Manage)]
    [ProducesResponseType(typeof(TourInfo), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(TourValidationResult), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TourInfo>> CreateTour([FromTourJsonBody] JToken tour)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(InvalidJson());
        }

        return ToActionResult(await tourService.CreateAsync(tour), created: true);
    }

    /// <summary>
    /// Replaces a custom tour. The body's id may differ from the one in the path: the tour is renamed and keeps its on/off state.
    /// </summary>
    [HttpPut("tours/{id}")]
    [Authorize(Permissions.Manage)]
    [ProducesResponseType(typeof(TourInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(TourValidationResult), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TourInfo>> UpdateTour([FromRoute] string id, [FromTourJsonBody] JToken tour)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(InvalidJson());
        }

        return ToActionResult(await tourService.UpdateAsync(id, tour), created: false);
    }

    [HttpDelete("tours/{id}")]
    [Authorize(Permissions.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(TourValidationResult), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> DeleteTour([FromRoute] string id)
    {
        var result = await tourService.DeleteAsync(id);

        return result.Status switch
        {
            TourChangeStatus.Succeeded => NoContent(),
            TourChangeStatus.NotFound => NotFound(),
            _ => BadRequest(new TourValidationResult { Problems = result.Problems }),
        };
    }

    /// <summary>
    /// Copies any tour to a new custom tour, created off.
    /// </summary>
    [HttpPost("tours/{id}/copy")]
    [Authorize(Permissions.Manage)]
    [ProducesResponseType(typeof(TourInfo), StatusCodes.Status201Created)]
    public async Task<ActionResult<TourInfo>> CopyTour([FromRoute] string id)
    {
        return ToActionResult(await tourService.CopyAsync(id), created: true);
    }

    /// <summary>
    /// Switches one tour, module or custom, on or off.
    /// </summary>
    [HttpPut("tours/{id}/enabled")]
    [Authorize(Permissions.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> SetTourEnabled([FromRoute] string id, [FromBody] EnabledState state)
    {
        if (state is null)
        {
            return BadRequest();
        }

        return await tourService.SetEnabledAsync(id, state.IsEnabled) ? NoContent() : NotFound();
    }

    /// <summary>
    /// Checks a tour against the tour format without saving it.
    /// </summary>
    [HttpPost("tours/validate")]
    [Authorize(Permissions.Access)]
    public ActionResult<TourValidationResult> ValidateTour([FromTourJsonBody] JToken tour)
    {
        if (!ModelState.IsValid)
        {
            return Ok(InvalidJson());
        }

        return Ok(new TourValidationResult { Problems = TourValidator.Validate(tour) });
    }

    /// <summary>
    /// Whether tours are on for everyone (the <c>GuidedTours.Enabled</c> setting).
    /// </summary>
    [HttpGet("settings")]
    [Authorize(Permissions.Access)]
    public async Task<ActionResult<EnabledState>> GetSettings()
    {
        var isEnabled = await settingsManager.GetValueAsync<bool>(ModuleConstants.Settings.General.Enabled);

        return Ok(new EnabledState { IsEnabled = isEnabled });
    }

    [HttpPut("settings")]
    [Authorize(Permissions.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> UpdateSettings([FromBody] EnabledState state)
    {
        if (state is null)
        {
            return BadRequest();
        }

        await settingsManager.SetValueAsync(ModuleConstants.Settings.General.Enabled.Name, state.IsEnabled);

        return NoContent();
    }

    private ActionResult<TourInfo> ToActionResult(TourChangeResult result, bool created)
    {
        return result.Status switch
        {
            TourChangeStatus.NotFound => NotFound(),
            TourChangeStatus.Invalid => BadRequest(new TourValidationResult { Problems = result.Problems }),
            _ when created => Created($"/api/guided-tours/tours/{Uri.EscapeDataString(result.Tour.Id)}", result.Tour),
            _ => Ok(result.Tour),
        };
    }

    private TourValidationResult InvalidJson()
    {
        var details = ModelState.Values.SelectMany(x => x.Errors).Select(x => x.ErrorMessage).FirstOrDefault(x => !string.IsNullOrEmpty(x));
        var message = string.IsNullOrEmpty(details) ? TourProblemMessages.InvalidJson : $"{TourProblemMessages.InvalidJson}. {details}";

        return new TourValidationResult { Problems = [new TourProblem(string.Empty, message)] };
    }
}
