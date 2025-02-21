import mysql.connector
from openai import OpenAI
#for database connection:-
def fetch_from_mysql(query):
    try:
        connection  = mysql.connector.connect(
        unix_socket="/var/run/mysqld/mysqld.sock",  # Correct socket path
        user="root",
        password="Om@001122",
        database="shopdata"
    )
        cursor = connection.cursor()
        cursor.execute(query)
        result = cursor.fetchall()
        
        # Print the fetched results:-
        all_rows = []
        for row in result:
            all_rows.append(row)
        
        return all_rows
    
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def query_generator(prompt):
    client = OpenAI(
        base_url = "https://api.scaleway.ai/48d10841-8363-40c9-a1b4-ad5f98163c59/v1",
        # api_key = '02a26650-145f-4330-9077-f54247a9bfa2' 
        api_key = "1bc826a4-1d94-4945-a8eb-4eb26c908d08" # Replace SCW_SECRET_KEY with your IAM API key
    )

    # Define database schema
    schema_description = (
        "Customers (CustomerID, CustomerName, ContactNumber, City, SignupDate), "
        "Products (ProductID, ProductName, Category, Price, StockQuantity), "
        "Sales (SaleID, CustomerID, ProductID, SaleDate (YYYY-MM-DD), Quantity, TotalAmount, PaymentMethod), "
        "Employees (EmployeeID, EmployeeName, Position, Salary, HireDate, ContactNumber, City), "
        "Suppliers (SupplierID, SupplierName, ContactNumber, City)."
    )

    # User query
    user_input = prompt

    # API request
    response = client.chat.completions.create(
        model="llama-3.3-70b-instruct",
        messages=[
            {"role": "system", "content": "You are a My-SQL expert who works on the given schema."},
            
            {"role": "user", "content": f"""
            Generate a MySQL query based solely on the following database schema:

            {schema_description}

            User Query: {user_input}

            Return only the MySQL query without any explanations or additional text.
            """}
        ],
        max_tokens=1000,
        temperature=0.7,
        top_p=0.7,
        presence_penalty=0,
        stream=True,
    )

    # Clean the query by removing extra words
    def clean_sql_query(query):
        return query.replace("```", "").replace("sql", "")

    # Stream the response
    full_query = ""
    for chunk in response:
        if hasattr(chunk, "choices") and chunk.choices:
            delta = chunk.choices[0].delta
            if hasattr(delta, "content") and delta.content:
                full_query += delta.content  # Accumulate the content

    # Clean the accumulated full query
    query_cleaning = clean_sql_query(full_query)
    return query_cleaning
    




def get_chat_response(fetched_data, user_input_que):
    client = OpenAI(
        base_url = "https://api.scaleway.ai/48d10841-8363-40c9-a1b4-ad5f98163c59/v1",
        api_key = "c3a7c4ab-aeb7-45ce-ade8-c70c4784542b"
    )

    response = client.chat.completions.create(
        model="qwen2.5-coder-32b-instruct",
        messages = [
    {
        "role": "system",
        "content": (
            "You are an intelligent Indian customer support bot with business intelligence. "
            "You will respond only to questions directly related to the provided database schema. "
            "If the question is not relevant, do not provide any answer. "
            "Ensure all responses are short, polite, and relevant to the user’s query."
        )
    },
    {
        "role": "user",
        "content": f"Question: {user_input_que}\nDatabase Response: {fetched_data}"
    },
],
        max_tokens=512,
        temperature=1.4,
        top_p=1,
        presence_penalty=0,
        stream=True,
    )

    result = ""
    for chunk in response:
        if chunk.choices and chunk.choices[0].delta.content:
            result += chunk.choices[0].delta.content
    return result

# # Example usage
# if __name__ == "__main__":
#     user_query = input("Enter your question: ")
#     sql_query = query_generator(user_query)
    # print(sql_query)
    # query_result = fetch_from_mysql(sql_query)
    # print(query_result)
    # print(get_chat_response(query_result, user_query))

