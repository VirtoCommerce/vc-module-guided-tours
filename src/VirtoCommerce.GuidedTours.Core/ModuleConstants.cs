using System.Collections.Generic;
using System.IO;
using System.Linq;
using VirtoCommerce.Platform.Core.Settings;

namespace VirtoCommerce.GuidedTours.Core;

public static class ModuleConstants
{
    /// <summary>
    /// Folder under each installed module's root that holds tour definitions,
    /// one subfolder per target host app: <c>{moduleRoot}/Content/tours/{appId}/*.json</c>.
    /// It sits in <c>Content</c> because that is one of the Web project folders module packages carry.
    /// </summary>
    public static readonly string ToursFolder = Path.Combine("Content", "tours");

    public const string UserProfileTenant = "UserProfile";

    public static class Security
    {
        public static class Permissions
        {
            public const string Access = "guided-tours:access";
            public const string Manage = "guided-tours:manage";

            public static string[] AllPermissions { get; } =
            [
                Access,
                Manage,
            ];
        }
    }

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
            /// The frontend reads and writes it through <c>/api/platform/settings/v2/me/values</c>,
            /// which ignores hidden settings, so this one stays visible.
            /// </summary>
            public static SettingDescriptor State { get; } = new()
            {
                Name = "GuidedTours.State",
                GroupName = "Guided Tours|User",
                ValueType = SettingValueType.Json,
                DefaultValue = "{}",
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
