using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core.Models;

namespace VirtoCommerce.GuidedTours.Core.Services;

/// <summary>
/// Module and custom tours as one list, and the changes the Guided Tours app makes to it.
/// </summary>
public interface ITourService
{
    /// <summary>
    /// Tours an end user gets for a host app: tours are on globally, the tour is on and not conflicting,
    /// and the audience rule (<c>publishedAt</c> vs the user's creation date) lets it through.
    /// A module tour carries <c>moduleId</c>.
    /// </summary>
    Task<IList<JObject>> GetUserToursAsync(string appId, DateTime? userCreatedDate);

    /// <summary>
    /// All tours of both kinds, of one app when <paramref name="appId"/> is given.
    /// </summary>
    Task<IList<TourInfo>> GetToursAsync(string appId = null);

    /// <summary>
    /// The tour with the id; for an id both a module and a custom tour use, the module tour.
    /// </summary>
    Task<TourInfo> GetTourAsync(string id);

    /// <summary>
    /// Adds a custom tour, created off.
    /// </summary>
    Task<TourChangeResult> CreateAsync(JToken tour);

    /// <summary>
    /// Replaces a custom tour. The new tour may carry another id; the switch state moves with it.
    /// </summary>
    Task<TourChangeResult> UpdateAsync(string id, JToken tour);

    Task<TourChangeResult> DeleteAsync(string id);

    /// <summary>
    /// Copies any tour to a new custom tour, created off: id <c>{id}-copy</c>, then <c>{id}-copy-2</c> and so on,
    /// and every title text with <c> (copy)</c> appended.
    /// </summary>
    Task<TourChangeResult> CopyAsync(string id);

    /// <summary>
    /// Switches one tour, module or custom, on or off. False when no tour has the id.
    /// </summary>
    Task<bool> SetEnabledAsync(string id, bool isEnabled);
}
