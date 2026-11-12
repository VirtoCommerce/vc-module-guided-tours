using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace VirtoCommerce.GuidedTours.Web.ModelBinders;

[AttributeUsage(AttributeTargets.Parameter)]
public sealed class FromTourJsonBodyAttribute : ModelBinderAttribute
{
    public FromTourJsonBodyAttribute()
        : base(typeof(TourJsonModelBinder))
    {
        BindingSource = BindingSource.Body;
    }
}
