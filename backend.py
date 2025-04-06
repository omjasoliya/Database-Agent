import asyncpg
from quart import Quart, request, jsonify, render_template, send_from_directory
import asyncio
import redis.asyncio as aioredis

# ✅ Connect to Supabase (Postgres)
DATABASE_URL = "postgresql://postgres.zvrbxuoeqyvqypohvlpm:Om%40001122@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

app = Quart(__name__)

# ✅ Set up Redis cache
redis_client = None
async def init_redis():
    global redis_client
    redis_client = await aioredis.from_url("redis://localhost", decode_responses=True)

# ✅ Set up PostgreSQL connection pool
pg_pool = None
async def init_postgres():
    global pg_pool
    pg_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=10)

@app.before_serving
async def startup():
    await init_redis()
    await init_postgres()

@app.after_serving
async def shutdown():
    if pg_pool:
        await pg_pool.close()
    if redis_client:
        await redis_client.close()

# ✅ Serve HTML templates (GET Request)
@app.route("/")
async def home():
    return await render_template("sample.html", user_query=None, response=None)

# ✅ Main processing logic
async def process_query(user_query):
    try:
        # ✅ Check Redis Cache
        cached_response = await redis_client.get(user_query)
        if cached_response:
            return cached_response
        
        # ✅ Generate SQL Query
        from connection import query_generator, get_chat_response  # 🛠️ Your own module
        sql_query = query_generator(user_query)

        # ✅ Fetch Data from PostgreSQL
        async with pg_pool.acquire() as conn:
            rows = await conn.fetch(sql_query)

        # ✅ Get AI-generated response
        response = get_chat_response(rows, user_query)

        # ✅ Cache the response for 5 minutes
        await redis_client.setex(user_query, 300, response)
        
        return response
    except Exception as e:
        print(f"Error in process_query: {e}")
        return "Server error. Please try again later."

# ✅ Handle POST request to get response
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
    return await send_from_directory('static', filename)

if __name__ == "__main__":
    # app.run(host="127.0.0.1", port=5000)
    # for Vercel
    app = app

