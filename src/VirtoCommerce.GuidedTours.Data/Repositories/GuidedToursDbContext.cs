using System.Reflection;
using Microsoft.EntityFrameworkCore;
using VirtoCommerce.GuidedTours.Data.Models;
using VirtoCommerce.Platform.Data.Extensions;
using VirtoCommerce.Platform.Data.Infrastructure;

namespace VirtoCommerce.GuidedTours.Data.Repositories;

public class GuidedToursDbContext : DbContextBase
{
    public GuidedToursDbContext(DbContextOptions<GuidedToursDbContext> options)
        : base(options)
    {
    }

    protected GuidedToursDbContext(DbContextOptions options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<CustomTourEntity>().ToAuditableEntityTable("GuidedTour");
        modelBuilder.Entity<CustomTourEntity>().HasIndex(x => x.TourId).IsUnique();

        modelBuilder.Entity<TourSwitchEntity>().ToAuditableEntityTable("GuidedTourSwitch");
        modelBuilder.Entity<TourSwitchEntity>().HasIndex(x => x.TourId).IsUnique();

        switch (Database.ProviderName)
        {
            case "Pomelo.EntityFrameworkCore.MySql":
                modelBuilder.ApplyConfigurationsFromAssembly(Assembly.Load("VirtoCommerce.GuidedTours.Data.MySql"));
                break;
            case "Npgsql.EntityFrameworkCore.PostgreSQL":
                modelBuilder.ApplyConfigurationsFromAssembly(Assembly.Load("VirtoCommerce.GuidedTours.Data.PostgreSql"));
                break;
            case "Microsoft.EntityFrameworkCore.SqlServer":
                modelBuilder.ApplyConfigurationsFromAssembly(Assembly.Load("VirtoCommerce.GuidedTours.Data.SqlServer"));
                break;
        }
    }
}
