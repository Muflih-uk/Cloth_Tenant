ADMIN_GROUP = "orders_admin"
INVENTORY_GROUP = "inventory_all"
CUSTOMER_GROUP = "customers_all"
CATALOG_GROUP = "catalog_admin"
TRANSPORT_GROUP = "transports_all"
USERS_GROUP = "users_admin"


def agent_group(user_id):
    return f"orders_agent_{user_id}"
