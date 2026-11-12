using Newtonsoft.Json.Linq;

namespace VirtoCommerce.GuidedTours.Core.Models;

public class ModuleTour
{
    public string ModuleId { get; set; }

    /// <summary>
    /// The tour as the module ships it, with <c>appId</c> set from the folder it lives in.
    /// </summary>
    public JObject Tour { get; set; }

    public string Id => Tour?.Value<string>("id");

    public string AppId => Tour?.Value<string>("appId");
}
