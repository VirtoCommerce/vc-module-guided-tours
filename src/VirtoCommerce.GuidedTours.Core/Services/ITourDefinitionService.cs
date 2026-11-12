using System.Collections.Generic;
using VirtoCommerce.GuidedTours.Core.Models;

namespace VirtoCommerce.GuidedTours.Core.Services;

public interface ITourDefinitionService
{
    /// <summary>
    /// Tours every installed module ships in <c>{moduleRoot}/tours/{appId}/*.json</c>, for all apps,
    /// each with <c>appId</c> set from its folder. Files that fail format validation are skipped,
    /// and so is a tour whose id an earlier module already uses.
    /// </summary>
    IList<ModuleTour> GetTours();
}
