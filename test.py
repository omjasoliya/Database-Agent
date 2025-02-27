from dotenv import load_dotenv
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnableBranch
from langchain_mistralai import ChatMistralAI
import os

load_dotenv()

API_KEY = os.getenv("API_KEY")

model = ChatMistralAI(model_name="mistral-medium", api_key=API_KEY)

# Classification template
classify_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are an AI classifier that classifies news articles based on their content into one of the following genres:"),
        ("system", "BUSINESS, WORLD, SPORTS, SCI/TECH, POLITICS, ENTERTAINMENT, ARTS & CULTURE, GENERAL"),
        ("human", "Please classify the following news article into one of the genres above. Article: {article} Description: {description}")
    ]
)

# Sentiment classification template
sentiment_classify_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are an AI classifier tasked with determining the urgency and sentiment of news articles."),
        ("system", "Urgency: Classify the news article as either 'Emergency' or 'Non-Emergency' based on its content."),
        ("system", "Sentiment: If the news is 'Emergency', classify the sentiment as 'Urgent'. If the news is 'Non-Emergency', classify the sentiment as 'Positive', 'Negative', or 'Neutral'."),
        ("human", "Please classify the following news article as either 'Emergency' or 'Non-Emergency'. Article: {article} Description: {description}")
    ]
)

# Feedback template for emergency situations
emergency_feedback_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful assistant."),
        ("human", "Based on the following news article, provide suggestions on what the user can do in this emergency situation: {article}")
    ]
)

# Response templates based on sentiment
positive_response_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful assistant."),
        ("human", "Based on the news, provide a positive response or suggestion for the user to take action or feel optimistic. Article: {article}")
    ]
)

negative_response_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful assistant."),
        ("human", "Based on the news, provide a negative response or suggest actions to avoid or handle a negative situation. Article: {article}")
    ]
)

neutral_response_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful assistant."),
        ("human", "Based on the news, provide a neutral response or suggest actions to consider without emphasizing positivity or negativity. Article: {article}")
    ]
)

# Summarization template
summarization_template = ChatPromptTemplate.from_messages(
    [
        ("system", "You are an AI assistant tasked with summarizing news descriptions."),
        ("human", "Please summarize the following news description: {description}")
    ]
)

# Branching logic for responses based on sentiment classification
def positive_branch():
    return positive_response_template | model | StrOutputParser()

def negative_branch():
    return negative_response_template | model | StrOutputParser()

def neutral_branch():
    return neutral_response_template | model | StrOutputParser()

# Branching logic for urgency classification
def emergency_branch():
    return emergency_feedback_template | model | StrOutputParser()

def non_emergency_branch():
    # Create a RunnableBranch to handle sentiment response based on classification
    return RunnableBranch(
        (
            lambda x: 'Positive' in x,
            positive_branch()
        ),
        (
            lambda x: 'Negative' in x,
            negative_branch()
        ),
        (
            lambda x: 'Neutral' in x,
            neutral_branch()
        )
    )

# Now create a chain for sentiment classification and branching
sentiment_classify_chain = sentiment_classify_template | model | StrOutputParser()

# Full chain of classification, summarization, sentiment, and branching
final_chain = (
    classify_template
    | model
    | summarization_template
    | model
    | sentiment_classify_chain
    | RunnableBranch(
        (
            lambda x: "Emergency" in x,
            emergency_branch(),
        ),
        (
            lambda x: "Non-Emergency" in x,
            non_emergency_branch(),
        )
    )
    | StrOutputParser()
)

# Test the final chain
result = final_chain.invoke({"article": "To HD-DVD or not to HD-DVD?", "description": "If you are an equipment manufacturer, parts supplier or content provider, the question has unquestionably been posed to you before."})

print(result)
