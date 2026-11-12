using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using VirtoCommerce.GuidedTours.Data.Repositories;

namespace VirtoCommerce.GuidedTours.Data.PostgreSql;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<GuidedToursDbContext>
{
    public GuidedToursDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<GuidedToursDbContext>();
        var connectionString = args.Length != 0 ? args[0] : "Server=localhost;Username=virto;Password=virto;Database=VirtoCommerce3;";

        builder.UseNpgsql(
            connectionString,
            options => options.MigrationsAssembly(typeof(PostgreSqlDataAssemblyMarker).Assembly.GetName().Name));

        return new GuidedToursDbContext(builder.Options);
    }
}
