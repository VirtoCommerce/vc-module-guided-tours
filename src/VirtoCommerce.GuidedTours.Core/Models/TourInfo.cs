using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace VirtoCommerce.GuidedTours.Core.Models;

public class TourInfo : ICloneable
{
    /// <summary>
    /// The tour as stored; module tours have <c>appId</c> filled in from their folder.
    /// </summary>
    public JObject Tour { get; set; }

    /// <summary>
    /// <see cref="TourSource.Module"/> or <see cref="TourSource.Custom"/>.
    /// </summary>
    public string Source { get; set; }

    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string ModuleId { get; set; }

    public bool IsEnabled { get; set; }

    /// <summary>
    /// A custom tour whose id a module tour also uses. The module tour wins; this one is never served to users.
    /// </summary>
    public bool IsConflicting { get; set; }

    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public DateTime? ModifiedDate { get; set; }

    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string ModifiedBy { get; set; }

    [JsonIgnore]
    public string Id => Tour?.Value<string>("id");

    [JsonIgnore]
    public string AppId => Tour?.Value<string>("appId");

    public virtual object Clone()
    {
        var result = (TourInfo)MemberwiseClone();
        result.Tour = (JObject)Tour?.DeepClone();

        return result;
    }
}
