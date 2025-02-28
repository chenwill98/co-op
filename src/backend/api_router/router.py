# import json
# from aws_utils import get_RDS_pool, logger
# from aws_lambda_powertools.event_handler.api_gateway import APIGatewayHttpResolver, Response

# app = APIGatewayHttpResolver()

# # Define a simple GET route for the root path
# @app.get("/")
# def root_route():
#     return {"message": "Welcome to the APIGatewayHttpResolver example!"}

# # Define a GET route for /search with a query parameter
# @app.get("/search")
# def search_route():
#     query_params = app.current_event.query_string_parameters or {}
#     max_price = query_params.get("max_price", 9999999)
#     min_price = query_params.get("min_price", 0)
#     if not max_price:
#         return Response(
#             status_code=400,
#             content_type="application/json",
#             body=json.dumps({"error": "Query parameter 'max_price' is required"}),
#         )
#     try:
#         db_pool = get_RDS_pool()
#         connection = db_pool.getconn()

#         with connection.cursor() as cursor:
#             cursor.execute("""SELECT
#                             fct.id, fct.price
#                             FROM real_estate.fct_properties fct
#                             LEFT JOIN real_estate.dim_property_details dim
#                             ON fct.id = dim.id
#                             LIMIT 10;""")
#             rows = cursor.fetchall()

#         # filtered = [item for item in mock_data if item["price"] <= int(max_price)]
#         return {"results": rows}
    
#     except Exception as e:
#         logger.error(f"Error: {e}")
#         raise

# # Lambda handler
# def lambda_handler(event, context):
#     print(json.dumps(event))
#     return app.resolve(event, context)