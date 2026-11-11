using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace VirtoCommerce.GuidedTours.Core.Services;

public interface ITourDefinitionService
{
    /// <summary>
    /// Tour definitions every installed module ships for the given host app,
    /// each with the declaring module's id added as <c>moduleId</c>.
    /// Definitions without an id, a positive version or at least one step are skipped.
    /// </summary>
    IList<JObject> GetTours(string appId);
}
