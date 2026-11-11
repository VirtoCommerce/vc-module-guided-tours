using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.GuidedTours.Web.Services;
using VirtoCommerce.Platform.Core.Modularity;
using VirtoCommerce.Platform.Core.Settings;

namespace VirtoCommerce.GuidedTours.Web;

public class Module : IModule
{
    public ManifestModuleInfo ModuleInfo { get; set; }

    public void Initialize(IServiceCollection serviceCollection)
    {
        serviceCollection.AddSingleton<ITourDefinitionService, TourDefinitionService>();
    }

    public void PostInitialize(IApplicationBuilder appBuilder)
    {
        var settingsRegistrar = appBuilder.ApplicationServices.GetRequiredService<ISettingsRegistrar>();
        settingsRegistrar.RegisterSettings(ModuleConstants.Settings.AllSettings, ModuleInfo.Id);
        settingsRegistrar.RegisterSettingsForType(ModuleConstants.Settings.UserProfile.AllSettings, ModuleConstants.UserProfileTenant);
    }

    public void Uninstall()
    {
        // Nothing to clean up: the module keeps no data of its own.
    }
}
