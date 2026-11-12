using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
using VirtoCommerce.GuidedTours.Core.Validation;

namespace VirtoCommerce.GuidedTours.Web.ModelBinders;

/// <summary>
/// Reads a tour from the request body with <see cref="TourJson"/>, so date-like strings stay strings.
/// Malformed JSON leaves a model state error and a null model.
/// </summary>
public class TourJsonModelBinder : IModelBinder
{
    public async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        ArgumentNullException.ThrowIfNull(bindingContext);

        using var reader = new StreamReader(bindingContext.HttpContext.Request.Body, Encoding.UTF8);
        var json = await reader.ReadToEndAsync();

        try
        {
            bindingContext.Result = ModelBindingResult.Success(TourJson.Parse(json));
        }
        catch (JsonException ex)
        {
            bindingContext.ModelState.AddModelError(bindingContext.ModelName, ex.Message);
            bindingContext.Result = ModelBindingResult.Success(null);
        }
    }
}
