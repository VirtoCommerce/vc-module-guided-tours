using System;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Validation;
using VirtoCommerce.Platform.Core.Common;
using VirtoCommerce.Platform.Core.Domain;

namespace VirtoCommerce.GuidedTours.Data.Models;

public class CustomTourEntity : AuditableEntity, IDataEntity<CustomTourEntity, CustomTour>
{
    [Required]
    [StringLength(TourValidator.MaxIdLength)]
    public string TourId { get; set; }

    [Required]
    [StringLength(128)]
    public string AppId { get; set; }

    [Required]
    public string Content { get; set; }

    public virtual CustomTour ToModel(CustomTour model)
    {
        ArgumentNullException.ThrowIfNull(model);

        model.Id = Id;
        model.CreatedBy = CreatedBy;
        model.CreatedDate = CreatedDate;
        model.ModifiedBy = ModifiedBy;
        model.ModifiedDate = ModifiedDate;

        model.TourId = TourId;
        model.AppId = AppId;
        model.Tour = TourJson.Parse(Content) as JObject;

        return model;
    }

    public virtual CustomTourEntity FromModel(CustomTour model, PrimaryKeyResolvingMap pkMap)
    {
        ArgumentNullException.ThrowIfNull(model);

        pkMap.AddPair(model, this);

        Id = model.Id;
        CreatedBy = model.CreatedBy;
        CreatedDate = model.CreatedDate;
        ModifiedBy = model.ModifiedBy;
        ModifiedDate = model.ModifiedDate;

        TourId = model.TourId;
        AppId = model.AppId;
        Content = model.Tour?.ToString(Formatting.None);

        return this;
    }

    public virtual void Patch(CustomTourEntity target)
    {
        ArgumentNullException.ThrowIfNull(target);

        target.TourId = TourId;
        target.AppId = AppId;
        target.Content = Content;
    }
}
