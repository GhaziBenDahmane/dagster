import pandas as pd

from dagster import AssetCheckResult, Definitions, asset, asset_check


@asset
def orders():
    orders_df = pd.DataFrame({"order_id": [1, 2], "item_id": [432, 878]})
    orders_df.to_csv("orders.csv")


@asset_check(asset=orders)
def orders_id_has_no_nulls():
    orders_df = pd.read_csv("orders.csv")
    num_null_order_ids = orders_df["order_id"].isna().sum()
    return AssetCheckResult(
        success=bool(num_null_order_ids == 0),
    )


defs = Definitions(
    assets=[orders],
    asset_checks=[orders_id_has_no_nulls],
)
