using System.Collections.Generic;
using System.Linq;
using VirtoCommerce.Platform.Core.Settings;

namespace VirtoCommerce.GuidedTours.Core;

public static class ModuleConstants
{
    /// <summary>
    /// Folder under each installed module's root that holds tour definitions,
    /// one subfolder per target host app: <c>{moduleRoot}/tours/{appId}/*.json</c>.
    /// </summary>
    public const string ToursFolder = "tours";

    public const string UserProfileTenant = "UserProfile";

    public static class Settings
    {
        public static class General
        {
            public static SettingDescriptor Enabled { get; } = new()
            {
                Name = "GuidedTours.Enabled",
                GroupName = "Guided Tours|General",
                ValueType = SettingValueType.Boolean,
                DefaultValue = true,
            };

            public static IEnumerable<SettingDescriptor> AllSettings
            {
                get
                {
                    yield return Enabled;
                }
            }
        }

        public static class UserProfile
        {
            /// <summary>
            /// Per-user tour progress keyed by tour id:
            /// <c>{ "tours": { "orders.basics": { "version": 1, "status": "completed" } } }</c>.
            /// The frontend reads and writes it through <c>/api/platform/settings/v2/me/values</c>.
            /// </summary>
            public static SettingDescriptor State { get; } = new()
            {
                Name = "GuidedTours.State",
                GroupName = "Guided Tours|User",
                ValueType = SettingValueType.Json,
                DefaultValue = "{}",
                IsHidden = true,
                Tenant = UserProfileTenant,
            };

            public static IEnumerable<SettingDescriptor> AllSettings
            {
                get
                {
                    yield return State;
                }
            }
        }

        public static IEnumerable<SettingDescriptor> AllSettings => General.AllSettings.Concat(UserProfile.AllSettings);
    }
}
