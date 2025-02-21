# from flask import Flask, render_template, request, jsonify
# from connection import query_generator, fetch_from_mysql, get_chat_response

# app = Flask(__name__)

# # Function to process the query and get response
# def process_query(user_query):
#     try:
#         sql_query = query_generator(user_query)  # Generate SQL query based on user input
#         query_result = fetch_from_mysql(sql_query)  # Fetch result from MySQL based on the SQL query
#         response = get_chat_response(query_result, user_query)  # Get AI response
#         return response
#     except Exception as e:
#         # Log the error if needed, and provide a generic response
#         print(f"Error occurred: {str(e)}")  # You can replace this with proper logging
#         return "Database server credit finished. Please try again later."

# @app.route("/", methods=["GET", "POST"])
# def index():
#     user_query = None
#     response = None

#     if request.method == "POST":
#         user_query = request.form["user_query"]
#         response = process_query(user_query)  # Call the shared processing function
#         return render_template("sample.html", user_query=user_query, response=response)
    
#     # If it's a GET request, just render the page with empty placeholders
#     return render_template("sample.html", user_query=None, response=None)

# @app.route('/get_response', methods=['POST'])
# def get_response():
#     user_query = request.json.get('user_query')
    
#     if user_query:
#         response = process_query(user_query)  # Call the shared processing function
#         return jsonify({'response': response})
    
#     return jsonify({'error': 'No user query provided'}), 400


# if __name__ == "__main__":
#     app.run(host='0.0.0.0', port=5000,debug=True)

#if any error comes then remove below code and run upper code
import aiomysql
import aioredis
from quart import Quart, request, jsonify, render_template
import asyncio
from connection import query_generator, fetch_from_mysql, get_chat_response
app = Quart(__name__)

# ✅ Set up Redis cache
redis = None
async def init_redis():
    global redis
    redis = await aioredis.from_url("redis://localhost", decode_responses=True)

# ✅ Set up MySQL connection pool
mysql_pool = None
async def init_mysql():
    global mysql_pool
    mysql_pool = await aiomysql.create_pool(
        unix_socket="/var/run/mysqld/mysqld.sock",
        user="root",
        password="Om@001122",
        db="shopdata",
        minsize=5, maxsize=10, autocommit=True
    )

@app.before_serving
async def startup():
    await init_redis()
    await init_mysql()

@app.after_serving
async def shutdown():
    mysql_pool.close()
    await mysql_pool.wait_closed()
    await redis.close()

# ✅ Serve HTML templates (GET Request)
@app.route("/")
async def home():
    return await render_template("sample.html", user_query=None, response=None)

# ✅ Handle AI Query Requests (POST Request)
async def process_query(user_query):
    try:
        # ✅ Check Redis Cache (This is async, so keep await)
        cached_response = await redis.get(user_query)
        if cached_response:
            return cached_response
        
        # ✅ Generate SQL Query (Fix: Remove await)
        sql_query = query_generator(user_query)  # ❌ Don't use 'await' if it's not async
        # print(sql_query)
        # ✅ Fetch Data from MySQL
        async with mysql_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql_query)
                query_result = await cur.fetchall()

        # ✅ Get AI-generated response (Fix: Remove await)
        response = get_chat_response(query_result, user_query)  # ❌ Don't use 'await' if it's not async

        # ✅ Cache the response for 5 minutes
        await redis.setex(user_query, 300, response)
        
        return response
    except Exception as e:
        print(f"Error: {e}")
        return "Database server credit finished. Please try again later."

@app.route("/get_response", methods=["POST"])
async def get_response():
    data = await request.json
    user_query = data.get("user_query")

    if not user_query:
        return jsonify({'error': 'No user query provided'}), 400

    response = await process_query(user_query)
    
    return jsonify({'response': response})

# ✅ Serve Static Files (CSS, JS, Images)
@app.route("/static/<path:filename>")
async def serve_static(filename):
    return await Quart.send_static_file(filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
