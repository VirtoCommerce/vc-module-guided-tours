using System;
using Newtonsoft.Json.Linq;
using VirtoCommerce.Platform.Core.Common;

namespace VirtoCommerce.GuidedTours.Core.Models;

public class CustomTour : AuditableEntity, ICloneable
{
    public string TourId { get; set; }

    public string AppId { get; set; }

    public JObject Tour { get; set; }

    public virtual object Clone()
    {
        var result = (CustomTour)MemberwiseClone();
        result.Tour = (JObject)Tour?.DeepClone();

        return result;
    }
}
