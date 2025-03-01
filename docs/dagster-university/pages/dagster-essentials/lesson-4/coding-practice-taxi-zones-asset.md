---
title: 'Lesson 4: Practice: Create a taxi_zones asset'
module: 'dagster_essentials'
lesson: '4'
---

# Practice: Create a taxi_zones asset

Let’s use what you learned about creating dependencies between assets to practice creating an asset with dependencies.

In Lesson 3, you created a `taxi_zones_file` asset that downloads a CSV containing data about NYC taxi zones.

Now, create a `taxi_zones` asset that uses the `taxi_zones_file` file to create a table called `zones` in your DuckDB database. This new table should have four columns:

- `zone_id`, which is the `LocationID` column, renamed
- `zone`
- `borough`
- `geometry`, which is the `the_geom` column, renamed

---

## Check your work

The asset you built should look similar to the code contained in the **View answer** toggle. Click to open it.

```python
@asset(
	deps=["taxi_zones_file"]
)
def taxi_zones():
    sql_query = f"""
        create or replace table zones as (
            select
                LocationID as zone_id,
                zone,
                borough,
                the_geom as geometry
            from '{constants.TAXI_ZONES_FILE_PATH}'
        );
    """

		conn = duckdb.connect(os.getenv("DUCKDB_DATABASE"))
		conn.execute(sql_query)
```

**If there are differences**, compare what you wrote to the asset above and change them, as this asset will be used as-is in future lessons.
